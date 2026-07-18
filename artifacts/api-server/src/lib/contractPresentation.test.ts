import { describe, expect, it } from "vitest";
import {
  arabicActionPriorityLabel,
  arabicClauseCategoryLabel,
  arabicDateTypeLabel,
  arabicFinancialTypeLabel,
  arabicRiskLabel,
  normalizeClarityScore,
} from "@workspace/api-zod/presentation";

describe("contract presentation", () => {
  it("normalizes 0-10 clarity scores without rescaling 0-100 scores", () => {
    expect(normalizeClarityScore(9)).toBe(90);
    expect(normalizeClarityScore(8.5)).toBe(85);
    expect(normalizeClarityScore(10)).toBe(100);
    expect(normalizeClarityScore(90)).toBe(90);
    expect(normalizeClarityScore(100)).toBe(100);
    expect(normalizeClarityScore(0)).toBe(0);
    expect(normalizeClarityScore(null)).toBeNull();
  });

  it("localizes Arabic risk, clause, financial, date, and priority labels", () => {
    expect(["high", "medium", "low"].map(arabicRiskLabel)).toEqual([
      "مرتفع",
      "متوسط",
      "منخفض",
    ]);
    expect(
      [
        "obligation",
        "cancellation",
        "liability",
        "missing_clause",
        "renewal",
        "right",
      ].map(arabicClauseCategoryLabel),
    ).toEqual(["التزام", "إلغاء", "مسؤولية", "بند مفقود", "تجديد", "حق"]);
    expect(
      ["monthly_payment", "annual_payment", "penalty"].map((value) =>
        arabicFinancialTypeLabel(value),
      ),
    ).toEqual(["دفعة شهرية", "دفعة سنوية", "غرامة"]);
    expect(arabicDateTypeLabel("cancellation_deadline")).toBe(
      "آخر موعد للإلغاء",
    );
    expect(arabicActionPriorityLabel("urgent")).toBe("عاجل");
  });

  it("labels an annual_payment total for a shorter contract as total contract value", () => {
    expect(
      arabicFinancialTypeLabel("annual_payment", {
        description: "إجمالي الأتعاب لفترة العقد (6 أشهر × 3,000 ريال سعودي)",
      }),
    ).toBe("إجمالي قيمة العقد");
    expect(
      arabicFinancialTypeLabel("annual_payment", {
        description: "الدفعة السنوية المتكررة",
      }),
    ).toBe("دفعة سنوية");
  });
});
