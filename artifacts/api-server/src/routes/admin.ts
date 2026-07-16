import { Router, type IRouter } from "express";
import { and, eq, ilike, desc, count, or } from "drizzle-orm";
import { db, usersTable, contractsTable, activityLogsTable } from "@workspace/db";
import { requireAdmin } from "../lib/authMiddleware";

const router: IRouter = Router();

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [userCount, contractCount, failedCount, contractsByType, recentLogs] = await Promise.all([
    db.select({ cnt: count() }).from(usersTable),
    db.select({ cnt: count() }).from(contractsTable),
    db.select({ cnt: count() }).from(contractsTable).where(eq(contractsTable.status, "failed")),
    db.select({ contractType: contractsTable.contractType, cnt: count() })
      .from(contractsTable)
      .groupBy(contractsTable.contractType),
    db.select()
      .from(activityLogsTable)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(10),
  ]);

  const analyzedCount = await db.select({ cnt: count() }).from(contractsTable).where(eq(contractsTable.status, "analyzed"));

  res.json({
    totalUsers: Number(userCount[0]?.cnt ?? 0),
    totalContracts: Number(contractCount[0]?.cnt ?? 0),
    totalAnalyses: Number(analyzedCount[0]?.cnt ?? 0),
    failedAnalyses: Number(failedCount[0]?.cnt ?? 0),
    contractsByType: contractsByType.map((r) => ({ contractType: r.contractType, count: Number(r.cnt) })),
    recentActivity: recentLogs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userEmail: null,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      createdAt: l.createdAt,
    })),
  });
});

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { search, role } = req.query as { search?: string; role?: string };

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.fullName, `%${search}%`),
      ),
    );
  }
  if (role) conditions.push(eq(usersTable.role, role));

  const users = await db
    .select()
    .from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(usersTable.createdAt));

  // Get contract count per user
  const contractCounts = await db
    .select({ userId: contractsTable.userId, cnt: count() })
    .from(contractsTable)
    .groupBy(contractsTable.userId);
  const contractMap = new Map(contractCounts.map((r) => [r.userId, Number(r.cnt)]));

  res.json(
    users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      preferredLanguage: u.preferredLanguage,
      contractCount: contractMap.get(u.id) ?? 0,
      createdAt: u.createdAt,
    })),
  );
});

// PATCH /admin/users/:userId
router.patch("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(raw, 10);
  const { role } = req.body as { role?: string };

  if (role && !["user", "admin"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (role) updates.role = role;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const contractCount = await db.select({ cnt: count() }).from(contractsTable).where(eq(contractsTable.userId, userId));

  res.json({
    id: updated.id,
    fullName: updated.fullName,
    email: updated.email,
    role: updated.role,
    preferredLanguage: updated.preferredLanguage,
    contractCount: Number(contractCount[0]?.cnt ?? 0),
    createdAt: updated.createdAt,
  });
});

// GET /admin/logs
router.get("/admin/logs", requireAdmin, async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "50", 10);
  const offset = parseInt((req.query.offset as string) ?? "0", 10);

  const logs = await db
    .select({
      id: activityLogsTable.id,
      userId: activityLogsTable.userId,
      userEmail: usersTable.email,
      action: activityLogsTable.action,
      entityType: activityLogsTable.entityType,
      entityId: activityLogsTable.entityId,
      createdAt: activityLogsTable.createdAt,
    })
    .from(activityLogsTable)
    .leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(logs);
});

export default router;
