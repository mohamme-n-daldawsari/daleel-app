import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useAnalyzeContract, useGetContract, getGetContractQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { 
  FileText, Search, Fingerprint, Calculator, 
  RefreshCcw, ShieldAlert, CheckCircle, XCircle, AlertTriangle, Loader2,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProcessingContract() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [activeStep, setActiveStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysisRequested = useRef(false);
  const analyzeMutation = useAnalyzeContract();

  // Poll every 2 seconds if status is processing or pending
  const { data: contract, error } = useGetContract(id, { 
    query: { 
      queryKey: getGetContractQueryKey(id),
      refetchInterval: (query) => {
        const state = query.state.data;
        if (state && (state.status === 'analyzed' || state.status === 'failed')) {
          return false;
        }
        return 2000;
      }
    } 
  });

  const steps = [
    { icon: FileText, ar: "رفع المستند", en: "Uploading document" },
    { icon: Search, ar: "استخراج النص", en: "Extracting text" },
    { icon: Fingerprint, ar: "تحديد نوع العقد", en: "Identifying contract type" },
    { icon: Calculator, ar: "استخراج التفاصيل المالية", en: "Extracting financial details" },
    { icon: RefreshCcw, ar: "البحث عن بنود التجديد والإلغاء", en: "Finding renewal and cancellation clauses" },
    { icon: ShieldAlert, ar: "تقييم المخاطر المهمة", en: "Evaluating important risks" },
    { icon: FileCheck, ar: "إعداد التقرير النهائي", en: "Building the final report" },
  ];

  useEffect(() => {
    if (contract?.status !== "pending" || analysisRequested.current) {
      return;
    }

    analysisRequested.current = true;
    analyzeMutation.mutate(
      {
        contractId: id,
        data: {
          explanationLevel: "standard",
          outputLanguage: language,
        },
      },
      {
        onSuccess: (analyzedContract) => {
          queryClient.setQueryData(
            getGetContractQueryKey(id),
            analyzedContract,
          );
        },
        onError: (error) => {
          const data = error && typeof error === "object"
            ? (error as { data?: unknown }).data
            : null;
          const apiMessage = data && typeof data === "object"
            ? (data as { error?: unknown }).error
            : null;
          setAnalysisError(
            typeof apiMessage === "string"
              ? apiMessage
              : language === "ar"
                ? "تعذر إكمال التحليل بواسطة OpenAI. لم يتم استخدام نتيجة تجريبية."
                : "OpenAI could not complete the analysis. No demo result was used.",
          );
          queryClient.invalidateQueries({
            queryKey: getGetContractQueryKey(id),
          });
        },
      },
    );
  }, [analyzeMutation, contract?.status, id, language]);

  useEffect(() => {
    if (!contract || contract.status === 'failed') {
      return undefined;
    }

    if (contract.status === 'analyzed') {
      setActiveStep(steps.length);
      // Small delay so user sees completion
      const timeout = setTimeout(() => setLocation(`/contracts/${id}`), 1500);
      return () => clearTimeout(timeout);
    }

    // Fake progression animation for processing state
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [contract, id, setLocation]);

  if (error || analyzeMutation.isError || contract?.status === 'failed') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-red-100 text-red-600 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          {language === 'ar' ? 'فشل تحليل العقد' : 'Analysis Failed'}
        </h1>
        <p className="text-slate-500 max-w-md mb-8">
          {analysisError ?? (language === 'ar'
            ? 'حدث خطأ أثناء محاولة الذكاء الاصطناعي قراءة المستند. قد يكون الملف غير واضح أو غير مدعوم.' 
            : 'An error occurred while the AI was trying to read the document. The file might be unclear or unsupported.')}
        </p>
        <div className="flex gap-4">
          <Button onClick={() => setLocation('/contracts/upload')} className="bg-slate-900 dark:bg-white dark:text-slate-900">
            {language === 'ar' ? 'رفع ملف جديد' : 'Upload New File'}
          </Button>
          <Button variant="outline" onClick={() => setLocation('/contracts')}>
            {language === 'ar' ? 'العودة للعقود' : 'Back to Contracts'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="text-center mb-16">
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-teal-100 dark:border-teal-900/50 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="bg-white dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center shadow-sm">
            <span className="font-bold text-2xl text-teal-600">د</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
          {language === 'ar' ? 'جاري تحليل عقدك...' : 'Analyzing your contract...'}
        </h1>
        <p className="text-slate-500">
          {language === 'ar' 
            ? 'يقوم دليل الآن بقراءة وتفنيد كل كلمة في العقد للبحث عن حقوقك والمخاطر المخفية.' 
            : 'Daleel is now reading and breaking down every word in the contract to find your rights and hidden risks.'}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isCompleted = index < activeStep || contract?.status === 'analyzed';
            const isCurrent = index === activeStep && contract?.status !== 'analyzed';
            const Icon = step.icon;
            
            return (
              <div 
                key={index} 
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isCompleted ? 'opacity-100' : isCurrent ? 'opacity-100 scale-105' : 'opacity-40 grayscale'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isCompleted 
                    ? 'bg-teal-600 text-white' 
                    : isCurrent 
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' 
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}>
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className={`w-6 h-6 ${isCurrent ? 'animate-pulse' : ''}`} />}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${
                    isCompleted ? 'text-slate-900 dark:text-white' : isCurrent ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'
                  }`}>
                    {language === 'ar' ? step.ar : step.en}
                  </h3>
                  {isCurrent && (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full animate-[progress_1.5s_ease-in-out_infinite] w-1/2 origin-left rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
