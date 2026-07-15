import { Router, type IRouter } from "express";
import { eq, and, ilike, desc, count } from "drizzle-orm";
import {
  db,
  contractsTable,
  contractPartiesTable,
  contractClausesTable,
  contractFinancialDetailsTable,
  contractDatesTable,
} from "@workspace/db";
import { requireAuth, logActivity } from "../lib/authMiddleware";
import { analyzeContract } from "../lib/aiService";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Helper to build full contract response
async function buildContractResponse(contractId: number) {
  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, contractId));
  if (!contract) return null;

  const [parties, clauses, financialDetails, contractDates, highRiskClauses] = await Promise.all([
    db.select().from(contractPartiesTable).where(eq(contractPartiesTable.contractId, contractId)),
    db.select().from(contractClausesTable).where(eq(contractClausesTable.contractId, contractId)),
    db.select().from(contractFinancialDetailsTable).where(eq(contractFinancialDetailsTable.contractId, contractId)),
    db.select().from(contractDatesTable).where(eq(contractDatesTable.contractId, contractId)),
    db.select({ cnt: count() }).from(contractClausesTable).where(and(eq(contractClausesTable.contractId, contractId), eq(contractClausesTable.riskLevel, "high"))),
  ]);

  return {
    ...contract,
    parties,
    clauses,
    financialDetails,
    contractDates,
    highRiskCount: Number(highRiskClauses[0]?.cnt ?? 0),
  };
}

// GET /contracts
router.get("/contracts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const { contractType, status, search } = req.query as Record<string, string | undefined>;

  let query = db.select().from(contractsTable).where(eq(contractsTable.userId, userId)).$dynamic();

  const conditions = [eq(contractsTable.userId, userId)];
  if (contractType) conditions.push(eq(contractsTable.contractType, contractType));
  if (status) conditions.push(eq(contractsTable.status, status));
  if (search) conditions.push(ilike(contractsTable.title, `%${search}%`));

  const contracts = await db
    .select()
    .from(contractsTable)
    .where(and(...conditions))
    .orderBy(desc(contractsTable.createdAt));

  // Get high-risk counts
  const highRiskResults = await db
    .select({ contractId: contractClausesTable.contractId, cnt: count() })
    .from(contractClausesTable)
    .where(eq(contractClausesTable.riskLevel, "high"))
    .groupBy(contractClausesTable.contractId);

  const highRiskMap = new Map(highRiskResults.map((r) => [r.contractId, Number(r.cnt)]));

  res.json(
    contracts.map((c) => ({
      id: c.id,
      title: c.title,
      contractType: c.contractType,
      status: c.status,
      clarityScore: c.clarityScore,
      highRiskCount: highRiskMap.get(c.id) ?? 0,
      automaticRenewal: c.automaticRenewal,
      endDate: c.endDate,
      createdAt: c.createdAt,
    })),
  );
  void query;
});

// POST /contracts/upload
router.post("/contracts/upload", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const { pastedText, fileBase64, fileName, fileType, contractType = "general", language = "ar", title } = req.body as {
    pastedText?: string;
    fileBase64?: string;
    fileName?: string;
    fileType?: string;
    contractType?: string;
    language?: string;
    title?: string;
  };

  let extractedText = pastedText ?? "";

  // If file was provided, decode base64 and extract text
  if (fileBase64 && fileName) {
    try {
      const buffer = Buffer.from(fileBase64, "base64");
      if (fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
        // Try PDF text extraction
        try {
          const pdfParse = await import("pdf-parse");
          const pdfData = await pdfParse.default(buffer);
          extractedText = pdfData.text || "";
        } catch {
          // If pdf-parse fails, use placeholder text for demo
          extractedText = `[PDF file: ${fileName}]\n\nUnable to extract text from this PDF. Using demo analysis mode.`;
        }
      } else {
        // Image files — use placeholder for now (OCR would require external service)
        extractedText = `[Image file: ${fileName}]\n\nImage text extraction is not available in this version. Using demo analysis mode.`;
      }
    } catch (err) {
      req.log.error({ err }, "File processing error");
      extractedText = `[File: ${fileName}]\n\nFile processing failed. Using demo analysis mode.`;
    }
  }

  const contractTitle = title || fileName || `عقد جديد - ${new Date().toLocaleDateString("ar-SA")}`;

  const [contract] = await db
    .insert(contractsTable)
    .values({
      userId,
      title: contractTitle,
      contractType,
      originalFileName: fileName ?? null,
      language,
      extractedText,
      status: "pending",
    })
    .returning();

  await logActivity(userId, "upload_contract", "contract", contract.id);

  const full = await buildContractResponse(contract.id);
  res.status(201).json(full);
});

