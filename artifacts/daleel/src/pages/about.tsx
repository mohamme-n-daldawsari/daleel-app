import React from "react";
import { useTranslation } from "@/lib/i18n";
import { Shield, Brain, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  const { language } = useTranslation();
  const isRtl = language === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => window.history.back()} className="rounded-full pl-2 pr-4 rtl:pr-2 rtl:pl-4">
          <BackIcon className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {language === 'ar' ? 'رجوع' : 'Back'}
        </Button>
      </div>

      <div className="text-center mb-16">
        <div className="w-20 h-20 rounded-3xl bg-teal-600 flex items-center justify-center text-white font-bold text-4xl mx-auto mb-6 shadow-xl shadow-teal-600/20">
          د
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
          عن دليل | About Daleel
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          {language === 'ar' 
            ? 'المنصة العربية الأولى المتخصصة في تحليل العقود بالذكاء الاصطناعي لحماية حقوقك.' 
            : 'The first Arab platform specialized in AI contract analysis to protect your rights.'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mx-auto flex items-center justify-center mb-6">
            <Brain className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg mb-3">
            {language === 'ar' ? 'ذكاء اصطناعي متخصص' : 'Specialized AI'}
          </h3>
          <p className="text-slate-500">
            {language === 'ar' 
              ? 'نماذجنا مدربة خصيصاً على فهم المصطلحات القانونية باللغتين العربية والإنجليزية.' 
              : 'Our models are specifically trained to understand legal terminology in both Arabic and English.'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 mx-auto flex items-center justify-center mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg mb-3">
            {language === 'ar' ? 'حماية من الاستغلال' : 'Protection from Exploitation'}
          </h3>
          <p className="text-slate-500">
            {language === 'ar' 
              ? 'نكتشف البنود المجحفة والتجديدات التلقائية الخفية قبل أن توقع عليها وتتورط.' 
              : 'We detect unfair clauses and hidden auto-renewals before you sign and get stuck.'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 mx-auto flex items-center justify-center mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg mb-3">
            {language === 'ar' ? 'خصوصية صارمة' : 'Strict Privacy'}
          </h3>
          <p className="text-slate-500">
            {language === 'ar' 
              ? 'ملفاتك لك وحدك. لا تُستخدم لتدريب النماذج العامة، ويمكنك حذفها نهائياً بضغطة زر.' 
              : 'Your files are yours alone. They are not used to train public models, and can be permanently deleted instantly.'}
          </p>
        </div>
      </div>
      
      <div className="bg-teal-900 text-white rounded-3xl p-10 md:p-16 text-center">
        <h2 className="text-3xl font-bold mb-6">
          {language === 'ar' ? 'مهمتنا' : 'Our Mission'}
        </h2>
        <p className="text-teal-100 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
          {language === 'ar'
            ? 'بناء ثقافة قانونية شفافة حيث يفهم الأفراد العاديون التزاماتهم تماماً كما تفهمها الشركات الكبرى التي صاغت العقد. المعرفة قوة، ودليل هو أداة تمكينك.'
            : 'Building a transparent legal culture where individuals understand their obligations just as well as the corporations that drafted the contract. Knowledge is power, and Daleel is your tool of empowerment.'}
        </p>
      </div>
    </div>
  );
}
