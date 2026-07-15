import React from "react";
import { useApp } from "../components/app-provider";

type Dictionary = {
  [key: string]: {
    ar: string;
    en: string;
  };
};

const dict: Dictionary = {
  "nav.dashboard": { ar: "لوحة التحكم", en: "Dashboard" },
  "nav.contracts": { ar: "العقود", en: "Contracts" },
  "nav.upload": { ar: "رفع عقد", en: "Upload" },
  "nav.compare": { ar: "مقارنة", en: "Compare" },
  "nav.reminders": { ar: "التنبيهات", en: "Reminders" },
  "nav.settings": { ar: "الإعدادات", en: "Settings" },
  "nav.admin": { ar: "الإدارة", en: "Admin" },
  "nav.about": { ar: "عن دليل", en: "About" },
  "nav.logout": { ar: "تسجيل الخروج", en: "Logout" },
  "nav.signin": { ar: "تسجيل الدخول", en: "Sign In" },
  "nav.signup": { ar: "حساب جديد", en: "Sign Up" },
  
  "home.hero.title": { ar: "افهم قبل أن توافق", en: "Understand before you agree" },
  "home.hero.subtitle": { ar: "منصة دليل تحلل عقودك واشتراكاتك في ثوانٍ، وتكشف لك البنود الخفية والمخاطر لتقرر بثقة.", en: "Daleel analyzes your contracts and subscriptions in seconds, revealing hidden clauses and risks so you can decide with confidence." },
  "home.hero.cta": { ar: "حلل عقدك الأول مجاناً", en: "Analyze your first contract for free" },
  
  // common
  "common.save": { ar: "حفظ", en: "Save" },
  "common.cancel": { ar: "إلغاء", en: "Cancel" },
  "common.delete": { ar: "حذف", en: "Delete" },
  "common.loading": { ar: "جاري التحميل...", en: "Loading..." },
  "common.error": { ar: "حدث خطأ ما.", en: "An error occurred." },
  "common.back": { ar: "رجوع", en: "Back" },
  "common.next": { ar: "التالي", en: "Next" },
  
  // contract status
  "status.pending": { ar: "قيد الانتظار", en: "Pending" },
  "status.processing": { ar: "جاري المعالجة", en: "Processing" },
  "status.analyzed": { ar: "تم التحليل", en: "Analyzed" },
  "status.failed": { ar: "فشل التحليل", en: "Failed" },
  
  // contract types
  "type.rental_agreement": { ar: "عقد إيجار", en: "Rental Agreement" },
  "type.employment_contract": { ar: "عقد عمل", en: "Employment Contract" },
  "type.gym_membership": { ar: "اشتراك نادي رياضي", en: "Gym Membership" },
  "type.telecom_contract": { ar: "عقد اتصالات", en: "Telecom Contract" },
  "type.software_subscription": { ar: "اشتراك برمجي", en: "Software Subscription" },
  "type.service_agreement": { ar: "اتفاقية خدمة", en: "Service Agreement" },
  "type.insurance_policy": { ar: "وثيقة تأمين", en: "Insurance Policy" },
  "type.car_financing": { ar: "تمويل سيارة", en: "Car Financing" },
  "type.travel_terms": { ar: "شروط سفر وفندق", en: "Travel Terms" },
  "type.education_contract": { ar: "عقد تعليمي", en: "Education Contract" },
};

export function useTranslation() {
  const { language } = useApp();
  
  const t = (key: string): string => {
    if (!dict[key]) return key;
    return dict[key][language] || key;
  };
  
  return { t, language };
}
