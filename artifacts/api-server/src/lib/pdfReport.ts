import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import PDFDocument from "pdfkit";
import {
  arabicActionPriorityLabel,
  arabicClauseCategoryLabel,
  arabicDateTypeLabel,
  arabicFinancialTypeLabel,
  arabicRiskLabel,
  normalizeClarityScore,
} from "@workspace/api-zod/presentation";

const require = createRequire(import.meta.url);
const WINDOWS_ARABIC_FONT = "C:\\Windows\\Fonts\\arial.ttf";
const ARABIC_FONT = existsSync(WINDOWS_ARABIC_FONT)
  ? WINDOWS_ARABIC_FONT
  : require.resolve("@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff");

type Clause = {
  category: string;
  title: string;
  simpleExplanation: string;
  riskLevel: string;
  sourcePage?: number | null;
  sourceText?: string | null;
  confidence?: number | null;
};

type DateItem = {
  type: string;
  date: string;
  description?: string | null;
  sourcePage?: number | null;
  sourceText?: string | null;
  confidence?: number | null;
};

type ActionItem = {
  priority: string;
  recommendedAction: string;
  rationale: string;
  deadline?: string | null;
  sourceText?: string | null;
  confidence: number;
};

type FinancialItem = {
  type: string;
  amount: number;
  currency: string;
  description?: string | null;
  sourcePage?: number | null;
  sourceText?: string | null;
  confidence?: number | null;
};

export type PdfContractReport = {
  title: string;
  contractType: string;
  summary?: string | null;
  clarityScore?: number | null;
  confidence?: number | null;
  overallRiskLevel?: string | null;
  clauses: Clause[];
  financialDetails?: FinancialItem[];
  contractDates: DateItem[];
  actionPlan?: ActionItem[];
};

function visualRtlText(text: string): string {
  // PDFKit/fontkit applies Arabic OpenType shaping for this Unicode font.
  // It does not reorder RTL words, so reverse the visual tokens while keeping
  // mixed Latin identifiers, dates and numbers internally left-to-right.
  return text
    .trim()
    .split(/\s+/)
    .reverse()
    .map((token) => token.replace(/[A-Za-z0-9][A-Za-z0-9_.:,/%-]*/g, (value) => `\u200E${value}\u200E`))
    .join(" ");
}

function arabicContractType(value: string): string {
  const labels: Record<string, string> = {
    consulting_services: "خدمات استشارية",
    service_agreement: "اتفاقية خدمات",
    rental_agreement: "عقد إيجار",
    employment_contract: "عقد عمل",
    gym_membership: "اشتراك رياضي",
    telecom_contract: "عقد اتصالات",
    software_subscription: "اشتراك برمجي",
    general: "عقد عام",
  };
  return labels[value] ?? value;
}

function arabicConfidence(value: number): string {
  return value >= 0.9 ? "مرتفعة" : value >= 0.7 ? "متوسطة" : "منخفضة";
}

