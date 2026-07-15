import React from "react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useGetDashboardSummary, useGetUpcomingAlerts } from "@workspace/api-client-react";
import { 
  FileText, AlertTriangle, RefreshCw, CalendarX, 
  Plus, ChevronLeft, ChevronRight, Clock, ShieldAlert,
  CreditCard, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format, differenceInDays, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export default function Dashboard() {
  const { t, language } = useTranslation();
  const isRtl = language === "ar";
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;
  const dateLocale = isRtl ? ar : enUS;

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: alerts, isLoading: loadingAlerts } = useGetUpcomingAlerts();

  const CHART_COLORS = ['#0F766E', '#1D4ED8', '#B91C1C', '#D97706', '#6D28D9'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("nav.dashboard")}
          </h1>
          <p className="text-slate-500 mt-1">
            {language === 'ar' ? 'نظرة عامة على عقودك والتزاماتك القادمة.' : 'Overview of your contracts and upcoming obligations.'}
          </p>
        </div>
        <Link href="/contracts/upload" className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-6 text-sm font-medium text-white shadow transition-colors hover:bg-teal-700 active:scale-95 whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t("nav.upload")}
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={language === 'ar' ? 'إجمالي العقود' : 'Total Contracts'}
          value={summary?.totalContracts}
          loading={loadingSummary}
          icon={<FileText className="w-5 h-5 text-teal-600" />}
          trend={null}
        />
        <StatCard 
          title={language === 'ar' ? 'مخاطر عالية' : 'High Risks'}
          value={summary?.highRiskCount}
          loading={loadingSummary}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          urgent={summary?.highRiskCount ? summary.highRiskCount > 0 : false}
        />
        <StatCard 
          title={language === 'ar' ? 'تجديد قريب' : 'Upcoming Renewals'}
          value={summary?.upcomingRenewals}
          loading={loadingSummary}
          icon={<RefreshCw className="w-5 h-5 text-amber-600" />}
          urgent={summary?.upcomingRenewals ? summary.upcomingRenewals > 0 : false}
        />
        <StatCard 
          title={language === 'ar' ? 'مواعيد إلغاء' : 'Cancellation Deadlines'}
          value={summary?.upcomingCancellations}
          loading={loadingSummary}
          icon={<CalendarX className="w-5 h-5 text-blue-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Urgent Alerts Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              {language === 'ar' ? 'تنبيهات عاجلة' : 'Urgent Alerts'}
            </h2>
          </div>
          
          {loadingAlerts ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 font-medium text-center">
                {language === 'ar' ? 'لا توجد تنبيهات عاجلة حالياً.' : 'No urgent alerts at the moment.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {alerts.map((alert, idx) => (
                <AlertCard key={idx} alert={alert} language={language} t={t} isRtl={isRtl} dateLocale={dateLocale} />
              ))}
            </div>
          )}
          
          {/* Recent Contracts */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'أحدث العقود' : 'Recent Contracts'}
              </h2>
              <Link href="/contracts" className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center">
                {language === 'ar' ? 'عرض الكل' : 'View all'}
                <ArrowIcon className="w-4 h-4 ml-1 rtl:mr-1 rtl:ml-0" />
              </Link>
            </div>
            
            {loadingSummary ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : summary?.recentContracts?.length ? (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summary.recentContracts.map(contract => (
                    <Link key={contract.id} href={`/contracts/${contract.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{contract.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{t(`type.${contract.contractType}`)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <StatusBadge status={contract.status} language={language} t={t} />
                        <ArrowIcon className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">{language === 'ar' ? 'لم تقم برفع أي عقود بعد.' : 'You have not uploaded any contracts yet.'}</p>
                <Link href="/contracts/upload" className="inline-block mt-4 text-teal-600 font-medium">
                  {language === 'ar' ? 'ارفع أول عقد' : 'Upload your first contract'}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {language === 'ar' ? 'توزيع العقود' : 'Contracts Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Skeleton className="w-48 h-48 rounded-full" />
                </div>
              ) : summary?.contractsByType && summary.contractsByType.length > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.contractsByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="contractType"
                      >
                        {summary.contractsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, t(`type.${name}`)]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
                  {language === 'ar' ? 'لا توجد بيانات كافية' : 'Not enough data'}
                </div>
              )}
              
              {/* Custom Legend */}
              <div className="mt-4 space-y-2">
                {summary?.contractsByType?.map((type, idx) => (
                  <div key={type.contractType} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="text-slate-600 dark:text-slate-300">{t(`type.${type.contractType}`)}</span>
                    </div>
                    <span className="font-medium">{type.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon, trend, urgent = false }: any) {
  return (
    <div className={`p-6 rounded-2xl border ${urgent ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50' : 'border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800'} shadow-sm relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${urgent ? 'bg-red-100 dark:bg-red-900/40' : 'bg-slate-50 dark:bg-slate-900'}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-3xl font-bold ${urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
            {value || 0}
          </div>
        )}
      </div>
      {urgent && (
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-100/50 dark:bg-red-900/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      )}
    </div>
  );
}

function AlertCard({ alert, language, t, isRtl, dateLocale }: any) {
  const isUrgent = alert.daysUntil <= 7;
  const isExpired = alert.daysUntil < 0;
  
  let icon = <Clock className="w-5 h-5" />;
  let colorClass = "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50";
  
  if (alert.alertType === 'renewal') {
    icon = <RefreshCw className="w-5 h-5" />;
    colorClass = isUrgent ? "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50" : colorClass;
  } else if (alert.alertType === 'payment') {
    icon = <CreditCard className="w-5 h-5" />;
    colorClass = "text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/50";
  } else if (alert.alertType === 'cancellation_deadline') {
    icon = <CalendarX className="w-5 h-5" />;
    colorClass = isUrgent ? "text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800/50" : colorClass;
  }

  if (isExpired) {
    colorClass = "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800";
  }

  return (
    <Link href={`/contracts/${alert.contractId}`}>
      <div className={`p-4 rounded-xl border flex items-center justify-between transition-transform hover:-translate-y-0.5 ${colorClass}`}>
        <div className="flex items-center gap-4">
          <div className="p-2 bg-white/60 dark:bg-black/20 rounded-lg">
            {icon}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">{alert.contractTitle}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm opacity-80 font-medium">
                {format(parseISO(alert.date), "dd MMM yyyy", { locale: dateLocale })}
              </span>
              <span className="w-1 h-1 rounded-full bg-current opacity-30" />
              <span className="text-sm opacity-80">
                {getAlertTypeName(alert.alertType, language)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-center bg-white/60 dark:bg-black/20 px-4 py-2 rounded-lg min-w-[80px]">
          {isExpired ? (
            <span className="text-sm font-bold">{language === 'ar' ? 'منتهي' : 'Expired'}</span>
          ) : (
            <>
              <div className="text-xl font-bold leading-none">{alert.daysUntil}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider mt-0.5 opacity-80">
                {language === 'ar' ? 'أيام' : 'Days'}
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status, language, t }: { status: string, language: string, t: any }) {
  switch (status) {
    case 'analyzed':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{t('status.analyzed')}</span>;
    case 'processing':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">{t('status.processing')}</span>;
    case 'failed':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('status.failed')}</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{t('status.pending')}</span>;
  }
}

function getAlertTypeName(type: string, lang: string) {
  const map: Record<string, { ar: string, en: string }> = {
    renewal: { ar: 'موعد التجديد', en: 'Renewal' },
    cancellation_deadline: { ar: 'آخر موعد للإلغاء', en: 'Cancellation Deadline' },
    payment: { ar: 'دفعة مستحقة', en: 'Payment Due' },
    trial_end: { ar: 'نهاية التجربة', en: 'Trial Ends' },
    expiry: { ar: 'انتهاء العقد', en: 'Expiry' }
  };
  return map[type]?.[lang as 'ar' | 'en'] || type;
}