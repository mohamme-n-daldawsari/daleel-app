import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useListContracts, useCompareContracts } from "@workspace/api-client-react";
import { Scale, ArrowRightLeft, Check, X, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CompareContracts() {
  const { language } = useTranslation();
  const isRtl = language === "ar";
  
  const [contractA, setContractA] = useState<string>("");
  const [contractB, setContractB] = useState<string>("");

  const { data: contracts } = useListContracts();
  const compareMutation = useCompareContracts();

  const handleCompare = () => {
    if (!contractA || !contractB || contractA === contractB) return;
    
    compareMutation.mutate({
      data: {
        contractIdA: parseInt(contractA),
        contractIdB: parseInt(contractB)
      }
    });
  };

  const getAdvantageStyle = (adv: 'a' | 'b' | 'neutral', side: 'a' | 'b') => {
    if (adv === 'neutral') return "bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300";
    if (adv === side) return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-medium shadow-sm";
    return "bg-slate-50 dark:bg-slate-900/50 text-slate-500 opacity-60";
  };

  const getAdvantageIcon = (adv: 'a' | 'b' | 'neutral', side: 'a' | 'b') => {
    if (adv === 'neutral') return <Minus className="w-4 h-4 text-slate-400" />;
    if (adv === side) return <Check className="w-5 h-5 text-emerald-600" />;
    return <X className="w-4 h-4 text-slate-300" />;
  };

  const analyzedContracts = contracts?.filter(c => c.status === 'analyzed') || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {language === 'ar' ? 'مقارنة العقود' : 'Compare Contracts'}
        </h1>
        <p className="text-slate-500 mt-1">
          {language === 'ar' 
            ? 'قارن بين عقدين جنباً إلى جنب لاكتشاف الفروقات الجوهرية واختيار العرض الأفضل.' 
            : 'Compare two contracts side-by-side to spot key differences and choose the better deal.'}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              {language === 'ar' ? 'العقد الأول' : 'First Contract'}
            </label>
            <Select value={contractA} onValueChange={setContractA}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900">
                <SelectValue placeholder={language === 'ar' ? 'اختر عقداً' : 'Select a contract'} />
              </SelectTrigger>
              <SelectContent>
                {analyzedContracts.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0 mt-6 hidden md:flex">
            <ArrowRightLeft className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              {language === 'ar' ? 'العقد الثاني' : 'Second Contract'}
            </label>
            <Select value={contractB} onValueChange={setContractB}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900">
                <SelectValue placeholder={language === 'ar' ? 'اختر عقداً للمقارنة' : 'Select contract to compare'} />
              </SelectTrigger>
              <SelectContent>
                {analyzedContracts.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} disabled={c.id.toString() === contractA}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleCompare}
            disabled={!contractA || !contractB || contractA === contractB || compareMutation.isPending}
            className="w-full md:w-auto h-12 mt-0 md:mt-7 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8"
          >
            {compareMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scale className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />}
            {language === 'ar' ? 'قارن الآن' : 'Compare Now'}
          </Button>
        </div>
      </div>

      {compareMutation.data && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-teal-900 dark:text-teal-300 mb-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-200 dark:bg-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-200">د</div>
              {language === 'ar' ? 'ملخص المقارنة (رأي دليل)' : 'Comparison Summary (Daleel\'s Take)'}
            </h3>
            <p className="text-teal-800 dark:text-teal-100 leading-relaxed text-lg">
              {compareMutation.data.aiSummary}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 divide-x rtl:divide-x-reverse divide-slate-200 dark:divide-slate-800">
              <div className="p-4 font-bold text-slate-500 text-center">
                {language === 'ar' ? 'وجه المقارنة' : 'Comparison Point'}
              </div>
              <div className="p-4 text-center font-bold text-slate-900 dark:text-white line-clamp-1">
                {compareMutation.data.contractA.title}
              </div>
              <div className="p-4 text-center font-bold text-slate-900 dark:text-white line-clamp-1">
                {compareMutation.data.contractB.title}
              </div>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {compareMutation.data.differences.map((diff, i) => (
                <div key={i} className="grid grid-cols-3 divide-x rtl:divide-x-reverse divide-slate-100 dark:divide-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <div className="p-4 flex items-center justify-center text-center font-medium text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? diff.labelAr : diff.labelEn}
                  </div>
                  <div className="p-2 md:p-4">
                    <div className={`h-full p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 ${getAdvantageStyle(diff.advantage, 'a')}`}>
                      {getAdvantageIcon(diff.advantage, 'a')}
                      <span>{diff.valueA}</span>
                    </div>
                  </div>
                  <div className="p-2 md:p-4">
                    <div className={`h-full p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 ${getAdvantageStyle(diff.advantage, 'b')}`}>
                      {getAdvantageIcon(diff.advantage, 'b')}
                      <span>{diff.valueB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
