"use client";

import { ClipboardCheck, FileCheck2, MessageCircle, ScanSearch } from "lucide-react";
import { useLocale } from "@/lib/language-context";

const problemsAr = [
  {
    title: "تشتت بين الجهات",
    body: "الطلب يبدأ من منصة، ثم يتوقف عند جهة أخرى أو صلاحية غير جاهزة.",
    impact: "نرتب العلاقة بين الجهة والطلب.",
  },
  {
    title: "رفض بسبب نقص بسيط",
    body: "مستند أو معلومة صغيرة تؤخر الإجراء وتعيدك لنقطة البداية.",
    impact: "نراجع النواقص قبل الرفع.",
  },
  {
    title: "مهل لا تُتابع",
    body: "تجديدات وتنبيهات متفرقة تظهر في وقت غير مناسب وتؤثر على التشغيل.",
    impact: "نرتب الأولويات حسب الأثر.",
  },
  {
    title: "ملاحظات غير مفهومة",
    body: "رسائل حكومية مختصرة لا توضّح المطلوب أو سبب التعطّل.",
    impact: "نحوّلها إلى إجراء واضح.",
  },
];

const journeyStepsAr = [
  {
    number: "١",
    title: "تواصل معنا",
    body: "تصف لنا طلبك أو التنبيه أو الهدف اللي تريد توصل له، وتترك لنا الباقي.",
  },
  {
    number: "٢",
    title: "نشخص ونرتب",
    body: "نحدد الجهة المناسبة، المتطلبات الناقصة، والخطوات المطلوبة قبل البدء.",
  },
  {
    number: "٣",
    title: "ننفذ ونتابع",
    body: "نرفع الطلب، نتابع الملاحظات، ونحدثك بكل تطور دون تحتاج تسأل.",
  },
  {
    number: "٤",
    title: "تستلم النتيجة",
    body: "ملخص واضح بما تم، ما ينتظرك، والخطوة التالية بدون رسائل مبهمة.",
  },
];

const problemsEn = [
  {
    title: "Scattered across authorities",
    body: "The request starts on one platform, then gets stuck at another authority or an incomplete approval.",
    impact: "We organize the relationship between the authority and the request.",
  },
  {
    title: "Rejection due to minor deficiency",
    body: "One document or small piece of information delays the process and sends you back to square one.",
    impact: "We review deficiencies before submission.",
  },
  {
    title: "Deadlines not tracked",
    body: "Scattered renewals and notifications appear at the wrong time and affect operations.",
    impact: "We prioritize by impact.",
  },
  {
    title: "Unclear observations",
    body: "Brief government messages that don't explain what's required or the reason for the delay.",
    impact: "We turn them into clear actions.",
  },
];

const journeyStepsEn = [
  {
    number: "1",
    title: "Contact us",
    body: "Describe your request, notification, or goal and leave the rest to us.",
  },
  {
    number: "2",
    title: "We diagnose and organize",
    body: "We identify the right authority, missing requirements, and steps needed before starting.",
  },
  {
    number: "3",
    title: "We execute and follow up",
    body: "We submit the request, track observations, and keep you updated without having to ask.",
  },
  {
    number: "4",
    title: "You receive the result",
    body: "A clear summary of what was done, what's pending, and the next step with no vague messages.",
  },
];

export function HomeGrowthSections() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const problems = isAr ? problemsAr : problemsEn;
  const journeySteps = isAr ? journeyStepsAr : journeyStepsEn;
  const journeyIcons = [MessageCircle, ScanSearch, ClipboardCheck, FileCheck2];

  return (
    <section className="section journey-section" id="how-it-works">
      <div className="journey-panel">
        <div className="journey-copy">
          <div>
            <p className="eyebrow">{isAr ? "كيف نعمل" : "How we work"}</p>
            <h2>{isAr ? "من أول رسالة إلى نتيجة واضحة" : "From the first message to a clear result"}</h2>
          </div>
          <p>
            {isAr ? "مسار بسيط يوضح لك ما يحدث بعد التواصل، من فهم الطلب إلى تسليم ملخص واضح." : "A simple path that shows what happens after you contact us, from understanding the request to delivering a clear summary."}
          </p>
        </div>
        <div className="journey-track">
          {journeySteps.map((step, index) => (
            <div className="journey-step" key={step.title}>
              <div className="journey-step-head">
                <span className="journey-num">{step.number}</span>
                <span className="journey-step-icon" aria-hidden="true">
                  {(() => {
                    const Icon = journeyIcons[index];
                    return <Icon size={22} strokeWidth={2} />;
                  })()}
                </span>
              </div>
              <div className="journey-step-copy">
                <span className="journey-step-label">
                  {isAr ? `الخطوة ${step.number}` : `Step ${step.number}`}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              {index < journeySteps.length - 1 ? <span className="journey-arrow" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
