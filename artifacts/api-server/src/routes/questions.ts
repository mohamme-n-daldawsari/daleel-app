import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, contractsTable, contractQuestionsTable } from "@workspace/db";
import { requireAuth } from "../lib/authMiddleware";
import { answerQuestion } from "../lib/aiService";

const router: IRouter = Router();

// GET /contracts/:contractId/questions
router.get("/contracts/:contractId/questions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(raw, 10);

  const [contract] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  const questions = await db
    .select()
    .from(contractQuestionsTable)
    .where(eq(contractQuestionsTable.contractId, contractId))
    .orderBy(desc(contractQuestionsTable.createdAt));

  res.json(
    questions.map((q) => ({
      id: q.id,
      contractId: q.contractId,
      question: q.question,
      answer: q.answer,
      sourcePage: q.sourcePage,
      sourceText: q.sourceText,
      createdAt: q.createdAt,
    })),
  );
});

// POST /contracts/:contractId/questions
router.post("/contracts/:contractId/questions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.contractId) ? req.params.contractId[0] : req.params.contractId;
  const contractId = parseInt(raw, 10);

  const [contract] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  const { question } = req.body as { question: string };
  if (!question) {
    res.status(400).json({ error: "Question is required" });
    return;
  }

  const result = await answerQuestion(
    contract.extractedText ?? "",
    question,
    contract.title,
  );

  const [saved] = await db
    .insert(contractQuestionsTable)
    .values({
      contractId,
      userId,
      question,
      answer: result.answer,
      sourcePage: result.sourcePage ?? null,
      sourceText: result.sourceText ?? null,
    })
    .returning();

  res.json({
    id: saved.id,
    contractId: saved.contractId,
    question: saved.question,
    answer: saved.answer,
    sourcePage: saved.sourcePage,
    sourceText: saved.sourceText,
    createdAt: saved.createdAt,
  });
});

export default router;
