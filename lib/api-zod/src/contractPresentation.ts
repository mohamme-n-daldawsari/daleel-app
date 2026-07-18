export function normalizeClarityScore(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const normalized = value > 0 && value <= 10 ? value * 10 : value;
  return Math.round(Math.min(100, Math.max(0, normalized)));
}

const ARABIC_RISK_LABELS: Record<string, string> = {
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
};

const ARABIC_CLAUSE_CATEGORY_LABELS: Record<string, string> = {
  renewal: "تجديد",
  cancellation: "إلغاء",
  payment: "دفعات",
  privacy: "خصوصية",
  liability: "مسؤولية",
  maintenance: "صيانة",
  non_compete: "عدم المنافسة",
  warranty: "ضمان",
  obligation: "التزام",
  right: "حق",
  missing_clause: "بند مفقود",
  recommendation: "توصية",
  general: "عام",
};

const ARABIC_FINANCIAL_TYPE_LABELS: Record<string, string> = {
  monthly_payment: "دفعة شهرية",
  annual_payment: "دفعة سنوية",
  deposit: "عربون",
  tax: "ضريبة",
  fee: "رسوم",
  penalty: "غرامة",
  refund: "استرداد",
  bonus: "مكافأة",
};

const ARABIC_DATE_TYPE_LABELS: Record<string, string> = {
  start: "بداية العقد",
  end: "نهاية العقد",
  renewal: "تاريخ التجديد",
  payment: "موعد الدفع",
  cancellation_deadline: "آخر موعد للإلغاء",
  trial_end: "نهاية الفترة التجريبية",
  warranty_end: "نهاية الضمان",
  probation_end: "نهاية فترة التجربة",
};

const ARABIC_ACTION_PRIORITY_LABELS: Record<string, string> = {
  urgent: "عاجل",
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
};

export function arabicRiskLabel(value: string): string {
  return ARABIC_RISK_LABELS[value] ?? value;
}

export function arabicClauseCategoryLabel(value: string): string {
  return ARABIC_CLAUSE_CATEGORY_LABELS[value] ?? value;
}

function describesTotalContractValue(context?: {
  description?: string | null;
  sourceText?: string | null;
}): boolean {
  const text = `${context?.description ?? ""} ${context?.sourceText ?? ""}`
    .replace(/\s+/g, " ")
    .toLowerCase();
  return (
    /(?:إجمالي|اجمالي).{0,60}(?:العقد|مدة|فترة)/u.test(text) ||
    /(?:العقد|مدة|فترة).{0,60}(?:إجمالي|اجمالي)/u.test(text) ||
    /\b(?:total|entire)\b.{0,60}\b(?:contract|term)\b/u.test(text) ||
    /\b(?:contract|term)\b.{0,60}\btotal\b/u.test(text)
  );
}

export function arabicFinancialTypeLabel(
  value: string,
  context?: { description?: string | null; sourceText?: string | null },
): string {
  if (value === "annual_payment" && describesTotalContractValue(context)) {
    return "إجمالي قيمة العقد";
  }
  return ARABIC_FINANCIAL_TYPE_LABELS[value] ?? value;
}

export function arabicDateTypeLabel(value: string): string {
  return ARABIC_DATE_TYPE_LABELS[value] ?? value;
}

export function arabicActionPriorityLabel(value: string): string {
  return ARABIC_ACTION_PRIORITY_LABELS[value] ?? value;
}
