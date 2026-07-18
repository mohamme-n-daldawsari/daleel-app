import React from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  getExportContractQueryKey,
  getGetContractQueryKey,
  getListRemindersQueryKey,
  useAnalyzeContract,
  useCreateReminder,
  useDeleteContract,
  useExportContract,
  useGetContract,
} from "@workspace/api-client-react";
import type { ActionPlanItem, Clause, ContractDate } from "@workspace/api-client-react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Shield,
  Sparkles,
  Trash2,
  XOctagon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function apiError(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const data = (error as { data?: { error?: unknown } }).data;
  return typeof data?.error === "string" ? data.error : fallback;
}

const riskStyle: Record<string, string> = {
  high: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
  medium: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
  low: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
};

function ConfidenceEvidence({ sourceText, confidence, sourcePage, language }: { sourceText?: string | null; confidence?: number | null; sourcePage?: number | null; language: string }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
        <span>{language === "ar" ? "النص الأصلي الداعم" : "Supporting source text"}</span>
        <span className="flex flex-wrap gap-3">
          {sourcePage != null && <span>{language === "ar" ? "الصفحة" : "Page"}: {sourcePage}</span>}
          {confidence != null && <span>{language === "ar" ? "الثقة" : "Confidence"}: {Math.round(confidence * 100)}%</span>}
        </span>
      </div>
      <blockquote className="border-s-2 border-teal-400 ps-3 leading-6 text-slate-700 dark:text-slate-300" dir="auto">
        {sourceText || (language === "ar" ? "لم يُعثر على نص داعم في العقد." : "No supporting text was found in the contract.")}
      </blockquote>
    </div>
  );
}

