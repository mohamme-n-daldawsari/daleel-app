export const SAMPLE_CONTRACT_FILE_NAME = "daleel-fictional-sample-v1.txt";

export const SAMPLE_CONTRACT_TEXT = `عقد تقديم خدمات استشارية (نموذج خيالي للعرض)
أبرم هذا العقد بين شركة آفاق التقنية، ويشار إليها بمقدم الخدمة، ومؤسسة النور التجارية، ويشار إليها بالعميل.
1. تبدأ مدة العقد بتاريخ 2026-08-01 وتنتهي بتاريخ 2027-07-31.
2. يدفع العميل مبلغاً شهرياً قدره 12,000 ريال سعودي في اليوم الأول من كل شهر.
3. يتجدد العقد تلقائياً لمدة مماثلة ما لم يخطر أحد الطرفين الطرف الآخر كتابة بعدم الرغبة في التجديد قبل 30 يوماً من تاريخ الانتهاء.
4. يجوز للعميل إنهاء العقد بإشعار كتابي قبل 15 يوماً، وتطبق عند الإنهاء المبكر غرامة قدرها 2,000 ريال سعودي.
5. يلتزم مقدم الخدمة بتسليم تقرير أداء شهري، ويلتزم العميل بتوفير البيانات اللازمة خلال خمسة أيام عمل من طلبها.
6. تعود ملكية المخرجات التي سدد العميل قيمتها إلى العميل، ويحتفظ مقدم الخدمة بأدواته وقوالبه السابقة.
7. يجوز لمقدم الخدمة استخدام بيانات العميل بالقدر اللازم لتنفيذ الخدمات، دون تحديد مدة الاحتفاظ بها بعد انتهاء العقد.
8. لا يتجاوز مجموع مسؤولية مقدم الخدمة قيمة الرسوم المدفوعة خلال الشهر السابق للمطالبة.
لم يحدد العقد آلية واضحة لتسوية النزاعات أو القانون الواجب التطبيق.`;

