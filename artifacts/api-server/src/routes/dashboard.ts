import { Router, type IRouter } from "express";
import { eq, and, gte, lte, count, desc, sql } from "drizzle-orm";
import { db, contractsTable, remindersTable, contractClausesTable } from "@workspace/db";
import { requireAuth } from "../lib/authMiddleware";

const router: IRouter = Router();

// GET /dashboard/summary
router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;

  const contracts = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.userId, userId))
    .orderBy(desc(contractsTable.createdAt));

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const upcomingReminders = await db
    .select()
    .from(remindersTable)
    .where(
      and(
        eq(remindersTable.userId, userId),
        eq(remindersTable.completed, false),
        gte(remindersTable.reminderDate, today),
        lte(remindersTable.reminderDate, thirtyDaysLater),
      ),
    );

  const renewalCount = upcomingReminders.filter((r) => r.type === "renewal").length;
  const cancellationCount = upcomingReminders.filter((r) => r.type === "cancellation").length;

  // Get high-risk clause count per contract
  const highRiskResults = await db
    .select({ contractId: contractClausesTable.contractId, cnt: count() })
    .from(contractClausesTable)
    .where(eq(contractClausesTable.riskLevel, "high"))
    .groupBy(contractClausesTable.contractId);

  const highRiskMap = new Map(highRiskResults.map((r) => [r.contractId, Number(r.cnt)]));

  const contractsByType = contracts.reduce<Record<string, number>>((acc, c) => {
    acc[c.contractType] = (acc[c.contractType] ?? 0) + 1;
    return acc;
  }, {});

  const recentContracts = contracts.slice(0, 5).map((c) => ({
    id: c.id,
    title: c.title,
    contractType: c.contractType,
    status: c.status,
    clarityScore: c.clarityScore,
    highRiskCount: highRiskMap.get(c.id) ?? 0,
    automaticRenewal: c.automaticRenewal,
    endDate: c.endDate,
    createdAt: c.createdAt,
  }));

  res.json({
    totalContracts: contracts.length,
    highRiskCount: contracts.filter((c) => (highRiskMap.get(c.id) ?? 0) > 0).length,
    upcomingRenewals: renewalCount,
    upcomingCancellations: cancellationCount,
    recentContracts,
    contractsByType: Object.entries(contractsByType).map(([contractType, count]) => ({ contractType, count })),
  });
});

// GET /dashboard/upcoming
router.get("/dashboard/upcoming", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const reminders = await db
    .select({
      id: remindersTable.id,
      contractId: remindersTable.contractId,
      contractTitle: contractsTable.title,
      type: remindersTable.type,
      reminderDate: remindersTable.reminderDate,
      completed: remindersTable.completed,
    })
    .from(remindersTable)
    .innerJoin(contractsTable, eq(remindersTable.contractId, contractsTable.id))
    .where(
      and(
        eq(remindersTable.userId, userId),
        eq(remindersTable.completed, false),
        gte(remindersTable.reminderDate, today),
        lte(remindersTable.reminderDate, ninetyDaysLater),
      ),
    )
    .orderBy(remindersTable.reminderDate)
    .limit(10);

  const todayMs = new Date(today).getTime();
  const alerts = reminders.map((r) => ({
    contractId: r.contractId,
    contractTitle: r.contractTitle,
    alertType: r.type as string,
    daysUntil: Math.ceil((new Date(r.reminderDate).getTime() - todayMs) / (1000 * 60 * 60 * 24)),
    date: r.reminderDate,
  }));

  res.json(alerts);
});

export default router;
