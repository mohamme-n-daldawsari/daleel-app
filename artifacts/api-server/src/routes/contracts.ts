import { Router, type IRouter } from "express";
import { eq, and, ilike, desc, count, inArray } from "drizzle-orm";
import {
  db,
  contractsTable,
  contractPartiesTable,
  contractClausesTable,
  contractFinancialDetailsTable,
  contractDatesTable,
} from "@workspace/db";
import { requireAuth, logActivity } from "../lib/authMiddleware";
import {
  analyzeContract,
  ContractAnalysisError,
  MAX_CONTRACT_TEXT_LENGTH,
  type AnalysisResult,
} from "../lib/aiService";
import { logger } from "../lib/logger";
import { persistContractAnalysis } from "../lib/analysisPersistence";
import {
  claimableAnalysisStatuses,
  shouldReturnCachedAnalysis,
  statusAfterAnalysisFailure,
} from "../lib/analysisPolicy";
import { DocumentExtractionError, extractContractText } from "../lib/documentExtraction";
import {
  SAMPLE_ANALYSIS,
  SAMPLE_CONTRACT_FILE_NAME,
  SAMPLE_CONTRACT_TEXT,
} from "../lib/demoData";
import { createArabicContractPdf } from "../lib/pdfReport";

const router: IRouter = Router();

function parseStoredAnalysis(value: string | null): Partial<AnalysisResult> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Partial<AnalysisResult>;
  } catch {
    return {};
  }
}

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

  const stored = parseStoredAnalysis(contract.rawAnalysis);
  const enrichedClauses = clauses.map((clause) => {
    const rawClause = stored.clauses?.find(
      (candidate) => candidate.category === clause.category && candidate.title === clause.title,
    );
    return {
      ...clause,
      sourceText: clause.sourceText ?? rawClause?.sourceText ?? null,
      confidence: clause.confidence ?? rawClause?.confidence ?? null,
    };
  });
  const enrichedDates = contractDates.map((item) => {
    const rawDate = stored.contractDates?.find(
      (candidate) => candidate.type === item.type && candidate.date === item.date,
    );
    return {
      ...item,
      sourceText: rawDate?.sourceText ?? null,
      confidence: rawDate?.confidence ?? null,
    };
  });
  const enrichedFinancialDetails = financialDetails.map((detail) => {
    const rawDetail = stored.financialDetails?.find(
      (candidate) =>
        candidate.type === detail.type &&
        candidate.amount === detail.amount &&
        candidate.currency === detail.currency,
    );
    return {
      ...detail,
      sourceText: detail.sourceText ?? rawDetail?.sourceText ?? null,
      confidence: rawDetail?.confidence ?? null,
    };
  });

  return {
    ...contract,
    parties,
    clauses: enrichedClauses,
    financialDetails: enrichedFinancialDetails,
    contractDates: enrichedDates,
    highRiskCount: Number(highRiskClauses[0]?.cnt ?? 0),
    overallRiskLevel: stored.overallRiskLevel ?? null,
    actionPlan: stored.actionPlan ?? [],
    isDemo: contract.originalFileName === SAMPLE_CONTRACT_FILE_NAME,
  };
}