// GET /contracts/compare — must be before /:contractId
router.post("/contracts/compare", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const { contractIdA, contractIdB } = req.body as { contractIdA: number; contractIdB: number };

  const [contractA, contractB] = await Promise.all([
    buildContractResponse(contractIdA),
    buildContractResponse(contractIdB),
  ]);

  if (!contractA || contractA.userId !== userId) {
    res.status(404).json({ error: "Contract A not found" });
    return;
  }
  if (!contractB || contractB.userId !== userId) {
    res.status(404).json({ error: "Contract B not found" });
    return;
  }

  const { compareContractsSummary } = await import("../lib/aiService");
  const aiSummary = await compareContractsSummary(
    { title: contractA.title, type: contractA.contractType, totalCost: contractA.totalCost, monthlyPayment: contractA.monthlyPayment, automaticRenewal: contractA.automaticRenewal, cancellationAllowed: contractA.cancellationAllowed, earlyCancellationPenalty: contractA.earlyCancellationPenalty },
    { title: contractB.title, type: contractB.contractType, totalCost: contractB.totalCost, monthlyPayment: contractB.monthlyPayment, automaticRenewal: contractB.automaticRenewal, cancellationAllowed: contractB.cancellationAllowed, earlyCancellationPenalty: contractB.earlyCancellationPenalty },
  );

  function fmt(val: unknown): string {
    if (val === null || val === undefined) return "غير محدد";
    if (typeof val === "boolean") return val ? "نعم" : "لا";
    if (typeof val === "number") return val.toLocaleString("ar-SA");
    return String(val);
  }

  const differences = [
    { field: "totalCost", labelAr: "التكلفة الإجمالية", labelEn: "Total Cost", valueA: fmt(contractA.totalCost), valueB: fmt(contractB.totalCost), advantage: (contractA.totalCost ?? 0) < (contractB.totalCost ?? 0) ? "a" : (contractA.totalCost ?? 0) > (contractB.totalCost ?? 0) ? "b" : "neutral" },
    { field: "monthlyPayment", labelAr: "الدفعة الشهرية", labelEn: "Monthly Payment", valueA: fmt(contractA.monthlyPayment), valueB: fmt(contractB.monthlyPayment), advantage: (contractA.monthlyPayment ?? 0) < (contractB.monthlyPayment ?? 0) ? "a" : (contractA.monthlyPayment ?? 0) > (contractB.monthlyPayment ?? 0) ? "b" : "neutral" },
    { field: "automaticRenewal", labelAr: "التجديد التلقائي", labelEn: "Automatic Renewal", valueA: fmt(contractA.automaticRenewal), valueB: fmt(contractB.automaticRenewal), advantage: contractA.automaticRenewal === false && contractB.automaticRenewal ? "a" : contractB.automaticRenewal === false && contractA.automaticRenewal ? "b" : "neutral" },
    { field: "cancellationAllowed", labelAr: "الإلغاء مسموح", labelEn: "Cancellation Allowed", valueA: fmt(contractA.cancellationAllowed), valueB: fmt(contractB.cancellationAllowed), advantage: contractA.cancellationAllowed && !contractB.cancellationAllowed ? "a" : contractB.cancellationAllowed && !contractA.cancellationAllowed ? "b" : "neutral" },
    { field: "earlyCancellationPenalty", labelAr: "غرامة الإلغاء المبكر", labelEn: "Early Cancellation Penalty", valueA: fmt(contractA.earlyCancellationPenalty), valueB: fmt(contractB.earlyCancellationPenalty), advantage: (contractA.earlyCancellationPenalty ?? 0) < (contractB.earlyCancellationPenalty ?? 0) ? "a" : (contractA.earlyCancellationPenalty ?? 0) > (contractB.earlyCancellationPenalty ?? 0) ? "b" : "neutral" },
    { field: "clarityScore", labelAr: "درجة الوضوح", labelEn: "Clarity Score", valueA: fmt(contractA.clarityScore), valueB: fmt(contractB.clarityScore), advantage: (contractA.clarityScore ?? 0) > (contractB.clarityScore ?? 0) ? "a" : (contractA.clarityScore ?? 0) < (contractB.clarityScore ?? 0) ? "b" : "neutral" },
  ] as const;

  const toSummary = (c: Awaited<ReturnType<typeof buildContractResponse>>) => ({
    id: c!.id,
    title: c!.title,
    contractType: c!.contractType,
    status: c!.status,
    clarityScore: c!.clarityScore,
    highRiskCount: c!.highRiskCount,
    automaticRenewal: c!.automaticRenewal,
    endDate: c!.endDate,
    createdAt: c!.createdAt,
  });

  res.json({
    contractA: toSummary(contractA),
    contractB: toSummary(contractB),
    aiSummary,
    differences,
  });
});

