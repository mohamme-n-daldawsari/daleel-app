import { pgTable, text, serial, integer, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contractsTable } from "./contracts";

export const contractFinancialDetailsTable = pgTable("contract_financial_details", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contractsTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  amount: real("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("SAR"),
  description: text("description"),
  sourcePage: integer("source_page"),
  sourceText: text("source_text"),
});

export const insertContractFinancialDetailSchema = createInsertSchema(contractFinancialDetailsTable).omit({ id: true });
export type InsertContractFinancialDetail = z.infer<typeof insertContractFinancialDetailSchema>;
export type ContractFinancialDetail = typeof contractFinancialDetailsTable.$inferSelect;
