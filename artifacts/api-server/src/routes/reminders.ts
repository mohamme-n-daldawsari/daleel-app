import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, remindersTable, contractsTable } from "@workspace/db";
import { requireAuth } from "../lib/authMiddleware";

const router: IRouter = Router();

// GET /reminders
router.get("/reminders", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;

  const results = await db
    .select({
      id: remindersTable.id,
      userId: remindersTable.userId,
      contractId: remindersTable.contractId,
      contractTitle: contractsTable.title,
      title: remindersTable.title,
      reminderDate: remindersTable.reminderDate,
      type: remindersTable.type,
      completed: remindersTable.completed,
      createdAt: remindersTable.createdAt,
    })
    .from(remindersTable)
    .innerJoin(contractsTable, eq(remindersTable.contractId, contractsTable.id))
    .where(eq(remindersTable.userId, userId))
    .orderBy(remindersTable.reminderDate);

  res.json(results);
});

// POST /reminders
router.post("/reminders", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const { contractId, title, reminderDate, type } = req.body as {
    contractId: number;
    title: string;
    reminderDate: string;
    type: string;
  };

  if (!contractId || !title || !reminderDate || !type) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Verify contract belongs to user
  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(and(eq(contractsTable.id, contractId), eq(contractsTable.userId, userId)));

  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  const [reminder] = await db
    .insert(remindersTable)
    .values({ userId, contractId, title, reminderDate, type, completed: false })
    .returning();

  res.status(201).json({
    id: reminder.id,
    contractId: reminder.contractId,
    contractTitle: contract.title,
    title: reminder.title,
    reminderDate: reminder.reminderDate,
    type: reminder.type,
    completed: reminder.completed,
    createdAt: reminder.createdAt,
  });
});

// PATCH /reminders/:reminderId
router.patch("/reminders/:reminderId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.reminderId) ? req.params.reminderId[0] : req.params.reminderId;
  const reminderId = parseInt(raw, 10);

  const [existing] = await db
    .select()
    .from(remindersTable)
    .where(and(eq(remindersTable.id, reminderId), eq(remindersTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }

  const { completed, reminderDate, title } = req.body as {
    completed?: boolean;
    reminderDate?: string;
    title?: string;
  };

  const updates: Partial<typeof remindersTable.$inferInsert> = {};
  if (completed !== undefined) updates.completed = completed;
  if (reminderDate) updates.reminderDate = reminderDate;
  if (title) updates.title = title;

  const [updated] = await db
    .update(remindersTable)
    .set(updates)
    .where(eq(remindersTable.id, reminderId))
    .returning();

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, updated.contractId));

  res.json({
    id: updated.id,
    contractId: updated.contractId,
    contractTitle: contract?.title ?? "",
    title: updated.title,
    reminderDate: updated.reminderDate,
    type: updated.type,
    completed: updated.completed,
    createdAt: updated.createdAt,
  });
});

// DELETE /reminders/:reminderId
router.delete("/reminders/:reminderId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.dbUser!.id;
  const raw = Array.isArray(req.params.reminderId) ? req.params.reminderId[0] : req.params.reminderId;
  const reminderId = parseInt(raw, 10);

  const [existing] = await db
    .select()
    .from(remindersTable)
    .where(and(eq(remindersTable.id, reminderId), eq(remindersTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }

  await db.delete(remindersTable).where(eq(remindersTable.id, reminderId));
  res.json({ message: "Reminder deleted successfully" });
});

export default router;
