"use client";

import { ArrowUpLeft, ArrowUpRight, BookOpen, CircleHelp, LibraryBig, Search } from "lucide-react";
import { businessGuide } from "@/data/site";
import { businessGuideEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";

export function BusinessGuidePromo() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const data = isAr ? businessGuide : businessGuideEn;
  const featuredQuestions = data.flatMap((group) => group.questions.slice(0, 1)).slice(0, 3);
  const featuredCategories = data.slice(0, 6);
  const questionsCount = data.reduce((total, group) => total + group.questions.length, 0);
  const ActionIcon = isAr ? ArrowUpLeft : ArrowUpRight;

  return (
    <section className="section guide-promo-section" id="business-guide">
      <div className="guide-promo">
        <div className="guide-promo-copy">
          <p className="eyebrow">
            <span className="section-badge">{isAr ? "جديد" : "New"}</span> {isAr ? "دليل الأعمال" : "Business Guide"}
          </p>
          <h2>{isAr ? "إجابات مباشرة على الأسئلة التي يبحث عنها أصحاب المنشآت." : "Direct answers to the questions business owners search for."}</h2>
          <p>
            {isAr ? "محتوى مختصر يساعد الزائر يفهم الفرق بين السجل والرخصة، متطلبات المنصات، حماية الأجور، والزكاة والضريبة قبل طلب الخدمة." : "Concise content to help visitors understand the difference between a register and license, platform requirements, wage protection, and zakat & tax before requesting a service."}
          </p>
          <div className="guide-promo-stats" aria-label={isAr ? "محتوى دليل الأعمال" : "Business guide content"}>
            <span>
              <LibraryBig aria-hidden="true" />
              <small><strong>{data.length}</strong>{isAr ? " أقسام" : " sections"}</small>
            </span>
            <span>
              <CircleHelp aria-hidden="true" />
              <small><strong>{questionsCount}</strong>{isAr ? " سؤال وجواب" : " Q&A"}</small>
            </span>
          </div>
          <a className="button primary" href={isAr ? "/business-guide" : "/en/business-guide"}>
            <span>{isAr ? "تصفح دليل الأعمال" : "Browse Business Guide"}</span>
            <ActionIcon aria-hidden="true" size={18} />
          </a>
        </div>
        <div className="guide-promo-board" aria-label={isAr ? "محتوى مختار من دليل الأعمال" : "Selected content from Business Guide"}>
          <div className="guide-board-block">
            <strong><Search aria-hidden="true" />{isAr ? "موضوعات يكثر البحث عنها" : "Popular topics"}</strong>
            <div className="guide-category-pills">
              {featuredCategories.map((group) => (
                <a href={isAr ? group.href : `/en${group.href}`} key={group.category}>{group.category}</a>
              ))}
            </div>
          </div>
          <div className="guide-board-block">
            <strong><BookOpen aria-hidden="true" />{isAr ? "أسئلة مختارة" : "Selected questions"}</strong>
            <div className="guide-question-list" aria-label={isAr ? "أسئلة شائعة في دليل الأعمال" : "FAQ from Business Guide"}>
              {featuredQuestions.map((item, index) => (
                <a href={isAr ? "/business-guide" : "/en/business-guide"} key={item.question}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.question}</strong>
                  <ActionIcon aria-hidden="true" size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