// GET /contracts/:contractId
router.get("/contracts/:contractId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(raw, 10);

  const full = await buildContractResponse(contractId);
  if (!full || full.userId !== userId) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  res.json(full);
});

// PATCH /contracts/:contractId
router.patch("/contracts/:contractId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(raw, 10);

  const [existing] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));
  if (!existing) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  const { title, contractType } = req.body as { title?: string; contractType?: string };
  const updates: Partial<typeof contractsTable.$inferInsert> = {};
  if (title) updates.title = title;
  if (contractType) updates.contractType = contractType;

  await db.update(contractsTable).set(updates).where(eq(contractsTable.id, contractId));

  const full = await buildContractResponse(contractId);
  res.json(full);
});

// DELETE /contracts/:contractId
router.delete("/contracts/:contractId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(raw, 10);

  const [existing] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));
  if (!existing) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  await db.delete(contractsTable).where(eq(contractsTable.id, contractId));
  await logActivity(userId, "delete_contract", "contract", contractId);

  res.json({ message: "Contract deleted successfully" });
});

// POST /contracts/:contractId/analyze
router.post("/contracts/:contractId/analyze", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(raw, 10);

  const [contract] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  const { explanationLevel = "standard", outputLanguage = "ar" } = req.body as {
    explanationLevel?: string;
    outputLanguage?: string;
  };

  // Mark as processing
  await db.update(contractsTable).set({ status: "processing" }).where(eq(contractsTable.id, contractId));

  try {
    const analysis = await analyzeContract(
      contract.extractedText ?? "",
      contract.contractType,
      explanationLevel,
      outputLanguage,
    );

    // Update contract with analysis results
    await db.update(contractsTable).set({
      status: "analyzed",
      title: analysis.title || contract.title,
      summary: analysis.summary,
      startDate: analysis.startDate,
      endDate: analysis.endDate,
      duration: analysis.duration,
      totalCost: analysis.totalCost,
      currency: analysis.currency,
      monthlyPayment: analysis.monthlyPayment,
      annualPayment: analysis.annualPayment,
      deposit: analysis.deposit,
      automaticRenewal: analysis.automaticRenewal,
      renewalNoticeDays: analysis.renewalNoticeDays,
      cancellationAllowed: analysis.cancellationAllowed,
      cancellationNoticeDays: analysis.cancellationNoticeDays,
      earlyCancellationPenalty: analysis.earlyCancellationPenalty,
      refundPolicy: analysis.refundPolicy,
      trialPeriodDays: analysis.trialPeriodDays,
      clarityScore: analysis.clarityScore,
      clarityExplanation: analysis.clarityExplanation,
      confidence: analysis.confidence,
      suggestedQuestions: analysis.suggestedQuestions ?? [],
    }).where(eq(contractsTable.id, contractId));

    // Insert parties
    if (analysis.parties?.length) {
      await db.delete(contractPartiesTable).where(eq(contractPartiesTable.contractId, contractId));
      await db.insert(contractPartiesTable).values(
        analysis.parties.map((p) => ({ contractId, name: p.name, role: p.role })),
      );
    }

    // Insert clauses
    if (analysis.clauses?.length) {
      await db.delete(contractClausesTable).where(eq(contractClausesTable.contractId, contractId));
      await db.insert(contractClausesTable).values(
        analysis.clauses.map((c) => ({
          contractId,
          category: c.category,
          title: c.title,
          simpleExplanation: c.simpleExplanation,
          riskLevel: c.riskLevel,
          sourcePage: c.sourcePage ?? null,
          sourceText: c.sourceText ?? null,
          confidence: null,
        })),
      );
    }

    // Insert financial details
    if (analysis.financialDetails?.length) {
      await db.delete(contractFinancialDetailsTable).where(eq(contractFinancialDetailsTable.contractId, contractId));
      await db.insert(contractFinancialDetailsTable).values(
        analysis.financialDetails.map((f) => ({
          contractId,
          type: f.type,
          amount: f.amount,
          currency: f.currency ?? "SAR",
          description: f.description ?? null,
          sourcePage: f.sourcePage ?? null,
        })),
      );
    }

    // Insert dates
    if (analysis.contractDates?.length) {
      await db.delete(contractDatesTable).where(eq(contractDatesTable.contractId, contractId));
      await db.insert(contractDatesTable).values(
        analysis.contractDates.map((d) => ({
          contractId,
          type: d.type,
          date: d.date,
          description: d.description ?? null,
          sourcePage: d.sourcePage ?? null,
        })),
      );
    }

    await logActivity(userId, "analyze_contract", "contract", contractId);

    const full = await buildContractResponse(contractId);
    res.json(full);
  } catch (err) {
    logger.error({ err }, "Analysis failed");
    await db.update(contractsTable).set({ status: "failed" }).where(eq(contractsTable.id, contractId));
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

// GET /contracts/:contractId/export/:format
router.get("/contracts/:contractId/export/:format", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const rawId = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(rawId, 10);
  const format = Array.isArray(req.params.format) ? req.params.format[0] : req.params.format;

  const full = await buildContractResponse(contractId);
  if (!full || full.userId !== userId) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  if (format === "csv") {
    // Export dates as CSV
    const lines = [
      "Type,Date,Description",
      ...full.contractDates.map((d) => `"${d.type}","${d.date}","${d.description ?? ""}"`),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="daleel-dates-${contractId}.csv"`);
    res.send(lines.join("\n"));
    return;
  }

  // PDF export — return a simple text-based report
  const report = `
DALEEL | دليل - Contract Analysis Report
==========================================
Contract: ${full.title}
Type: ${full.contractType}
Status: ${full.status}
Clarity Score: ${full.clarityScore ?? "N/A"}/100
Analysis Date: ${new Date().toLocaleDateString()}

DISCLAIMER:
Daleel helps users understand contracts and identify important clauses. 
It does not provide legal advice and does not replace consultation with a qualified legal professional.
دليل يساعدك على فهم العقود والعثور على البنود المهمة، لكنه لا يقدم استشارة قانونية.

SUMMARY:
${full.summary ?? "No summary available."}

PARTIES:
${full.parties.map((p) => `- ${p.name} (${p.role})`).join("\n")}

FINANCIAL DETAILS:
${full.financialDetails.map((f) => `- ${f.type}: ${f.amount} ${f.currency} — ${f.description ?? ""}`).join("\n")}

KEY DATES:
${full.contractDates.map((d) => `- ${d.type}: ${d.date} — ${d.description ?? ""}`).join("\n")}

IMPORTANT CLAUSES:
${full.clauses.map((c) => `[${c.riskLevel.toUpperCase()}] ${c.title}\n  ${c.simpleExplanation}${c.sourcePage ? `\n  Source: Page ${c.sourcePage}` : ""}`).join("\n\n")}
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="daleel-report-${contractId}.txt"`);
  res.send(report);
});

// GET /contracts/:contractId/clauses
router.get("/contracts/:contractId/clauses", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(raw, 10);

  const [contract] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  const clauses = await db.select().from(contractClausesTable).where(eq(contractClausesTable.contractId, contractId));
  res.json(clauses);
});

export default router;
