import React, { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useUploadContract } from "@workspace/api-client-react";
import { 
  UploadCloud, FileText, File, FileImage, 
  AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UploadContract() {
  const { t, language } = useTranslation();
  const isRtl = language === "ar";
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;
  const BackArrowIcon = isRtl ? ChevronRight : ChevronLeft;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const uploadContractMutation = useUploadContract();

  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  
  // Text state
  const [pastedText, setPastedText] = useState("");
  
  // Details state
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("");
  const [docLanguage, setDocLanguage] = useState<"ar" | "en" | "mixed">("ar");

  const contractTypes = [
    "rental_agreement", "employment_contract", "gym_membership", 
    "telecom_contract", "software_subscription", "service_agreement", 
    "insurance_policy", "car_financing", "travel_terms", "education_contract"
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: language === 'ar' ? "حجم الملف كبير جداً" : "File too large",
          description: language === 'ar' ? "الحد الأقصى المسموح به هو 10 ميجابايت." : "Maximum allowed size is 10MB.",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, "")); // Strip extension for title
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        // Strip data:image/jpeg;base64, or data:application/pdf;base64,
        const base64Data = base64String.split(",")[1];
        setFileBase64(base64Data);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Create a pseudo event object to reuse handleFileChange
      const event = {
        target: { files: e.dataTransfer.files }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    }
  };

  const handleNextStep = () => {
    if (inputMode === "file" && !fileBase64) {
      toast({
        title: language === 'ar' ? "الرجاء اختيار ملف" : "Please select a file",
        variant: "destructive"
      });
      return;
    }
    if (inputMode === "text" && pastedText.trim().length < 50) {
      toast({
        title: language === 'ar' ? "النص قصير جداً" : "Text is too short",
        description: language === 'ar' ? "الرجاء إدخال 50 حرفاً على الأقل." : "Please enter at least 50 characters.",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handleAnalyze = () => {
    if (!title.trim() || !contractType) {
      toast({
        title: language === 'ar' ? "بيانات ناقصة" : "Missing details",
        description: language === 'ar' ? "الرجاء تحديد العنوان ونوع العقد." : "Please specify title and contract type.",
        variant: "destructive"
      });
      return;
    }

    const payload: any = {
      title,
      contractType,
      language: docLanguage
    };

    if (inputMode === "file") {
      payload.fileBase64 = fileBase64;
      payload.fileName = file?.name;
      payload.fileType = file?.type;
    } else {
      payload.pastedText = pastedText;
    }

    uploadContractMutation.mutate({ data: payload }, {
      onSuccess: (data) => {
        toast({
          title: language === 'ar' ? "تم الرفع بنجاح" : "Uploaded successfully",
          description: language === 'ar' ? "جاري بدء التحليل..." : "Starting analysis..."
        });
        setLocation(`/contracts/processing/${data.id}`);
      },
      onError: (err: any) => {
        toast({
          title: language === 'ar' ? "فشل الرفع" : "Upload failed",
          description: err.message || (language === 'ar' ? "حدث خطأ غير متوقع." : "An unexpected error occurred."),
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
          <BackArrowIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {language === 'ar' ? 'رفع عقد جديد' : 'Upload New Contract'}
          </h1>
          <p className="text-slate-500 mt-1">
            {language === 'ar' ? 'قم برفع ملف PDF أو صورة، أو انسخ والصق نص العقد مباشرة.' : 'Upload a PDF or image file, or copy and paste the contract text directly.'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between relative mb-12">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 -z-10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-teal-500 transition-all duration-500" 
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
            step >= 1 ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          }`}>
            1
          </div>
          <span className={`text-sm font-medium ${step >= 1 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {language === 'ar' ? 'المحتوى' : 'Content'}
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
            step >= 2 ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          }`}>
            2
          </div>
          <span className={`text-sm font-medium ${step >= 2 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {language === 'ar' ? 'التفاصيل' : 'Details'}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        
        {/* Step 1: Content Upload */}
        <div className={step === 1 ? "block" : "hidden"}>
          <Tabs value={inputMode} onValueChange={(v: any) => setInputMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <TabsTrigger value="file" className="rounded-lg py-2.5">
                <UploadCloud className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {language === 'ar' ? 'رفع ملف (PDF / صورة)' : 'Upload File (PDF / Image)'}
              </TabsTrigger>
              <TabsTrigger value="text" className="rounded-lg py-2.5">
                <FileText className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {language === 'ar' ? 'لصق نص' : 'Paste Text'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="file" className="mt-0">
              {!fileBase64 ? (
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept="application/pdf,image/png,image/jpeg,image/webp" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 rounded-2xl flex items-center justify-center mb-6">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {language === 'ar' ? 'اسحب وأفلت الملف هنا' : 'Drag and drop file here'}
                  </h3>
                  <p className="text-slate-500 mb-6 max-w-sm">
                    {language === 'ar' ? 'أو انقر لاختيار ملف. ندعم صيغ PDF، PNG، JPG، WEBP.' : 'Or click to select a file. We support PDF, PNG, JPG, WEBP formats.'}
                  </p>
                  <Button variant="outline" className="rounded-full bg-white dark:bg-slate-900 pointer-events-none">
                    {language === 'ar' ? 'اختيار ملف' : 'Select File'}
                  </Button>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-16 h-16 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-2xl flex items-center justify-center shrink-0">
                    {file?.type.includes('pdf') ? <FileText className="w-8 h-8" /> : <FileImage className="w-8 h-8" />}
                  </div>
                  <div className="flex-1 text-center sm:text-left sm:rtl:text-right">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-1">{file?.name}</h3>
                    <p className="text-slate-500 mt-1">{(file?.size! / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setFile(null); setFileBase64(""); }} className="rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200">
                      {language === 'ar' ? 'إزالة' : 'Remove'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="text" className="mt-0">
              <div className="space-y-4">
                <Textarea 
                  placeholder={language === 'ar' ? 'الصق نص العقد هنا للتحليل...' : 'Paste the contract text here for analysis...'}
                  className="min-h-[300px] resize-y p-4 text-base bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-teal-500"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  dir="auto"
                />
                <div className="text-sm text-slate-500 flex justify-between px-2">
                  <span>{language === 'ar' ? 'الحد الأدنى: 50 حرف' : 'Minimum: 50 characters'}</span>
                  <span className={pastedText.length >= 50 ? 'text-teal-600' : 'text-slate-400'}>
                    {pastedText.length} {language === 'ar' ? 'حرف' : 'chars'}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-10">
            <Button onClick={handleNextStep} className="bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 rounded-xl px-8 h-12">
              {language === 'ar' ? 'التالي' : 'Next'}
              <ArrowIcon className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
            </Button>
          </div>
        </div>

        {/* Step 2: Details */}
        <div className={step === 2 ? "block animate-in fade-in slide-in-from-right-4 duration-500" : "hidden"}>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-900 dark:text-white">
                {language === 'ar' ? 'عنوان العقد' : 'Contract Title'}
              </label>
              <Input 
                placeholder={language === 'ar' ? 'مثال: عقد إيجار شقة الرياض' : 'e.g., Riyadh Apartment Lease'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-900 dark:text-white">
                  {language === 'ar' ? 'نوع العقد' : 'Contract Type'}
                </label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900">
                    <SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map(tKey => (
                      <SelectItem key={tKey} value={tKey}>{t(`type.${tKey}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-900 dark:text-white">
                  {language === 'ar' ? 'لغة العقد' : 'Document Language'}
                </label>
                <Select value={docLanguage} onValueChange={(v: any) => setDocLanguage(v)}>
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{language === 'ar' ? 'عربي' : 'Arabic'}</SelectItem>
                    <SelectItem value="en">{language === 'ar' ? 'إنجليزي' : 'English'}</SelectItem>
                    <SelectItem value="mixed">{language === 'ar' ? 'مختلط (عربي وإنجليزي)' : 'Mixed (Arabic & English)'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 rounded-xl p-4 flex gap-3 mt-8">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{language === 'ar' ? 'إخلاء مسؤولية:' : 'Disclaimer:'}</strong>{' '}
                {language === 'ar' 
                  ? 'يقوم دليل بتحليل العقود باستخدام الذكاء الاصطناعي للمساعدة في الفهم فقط. لا يعتبر هذا التحليل استشارة قانونية مهنية معتمدة. ننصح دائماً بمراجعة محامٍ مختص للقرارات المهمة.' 
                  : 'Daleel analyzes contracts using AI to assist with comprehension only. This analysis does not constitute certified professional legal advice. We always recommend consulting a qualified lawyer for important decisions.'}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-10">
            <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl px-6 h-12">
              <BackArrowIcon className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("common.back")}
            </Button>
            
            <Button 
              onClick={handleAnalyze} 
              disabled={uploadContractMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 h-12 shadow-lg shadow-teal-600/20"
            >
              {uploadContractMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                  {language === 'ar' ? 'جاري البدء...' : 'Starting...'}
                </>
              ) : (
                <>
                  {language === 'ar' ? 'ابدأ التحليل' : 'Analyze Now'}
                  <CheckCircle2 className="w-5 h-5 ml-2 rtl:mr-2 rtl:ml-0" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
