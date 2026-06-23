"use client";

import { useLocale } from "@/lib/language-context";

const agenciesAr = [
  { name: "وزارة التجارة", logo: "/assets/agencies/ministry-commerce.png" },
  { name: "وزارة الصناعة والثروة المعدنية", logo: "/assets/agencies/ministry-industry.svg" },
  { name: "وزارة البلديات والإسكان", logo: "/assets/agencies/ministry-municipalities-housing.svg" },
  { name: "هيئة الزكاة والضريبة والجمارك", logo: "/assets/agencies/zatca-official.svg" },
  { name: "وزارة الموارد البشرية والتنمية الاجتماعية", logo: "/assets/agencies/ministry-human-resources.svg" },
  { name: "التأمينات الاجتماعية", logo: "/assets/agencies/gosi.svg" },
  { name: "منصة قوى", logo: "/assets/agencies/qiwa-official.svg" },
  { name: "برنامج مُدد", logo: "/assets/agencies/mudad.svg" },
];

const agenciesEn = [
  { name: "Ministry of Commerce", logo: "/assets/agencies/ministry-commerce.png" },
  { name: "Ministry of Industry and Mineral Resources", logo: "/assets/agencies/ministry-industry.svg" },
  { name: "Ministry of Municipalities and Housing", logo: "/assets/agencies/ministry-municipalities-housing.svg" },
  { name: "Zakat, Tax and Customs Authority", logo: "/assets/agencies/zatca-official.svg" },
  { name: "Ministry of Human Resources and Social Development", logo: "/assets/agencies/ministry-human-resources.svg" },
  { name: "General Organization for Social Insurance", logo: "/assets/agencies/gosi.svg" },
  { name: "Qiwa", logo: "/assets/agencies/qiwa-official.svg" },
  { name: "Mudad", logo: "/assets/agencies/mudad.svg" },
];

export function AgenciesBar() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const agencies = isAr ? agenciesAr : agenciesEn;

  return (
    <section className="agencies-bar section">
      <div className="agencies-frame">
        <p className="agencies-label">{isAr ? "نتعامل مع أكثر من 12 جهة" : "We work with more than 12 authorities"}</p>
        <div className="agencies-logos">
          {agencies.map(({ name, logo }) => (
            <span
              key={name}
              className={`agency-logo-card${logo.includes("qiwa-") ? " agency-logo-card--qiwa" : ""}${logo.includes("ministry-commerce") ? " agency-logo-card--commerce" : ""}${logo.includes("ministry-municipalities") ? " agency-logo-card--municipalities" : ""}${logo.includes("zatca") ? " agency-logo-card--zatca" : ""}`}
              title={name}
            >
              <span className="agency-logo-viewport">
                <img src={logo} alt={name} loading="lazy" />
              </span>
            </span>
          ))}
        </div>
        <a className="agencies-all" href={isAr ? "/services" : "/en/services"}>
          {isAr ? "عرض جميع الجهات" : "View all authorities"}
        </a>
      </div>
    </section>
  );
}
