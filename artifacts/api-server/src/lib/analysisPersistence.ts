import { eq } from "drizzle-orm";
import {
  db,
  contractsTable,
  contractPartiesTable,
  contractClausesTable,
  contractFinancialDetailsTable,
  contractDatesTable,
} from "@workspace/db";
import type { AnalysisResult } from "./aiService";

export async function persistContractAnalysis(
  contractId: number,
  currentTitle: string,
  analysis: AnalysisResult,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(contractsTable)
      .set({
        status: "analyzed",
        title: analysis.title || currentTitle,
        summary: analysis.summary,
        startDate: analysis.startDate,
        endDate: analysis.endDate,
        duration: analysis.duration,
        totalCost: analysis.totalCost,
        currency: analysis.currency,
        monthlyPayment: analysis.monthlyPayment,
        annualPayment: analysis.annualPayment,
        deposit: analysis.deposit,
        automaticRenewal: analysis.automaticRenewal,
        renewalNoticeDays: analysis.renewalNoticeDays,
        cancellationAllowed: analysis.cancellationAllowed,
        cancellationNoticeDays: analysis.cancellationNoticeDays,
        earlyCancellationPenalty: analysis.earlyCancellationPenalty,
        refundPolicy: analysis.refundPolicy,
        trialPeriodDays: analysis.trialPeriodDays,
        clarityScore: analysis.clarityScore,
        clarityExplanation: analysis.clarityExplanation,
        confidence: analysis.confidence,
        suggestedQuestions: analysis.suggestedQuestions,
        rawAnalysis: JSON.stringify(analysis),
      })
      .where(eq(contractsTable.id, contractId));

    // A PostgreSQL transaction uses one client connection; keep these sequential.
    await tx.delete(contractPartiesTable).where(eq(contractPartiesTable.contractId, contractId));
    await tx.delete(contractClausesTable).where(eq(contractClausesTable.contractId, contractId));
    await tx.delete(contractFinancialDetailsTable).where(eq(contractFinancialDetailsTable.contractId, contractId));
    await tx.delete(contractDatesTable).where(eq(contractDatesTable.contractId, contractId));

    if (analysis.parties.length) {
      await tx.insert(contractPartiesTable).values(
        analysis.parties.map((party) => ({ contractId, name: party.name, role: party.role })),
      );
    }
    if (analysis.clauses.length) {
      await tx.insert(contractClausesTable).values(
        analysis.clauses.map((clause) => ({
          contractId,
          category: clause.category,
          title: clause.title,
          simpleExplanation: clause.simpleExplanation,
          riskLevel: clause.riskLevel,
          sourcePage: clause.sourcePage,
          sourceText: clause.sourceText,
          confidence: clause.confidence,
        })),
      );
    }
    if (analysis.financialDetails.length) {
      await tx.insert(contractFinancialDetailsTable).values(
        analysis.financialDetails.map((detail) => ({
          contractId,
          type: detail.type,
          amount: detail.amount,
          currency: detail.currency,
          description: detail.description,
          sourcePage: detail.sourcePage,
          sourceText: detail.sourceText,
        })),
      );
    }
    if (analysis.contractDates.length) {
      await tx.insert(contractDatesTable).values(
        analysis.contractDates.map((item) => ({
          contractId,
          type: item.type,
          date: item.date,
          description: item.description,
          sourcePage: item.sourcePage,
        })),
      );
    }
  });
}
