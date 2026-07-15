import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useListReminders, useUpdateReminder, useDeleteReminder, useCreateReminder, useListContracts } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { 
  Bell, Calendar, Plus, CheckCircle2, Trash2, Clock, 
  CreditCard, ShieldAlert, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isPast } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reminders() {
  const { language } = useTranslation();
  const { toast } = useToast();
  const dateLocale = language === "ar" ? ar : enUS;

  const { data: reminders, isLoading } = useListReminders();
  const { data: contracts } = useListContracts();
  
  const updateMutation = useUpdateReminder();
  const deleteMutation = useDeleteReminder();
  const createMutation = useCreateReminder();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    contractId: "",
    title: "",
    type: "expiry",
    date: ""
  });

  const handleToggleComplete = (id: number, current: boolean) => {
    updateMutation.mutate({ reminderId: id, data: { completed: !current } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reminders"] })
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ reminderId: id }, {
      onSuccess: () => {
        toast({ title: language === 'ar' ? 'تم حذف التنبيه' : 'Reminder deleted' });
        queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      }
    });
  };

  const handleCreate = () => {
    if (!newReminder.contractId || !newReminder.title || !newReminder.date) {
      toast({ 
        title: language === 'ar' ? 'بيانات ناقصة' : 'Missing fields',
        variant: "destructive"
      });
      return;
    }
    
    createMutation.mutate({
      data: {
        contractId: parseInt(newReminder.contractId),
        title: newReminder.title,
        type: newReminder.type as any,
        reminderDate: new Date(newReminder.date).toISOString()
      }
    }, {
      onSuccess: () => {
        toast({ title: language === 'ar' ? 'تمت إضافة التنبيه' : 'Reminder added' });
        setIsAddModalOpen(false);
        setNewReminder({ contractId: "", title: "", type: "expiry", date: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      }
    });
  };

  const activeReminders = reminders?.filter(r => !r.completed) || [];
  const completedReminders = reminders?.filter(r => r.completed) || [];

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'payment': return <CreditCard className="w-5 h-5 text-purple-500" />;
      case 'renewal': return <RefreshCw className="w-5 h-5 text-amber-500" />;
      case 'cancellation': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      default: return <Calendar className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-teal-600" />
            {language === 'ar' ? 'التنبيهات والمواعيد' : 'Reminders & Dates'}
          </h1>
          <p className="text-slate-500 mt-1">
            {language === 'ar' ? 'لا تفوت أي موعد تجديد أو موعد إلغاء لعقودك.' : 'Never miss a renewal or cancellation deadline again.'}
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-10 px-6">
              <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {language === 'ar' ? 'تنبيه جديد' : 'New Reminder'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة تنبيه لعقد' : 'Add Contract Reminder'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'العقد' : 'Contract'}</label>
                <Select value={newReminder.contractId} onValueChange={(v) => setNewReminder({...newReminder, contractId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر العقد' : 'Select Contract'} />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'نوع التنبيه' : 'Alert Type'}</label>
                <Select value={newReminder.type} onValueChange={(v) => setNewReminder({...newReminder, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expiry">{language === 'ar' ? 'انتهاء العقد' : 'Contract Expiry'}</SelectItem>
                    <SelectItem value="renewal">{language === 'ar' ? 'تجديد تلقائي' : 'Auto Renewal'}</SelectItem>
                    <SelectItem value="cancellation">{language === 'ar' ? 'آخر موعد للإلغاء' : 'Cancellation Deadline'}</SelectItem>
                    <SelectItem value="payment">{language === 'ar' ? 'موعد دفع' : 'Payment Due'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'عنوان التنبيه' : 'Reminder Title'}</label>
                <Input value={newReminder.title} onChange={(e) => setNewReminder({...newReminder, title: e.target.value})} placeholder={language === 'ar' ? 'مثال: إلغاء اشتراك النادي' : 'e.g., Cancel Gym'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                <Input type="date" value={newReminder.date} onChange={(e) => setNewReminder({...newReminder, date: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-teal-600 text-white">
                {language === 'ar' ? 'حفظ' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 rounded-xl p-1 w-full max-w-sm">
          <TabsTrigger value="upcoming" className="flex-1 rounded-lg">
            {language === 'ar' ? 'القادمة' : 'Upcoming'}
            <span className="ml-2 rtl:mr-2 rtl:ml-0 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md text-xs">{activeReminders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 rounded-lg">
            {language === 'ar' ? 'المكتملة' : 'Completed'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {activeReminders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">{language === 'ar' ? 'لا توجد تنبيهات قادمة.' : 'No upcoming reminders.'}</p>
            </div>
          ) : (
            activeReminders.sort((a,b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()).map(reminder => {
              const isPastDate = isPast(parseISO(reminder.reminderDate));
              return (
                <div key={reminder.id} className={`flex items-center justify-between p-5 rounded-2xl border ${isPastDate ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800'} shadow-sm transition-all hover:shadow-md group`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleToggleComplete(reminder.id, reminder.completed)}
                      className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center hover:border-emerald-500 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-50" />
                    </button>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                      {getTypeIcon(reminder.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-lg leading-tight">{reminder.title}</h4>
                      <p className="text-slate-500 text-sm mt-1">{reminder.contractTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right rtl:text-left">
                      <div className={`font-semibold ${isPastDate ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                        {format(parseISO(reminder.reminderDate), "dd MMM yyyy", { locale: dateLocale })}
                      </div>
                      <div className="text-xs text-slate-500">{isPastDate ? (language === 'ar' ? 'متأخر' : 'Overdue') : ''}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(reminder.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4 opacity-70">
           {completedReminders.length === 0 ? (
            <p className="text-center py-10 text-slate-500">{language === 'ar' ? 'لا يوجد تنبيهات مكتملة.' : 'No completed reminders.'}</p>
          ) : (
            completedReminders.map(reminder => (
              <div key={reminder.id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleToggleComplete(reminder.id, reminder.completed)}
                    className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </button>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 grayscale">
                    {getTypeIcon(reminder.type)}
                  </div>
                  <div className="line-through text-slate-500">
                    <h4 className="font-semibold text-lg leading-tight">{reminder.title}</h4>
                    <p className="text-sm mt-1">{reminder.contractTitle}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(reminder.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
