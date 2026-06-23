"use client";

import { hero } from "@/data/site";
import { heroEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";
import { ArrowLeft, Building2, CircleEllipsis, Clock3, FileCheck2, Layers3, MonitorCog, ShieldCheck, Smile, Store, UsersRound } from "lucide-react";

export function HeroSection() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const h = isAr ? hero : heroEn;

  return (
    <section className="hero section">
      <div className="hero-copy">
        <p className="eyebrow">{h.eyebrow}</p>
        <h1 className="hero-title">{isAr ? "نرتّب إجراءات منشأتك بلا تشتت" : "Your business procedures, no scattered effort."}</h1>
        <p className="hero-text">{h.body}</p>
        <div className="hero-assurances" aria-label={isAr ? "مزايا متابعة الطلب" : "Request follow-up benefits"}>
          <span>{isAr ? "فهم سريع لطلبك" : "Quick request diagnosis"}</span>
          <span>{isAr ? "متابعة شفافة" : "Transparent follow-up"}</span>
          <span>{isAr ? "نتيجة موثقة" : "Documented outcome"}</span>
        </div>
        <div className="hero-actions">
          <a className="button primary" href={isAr ? h.primaryCta.href : `/en${h.primaryCta.href}`}>
            {h.primaryCta.label}
          </a>
          <a className="button secondary" href={isAr ? h.secondaryCta.href : `/en${h.secondaryCta.href}`}>
            {h.secondaryCta.label}
          </a>
        </div>
      </div>
      <aside className="hero-situation" aria-label={isAr ? "اختر وضعك الحالي" : "Choose Your Situation"}>
        <div className="situation-heading">
          <span className="situation-kicker">{isAr ? "دليل الخدمات" : "Service Guide"}</span>
          <h2>{isAr ? "ما الذي تريد إنجازه؟" : "What do you need to accomplish?"}</h2>
          <p>{isAr ? "اختر احتياجك وسنأخذك مباشرة إلى الخدمات المناسبة." : "Choose what you need and we'll take you to the right services."}</p>
        </div>
        <div className="situation-options">
          <a href={isAr ? "/services/company-formation" : "/en/services/company-formation"}>
            <Store aria-hidden="true" />
            <span><strong>{isAr ? "تأسيس منشأة" : "Start a business"}</strong><small>{isAr ? "السجل والعقود والبداية النظامية" : "Registration, contracts, and setup"}</small></span>
            <ArrowLeft className="situation-arrow" aria-hidden="true" />
          </a>
          <a href={isAr ? "/services/government-platforms" : "/en/services/government-platforms"}>
            <MonitorCog aria-hidden="true" />
            <span><strong>{isAr ? "حل مشكلة منصة" : "Resolve a platform issue"}</strong><small>{isAr ? "تشخيص الخلل ومتابعة المعالجة" : "Diagnose and follow up the issue"}</small></span>
            <ArrowLeft className="situation-arrow" aria-hidden="true" />
          </a>
          <a href={isAr ? "/services/licenses" : "/en/services/licenses"}>
            <FileCheck2 aria-hidden="true" />
            <span><strong>{isAr ? "ترخيص أو ملاحظة" : "License or notice"}</strong><small>{isAr ? "إصدار وتجديد ومعالجة الملاحظات" : "Issue, renew, and resolve notices"}</small></span>
            <ArrowLeft className="situation-arrow" aria-hidden="true" />
          </a>
          <a href={isAr ? "/services" : "/en/services"}>
            <CircleEllipsis aria-hidden="true" />
            <span><strong>{isAr ? "طلب مختلف" : "Another request"}</strong><small>{isAr ? "استعرض جميع خدمات أتمم" : "Browse all Atmmam services"}</small></span>
            <ArrowLeft className="situation-arrow" aria-hidden="true" />
          </a>
        </div>
      </aside>
      <div className="hero-process" aria-label={isAr ? "رحلة الطلب" : "Request journey"}>
        <span><b>1</b><strong>{isAr ? "الجهة" : "Authority"}</strong><small>{isAr ? "نحدد الجهة المختصة" : "Identify the authority"}</small></span>
        <span><b>2</b><strong>{isAr ? "المتطلبات" : "Requirements"}</strong><small>{isAr ? "نرتب المطلوب بوضوح" : "Organize requirements"}</small></span>
        <span><b>3</b><strong>{isAr ? "المتابعة" : "Follow-up"}</strong><small>{isAr ? "نحدثك في كل خطوة" : "Update every step"}</small></span>
        <span><b>4</b><strong>{isAr ? "النتيجة" : "Outcome"}</strong><small>{isAr ? "تسليم واضح وموثق" : "Clear documented handoff"}</small></span>
      </div>
      <div className="hero-badges" aria-label={isAr ? "أرقام أتمم" : "Atmmam Numbers"}>
        <span className="hero-badge"><Layers3 aria-hidden="true" /><strong dir="ltr">+300</strong><small>{isAr ? "خدمة نقدمها بمختلف الجهات والقطاعات" : "Services across authorities and sectors"}</small></span>
        <span className="hero-badge"><Building2 aria-hidden="true" /><strong dir="ltr">+120</strong><small>{isAr ? "جهة حكومية وشبه حكومية" : "Government and semi-government entities"}</small></span>
        <span className="hero-badge"><Smile aria-hidden="true" /><strong dir="ltr">98%</strong><small>{isAr ? "رضا العملاء عن خدماتنا" : "Customer satisfaction"}</small></span>
        <span className="hero-badge"><Clock3 aria-hidden="true" /><strong dir="ltr">24–72</strong><small>{isAr ? "ساعة متوسط إنجاز الطلب" : "Hours average completion"}</small></span>
        <span className="hero-badge"><UsersRound aria-hidden="true" /><strong dir="ltr">+50,000</strong><small>{isAr ? "عميل من مختلف المنشآت" : "Customers across businesses"}</small></span>
        <span className="hero-badge hero-trust-badge"><ShieldCheck aria-hidden="true" /><strong>{isAr ? "معتمدون وموثوقون" : "Accredited & trusted"}</strong><small>{isAr ? "نحافظ على أعلى معايير الامتثال وأمن المعلومات" : "High standards of compliance and information security"}</small></span>
      </div>
    </section>
  );
}
