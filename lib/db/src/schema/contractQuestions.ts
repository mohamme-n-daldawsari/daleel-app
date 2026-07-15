import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contractsTable } from "./contracts";
import { usersTable } from "./users";

export const contractQuestionsTable = pgTable("contract_questions", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contractsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sourcePage: integer("source_page"),
  sourceText: text("source_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContractQuestionSchema = createInsertSchema(contractQuestionsTable).omit({ id: true, createdAt: true });
export type InsertContractQuestion = z.infer<typeof insertContractQuestionSchema>;
export type ContractQuestion = typeof contractQuestionsTable.$inferSelect;
