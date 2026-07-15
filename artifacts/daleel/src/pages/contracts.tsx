import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useListContracts, getListContractsQueryKey } from "@workspace/api-client-react";
import { 
  FileText, Search, Filter, Plus, ChevronLeft, ChevronRight, 
  MoreVertical, Edit, Trash2, Eye, ShieldAlert, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export default function ContractsList() {
  const { t, language } = useTranslation();
  const isRtl = language === "ar";
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;
  const dateLocale = isRtl ? ar : enUS;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: contracts, isLoading } = useListContracts({
    search: debouncedSearch || undefined,
    contractType: filterType && filterType !== 'all' ? filterType : undefined,
    status: filterStatus && filterStatus !== 'all' ? filterStatus : undefined,
  });

  const [, setLocation] = useLocation();

  const handleRowClick = (id: number) => {
    setLocation(`/contracts/${id}`);
  };

  const contractTypes = [
    "rental_agreement", "employment_contract", "gym_membership", 
    "telecom_contract", "software_subscription", "service_agreement", 
    "insurance_policy", "car_financing", "travel_terms", "education_contract"
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("nav.contracts")}
          </h1>
          <p className="text-slate-500 mt-1">
            {language === 'ar' ? 'إدارة وتصفح جميع عقودك.' : 'Manage and browse all your contracts.'}
          </p>
        </div>
        <Link href="/contracts/upload" className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-6 text-sm font-medium text-white shadow transition-colors hover:bg-teal-700 active:scale-95 whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t("nav.upload")}
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto w-4 h-4 text-slate-400" />
            <Input 
              placeholder={language === 'ar' ? "ابحث عن عقد..." : "Search contracts..."}
              className="pl-9 rtl:pr-9 rtl:pl-3 bg-slate-50 dark:bg-slate-900 border-transparent focus-visible:bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px] bg-slate-50 dark:bg-slate-900 border-transparent">
                <SelectValue placeholder={language === 'ar' ? "جميع الأنواع" : "All Types"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "جميع الأنواع" : "All Types"}</SelectItem>
                {contractTypes.map(tKey => (
                  <SelectItem key={tKey} value={tKey}>{t(`type.${tKey}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-900 border-transparent">
                <SelectValue placeholder={language === 'ar' ? "كل الحالات" : "All Statuses"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? "كل الحالات" : "All Statuses"}</SelectItem>
                <SelectItem value="analyzed">{t('status.analyzed')}</SelectItem>
                <SelectItem value="processing">{t('status.processing')}</SelectItem>
                <SelectItem value="pending">{t('status.pending')}</SelectItem>
                <SelectItem value="failed">{t('status.failed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">{language === 'ar' ? 'العنوان' : 'Title'}</th>
                <th className="px-6 py-4">{language === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="px-6 py-4">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-4">{language === 'ar' ? 'مخاطر' : 'Risks'}</th>
                <th className="px-6 py-4">{language === 'ar' ? 'تاريخ الإضافة' : 'Date Added'}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-8" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-full" /></td>
                  </tr>
                ))
              ) : !contracts || contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-12 h-12 mb-4 opacity-20" />
                      <p>{language === 'ar' ? 'لا توجد عقود مطابقة.' : 'No contracts found.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr 
                    key={contract.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group"
                    onClick={() => handleRowClick(contract.id)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {contract.title}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {t(`type.${contract.contractType}`)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={contract.status} t={t} />
                    </td>
                    <td className="px-6 py-4">
                      {contract.highRiskCount > 0 ? (
                        <div className="flex items-center gap-1.5 text-red-600 font-medium">
                          <ShieldAlert className="w-4 h-4" />
                          <span>{contract.highRiskCount}</span>
                        </div>
                      ) : contract.status === 'analyzed' ? (
                        <div className="text-emerald-600 font-medium">0</div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(parseISO(contract.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                    </td>
                    <td className="px-6 py-4 text-right rtl:text-left">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={e => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRowClick(contract.id)}>
                            <Eye className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {language === 'ar' ? 'عرض' : 'View'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string, t: any }) {
  switch (status) {
    case 'analyzed':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{t('status.analyzed')}</span>;
    case 'processing':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse"><Activity className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />{t('status.processing')}</span>;
    case 'failed':
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t('status.failed')}</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{t('status.pending')}</span>;
  }
}