// GET /contracts
router.get("/contracts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const { contractType, status, search } = req.query as Record<string, string | undefined>;

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

  let extractedText: string;
  try {
    extractedText = await extractContractText({ pastedText, fileBase64, fileName, fileType });
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      if (error.cause) {
        req.log.warn(
          { err: error.cause, statusCode: error.status },
          "PDF text extraction failed",
        );
      }
      res.status(error.status).json({ error: error.message });
      return;
    }
    req.log.warn(
      { errorName: error instanceof Error ? error.name : "UnknownError" },
      "Contract text extraction failed",
    );
    res.status(422).json({ error: "تعذر قراءة الملف المرفوع. تحقق من الملف وحاول مرة أخرى." });
    return;
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

// POST /contracts/sample — creates one fictional, pre-analyzed contract per user.
// It never calls OpenAI and therefore consumes no API credit.
router.post("/contracts/sample", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const [existing] = await db
    .select({ id: contractsTable.id })
    .from(contractsTable)
    .where(
      and(
        eq(contractsTable.userId, userId),
        eq(contractsTable.originalFileName, SAMPLE_CONTRACT_FILE_NAME),
      ),
    );

  if (existing) {
    res.json(await buildContractResponse(existing.id));
    return;
  }

  const [contract] = await db
    .insert(contractsTable)
    .values({
      userId,
      title: SAMPLE_ANALYSIS.title,
      contractType: SAMPLE_ANALYSIS.contractType,
      originalFileName: SAMPLE_CONTRACT_FILE_NAME,
      language: "ar",
      extractedText: SAMPLE_CONTRACT_TEXT,
      status: "pending",
    })
    .returning();

  await persistContractAnalysis(contract.id, contract.title, SAMPLE_ANALYSIS as AnalysisResult);
  await logActivity(userId, "create_sample_contract", "contract", contract.id);
  res.status(201).json(await buildContractResponse(contract.id));
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

  const { explanationLevel = "standard", outputLanguage = "ar", force = false } = req.body as {
    explanationLevel?: string;
    outputLanguage?: string;
    force?: boolean;
  };

  if (shouldReturnCachedAnalysis(contract.status, force)) {
    const cached = await buildContractResponse(contractId);
    res.json(cached);
    return;
  }

  if ((contract.extractedText ?? "").length > MAX_CONTRACT_TEXT_LENGTH) {
    res.status(413).json({
      error: `العقد كبير جداً للتحليل. الحد الأقصى هو ${MAX_CONTRACT_TEXT_LENGTH.toLocaleString("ar-SA")} حرف.`,
    });
    return;
  }

  // A paid re-analysis must be explicitly forced. The atomic status update
  // prevents duplicate concurrent API calls for both initial and repeat runs.
  const claimableStatuses = claimableAnalysisStatuses(force);
  const [claimed] = await db
    .update(contractsTable)
    .set({ status: "processing" })
    .where(
      and(
        eq(contractsTable.id, contractId),
        eq(contractsTable.userId, userId),
        inArray(contractsTable.status, claimableStatuses),
      ),
    )
    .returning({ id: contractsTable.id });

  if (!claimed) {
    const current = await buildContractResponse(contractId);
    if (!current || current.userId !== userId) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }
    if (current.status === "analyzed" && !force) {
      res.json(current);
      return;
    }
    if (current.status === "processing") {
      res.status(409).json({ error: "تحليل هذا العقد قيد التنفيذ بالفعل. يرجى الانتظار حتى يكتمل." });
      return;
    }
    res.status(409).json({ error: "تعذر بدء التحليل. استخدم خيار إعادة التحليل للمحاولة مرة أخرى." });
    return;
  }

  try {
    const analysis = await analyzeContract(
      contract.extractedText ?? "",
      contract.contractType,
      explanationLevel,
      outputLanguage,
    );

    await persistContractAnalysis(contractId, contract.title, analysis);

    await logActivity(userId, "analyze_contract", "contract", contractId);

    const full = await buildContractResponse(contractId);
    res.json(full);
  } catch (error) {
    logger.error(
      { errorName: error instanceof Error ? error.name : "UnknownError", contractId },
      "Contract analysis request failed",
    );
    await db
      .update(contractsTable)
      .set({ status: statusAfterAnalysisFailure(contract.status) })
      .where(eq(contractsTable.id, contractId));
    res.status(502).json({
      error:
        error instanceof ContractAnalysisError
          ? error.message
          : "تعذر إكمال تحليل العقد. لم يتم استخدام نتائج تجريبية. يرجى المحاولة مرة أخرى.",
    });
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

  if (format !== "pdf") {
    res.status(400).json({ error: "صيغة التصدير غير مدعومة." });
    return;
  }

  try {
    const report = await createArabicContractPdf(full);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="daleel-report-${contractId}.pdf"`);
    res.send(report);
  } catch (error) {
    req.log.error(
      {
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Unknown PDF generation error",
        contractId,
      },
      "PDF report generation failed",
    );
    res.status(500).json({ error: "تعذر إنشاء تقرير PDF حالياً. يرجى المحاولة مرة أخرى." });
  }
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
