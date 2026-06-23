"use client";

import Link from "next/link";
import {
  ArrowUpLeft,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  FileCheck2,
  Landmark,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { services } from "@/data/site";
import { servicesEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";

const icons: Record<string, LucideIcon> = {
  "company-formation": Building2,
  "government-platforms": Landmark,
  licenses: FileCheck2,
  accreditation: BadgeCheck,
  legal: BookOpenCheck,
  "hr-wages": UsersRound,
};

const serviceTags = {
  ar: {
    "company-formation": ["تأسيس", "تشغيل أولي"],
    "government-platforms": ["منصات", "متابعة"],
    licenses: ["تراخيص", "تصاريح"],
    accreditation: ["تأهيل", "اعتمادات"],
    legal: ["توثيق", "صياغة"],
    "hr-wages": ["موظفون", "حماية أجور"],
  },
  en: {
    "company-formation": ["Formation", "Launch"],
    "government-platforms": ["Platforms", "Follow-up"],
    licenses: ["Licenses", "Permits"],
    accreditation: ["Qualification", "Accreditation"],
    legal: ["Documentation", "Drafting"],
    "hr-wages": ["Employees", "Wage protection"],
  },
} as const;

export function ServicesSection() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const data = isAr ? services : servicesEn;
  const visibleServices = data.slice(0, 6);
  const ActionIcon = isAr ? ArrowUpLeft : ArrowUpRight;
  const tags = isAr ? serviceTags.ar : serviceTags.en;

  return (
    <section className="section services" id="services">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isAr ? "خدماتنا" : "Our Services"}</p>
          <h2>{isAr ? "خدماتنا الأكثر طلباً" : "Our most requested services"}</h2>
          <p>{isAr ? "ابدأ بالخدمة الأقرب لوضع منشأتك، وسنرتب معك بقية المسار." : "Start with the service closest to your situation, and we'll organize the rest of the journey with you."}</p>
        </div>
        <Link className="button secondary section-head-action" href={isAr ? "/services" : "/en/services"}>
          {isAr ? "عرض جميع الخدمات" : "View all services"}
        </Link>
      </div>
      <div className="service-list">
        {visibleServices.map((s, index) => {
          const Icon = icons[s.id];
          const serviceLabels = tags[s.id as keyof typeof tags] || [];
          return (
          <article className="service-card" key={s.id}>
            <div className="service-card-top">
              <span className="service-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="service-icon">{Icon ? <Icon aria-hidden="true" /> : null}</span>
            </div>
            <div className="service-card-tags" aria-label={isAr ? "تصنيف الخدمة" : "Service categories"}>
              {serviceLabels.map((label) => <span key={label}>{label}</span>)}
            </div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <Link className="service-link" href={isAr ? `/services/${s.id}` : `/en/services/${s.id}`}>
              {isAr ? "تفاصيل الخدمة" : "Service details"}
              <ActionIcon aria-hidden="true" />
            </Link>
          </article>
          );
        })}
      </div>
    </section>
  );
}
