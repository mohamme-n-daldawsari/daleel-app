import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { useGetMe, useUpdateSettings } from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { User, Settings as SettingsIcon, Globe, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { language: currentLang } = useTranslation();
  const { setLanguage } = useApp();
  const { toast } = useToast();

  const { data: user, isLoading } = useGetMe();
  const updateMutation = useUpdateSettings();

  const [name, setName] = useState("");
  const [prefLang, setPrefLang] = useState<"ar"|"en">("ar");

  useEffect(() => {
    if (user) {
      setName(user.fullName);
      setPrefLang(user.preferredLanguage as "ar"|"en" || "ar");
    }
  }, [user]);

  const handleSave = () => {
    updateMutation.mutate({ data: { fullName: name, preferredLanguage: prefLang } }, {
      onSuccess: () => {
        toast({ title: currentLang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved' });
        setLanguage(prefLang); // Update UI context instantly
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-teal-600" />
          {currentLang === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            {currentLang === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
          </h2>
          
          <div className="space-y-6">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {currentLang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <Input value={user?.email || ""} disabled className="bg-slate-50 dark:bg-slate-900 opacity-60" />
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {currentLang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-slate-50 dark:bg-slate-900 focus-visible:ring-teal-500" />
            </div>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-600" />
            {currentLang === 'ar' ? 'تفضيلات النظام' : 'System Preferences'}
          </h2>
          
          <div className="space-y-6">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {currentLang === 'ar' ? 'لغة الواجهة' : 'Interface Language'}
              </label>
              <Select value={prefLang} onValueChange={(v: "ar"|"en") => setPrefLang(v)}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-900 w-full sm:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  <SelectItem value="en">English (الإنجليزية)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {currentLang === 'ar' 
                  ? 'ستتغير لغة الواجهة بالكامل بمجرد الحفظ.' 
                  : 'The entire interface language will change upon saving.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" /> : <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}
            {currentLang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
