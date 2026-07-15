import { pgTable, text, serial, integer, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contractsTable } from "./contracts";

export const contractDatesTable = pgTable("contract_dates", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contractsTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description"),
  sourcePage: integer("source_page"),
});

export const insertContractDateSchema = createInsertSchema(contractDatesTable).omit({ id: true });
export type InsertContractDate = z.infer<typeof insertContractDateSchema>;
export type ContractDate = typeof contractDatesTable.$inferSelect;
