import React from "react";
import { useParams, Link, useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import {
  getExportContractQueryKey,
  getGetContractQueryKey,
  useAnalyzeContract,
  useDeleteContract,
  useExportContract,
  useGetContract,
} from "@workspace/api-client-react";
import { 
  FileText, Download, Trash2, ArrowLeft, ArrowRight, MessageSquare,
  AlertTriangle, Calendar, DollarSign, XOctagon, CheckCircle2,
  Shield, FileQuestion,
  RefreshCcw, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const data = (error as { data?: unknown }).data;
  if (data && typeof data === "object") {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export default function ContractReport() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [, nav] = useLocation();
  
  const isRtl = language === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const dateLocale = isRtl ? ar : enUS;

  const { data: contract, isLoading } = useGetContract(id, {
    query: { enabled: !!id, queryKey: getGetContractQueryKey(id) },
  });
  const deleteMutation = useDeleteContract();
  const analyzeMutation = useAnalyzeContract();
  
  // Note: we fetch on demand when Export is clicked
  const exportMutation = useExportContract(id, 'pdf', {
    query: {
      enabled: false,
      queryKey: getExportContractQueryKey(id, 'pdf'),
    },
    request: { responseType: 'blob' },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ contractId: id }, {
      onSuccess: () => {
        toast({ title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully' });
        nav('/contracts');
      }
    });
  };

  const handleExport = () => {
    exportMutation.refetch().then((res) => {
      if (res.data) {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
      }
    }).catch(() => {
      toast({
        title: language === 'ar' ? 'فشل تصدير التقرير' : 'Report export failed',
        variant: 'destructive',
      });
    });
  };

  const handleReanalyze = () => {
    analyzeMutation.mutate(
      {
        contractId: id,
        data: {
          explanationLevel: "standard",
          outputLanguage: "ar",
          force: true,
        },
      },
      {
        onSuccess: (updatedContract) => {
          queryClient.setQueryData(getGetContractQueryKey(id), updatedContract);
          toast({
            title: language === "ar" ? "اكتملت إعادة التحليل" : "Re-analysis complete",
            description:
              language === "ar"
                ? "تم استبدال التحليل السابق وحفظ النتيجة الجديدة."
                : "The previous analysis was replaced and the new result was saved.",
          });
        },
        onError: (error) => {
          toast({
            title: language === "ar" ? "فشلت إعادة التحليل" : "Re-analysis failed",
            description: getApiErrorMessage(
              error,
              language === "ar"
                ? "تعذر الاتصال بخدمة OpenAI. بقي التحليل السابق محفوظاً ولم تُستخدم نتيجة تجريبية."
                : "OpenAI could not complete the request. The previous analysis remains saved and no demo result was used.",
            ),
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading) {
    return <div className="space-y-6 animate-pulse p-4">
      <Skeleton className="h-12 w-3/4 rounded-xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>;
  }

  if (!contract) return <div>Not found</div>;

  const cancellationClauses =
    contract.clauses?.filter((clause) =>
      ["cancellation", "renewal"].includes(clause.category),
    ) ?? [];
  const rightsAndDuties =
    contract.clauses?.filter((clause) =>
      ["right", "obligation", "missing_clause", "recommendation"].includes(
        clause.category,
      ),
    ) ?? [];

  const scoreColor = contract.clarityScore && contract.clarityScore >= 80 ? 'text-emerald-500' 
                   : contract.clarityScore && contract.clarityScore >= 50 ? 'text-amber-500' 
                   : 'text-red-500';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to contracts"
            onClick={() => window.history.back()}
            className="rounded-full bg-slate-100 dark:bg-slate-900"
          >
            <BackIcon className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {contract.title}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-500 text-sm">{t(`type.${contract.contractType}`)}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-500 text-sm">
                {format(parseISO(contract.createdAt), "dd MMMM yyyy", { locale: dateLocale })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={analyzeMutation.isPending}
                className="rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                )}
                {language === "ar" ? "إعادة التحليل" : "Re-analyze"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {language === "ar" ? "إعادة تحليل العقد؟" : "Re-analyze this contract?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {language === "ar"
                    ? "سيؤدي هذا إلى إرسال نص العقد إلى OpenAI، واستهلاك رصيد API، واستبدال التحليل الحالي عند نجاح الطلب. لا يلزم إعادة التحليل لعرض النتيجة المحفوظة."
                    : "This sends the contract text to OpenAI, consumes API credit, and replaces the current analysis if successful. Re-analysis is not required to view the saved result."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReanalyze}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  {language === "ar" ? "تأكيد واستهلاك الرصيد" : "Confirm and use credit"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Link href={`/contracts/${id}/ask`} className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-sm whitespace-nowrap">
            <MessageSquare className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === 'ar' ? 'اسأل دليل' : 'Ask Daleel'}
          </Link>
          <Button variant="outline" onClick={handleExport} className="rounded-xl">
            <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Delete contract"
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?'}</AlertDialogTitle>
                <AlertDialogDescription>
                  {language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء. سيتم حذف العقد وتحليلاته نهائياً.' : 'This action cannot be undone. The contract and its analysis will be permanently deleted.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>{language === "ar" ? "تنبيه قانوني: " : "Legal notice: "}</strong>
          {language === "ar"
            ? "هذا التحليل معلوماتي للمساعدة على فهم العقد، ولا يُعد بديلاً عن استشارة محامٍ مرخص. راجع محامياً مختصاً قبل اتخاذ قرار قانوني أو مالي مهم."
            : "This analysis is informational and helps explain the contract. It is not a substitute for advice from a licensed lawyer. Consult qualified counsel before making important legal or financial decisions."}
        </p>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clarity Score */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
          <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className={`w-full h-full ${scoreColor} opacity-20`}>
              <path strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
            <svg viewBox="0 0 36 36" className={`w-full h-full absolute top-0 left-0 ${scoreColor}`}>
              <path strokeDasharray={`${contract.clarityScore || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="absolute text-xl font-bold text-slate-900 dark:text-white">{contract.clarityScore}</div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
              {language === 'ar' ? 'مؤشر الوضوح' : 'Clarity Score'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {contract.clarityExplanation || (language === 'ar' ? 'تقييم الذكاء الاصطناعي لمدى وضوح العقد.' : 'AI evaluation of how clear the contract is.')}
            </p>
          </div>
        </div>

        {/* Status / Auto Renewal */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${contract.automaticRenewal ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
              <RefreshCcw className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {language === 'ar' ? 'التجديد التلقائي' : 'Auto Renewal'}
            </h3>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {contract.automaticRenewal 
              ? <span className="text-amber-600">{language === 'ar' ? 'نعم، يتجدد تلقائياً' : 'Yes, renews automatically'}</span> 
              : <span className="text-emerald-600">{language === 'ar' ? 'لا يتجدد' : 'No, does not renew'}</span>}
          </div>
        </div>

        {/* Cost / Value */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {language === 'ar' ? 'التكلفة الإجمالية' : 'Total Cost'}
            </h3>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {contract.totalCost ? `${contract.totalCost.toLocaleString()} ${contract.currency || 'SAR'}` : '---'}
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="w-full mt-8">
        <TabsList className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl w-full flex overflow-x-auto overflow-y-hidden hide-scrollbar">
          {[
            { id: "overview", ar: "نظرة عامة", en: "Overview", icon: FileText },
            { id: "alerts", ar: "تنبيهات هامة", en: "Important Alerts", icon: AlertTriangle },
            { id: "financial", ar: "مالية", en: "Financial", icon: DollarSign },
            { id: "dates", ar: "تواريخ", en: "Dates", icon: Calendar },
            { id: "cancellation", ar: "إلغاء وتجديد", en: "Cancellation", icon: XOctagon },
            { id: "rights", ar: "حقوق وواجبات", en: "Rights & Duties", icon: Shield },
          ].map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="rounded-lg px-4 py-2.5 whitespace-nowrap">
              <tab.icon className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 opacity-70" />
              {language === 'ar' ? tab.ar : tab.en}
              {tab.id === 'alerts' && contract.clauses?.some(c => c.riskLevel === 'high') && (
                <span className="ml-2 rtl:mr-2 rtl:ml-0 flex w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl mt-4 min-h-[400px]">
          
          <TabsContent value="overview" className="m-0 p-6 md:p-8 outline-none">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-xl font-bold mb-4">{language === 'ar' ? 'الملخص والتفاصيل' : 'Summary & Details'}</h3>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 mb-8 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                {contract.summary}
              </div>

              {contract.parties && contract.parties.length > 0 && (
                <>
                  <h4 className="text-lg font-bold mb-4">{language === 'ar' ? 'أطراف العقد' : 'Contract Parties'}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {contract.parties.map(p => (
                      <div key={p.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col">
                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">{p.role}</span>
                        <span className="font-semibold text-slate-900 dark:text-white text-lg">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="m-0 p-6 md:p-8 outline-none">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {language === 'ar' ? 'بنود تستدعي الانتباه' : 'Clauses Requiring Attention'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {language === 'ar' ? 'مخاطر وشروط خفية وجدها الذكاء الاصطناعي.' : 'Risks and hidden terms found by AI.'}
                  </p>
                </div>
              </div>

              {contract.clauses?.filter(c => c.riskLevel === 'high' || c.riskLevel === 'medium').length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    {language === 'ar' ? 'لم يتم العثور على مخاطر عالية في هذا العقد.' : 'No high risks found in this contract.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {contract.clauses?.filter(c => c.riskLevel === 'high' || c.riskLevel === 'medium').map((clause) => (
                    <div key={clause.id} className={`p-5 rounded-xl border relative overflow-hidden ${
                      clause.riskLevel === 'high' 
                        ? 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10' 
                        : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10'
                    }`}>
                      <div className={`absolute top-0 right-0 rtl:left-0 rtl:right-auto w-1 h-full ${
                        clause.riskLevel === 'high' ? 'bg-red-500' : 'bg-amber-500'
                      }`}></div>
                      
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`font-bold text-lg ${
                          clause.riskLevel === 'high' ? 'text-red-900 dark:text-red-300' : 'text-amber-900 dark:text-amber-300'
                        }`}>
                          {clause.title}
                        </h4>
                        {clause.sourcePage && (
                          <span className="text-xs font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                            {language === 'ar' ? 'صفحة ' : 'Page '}{clause.sourcePage}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        {clause.simpleExplanation}
                      </p>
                      {clause.sourceText && (
                        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                          <p className="text-xs text-slate-500 mb-1">{language === 'ar' ? 'النص الأصلي:' : 'Source Text:'}</p>
                          <p className="text-sm font-serif italic text-slate-600 dark:text-slate-400 border-l-2 rtl:border-l-0 rtl:border-r-2 border-slate-300 dark:border-slate-700 pl-3 rtl:pr-3 rtl:pl-0">
                            "{clause.sourceText}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Additional tabs would be fully implemented similarly based on contract.financialDetails, contractDates etc. */}
          <TabsContent value="financial" className="m-0 p-6 md:p-8 outline-none">
            <h3 className="text-xl font-bold mb-6">{language === 'ar' ? 'التفاصيل المالية' : 'Financial Details'}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {contract.financialDetails?.map(fd => (
                <div key={fd.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-slate-500 text-sm mb-1">{fd.type}</div>
                    <div className="font-bold text-xl">{fd.amount.toLocaleString()} {fd.currency}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-teal-600" />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="dates" className="m-0 p-6 md:p-8 outline-none">
            <h3 className="text-xl font-bold mb-6">
              {language === "ar" ? "التواريخ والمواعيد المهمة" : "Important dates and deadlines"}
            </h3>
            {contract.contractDates?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {contract.contractDates.map((contractDate) => (
                  <div key={contractDate.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-900 dark:text-white">{contractDate.type}</span>
                      <time className="font-mono text-sm text-teal-700 dark:text-teal-300">{contractDate.date}</time>
                    </div>
                    {contractDate.description && <p className="text-sm text-slate-600 dark:text-slate-400">{contractDate.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">{language === "ar" ? "لم تُستخرج تواريخ مؤكدة من العقد." : "No confirmed dates were extracted."}</p>
            )}
          </TabsContent>
          
          <TabsContent value="cancellation" className="m-0 p-6 md:p-8 outline-none">
            <h3 className="text-xl font-bold mb-6">
              {language === "ar" ? "الإلغاء والتجديد" : "Cancellation and renewal"}
            </h3>
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <div className="text-sm text-slate-500">{language === "ar" ? "مهلة إشعار الإلغاء" : "Cancellation notice"}</div>
                <div className="mt-1 font-bold">{contract.cancellationNoticeDays == null ? "—" : `${contract.cancellationNoticeDays} ${language === "ar" ? "يوماً" : "days"}`}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <div className="text-sm text-slate-500">{language === "ar" ? "غرامة الإلغاء المبكر" : "Early cancellation penalty"}</div>
                <div className="mt-1 font-bold">{contract.earlyCancellationPenalty == null ? "—" : `${contract.earlyCancellationPenalty.toLocaleString()} ${contract.currency ?? ""}`}</div>
              </div>
            </div>
            <div className="space-y-4">
              {cancellationClauses.length ? cancellationClauses.map((clause) => (
                <div key={clause.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h4 className="font-bold">{clause.title}</h4>
                  <p className="mt-2 text-slate-600 dark:text-slate-300">{clause.simpleExplanation}</p>
                  {clause.sourceText && <blockquote className="mt-3 border-s-2 border-slate-300 ps-3 text-sm italic text-slate-500">{clause.sourceText}</blockquote>}
                </div>
              )) : <p className="text-slate-500">{language === "ar" ? "لم تُستخرج شروط إلغاء أو تجديد واضحة." : "No clear cancellation or renewal terms were extracted."}</p>}
            </div>
          </TabsContent>
          
          <TabsContent value="rights" className="m-0 p-6 md:p-8 outline-none">
            <h3 className="text-xl font-bold mb-6">
              {language === "ar" ? "الحقوق والالتزامات والنواقص والتوصيات" : "Rights, obligations, gaps, and recommendations"}
            </h3>
            <div className="space-y-4">
              {rightsAndDuties.length ? rightsAndDuties.map((clause) => (
                <div key={clause.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold">{clause.title}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-800">{clause.category}</span>
                  </div>
                  <p className="mt-2 text-slate-600 dark:text-slate-300">{clause.simpleExplanation}</p>
                  {clause.sourceText && <blockquote className="mt-3 border-s-2 border-slate-300 ps-3 text-sm italic text-slate-500">{clause.sourceText}</blockquote>}
                </div>
              )) : <p className="text-slate-500">{language === "ar" ? "لم تُستخرج عناصر إضافية في هذه الفئات." : "No additional items were extracted for these categories."}</p>}
            </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
