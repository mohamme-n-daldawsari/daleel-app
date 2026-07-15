import { pgTable, text, serial, timestamp, varchar, integer, real, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  contractType: varchar("contract_type", { length: 100 }).notNull().default("general"),
  originalFileName: text("original_file_name"),
  language: varchar("language", { length: 20 }).default("ar"),
  extractedText: text("extracted_text"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  clarityScore: integer("clarity_score"),
  clarityExplanation: text("clarity_explanation"),
  confidence: real("confidence"),
  summary: text("summary"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  duration: varchar("duration", { length: 100 }),
  totalCost: real("total_cost"),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  monthlyPayment: real("monthly_payment"),
  annualPayment: real("annual_payment"),
  deposit: real("deposit"),
  automaticRenewal: boolean("automatic_renewal"),
  renewalNoticeDays: integer("renewal_notice_days"),
  cancellationAllowed: boolean("cancellation_allowed"),
  cancellationNoticeDays: integer("cancellation_notice_days"),
  earlyCancellationPenalty: real("early_cancellation_penalty"),
  refundPolicy: text("refund_policy"),
  trialPeriodDays: integer("trial_period_days"),
  suggestedQuestions: text("suggested_questions").array(),
  rawAnalysis: text("raw_analysis"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
