import { pgTable, text, serial, integer, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contractsTable } from "./contracts";

export const contractClausesTable = pgTable("contract_clauses", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contractsTable.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull().default("general"),
  title: text("title").notNull(),
  simpleExplanation: text("simple_explanation").notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"),
  sourcePage: integer("source_page"),
  sourceText: text("source_text"),
  confidence: real("confidence"),
});

export const insertContractClauseSchema = createInsertSchema(contractClausesTable).omit({ id: true });
export type InsertContractClause = z.infer<typeof insertContractClauseSchema>;
export type ContractClause = typeof contractClausesTable.$inferSelect;
