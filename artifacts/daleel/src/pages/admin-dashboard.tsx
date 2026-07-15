import React from "react";
import { useTranslation } from "@/lib/i18n";
import { useGetAdminStats } from "@workspace/api-client-react";
import { 
  Users, FileText, AlertTriangle, Activity, 
  CheckCircle2, XCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function AdminDashboard() {
  const { language } = useTranslation();
  const isRtl = language === "ar";
  
  const { data: stats, isLoading } = useGetAdminStats();

  const CHART_COLORS = ['#0F766E', '#1D4ED8', '#B91C1C', '#D97706', '#6D28D9'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {language === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}
        </h1>
        <p className="text-slate-500 mt-1">
          {language === 'ar' ? 'نظرة عامة على نشاط المنصة والمستخدمين.' : 'Overview of platform activity and users.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
          value={stats?.totalUsers}
          loading={isLoading}
          icon={<Users className="w-5 h-5 text-blue-600" />}
        />
        <StatCard 
          title={language === 'ar' ? 'إجمالي العقود' : 'Total Contracts'}
          value={stats?.totalContracts}
          loading={isLoading}
          icon={<FileText className="w-5 h-5 text-teal-600" />}
        />
        <StatCard 
          title={language === 'ar' ? 'عمليات التحليل' : 'Total Analyses'}
          value={stats?.totalAnalyses}
          loading={isLoading}
          icon={<Activity className="w-5 h-5 text-purple-600" />}
        />
        <StatCard 
          title={language === 'ar' ? 'تحليلات فاشلة' : 'Failed Analyses'}
          value={stats?.failedAnalyses}
          loading={isLoading}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          urgent={stats?.failedAnalyses ? stats.failedAnalyses > 0 : false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle>{language === 'ar' ? 'العقود حسب النوع' : 'Contracts by Type'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[300px] flex items-end gap-2 p-4">
                {[40, 70, 45, 90, 65, 30].map((h, i) => (
                  <Skeleton key={i} className={`w-full rounded-t-sm`} style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.contractsByType || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="contractType" 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => val.split('_')[0]} // Shorten labels
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {stats?.contractsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle>{language === 'ar' ? 'حالة النظام' : 'System Status'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="font-medium text-emerald-900 dark:text-emerald-300">
                  {language === 'ar' ? 'محرك الذكاء الاصطناعي' : 'AI Engine'}
                </span>
              </div>
              <span className="text-emerald-600 text-sm font-bold bg-white dark:bg-black/20 px-2 py-1 rounded-md">Online</span>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="font-medium text-emerald-900 dark:text-emerald-300">
                  {language === 'ar' ? 'قاعدة البيانات' : 'Database'}
                </span>
              </div>
              <span className="text-emerald-600 text-sm font-bold bg-white dark:bg-black/20 px-2 py-1 rounded-md">Online</span>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="font-medium text-emerald-900 dark:text-emerald-300">
                  {language === 'ar' ? 'التخزين' : 'Storage'}
                </span>
              </div>
              <span className="text-emerald-600 text-sm font-bold bg-white dark:bg-black/20 px-2 py-1 rounded-md">Online</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon, urgent = false }: any) {
  return (
    <div className={`p-6 rounded-3xl border ${urgent ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800'} shadow-sm relative overflow-hidden group`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-2xl ${urgent ? 'bg-red-100 dark:bg-red-900/40' : 'bg-slate-50 dark:bg-slate-900'}`}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-4xl font-bold ${urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
            {value || 0}
          </div>
        )}
      </div>
    </div>
  );
}
