import { pgTable, text, serial, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contractsTable } from "./contracts";

export const contractPartiesTable = pgTable("contract_parties", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contractsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: varchar("role", { length: 100 }).notNull().default("party"),
});

export const insertContractPartySchema = createInsertSchema(contractPartiesTable).omit({ id: true });
export type InsertContractParty = z.infer<typeof insertContractPartySchema>;
export type ContractParty = typeof contractPartiesTable.$inferSelect;