function buildPdf(write: (chunk: Buffer) => void, done: () => void, report: PdfContractReport): void {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 58, right: 54, bottom: 58, left: 54 },
    bufferPages: true,
    // Avoid PDFKit's built-in Helvetica AFM lookup, whose relative data path is
    // not present after bundling the API into dist/index.mjs.
    font: ARABIC_FONT,
  });
  doc.on("data", write);
  doc.on("end", done);
  doc.registerFont("DaleelArabic", ARABIC_FONT).font("DaleelArabic");

  const teal = "#0F766E";
  const ink = "#172B2A";
  const muted = "#586766";
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const ensureSpace = (height: number) => {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom - 24) doc.addPage();
  };

  const rtlLines = (text: string, size = 11, maxWidth = pageWidth): string[] => {
    doc.fontSize(size);
    const wordSpacing = size * 0.14;
    const words = text.replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (doc.widthOfString(visualRtlText(candidate), { wordSpacing }) <= maxWidth || !current) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const rtl = (text: string, options: { size?: number; color?: string; gap?: number; indent?: number } = {}) => {
    const size = options.size ?? 11;
    const indent = options.indent ?? 0;
    const width = pageWidth - indent;
    const lines = rtlLines(text, size, width);
    const wordSpacing = size * 0.14;
    ensureSpace(lines.length * (size * 1.65) + (options.gap ?? 4));
    doc.fillColor(options.color ?? ink).fontSize(size);
    for (const line of lines) {
      doc.text(visualRtlText(line), doc.page.margins.left, doc.y, { width, align: "right", lineBreak: false, wordSpacing });
      doc.moveDown(0.58);
    }
    doc.moveDown((options.gap ?? 4) / size);
  };

  const heading = (title: string) => {
    ensureSpace(42);
    doc.moveDown(0.45);
    doc.strokeColor("#CFE7E4").lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.moveDown(0.45);
    rtl(title, { size: 15, color: teal, gap: 6 });
  };

  const clauseSection = (title: string, categories: string[]) => {
    const items = report.clauses.filter((item) => categories.includes(item.category));
    ensureSpace(items.length ? 175 : 80);
    heading(title);
    if (!items.length) {
      rtl("لم يُعثر على بنود من هذه الفئة في العقد.", { color: muted });
      return;
    }
    for (const item of items) {
      ensureSpace(125);
      rtl(`• ${item.title} — ${arabicClauseCategoryLabel(item.category)} — ${arabicRiskLabel(item.riskLevel)}`, { size: 11.5, color: item.riskLevel === "high" ? "#A13D2D" : ink });
      rtl(item.simpleExplanation, { color: muted, indent: 12 });
      rtl(`الدليل: ${item.sourceText || "لم يُعثر على نص داعم في العقد."}${item.sourcePage != null ? ` — الصفحة ${item.sourcePage}` : ""}${item.confidence != null ? ` — درجة الثقة ${arabicConfidence(item.confidence)}` : ""}`, { size: 9.5, color: "#687775", indent: 12 });
    }
  };

  doc.rect(0, 0, doc.page.width, 94).fill(teal);
  doc.y = 22;
  rtl("دليل", { size: 25, color: "#FFFFFF", gap: 0 });
  rtl("تقرير فهم العقد", { size: 13, color: "#DFF5F2", gap: 12 });
  doc.y = 116;

  rtl(report.title, { size: 21, color: ink, gap: 8 });
  rtl(`نوع العقد: ${arabicContractType(report.contractType)}`, { color: muted });
  rtl(`مستوى المخاطر: ${report.overallRiskLevel ? arabicRiskLabel(report.overallRiskLevel) : "غير محدد"}، درجة الوضوح: ${normalizeClarityScore(report.clarityScore) ?? "غير متاحة"} من 100`, { color: teal });
  if (report.confidence != null) rtl(`ثقة التحليل: ${Math.round(report.confidence * 100)}%`, { color: teal });

  heading("الملخص التنفيذي");
  rtl(report.summary || "لا يتوفر ملخص.", { size: 12 });

  heading("الالتزامات المالية");
  if (!report.financialDetails?.length) rtl("لم يُعثر على تفاصيل مالية محددة.", { color: muted });
  for (const item of report.financialDetails ?? []) {
    ensureSpace(82);
    rtl(`• ${arabicFinancialTypeLabel(item.type, item)}: ${item.amount.toLocaleString("ar-SA")} ${item.currency}`, { size: 11.5 });
    if (item.description) rtl(item.description, { color: muted, indent: 12 });
    rtl(`الدليل: ${item.sourceText || "لم يُعثر على نص داعم في العقد."}${item.sourcePage != null ? ` — الصفحة ${item.sourcePage}` : ""}${item.confidence != null ? ` — درجة الثقة ${arabicConfidence(item.confidence)}` : ""}`, { size: 9.5, color: "#687775", indent: 12 });
  }

  const topRisks = report.clauses.filter((item) => item.riskLevel === "high").slice(0, 3);
  heading("أهم المخاطر");
  if (!topRisks.length) rtl("لم تظهر مخاطر مرتفعة في التحليل.");
  for (const item of topRisks) {
    ensureSpace(125);
    rtl(`• ${item.title} — ${arabicClauseCategoryLabel(item.category)} — ${arabicRiskLabel(item.riskLevel)}`, { size: 12, color: "#A13D2D" });
    rtl(item.simpleExplanation, { color: muted, indent: 12 });
    rtl(`الدليل: ${item.sourceText || "لم يُعثر على نص داعم في العقد."}${item.sourcePage != null ? ` — الصفحة ${item.sourcePage}` : ""}`, { size: 9.5, color: "#687775", indent: 12 });
    if (item.confidence != null) rtl(`درجة الثقة: ${arabicConfidence(item.confidence)}`, { size: 9.5, color: "#687775", indent: 12 });
  }

  clauseSection("شروط الإلغاء والتجديد", ["cancellation", "renewal"]);
  clauseSection("الحقوق", ["right"]);
  clauseSection("الالتزامات", ["obligation"]);
  clauseSection("البنود المهمة المفقودة", ["missing_clause"]);
  clauseSection("التوصيات", ["recommendation"]);

  heading("خطة العمل");
  if (!report.actionPlan?.length) rtl("لا توجد خطوات عملية مقترحة.");
  for (const item of report.actionPlan ?? []) {
    ensureSpace(125);
    rtl(`• ${item.recommendedAction} — ${arabicActionPriorityLabel(item.priority)}`, { size: 12, color: teal });
    rtl(item.rationale, { color: muted, indent: 12 });
    if (item.deadline) rtl(`الموعد: ${item.deadline}`, { color: "#A13D2D", indent: 12 });
    rtl(`الدليل: ${item.sourceText || "لم يُعثر على نص داعم في العقد."} — درجة الثقة ${arabicConfidence(item.confidence)}`, { size: 9.5, color: "#687775", indent: 12 });
  }

  heading("التواريخ المهمة");
  if (!report.contractDates.length) rtl("لم يُعثر على تواريخ محددة.");
  for (const item of report.contractDates) {
    ensureSpace(76);
    rtl(`• ${item.date} — ${item.description || arabicDateTypeLabel(item.type)}`, { size: 11.5 });
    rtl(`الدليل: ${item.sourceText || "لم يُعثر على نص داعم في العقد."}${item.sourcePage != null ? ` — الصفحة ${item.sourcePage}` : ""}${item.confidence != null ? ` — درجة الثقة ${arabicConfidence(item.confidence)}` : ""}`, { size: 9.5, color: "#687775", indent: 12 });
  }

  heading("تنبيه قانوني");
  rtl("هذا التحليل معلوماتي لمساعدتك على فهم العقد، وليس استشارة قانونية ولا بديلاً عن رأي محامٍ مرخص.", { size: 10.5, color: "#7B5C22" });

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.font("DaleelArabic").fontSize(8.5).fillColor("#6C7978");
    doc.text(
      visualRtlText(`تقرير دليل — صفحة ${index + 1} من ${range.count}`),
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 12,
      { width: pageWidth, align: "center", lineBreak: false },
    );
  }
  doc.end();
}

export function createArabicContractPdf(report: PdfContractReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    try {
      buildPdf((chunk) => chunks.push(chunk), () => resolve(Buffer.concat(chunks)), report);
    } catch (error) {
      reject(error);
    }
  });
}
