import React from "react";
import { useTranslation } from "@/lib/i18n";
import { useGetActivityLogs } from "@workspace/api-client-react";
import { Activity, Clock, FileText, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLogs() {
  const { language } = useTranslation();
  const dateLocale = language === "ar" ? ar : enUS;

  const { data: logs, isLoading } = useGetActivityLogs({ limit: 50 });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-teal-600" />
          {language === 'ar' ? 'سجل النشاطات' : 'Activity Logs'}
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden p-6 md:p-8">
        <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
          {isLoading ? (
             <div className="space-y-8">
               {[1,2,3,4].map(i => (
                 <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_0_4px_rgba(255,255,255,1)] dark:shadow-[0_0_0_4px_rgba(2,6,23,1)] z-10" />
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                 </div>
               ))}
             </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {language === 'ar' ? 'لا توجد نشاطات مسجلة' : 'No activities recorded'}
            </div>
          ) : (
            <div className="space-y-8">
              {logs.map((log, i) => {
                const isContract = log.entityType === 'contract';
                const Icon = isContract ? FileText : User;
                const iconColor = isContract ? 'text-teal-600 bg-teal-100 dark:bg-teal-900/40' : 'text-blue-600 bg-blue-100 dark:bg-blue-900/40';

                return (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 dark:text-white capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center text-xs text-slate-400 font-medium">
                          <Clock className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          {format(parseISO(log.createdAt), "MMM d, HH:mm", { locale: dateLocale })}
                        </div>
                      </div>
                      
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex flex-col gap-1">
                        {log.userEmail && (
                          <div className="flex items-center gap-1.5">
                            <span className="opacity-60">{language === 'ar' ? 'بواسطة:' : 'By:'}</span>
                            <span className="font-medium text-slate-900 dark:text-white">{log.userEmail}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="opacity-60">{language === 'ar' ? 'الكيان:' : 'Target:'}</span>
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">{log.entityType} #{log.entityId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
