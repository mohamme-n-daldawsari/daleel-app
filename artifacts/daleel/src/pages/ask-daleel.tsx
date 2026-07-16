import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import {
  getGetContractQueryKey,
  getListQuestionsQueryKey,
  useAskQuestion,
  useGetContract,
  useListQuestions,
} from "@workspace/api-client-react";
import { 
  Send, ArrowLeft, ArrowRight, Bot, User as UserIcon, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AskDaleel() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { t, language } = useTranslation();
  const isRtl = language === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const SendIcon = isRtl ? ArrowLeft : Send;

  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: contract } = useGetContract(id, {
    query: { enabled: !!id, queryKey: getGetContractQueryKey(id) },
  });
  const { data: pastQuestions, refetch } = useListQuestions(id, {
    query: { enabled: !!id, queryKey: getListQuestionsQueryKey(id) },
  });
  const askMutation = useAskQuestion();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, sourcePage?: number | null }[]>([]);

  // Initialize with past questions
  useEffect(() => {
    if (pastQuestions && messages.length === 0) {
      const formatted = pastQuestions.flatMap(q => [
        { role: 'user' as const, content: q.question },
        { role: 'assistant' as const, content: q.answer, sourcePage: q.sourcePage }
      ]);
      setMessages(formatted);
    }
  }, [pastQuestions]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || askMutation.isPending) return;

    const q = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: q }]);

    askMutation.mutate({ contractId: id, data: { question: q } }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer, sourcePage: data.sourcePage }]);
        refetch();
      },
      onError: () => {
        setMessages(prev => [...prev, { role: 'assistant', content: language === 'ar' ? 'عذراً، حدث خطأ. حاول مرة أخرى.' : 'Sorry, an error occurred. Please try again.' }]);
      }
    });
  };

  const handleChipClick = (q: string) => {
    setInput(q);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] max-h-[800px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/contracts/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
              <BackIcon className="w-4 h-4 text-slate-500" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
              د
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white leading-tight">
                {language === 'ar' ? 'اسأل دليل' : 'Ask Daleel'}
              </h2>
              <p className="text-xs text-slate-500 leading-tight line-clamp-1">
                {contract?.title || "..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'ar' ? 'كيف يمكنني مساعدتك؟' : 'How can I help you?'}
              </h3>
              <p className="text-slate-500">
                {language === 'ar' 
                  ? 'اسألني أي سؤال عن هذا العقد. أستطيع شرح البنود المعقدة، أو البحث عن شروط معينة.' 
                  : 'Ask me any question about this contract. I can explain complex clauses or search for specific terms.'}
              </p>
            </div>
            
            {contract?.suggestedQuestions && contract.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {contract.suggestedQuestions.map((sq, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleChipClick(sq)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-full text-sm text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-teal-600 text-white font-bold'
              }`}>
                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : 'د'}
              </div>
              
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-tr-sm rtl:rounded-tr-2xl rtl:rounded-tl-sm' 
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200 rounded-tl-sm rtl:rounded-tl-2xl rtl:rounded-tr-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.sourcePage && (
                  <span className="text-xs text-slate-500 mt-2 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                    {language === 'ar' ? 'صفحة ' : 'Page '}{msg.sourcePage}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        
        {askMutation.isPending && (
          <div className="flex gap-4 flex-row">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 mt-1">د</div>
            <div className="px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 rounded-tl-sm flex items-center gap-1.5 h-12">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
            className="h-14 pl-4 pr-14 rtl:pr-4 rtl:pl-14 rounded-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-teal-500 shadow-sm"
            disabled={askMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || askMutation.isPending}
            className="absolute right-2 rtl:left-2 rtl:right-auto w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            {askMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
          </Button>
        </form>
        <div className="text-center mt-3">
          <span className="text-xs text-slate-400">
            {language === 'ar' ? 'إجابات الذكاء الاصطناعي قد تحتوي على أخطاء. يرجى التحقق منها.' : 'AI answers may contain mistakes. Please verify.'}
          </span>
        </div>
      </div>
    </div>
  );
}
