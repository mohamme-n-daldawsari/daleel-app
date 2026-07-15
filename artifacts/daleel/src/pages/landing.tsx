import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { FileText, Shield, Zap, Search, ChevronLeft, ChevronRight, Globe, Lock } from "lucide-react";
import { useApp } from "@/components/app-provider";

export default function LandingPage() {
  const { t, language } = useTranslation();
  const { setLanguage } = useApp();

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const isRtl = language === "ar";
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-teal-900 selection:text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 h-20 bg-background/80 backdrop-blur-lg z-50 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container h-full mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-600/20">
              د
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
              دليل <span className="text-teal-600 opacity-60">|</span> Daleel
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-full">
              <Globe className="w-5 h-5 text-slate-600" />
            </Button>
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                {t("nav.signin")}
              </Link>
              <Link href="/sign-up" className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white shadow transition-colors hover:bg-slate-900/90 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90">
                {t("nav.signup")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-100/40 via-background to-background dark:from-teal-900/20"></div>
          
          <div className="container relative mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 mb-8 text-sm text-teal-600 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-400">
              <span className="flex h-2 w-2 rounded-full bg-teal-600 mr-2 rtl:ml-2 rtl:mr-0"></span>
              {language === 'ar' ? 'أداة تحليل العقود الأذكى في العالم العربي' : 'The smartest contract analyzer for the Arab world'}
            </div>
            
            <h1 className="max-w-4xl mx-auto text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.15]">
              {language === 'ar' ? (
                <>افهم قبل أن <span className="text-transparent bg-clip-text bg-gradient-to-br from-teal-600 to-teal-400">توافق</span></>
              ) : (
                <>Understand before you <span className="text-transparent bg-clip-text bg-gradient-to-br from-teal-600 to-teal-400">agree</span></>
              )}
            </h1>
            
            <p className="max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
              {t("home.hero.subtitle")}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up" className="inline-flex h-14 items-center justify-center rounded-full bg-teal-600 px-8 text-base font-medium text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:scale-105 active:scale-95 w-full sm:w-auto group">
                {t("home.hero.cta")}
                <ArrowIcon className="ml-2 rtl:mr-2 rtl:ml-0 w-5 h-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
              <Link href="/about" className="inline-flex h-14 items-center justify-center rounded-full bg-white dark:bg-slate-900 px-8 text-base font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto">
                {language === 'ar' ? 'كيف يعمل؟' : 'How it works'}
              </Link>
            </div>

            {/* Demo Credentials */}
            <div className="mt-16 mx-auto max-w-md p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left rtl:text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {language === 'ar' ? 'حسابات تجريبية' : 'Demo Credentials'}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-sm"><span className="text-slate-400">User:</span> <span className="font-mono text-slate-700 dark:text-slate-300">user@daleel.app</span></div>
                  <div className="text-sm"><span className="text-slate-400">Pass:</span> <span className="font-mono text-slate-700 dark:text-slate-300">demo1234</span></div>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-sm"><span className="text-slate-400">Admin:</span> <span className="font-mono text-slate-700 dark:text-slate-300">admin@daleel.app</span></div>
                  <div className="text-sm"><span className="text-slate-400">Pass:</span> <span className="font-mono text-slate-700 dark:text-slate-300">admin1234</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {language === 'ar' ? 'تحليل فوري' : 'Instant Analysis'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {language === 'ar' ? 'ارفع عقدك بصيغة PDF أو صورة، وسيقوم الذكاء الاصطناعي بقراءته وتحليله في ثوانٍ معدودة.' : 'Upload your contract as PDF or image, and our AI will read and analyze it in seconds.'}
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center mb-6">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {language === 'ar' ? 'كشف البنود الخفية' : 'Spot Hidden Clauses'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {language === 'ar' ? 'نسلط الضوء على بنود التجديد التلقائي، غرامات الإلغاء، وأي شروط قد تكون مجحفة بحقك.' : 'We highlight auto-renewal clauses, cancellation penalties, and any unfair terms.'}
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center mb-6">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {language === 'ar' ? 'خصوصية تامة' : 'Total Privacy'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {language === 'ar' ? 'عقودك مشفرة ولا يتم مشاركتها أبداً. نحن لا نستخدم بياناتك لتدريب نماذج الذكاء الاصطناعي.' : 'Your contracts are encrypted and never shared. We do not use your data to train AI models.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contract Types */}
        <section className="py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                {language === 'ar' ? 'ندعم جميع أنواع العقود' : 'We support all contract types'}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {language === 'ar' ? 'سواء كان عقداً شخصياً أو تجارياً، دليل مصمم ليفهم المصطلحات القانونية المعقدة.' : 'Whether personal or business, Daleel is designed to understand complex legal jargon.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                { id: "rental_agreement", icon: "🏠" },
                { id: "employment_contract", icon: "💼" },
                { id: "gym_membership", icon: "🏋️" },
                { id: "telecom_contract", icon: "📱" },
                { id: "software_subscription", icon: "💻" },
                { id: "service_agreement", icon: "🤝" },
                { id: "insurance_policy", icon: "🛡️" },
                { id: "car_financing", icon: "🚗" },
                { id: "travel_terms", icon: "✈️" },
                { id: "education_contract", icon: "🎓" },
              ].map((type) => (
                <div key={type.id} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-3xl mb-3">{type.icon}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-center text-sm">
                    {t(`type.${type.id}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Trust Section */}
        <section className="py-20 bg-teal-900 text-white">
          <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center">
            <Lock className="w-12 h-12 text-teal-300 mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              {language === 'ar' ? 'أمان بمستوى بنكي' : 'Bank-grade Security'}
            </h2>
            <p className="text-teal-100 max-w-2xl text-lg mb-8">
              {language === 'ar' 
                ? 'نحن نأخذ خصوصيتك بجدية مطلقة. جميع الملفات يتم تشفيرها أثناء النقل والتخزين. يتم حذف عقودك تلقائياً إذا طلبت ذلك، ولا أحد يستطيع الوصول إليها غيرك.' 
                : 'We take your privacy with absolute seriousness. All files are encrypted in transit and at rest. Your contracts are automatically deleted upon request, and no one can access them but you.'}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="w-6 h-6 rounded-md bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs">
              د
            </div>
            <span className="font-medium">Daleel © {new Date().getFullYear()}</span>
          </div>
          
          <div className="text-sm text-slate-400 text-center max-w-lg">
            {language === 'ar' 
              ? 'إخلاء مسؤولية: دليل هي أداة مساعدة تعتمد على الذكاء الاصطناعي ولا تغني عن الاستشارة القانونية المهنية المتخصصة.' 
              : 'Disclaimer: Daleel is an AI-powered assistive tool and does not replace specialized professional legal advice.'}
          </div>
        </div>
      </footer>
    </div>
  );
}
