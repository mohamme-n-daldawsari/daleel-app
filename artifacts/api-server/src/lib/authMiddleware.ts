import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// Extend Express Request to include our user
declare global {
  namespace Express {
    interface Request {
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Look up user in our DB by Clerk ID
    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));

    if (!user) {
      // JIT provision: create a local user record on first auth
      const clerkUser = await auth.getToken();
      const email = `user_${auth.userId.slice(-8)}@daleel.internal`;
      const [newUser] = await db.insert(usersTable).values({
        clerkId: auth.userId,
        fullName: "مستخدم دليل",
        email,
        role: "user",
        preferredLanguage: "ar",
      }).returning();
      user = newUser;
      logger.info({ userId: user.id, clerkId: auth.userId }, "JIT provisioned new user");
      void clerkUser; // suppress unused warning
    }

    req.dbUser = user;
    next();
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    res.status(500).json({ error: "Authentication error" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.dbUser || req.dbUser.role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    next();
  });
}

export async function logActivity(
  userId: number,
  action: string,
  entityType: string,
  entityId?: number,
): Promise<void> {
  try {
    const { activityLogsTable } = await import("@workspace/db");
    await db.insert(activityLogsTable).values({
      userId,
      action,
      entityType,
      entityId: entityId ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to log activity");
  }
}