export const SAMPLE_ANALYSIS = {
  contractType: "consulting_services",
  title: "عقد خدمات استشارية — نموذج خيالي",
  summary:
    "عقد خدمات استشارية خيالي لمدة سنة بقيمة 12,000 ريال شهرياً، يتجدد تلقائياً ويتضمن غرامة إنهاء مبكر وحداً للمسؤولية. يحتاج العميل إلى الانتباه لمهلة منع التجديد ولمدة الاحتفاظ بالبيانات وآلية النزاعات غير المحددة.",
  parties: [
    { name: "شركة آفاق التقنية", role: "مقدم الخدمة" },
    { name: "مؤسسة النور التجارية", role: "العميل" },
  ],
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  duration: "12 شهراً",
  totalCost: 144000,
  currency: "SAR",
  monthlyPayment: 12000,
  annualPayment: 144000,
  deposit: null,
  automaticRenewal: true,
  renewalNoticeDays: 30,
  cancellationAllowed: true,
  cancellationNoticeDays: 15,
  earlyCancellationPenalty: 2000,
  refundPolicy: null,
  trialPeriodDays: null,
  clarityScore: 71,
  clarityExplanation:
    "المبالغ والمدة والتجديد والإلغاء واضحة، لكن مدة الاحتفاظ بالبيانات وتسوية النزاعات والقانون الواجب التطبيق غير محددة.",
  confidence: 0.96,
  overallRiskLevel: "high" as const,
  clauses: [
    {
      category: "renewal" as const,
      title: "التجديد التلقائي ومهلة الإخطار",
      simpleExplanation: "يتجدد العقد تلقائياً ما لم يرسل أحد الطرفين إخطاراً كتابياً قبل 30 يوماً من الانتهاء.",
      riskLevel: "high" as const,
      sourcePage: null,
      sourceText: "يتجدد العقد تلقائياً لمدة مماثلة ما لم يخطر أحد الطرفين الطرف الآخر كتابة بعدم الرغبة في التجديد قبل 30 يوماً من تاريخ الانتهاء.",
      confidence: 0.99,
    },
    {
      category: "cancellation" as const,
      title: "غرامة الإنهاء المبكر",
      simpleExplanation: "يتطلب الإنهاء إخطاراً قبل 15 يوماً وتترتب عليه غرامة قدرها 2,000 ريال.",
      riskLevel: "high" as const,
      sourcePage: null,
      sourceText: "يجوز للعميل إنهاء العقد بإشعار كتابي قبل 15 يوماً، وتطبق عند الإنهاء المبكر غرامة قدرها 2,000 ريال سعودي.",
      confidence: 0.99,
    },
    {
      category: "liability" as const,
      title: "تحديد المسؤولية",
      simpleExplanation: "يحد العقد مسؤولية مقدم الخدمة بقيمة رسوم شهر واحد؛ يستحسن تقييم مدى ملاءمة هذا الحد لحجم الضرر المحتمل.",
      riskLevel: "high" as const,
      sourcePage: null,
      sourceText: "لا يتجاوز مجموع مسؤولية مقدم الخدمة قيمة الرسوم المدفوعة خلال الشهر السابق للمطالبة.",
      confidence: 0.98,
    },
    {
      category: "privacy" as const,
      title: "مدة الاحتفاظ بالبيانات غير محددة",
      simpleExplanation: "يسمح باستخدام البيانات لتنفيذ الخدمة من دون تحديد متى تحذف بعد انتهاء العقد.",
      riskLevel: "medium" as const,
      sourcePage: null,
      sourceText: "يجوز لمقدم الخدمة استخدام بيانات العميل بالقدر اللازم لتنفيذ الخدمات، دون تحديد مدة الاحتفاظ بها بعد انتهاء العقد.",
      confidence: 0.98,
    },
    {
      category: "obligation" as const,
      title: "التزام العميل بتوفير البيانات",
      simpleExplanation: "على العميل توفير البيانات المطلوبة خلال خمسة أيام عمل.",
      riskLevel: "medium" as const,
      sourcePage: null,
      sourceText: "يلتزم العميل بتوفير البيانات اللازمة خلال خمسة أيام عمل من طلبها.",
      confidence: 0.99,
    },
    {
      category: "right" as const,
      title: "ملكية المخرجات المدفوعة",
      simpleExplanation: "تنتقل ملكية المخرجات التي سددت قيمتها إلى العميل مع احتفاظ مقدم الخدمة بأدواته السابقة.",
      riskLevel: "low" as const,
      sourcePage: null,
      sourceText: "تعود ملكية المخرجات التي سدد العميل قيمتها إلى العميل، ويحتفظ مقدم الخدمة بأدواته وقوالبه السابقة.",
      confidence: 0.97,
    },
    {
      category: "missing_clause" as const,
      title: "آلية تسوية النزاعات والقانون الواجب التطبيق",
      simpleExplanation: "لم يُعثر على نص داعم في العقد يحدد آلية تسوية النزاعات أو القانون الواجب التطبيق.",
      riskLevel: "medium" as const,
      sourcePage: null,
      sourceText: null,
      confidence: 0.92,
    },
    {
      category: "recommendation" as const,
      title: "توضيح حذف البيانات",
      simpleExplanation: "يوصى بطلب تحديد مدة الاحتفاظ بالبيانات وإجراء حذفها أو إعادتها بعد انتهاء العقد. لم يُعثر على نص داعم مكتمل في العقد.",
      riskLevel: "medium" as const,
      sourcePage: null,
      sourceText: null,
      confidence: 0.9,
    },
  ],
  financialDetails: [
    { type: "monthly_payment" as const, amount: 12000, currency: "SAR", description: "الدفعة الشهرية", sourcePage: null, sourceText: "يسدد العميل مبلغ 12,000 ريال سعودي شهرياً", confidence: 0.99 },
    { type: "annual_payment" as const, amount: 144000, currency: "SAR", description: "إجمالي سنة محسوب من الدفعات الشهرية", sourcePage: null, sourceText: "يسدد العميل مبلغ 12,000 ريال سعودي شهرياً", confidence: 0.91 },
    { type: "penalty" as const, amount: 2000, currency: "SAR", description: "غرامة الإنهاء المبكر", sourcePage: null, sourceText: "وتطبق عند الإنهاء المبكر غرامة قدرها 2,000 ريال سعودي", confidence: 0.99 },
  ],
  contractDates: [
    { type: "start" as const, date: "2026-08-01", description: "بداية العقد", sourcePage: null, sourceText: "تبدأ مدة العقد بتاريخ 2026-08-01", confidence: 0.99 },
    { type: "end" as const, date: "2027-07-31", description: "نهاية العقد", sourcePage: null, sourceText: "وتنتهي بتاريخ 2027-07-31", confidence: 0.99 },
    { type: "cancellation_deadline" as const, date: "2027-07-01", description: "آخر يوم تقريبي لإرسال إخطار منع التجديد قبل 30 يوماً", sourcePage: null, sourceText: "قبل 30 يوماً من تاريخ الانتهاء", confidence: 0.94 },
  ],
  actionPlan: [
    {
      priority: "urgent" as const,
      recommendedAction: "قرر بشأن التجديد وأرسل الإخطار الكتابي قبل المهلة.",
      rationale: "عدم الإخطار قد يؤدي إلى تجديد العقد لمدة مماثلة.",
      sourceText: "قبل 30 يوماً من تاريخ الانتهاء",
      deadline: "2027-07-01",
      reminderSuggested: true,
      reminderTitle: "مراجعة قرار تجديد عقد الخدمات",
      reminderType: "renewal" as const,
      confidence: 0.94,
    },
    {
      priority: "high" as const,
      recommendedAction: "اطلب توضيح مدة الاحتفاظ بالبيانات وإجراء حذفها بعد انتهاء العقد.",
      rationale: "النص يجيز استخدام البيانات ولا يحدد مدة الاحتفاظ بها.",
      sourceText: "دون تحديد مدة الاحتفاظ بها بعد انتهاء العقد",
      deadline: null,
      reminderSuggested: false,
      reminderTitle: null,
      reminderType: null,
      confidence: 0.96,
    },
    {
      priority: "medium" as const,
      recommendedAction: "ناقش إضافة آلية لتسوية النزاعات والقانون الواجب التطبيق.",
      rationale: "لم يُعثر على نص داعم في العقد يحدد هذين الأمرين.",
      sourceText: null,
      deadline: null,
      reminderSuggested: false,
      reminderTitle: null,
      reminderType: null,
      confidence: 0.92,
    },
  ],
  suggestedQuestions: [
    "هل يمكن تخفيض حد المسؤولية أو استثناء الإهمال الجسيم؟",
    "متى تحذف بيانات العميل بعد انتهاء العقد؟",
    "ما وسيلة الإخطار الكتابي المعتمدة؟",
  ],
};

export function getDemoAnalysis(contractType: string): object {
  return { ...SAMPLE_ANALYSIS, contractType };
}
