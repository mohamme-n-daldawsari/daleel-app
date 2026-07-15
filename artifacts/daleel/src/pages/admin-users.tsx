import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useListAdminUsers, useUpdateAdminUser } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { 
  Users, Search, Shield, User as UserIcon, ShieldAlert,
  MoreVertical, Check
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
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export default function AdminUsers() {
  const { language } = useTranslation();
  const { toast } = useToast();
  const dateLocale = language === "ar" ? ar : enUS;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: users, isLoading } = useListAdminUsers({
    search: debouncedSearch || undefined,
  });

  const updateMutation = useUpdateAdminUser();

  const handleRoleChange = (userId: number, newRole: 'admin' | 'user') => {
    updateMutation.mutate({ userId, data: { role: newRole } }, {
      onSuccess: () => {
        toast({ title: language === 'ar' ? 'تم تحديث الصلاحية' : 'Role updated' });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-md">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto w-4 h-4 text-slate-400" />
            <Input 
              placeholder={language === 'ar' ? "ابحث بالاسم أو البريد..." : "Search by name or email..."}
              className="pl-9 rtl:pr-9 rtl:pl-3 bg-slate-50 dark:bg-slate-900 border-transparent h-10 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">{language === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="px-6 py-4">{language === 'ar' ? 'الصلاحية' : 'Role'}</th>
                <th className="px-6 py-4">{language === 'ar' ? 'العقود' : 'Contracts'}</th>
                <th className="px-6 py-4">{language === 'ar' ? 'تاريخ التسجيل' : 'Joined'}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-8" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-full" /></td>
                  </tr>
                ))
              ) : !users || users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    {language === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 font-bold">
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{user.fullName}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          <ShieldAlert className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          {language === 'ar' ? 'مدير' : 'Admin'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          <UserIcon className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          {language === 'ar' ? 'مستخدم' : 'User'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {user.contractCount || 0}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(parseISO(user.createdAt), "dd MMM yyyy", { locale: dateLocale })}
                    </td>
                    <td className="px-6 py-4 text-right rtl:text-left">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')} disabled={user.role === 'admin'}>
                            <Shield className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {language === 'ar' ? 'ترقية لمدير' : 'Make Admin'}
                            {user.role === 'admin' && <Check className="w-4 h-4 ml-auto" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')} disabled={user.role === 'user'}>
                            <UserIcon className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {language === 'ar' ? 'تخفيض لمستخدم' : 'Make User'}
                            {user.role === 'user' && <Check className="w-4 h-4 ml-auto" />}
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