function ClauseCard({ clause, language }: { clause: Clause; language: string }) {
  return (
    <article className={`rounded-xl border p-5 ${riskStyle[clause.riskLevel] ?? riskStyle.low}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold">{clause.title}</h4>
        <div className="flex gap-2">
          <Badge variant="outline">{clause.category}</Badge>
          <Badge variant="outline">{clause.riskLevel}</Badge>
        </div>
      </div>
      <p className="mt-2 leading-7">{clause.simpleExplanation}</p>
      <ConfidenceEvidence sourceText={clause.sourceText} confidence={clause.confidence} sourcePage={clause.sourcePage} language={language} />
    </article>
  );
}

function DateCard({ item, language }: { item: ContractDate; language: string }) {
  return (
    <article className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-slate-900 dark:text-white">{item.description || item.type}</h4>
        <time className="font-bold text-teal-700 dark:text-teal-300">{item.date}</time>
      </div>
      <ConfidenceEvidence sourceText={item.sourceText} confidence={item.confidence} sourcePage={item.sourcePage} language={language} />
    </article>
  );
}

export default function ContractReport() {
  const id = Number(useParams().id || 0);
  const { language } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isArabic = language === "ar";
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const { data: contract, isLoading } = useGetContract(id, {
    query: { enabled: id > 0, queryKey: getGetContractQueryKey(id) },
  });
  const deleteMutation = useDeleteContract();
  const analyzeMutation = useAnalyzeContract();
  const reminderMutation = useCreateReminder();
  const exportQuery = useExportContract(id, "pdf", {
    query: { enabled: false, queryKey: getExportContractQueryKey(id, "pdf") },
    request: { responseType: "blob" },
  });

  if (isLoading) return <div className="space-y-5 p-4"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-48 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (!contract) return <div className="p-8 text-center">{isArabic ? "لم يُعثر على العقد." : "Contract not found."}</div>;

  const clauses = contract.clauses ?? [];
  const highRisks = clauses.filter((item) => item.riskLevel === "high").slice(0, 3);
  const actionPlan = contract.actionPlan ?? [];
  const nextAction = actionPlan[0];
  const risk = contract.overallRiskLevel ?? (highRisks.length ? "high" : "low");
  const categoryTitle: Record<string, string> = {
    right: isArabic ? "الحقوق" : "Rights",
    obligation: isArabic ? "الالتزامات" : "Obligations",
    missing_clause: isArabic ? "البنود المفقودة" : "Missing clauses",
    recommendation: isArabic ? "التوصيات" : "Recommendations",
  };

  const handleExport = async () => {
    try {
      const result = await exportQuery.refetch();
      if (!result.data) throw new Error("empty");
      const url = URL.createObjectURL(result.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `daleel-report-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: isArabic ? "تعذر تصدير تقرير PDF" : "PDF export failed", variant: "destructive" });
    }
  };

  const createReminder = (item: ActionPlanItem) => {
    if (!item.deadline || !item.reminderTitle || !item.reminderType) return;
    reminderMutation.mutate(
      { data: { contractId: id, title: item.reminderTitle, reminderDate: item.deadline, type: item.reminderType } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRemindersQueryKey() });
          toast({ title: isArabic ? "تم إنشاء التذكير بعد موافقتك" : "Reminder created after your confirmation" });
        },
        onError: (error) => toast({ title: isArabic ? "تعذر إنشاء التذكير" : "Reminder creation failed", description: apiError(error, ""), variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => history.back()} className="rounded-full"><BackIcon className="h-5 w-5" /></Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{contract.title}</h1>
              {contract.isDemo && <Badge className="bg-violet-600">{isArabic ? "نموذج خيالي" : "Fictional sample"}</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{format(parseISO(contract.createdAt), "dd MMMM yyyy", { locale: isArabic ? ar : enUS })}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" disabled={analyzeMutation.isPending} className="border-amber-300 text-amber-800"><RefreshCcw className="me-2 h-4 w-4" />{isArabic ? "إعادة التحليل" : "Re-analyze"}</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>{isArabic ? "إعادة تحليل العقد؟" : "Re-analyze?"}</AlertDialogTitle><AlertDialogDescription>{isArabic ? "سيُرسل نص العقد إلى OpenAI ويستهلك رصيد API. ستبقى النتيجة الحالية إن فشل الطلب." : "This sends the contract to OpenAI and consumes API credit. The current result remains if it fails."}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel><AlertDialogAction className="bg-amber-600" onClick={() => analyzeMutation.mutate({ contractId: id, data: { force: true, explanationLevel: "standard", outputLanguage: "ar" } }, { onSuccess: (updated) => queryClient.setQueryData(getGetContractQueryKey(id), updated), onError: (error) => toast({ title: isArabic ? "فشلت إعادة التحليل" : "Re-analysis failed", description: apiError(error, isArabic ? "لم تُستخدم نتيجة تجريبية وبقي التحليل السابق محفوظاً." : "No demo result was used; the previous result remains."), variant: "destructive" }) })}>{isArabic ? "تأكيد واستهلاك الرصيد" : "Confirm and use credit"}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Link href={`/contracts/${id}/ask`} className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white"><MessageSquare className="me-2 h-4 w-4" />{isArabic ? "اسأل دليل" : "Ask Daleel"}</Link>
          <Button variant="outline" onClick={handleExport}><Download className="me-2 h-4 w-4" />PDF</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="icon" aria-label="Delete" className="text-red-600"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isArabic ? "حذف العقد نهائياً؟" : "Delete permanently?"}</AlertDialogTitle><AlertDialogDescription>{isArabic ? "لا يمكن التراجع عن الحذف." : "This cannot be undone."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel><AlertDialogAction className="bg-red-600" onClick={() => deleteMutation.mutate({ contractId: id }, { onSuccess: () => navigate("/contracts") })}>{isArabic ? "حذف" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>{isArabic ? "تنبيه قانوني: " : "Legal notice: "}</strong>{isArabic ? "هذا التحليل معلوماتي وليس بديلاً عن استشارة محامٍ مرخص." : "This analysis is informational and is not a substitute for advice from a licensed lawyer."}</p></div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className={`rounded-2xl border p-6 ${riskStyle[risk]}`}><p className="text-sm font-semibold">{isArabic ? "مستوى المخاطر" : "Risk level"}</p><p className="mt-2 text-3xl font-black">{risk === "high" ? (isArabic ? "مرتفع" : "High") : risk === "medium" ? (isArabic ? "متوسط" : "Medium") : (isArabic ? "منخفض" : "Low")}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"><p className="text-sm text-slate-500">{isArabic ? "درجة الوضوح" : "Clarity"}</p><p className="mt-2 text-3xl font-black text-teal-700">{contract.clarityScore ?? "—"}<span className="text-base">/100</span></p>{contract.confidence != null && <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{isArabic ? "ثقة التحليل" : "Analysis confidence"}: {Math.round(contract.confidence * 100)}%</p>}<p className="mt-2 text-sm text-slate-500">{contract.clarityExplanation}</p></div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 dark:border-teal-900/50 dark:bg-teal-950/30"><p className="text-sm font-semibold text-teal-800 dark:text-teal-200">{isArabic ? "الخطوة التالية" : "Next action"}</p><p className="mt-2 font-bold leading-7 text-teal-950 dark:text-teal-100">{nextAction?.recommendedAction || (isArabic ? "راجع الملخص والبنود المهمة." : "Review the summary and key clauses.")}</p>{nextAction?.deadline && <p className="mt-2 text-sm text-teal-700">{isArabic ? "قبل" : "By"}: {nextAction.deadline}</p>}</div>
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl p-1">
          <TabsTrigger value="overview"><FileText className="me-2 h-4 w-4" />{isArabic ? "نظرة عامة" : "Overview"}</TabsTrigger>
          <TabsTrigger value="risks"><AlertTriangle className="me-2 h-4 w-4" />{isArabic ? "أهم المخاطر" : "Top risks"}</TabsTrigger>
          <TabsTrigger value="actions"><Sparkles className="me-2 h-4 w-4" />{isArabic ? "خطة العمل" : "Action plan"}</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="me-2 h-4 w-4" />{isArabic ? "المالية" : "Financial"}</TabsTrigger>
          <TabsTrigger value="dates"><Calendar className="me-2 h-4 w-4" />{isArabic ? "التواريخ" : "Dates"}</TabsTrigger>
          <TabsTrigger value="cancellation"><XOctagon className="me-2 h-4 w-4" />{isArabic ? "الإلغاء والتجديد" : "Cancellation"}</TabsTrigger>
          <TabsTrigger value="clauses"><Shield className="me-2 h-4 w-4" />{isArabic ? "كل البنود" : "All clauses"}</TabsTrigger>
        </TabsList>
        <div className="mt-4 min-h-96 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 md:p-8">
          <TabsContent value="overview" className="m-0 space-y-7"><div><h2 className="text-xl font-bold">{isArabic ? "الملخص التنفيذي" : "Executive summary"}</h2><p className="mt-3 rounded-xl bg-slate-50 p-5 text-lg leading-8 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">{contract.summary}</p></div><div><h3 className="font-bold">{isArabic ? "أهم ثلاثة مخاطر" : "Top three risks"}</h3><div className="mt-3 space-y-3">{highRisks.length ? highRisks.map((item) => <ClauseCard key={item.id} clause={item} language={language} />) : <p className="text-slate-500">{isArabic ? "لم تظهر مخاطر مرتفعة." : "No high risks were found."}</p>}</div></div></TabsContent>
          <TabsContent value="risks" className="m-0 space-y-4">{clauses.filter((item) => item.riskLevel !== "low").map((item) => <ClauseCard key={item.id} clause={item} language={language} />)}</TabsContent>
          <TabsContent value="actions" className="m-0 space-y-4">{actionPlan.length ? actionPlan.map((item, index) => <article key={`${item.recommendedAction}-${index}`} className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge variant="outline">{item.priority}</Badge><h3 className="mt-3 text-lg font-bold">{item.recommendedAction}</h3><p className="mt-2 text-slate-600 dark:text-slate-300">{item.rationale}</p>{item.deadline && <p className="mt-2 font-semibold text-teal-700">{isArabic ? "الموعد" : "Deadline"}: {item.deadline}</p>}</div>{item.reminderSuggested && item.deadline && item.reminderTitle && item.reminderType && <AlertDialog><AlertDialogTrigger asChild><Button variant="outline"><Calendar className="me-2 h-4 w-4" />{isArabic ? "إنشاء تذكير" : "Create reminder"}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isArabic ? "إنشاء هذا التذكير؟" : "Create this reminder?"}</AlertDialogTitle><AlertDialogDescription>{isArabic ? `لن يُنشأ شيء تلقائياً. بعد موافقتك سيُحفظ التذكير بتاريخ ${item.deadline}.` : `Nothing is created automatically. After confirmation, the reminder will be saved for ${item.deadline}.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{isArabic ? "إلغاء" : "Cancel"}</AlertDialogCancel><AlertDialogAction onClick={() => createReminder(item)}>{isArabic ? "تأكيد إنشاء التذكير" : "Confirm reminder"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</div><ConfidenceEvidence sourceText={item.sourceText} confidence={item.confidence} language={language} /></article>) : <p className="text-slate-500">{isArabic ? "لا توجد خطة عمل محفوظة لهذا التحليل القديم. أعد التحليل فقط إذا رغبت واستهلك رصيد API." : "No action plan is stored for this older analysis."}</p>}</TabsContent>
          <TabsContent value="financial" className="m-0"><div className="grid gap-4 md:grid-cols-2">{contract.financialDetails?.length ? contract.financialDetails.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><Badge variant="outline">{item.type}</Badge><p className="mt-3 text-2xl font-black text-teal-700">{item.amount.toLocaleString()} {item.currency}</p><p className="mt-2 text-slate-600 dark:text-slate-300">{item.description}</p><ConfidenceEvidence sourceText={item.sourceText} confidence={item.confidence} sourcePage={item.sourcePage} language={language} /></article>) : <p className="text-slate-500">{isArabic ? "لم يُعثر على تفاصيل مالية محددة." : "No financial details were found."}</p>}</div></TabsContent>
          <TabsContent value="dates" className="m-0 space-y-4">{contract.contractDates?.length ? contract.contractDates.map((item) => <DateCard key={item.id} item={item} language={language} />) : <p className="text-slate-500">{isArabic ? "لم يُعثر على تواريخ محددة." : "No dates found."}</p>}</TabsContent>
          <TabsContent value="cancellation" className="m-0 space-y-4">{clauses.filter((item) => ["cancellation", "renewal"].includes(item.category)).length ? clauses.filter((item) => ["cancellation", "renewal"].includes(item.category)).map((item) => <ClauseCard key={item.id} clause={item} language={language} />) : <p className="text-slate-500">{isArabic ? "لم يُعثر على شروط إلغاء أو تجديد محددة." : "No cancellation or renewal terms were found."}</p>}</TabsContent>
          <TabsContent value="clauses" className="m-0 space-y-7">{["right", "obligation", "missing_clause", "recommendation"].map((category) => { const items = clauses.filter((item) => item.category === category); if (!items.length) return null; return <section key={category}><h3 className="mb-3 text-lg font-bold">{categoryTitle[category]}</h3><div className="space-y-3">{items.map((item) => <ClauseCard key={item.id} clause={item} language={language} />)}</div></section>; })}<section><h3 className="mb-3 text-lg font-bold">{isArabic ? "بنود أخرى" : "Other clauses"}</h3><div className="space-y-3">{clauses.filter((item) => !["right", "obligation", "missing_clause", "recommendation"].includes(item.category)).map((item) => <ClauseCard key={item.id} clause={item} language={language} />)}</div></section></TabsContent>
        </div>
      </Tabs>
      <div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-teal-600" />{isArabic ? "يعرض دليل الأدلة النصية ودرجة الثقة لتسهيل مراجعتك، ولا يصدر حكماً قانونياً." : "Daleel shows source evidence and confidence for review; it does not make legal judgments."}</div>
    </div>
  );
}
