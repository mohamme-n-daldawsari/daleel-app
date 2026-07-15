import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/authMiddleware";

const router: IRouter = Router();

// GET /auth/me — get current user
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.dbUser!;
  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    createdAt: user.createdAt,
  });
});

// PATCH /auth/me/settings
router.patch("/auth/me/settings", requireAuth, async (req, res): Promise<void> => {
  const user = req.dbUser!;
  const { fullName, preferredLanguage } = req.body as {
    fullName?: string;
    preferredLanguage?: string;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName) updates.fullName = fullName;
  if (preferredLanguage && ["ar", "en"].includes(preferredLanguage)) {
    updates.preferredLanguage = preferredLanguage;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    id: updated.id,
    fullName: updated.fullName,
    email: updated.email,
    role: updated.role,
    preferredLanguage: updated.preferredLanguage,
    createdAt: updated.createdAt,
  });
});

// POST /auth/register — local email/password register (demo mode fallback)
router.post("/auth/register", async (req, res): Promise<void> => {
  const { fullName, email, password, preferredLanguage = "ar" } = req.body as {
    fullName: string;
    email: string;
    password: string;
    preferredLanguage?: string;
  };

  if (!fullName || !email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    fullName,
    email,
    passwordHash,
    role: "user",
    preferredLanguage,
  }).returning();

  res.status(201).json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, preferredLanguage: user.preferredLanguage, createdAt: user.createdAt } });
});

// POST /auth/login — local email/password login (demo mode fallback)
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, preferredLanguage: user.preferredLanguage, createdAt: user.createdAt } });
});

// POST /auth/logout
router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

export default router;
