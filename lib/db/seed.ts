import { db } from "./src/index";
import {
  usersTable,
  contractsTable,
  contractPartiesTable,
  contractClausesTable,
  contractFinancialDetailsTable,
  contractDatesTable,
  remindersTable,
  activityLogsTable,
} from "./src/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  const demoHash = await bcrypt.hash("demo1234", 10);
  const adminHash = await bcrypt.hash("admin1234", 10);

  const [demoUser] = await db
    .insert(usersTable)
    .values({ fullName: "أحمد الغامدي", email: "user@daleel.app", passwordHash: demoHash, role: "user", preferredLanguage: "ar" })
    .onConflictDoNothing()
    .returning();

  const [adminUser] = await db
    .insert(usersTable)
    .values({ fullName: "منيرة الزهراني", email: "admin@daleel.app", passwordHash: adminHash, role: "admin", preferredLanguage: "ar" })
    .onConflictDoNothing()
    .returning();

  if (!demoUser || !adminUser) {
    console.log("✅ Demo users already seeded — skipping.");
    process.exit(0);
  }

  // Contract 1: Gym membership (high risk, analyzed)
  const [gymContract] = await db.insert(contractsTable).values({
    userId: demoUser.id, title: "اشتراك نادي الفيتنس السنوي", contractType: "gym_membership",
    originalFileName: "gym-membership-2026.pdf", language: "ar",
    extractedText: "عقد اشتراك في نادي الفيتنس...", status: "analyzed",
    clarityScore: 62, clarityExplanation: "بنود الإلغاء موزعة على عدة أقسام.", confidence: 0.91,
    summary: "عقد اشتراك في نادي رياضي لمدة 12 شهرًا بدفعات شهرية وتجديد تلقائي وغرامة إلغاء.",
    startDate: "2026-08-01", endDate: "2027-07-31", duration: "12 شهرًا",
    totalCost: 2400, currency: "SAR", monthlyPayment: 200, deposit: 200,
    automaticRenewal: true, renewalNoticeDays: 30, cancellationAllowed: true,
    cancellationNoticeDays: 30, earlyCancellationPenalty: 500,
    refundPolicy: "لا يوجد استرجاع بعد بداية الاشتراك", trialPeriodDays: 7,
    suggestedQuestions: ["هل يمكنني تجميد الاشتراك مؤقتًا؟", "ما هي الخدمات المشمولة في الاشتراك؟", "هل يمكن نقل الاشتراك لشخص آخر؟"],
  }).returning();

  await db.insert(contractPartiesTable).values([
    { contractId: gymContract.id, name: "أحمد الغامدي", role: "subscriber" },
    { contractId: gymContract.id, name: "نادي الفيتنس بلاس", role: "provider" },
  ]);
  await db.insert(contractClausesTable).values([
    { contractId: gymContract.id, category: "renewal", title: "التجديد التلقائي", simpleExplanation: "يتجدد الاشتراك تلقائيًا ما لم يتم الإلغاء قبل 30 يومًا من تاريخ الانتهاء.", riskLevel: "high", sourcePage: 4, sourceText: "يتجدد الاشتراك تلقائيًا..." },
    { contractId: gymContract.id, category: "cancellation", title: "غرامة الإلغاء المبكر", simpleExplanation: "في حال الإلغاء قبل انتهاء المدة تُفرض غرامة 500 ريال.", riskLevel: "high", sourcePage: 6 },
    { contractId: gymContract.id, category: "payment", title: "موعد الدفع الشهري", simpleExplanation: "يستحق الدفع في اليوم الأول من كل شهر.", riskLevel: "low", sourcePage: 2 },
    { contractId: gymContract.id, category: "privacy", title: "مشاركة البيانات", simpleExplanation: "قد يتم مشاركة بياناتك مع شركاء النادي لأغراض تسويقية.", riskLevel: "medium", sourcePage: 8 },
  ]);
  await db.insert(contractFinancialDetailsTable).values([
    { contractId: gymContract.id, type: "monthly_payment", amount: 200, currency: "SAR", description: "الدفعة الشهرية", sourcePage: 2 },
    { contractId: gymContract.id, type: "deposit", amount: 200, currency: "SAR", description: "رسوم التسجيل", sourcePage: 1 },
    { contractId: gymContract.id, type: "cancellation_penalty", amount: 500, currency: "SAR", description: "غرامة الإلغاء المبكر", sourcePage: 6 },
  ]);
  await db.insert(contractDatesTable).values([
    { contractId: gymContract.id, type: "start", date: "2026-08-01", description: "تاريخ بداية الاشتراك" },
    { contractId: gymContract.id, type: "end", date: "2027-07-31", description: "تاريخ انتهاء الاشتراك" },
    { contractId: gymContract.id, type: "renewal", date: "2027-07-01", description: "آخر موعد للإلغاء قبل التجديد التلقائي" },
  ]);

  // Contract 2: Rental agreement (medium risk)
  const [rentalContract] = await db.insert(contractsTable).values({
    userId: demoUser.id, title: "عقد إيجار شقة سكنية - حي النرجس", contractType: "rental_agreement",
    originalFileName: "rental-agreement.pdf", language: "ar",
    extractedText: "عقد إيجار شقة سكنية لمدة 12 شهرًا...", status: "analyzed",
    clarityScore: 75, clarityExplanation: "العقد واضح مع بعض الغموض في شروط الصيانة.", confidence: 0.88,
    summary: "عقد إيجار لشقة سكنية لمدة سنة كاملة بإيجار شهري ثابت ومبلغ تأمين.",
    startDate: "2026-09-01", endDate: "2027-08-31", duration: "12 شهرًا",
    totalCost: 36000, currency: "SAR", monthlyPayment: 3000, deposit: 6000,
    automaticRenewal: false, cancellationAllowed: true, cancellationNoticeDays: 60, earlyCancellationPenalty: 3000,
    refundPolicy: "يُستردّ التأمين بعد الإخلاء وتفتيش الوحدة خلال 30 يومًا",
    suggestedQuestions: ["هل يمكن تعديل الإيجار خلال فترة العقد؟", "من المسؤول عن صيانة الأجهزة المنزلية؟"],
  }).returning();

  await db.insert(contractPartiesTable).values([
    { contractId: rentalContract.id, name: "أحمد الغامدي", role: "tenant" },
    { contractId: rentalContract.id, name: "عبدالله المالكي", role: "landlord" },
  ]);
  await db.insert(contractClausesTable).values([
    { contractId: rentalContract.id, category: "payment", title: "موعد دفع الإيجار", simpleExplanation: "يجب دفع الإيجار في بداية كل شهر.", riskLevel: "low", sourcePage: 2 },
    { contractId: rentalContract.id, category: "cancellation", title: "إشعار الإخلاء", simpleExplanation: "يجب إشعار المالك قبل 60 يومًا من الإخلاء.", riskLevel: "medium", sourcePage: 5 },
    { contractId: rentalContract.id, category: "maintenance", title: "مسؤولية الصيانة", simpleExplanation: "المستأجر مسؤول عن الأضرار الناتجة عن الإهمال.", riskLevel: "medium", sourcePage: 7 },
  ]);
  await db.insert(contractFinancialDetailsTable).values([
    { contractId: rentalContract.id, type: "monthly_payment", amount: 3000, currency: "SAR", description: "الإيجار الشهري" },
    { contractId: rentalContract.id, type: "deposit", amount: 6000, currency: "SAR", description: "مبلغ التأمين" },
    { contractId: rentalContract.id, type: "cancellation_penalty", amount: 3000, currency: "SAR", description: "غرامة الإخلاء المبكر" },
  ]);
  await db.insert(contractDatesTable).values([
    { contractId: rentalContract.id, type: "start", date: "2026-09-01", description: "تاريخ بداية الإيجار" },
    { contractId: rentalContract.id, type: "end", date: "2027-08-31", description: "تاريخ انتهاء العقد" },
  ]);

  // Contract 3: Telecom (high risk)
  const [telecomContract] = await db.insert(contractsTable).values({
    userId: demoUser.id, title: "عقد خدمات الاتصالات - باقة 5G", contractType: "telecom_contract",
    originalFileName: "telecom-5g-contract.pdf", language: "ar",
    extractedText: "عقد اشتراك في خدمات الاتصالات...", status: "analyzed",
    clarityScore: 55, clarityExplanation: "تحتوي الوثيقة على شروط مخفية وغامضة.", confidence: 0.85,
    summary: "عقد خدمات اتصالات لمدة 24 شهرًا مع شروط تقييد مشددة وغرامة إلغاء عالية.",
    startDate: "2025-01-15", endDate: "2027-01-14", duration: "24 شهرًا",
    totalCost: 4800, currency: "SAR", monthlyPayment: 200,
    automaticRenewal: true, renewalNoticeDays: 60, cancellationAllowed: true,
    cancellationNoticeDays: 30, earlyCancellationPenalty: 1200,
    suggestedQuestions: ["ما هي نطاقات التغطية المشمولة؟", "هل يمكن تغيير الباقة خلال فترة العقد؟"],
  }).returning();

  await db.insert(contractPartiesTable).values([
    { contractId: telecomContract.id, name: "أحمد الغامدي", role: "subscriber" },
    { contractId: telecomContract.id, name: "شركة الاتصالات السعودية", role: "provider" },
  ]);
  await db.insert(contractClausesTable).values([
    { contractId: telecomContract.id, category: "renewal", title: "إشعار مسبق للإنهاء مدته 60 يومًا", simpleExplanation: "يلزم الإخطار قبل 60 يومًا من الإنهاء وإلا يُجدَّد تلقائيًا.", riskLevel: "high", sourcePage: 3 },
    { contractId: telecomContract.id, category: "cancellation", title: "غرامة الإلغاء المبكر", simpleExplanation: "غرامة 1200 ريال عند الإلغاء قبل انتهاء العقد.", riskLevel: "high", sourcePage: 5 },
    { contractId: telecomContract.id, category: "liability", title: "حدود المسؤولية", simpleExplanation: "الشركة غير مسؤولة عن انقطاع الخدمة لأسباب خارجية.", riskLevel: "medium", sourcePage: 8 },
  ]);
  await db.insert(contractFinancialDetailsTable).values([
    { contractId: telecomContract.id, type: "monthly_payment", amount: 200, currency: "SAR", description: "الرسوم الشهرية" },
    { contractId: telecomContract.id, type: "cancellation_penalty", amount: 1200, currency: "SAR", description: "غرامة الإلغاء المبكر" },
  ]);
  await db.insert(contractDatesTable).values([
    { contractId: telecomContract.id, type: "start", date: "2025-01-15", description: "تاريخ بداية العقد" },
    { contractId: telecomContract.id, type: "end", date: "2027-01-14", description: "تاريخ انتهاء العقد" },
    { contractId: telecomContract.id, type: "cancellation_deadline", date: "2026-11-14", description: "آخر موعد للإلغاء بدون تجديد" },
  ]);

  // Contract 4: Employment (mostly low risk)
  const [employmentContract] = await db.insert(contractsTable).values({
    userId: demoUser.id, title: "عقد عمل - مهندس برمجيات أول", contractType: "employment_contract",
    originalFileName: "employment-contract-2026.pdf", language: "ar",
    extractedText: "عقد عمل بين الموظف والشركة...", status: "analyzed",
    clarityScore: 82, clarityExplanation: "العقد واضح ومنظم بشكل جيد مع تفاصيل كافية.", confidence: 0.93,
    summary: "عقد عمل دائم بمرتب شهري ومزايا وظيفية شاملة.",
    startDate: "2026-10-01", duration: "غير محدد المدة",
    currency: "SAR", monthlyPayment: 15000, annualPayment: 180000,
    automaticRenewal: false, cancellationAllowed: true, cancellationNoticeDays: 30,
    suggestedQuestions: ["ما هي شروط الزيادة السنوية في الراتب؟", "هل يشمل العقد تأمينًا صحيًا للأسرة؟", "ما هي إجراءات إنهاء العقد من قِبل الشركة؟"],
  }).returning();

  await db.insert(contractPartiesTable).values([
    { contractId: employmentContract.id, name: "أحمد الغامدي", role: "employee" },
    { contractId: employmentContract.id, name: "شركة التقنية المتقدمة", role: "employer" },
  ]);
  await db.insert(contractClausesTable).values([
    { contractId: employmentContract.id, category: "non_compete", title: "بند عدم المنافسة", simpleExplanation: "لا يمكن العمل في شركات منافسة لمدة سنة بعد انتهاء العقد.", riskLevel: "high", sourcePage: 9 },
    { contractId: employmentContract.id, category: "general", title: "فترة التجربة", simpleExplanation: "فترة تجربة 90 يومًا يمكن خلالها إنهاء العقد بدون تعويض.", riskLevel: "medium", sourcePage: 2 },
    { contractId: employmentContract.id, category: "payment", title: "الراتب والمزايا", simpleExplanation: "راتب شهري 15,000 ريال + مكافأة سنوية حسب الأداء.", riskLevel: "low", sourcePage: 3 },
  ]);
  await db.insert(contractFinancialDetailsTable).values([
    { contractId: employmentContract.id, type: "monthly_payment", amount: 15000, currency: "SAR", description: "الراتب الشهري الأساسي" },
    { contractId: employmentContract.id, type: "bonus", amount: 30000, currency: "SAR", description: "مكافأة سنوية مشروطة بالأداء" },
  ]);
  await db.insert(contractDatesTable).values([
    { contractId: employmentContract.id, type: "start", date: "2026-10-01", description: "تاريخ بداية العمل" },
    { contractId: employmentContract.id, type: "probation_end", date: "2026-12-30", description: "نهاية فترة التجربة" },
  ]);

  // Reminders
  await db.insert(remindersTable).values([
    { userId: demoUser.id, contractId: gymContract.id, title: "آخر موعد للإلغاء قبل التجديد التلقائي", reminderDate: "2027-07-01", type: "renewal", completed: false },
    { userId: demoUser.id, contractId: telecomContract.id, title: "آخر موعد لإلغاء عقد الاتصالات", reminderDate: "2026-11-14", type: "cancellation", completed: false },
    { userId: demoUser.id, contractId: rentalContract.id, title: "إشعار تجديد عقد الإيجار", reminderDate: "2027-07-01", type: "renewal", completed: false },
  ]);

  // Activity logs
  await db.insert(activityLogsTable).values([
    { userId: demoUser.id, action: "upload_contract", entityType: "contract", entityId: gymContract.id },
    { userId: demoUser.id, action: "analyze_contract", entityType: "contract", entityId: gymContract.id },
    { userId: demoUser.id, action: "upload_contract", entityType: "contract", entityId: rentalContract.id },
    { userId: demoUser.id, action: "analyze_contract", entityType: "contract", entityId: rentalContract.id },
    { userId: demoUser.id, action: "upload_contract", entityType: "contract", entityId: telecomContract.id },
    { userId: demoUser.id, action: "analyze_contract", entityType: "contract", entityId: telecomContract.id },
    { userId: demoUser.id, action: "upload_contract", entityType: "contract", entityId: employmentContract.id },
    { userId: demoUser.id, action: "analyze_contract", entityType: "contract", entityId: employmentContract.id },
  ]);

  console.log("✅ Seeded successfully! Contract IDs:", gymContract.id, rentalContract.id, telecomContract.id, employmentContract.id);
  process.exit(0);
}

seed().catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); });
