"use client";

import { useState } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Calculator,
  ClipboardCheck,
  Compass,
  ListChecks,
  Search,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { freeTools } from "@/data/site";
import { freeToolsEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";

const toolIcons: Record<string, LucideIcon> = {
  "labor-calculator": Calculator,
  "operation-readiness": ClipboardCheck,
  "nitaqat-indicator": UsersRound,
  "company-formation-checklist": ListChecks,
  "activity-requirements": Compass,
  "formation-cost-estimator": BadgeDollarSign,
};

const toolCategories: Record<string, "formation" | "operations" | "workforce"> = {
  "labor-calculator": "workforce",
  "operation-readiness": "operations",
  "nitaqat-indicator": "workforce",
  "company-formation-checklist": "formation",
  "activity-requirements": "operations",
  "formation-cost-estimator": "formation",
};

export function FreeToolsSection({ compact = false, directoryMode = false }: { compact?: boolean; directoryMode?: boolean }) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const data = isAr ? freeTools : freeToolsEn;
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const ActionIcon = isAr ? ArrowUpLeft : ArrowUpRight;
  const categories = [
    { id: "all", label: isAr ? "الكل" : "All" },
    { id: "formation", label: isAr ? "التأسيس والتكلفة" : "Formation & cost" },
    { id: "operations", label: isAr ? "التشغيل والامتثال" : "Operations & compliance" },
    { id: "workforce", label: isAr ? "الموظفون والتوطين" : "Workforce & Saudization" },
  ];
  const categoryLabel = (slug: string) => categories.find((category) => category.id === toolCategories[slug])?.label;

  const source = compact ? data.slice(0, 4) : data;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleTools = source.filter((tool) => {
    const slug = tool.href.split("/").pop() || "";
    const matchesCategory = activeCategory === "all" || toolCategories[slug] === activeCategory;
    const searchableText = [tool.title, tool.body, ...tool.points].join(" ").toLocaleLowerCase();
    return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
  const resultCountLabel = isAr
    ? visibleTools.length === 0
      ? "لا توجد أدوات مطابقة"
      : visibleTools.length === 1
        ? "أداة واحدة متاحة"
        : visibleTools.length === 2
          ? "أداتان متاحتان"
          : `${visibleTools.length} أدوات متاحة`
    : `${visibleTools.length} ${visibleTools.length === 1 ? "tool" : "tools"} available`;

  return (
    <section className={`section free-tools-section ${compact ? "is-compact" : ""} ${directoryMode ? "is-directory" : ""}`} id="free-tools">
      {!directoryMode ? (
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isAr ? "أدوات مجانية" : "Free Tools"}</p>
            <h2>{isAr ? "أدوات تساعد صاحب المنشأة قبل طلب الخدمة." : "Tools that help business owners before requesting a service."}</h2>
            <p>{isAr ? "نحوّل الأسئلة المتكررة إلى أدوات عملية تختصر الوقت وتوضح الخطوة التالية." : "We turn common questions into practical tools that save time and clarify the next step."}</p>
          </div>
          {compact ? (
            <a className="button secondary free-tools-head-action" href={isAr ? "/tools" : "/en/tools"}>
              {isAr ? "عرض كل الأدوات" : "View all tools"}
            </a>
          ) : null}
        </div>
      ) : (
        <div className="tools-directory-bar">
          <label className="tools-search-field">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isAr ? "ابحث باسم الأداة أو النتيجة التي تريدها" : "Search by tool or outcome"}
              aria-label={isAr ? "البحث في الأدوات" : "Search tools"}
            />
          </label>
          <div className="tools-category-filters" aria-label={isAr ? "تصنيف الأدوات" : "Tool categories"}>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                aria-pressed={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <p className="tools-result-count" role="status">
            {resultCountLabel}
          </p>
        </div>
      )}

      <div className="free-tools-grid">
        {visibleTools.map((tool) => {
          const slug = tool.href.split("/").pop() || "";
          const Icon = toolIcons[slug];
          return (
            <a className="free-tool-card" href={isAr ? tool.href : `/en${tool.href}`} key={tool.title}>
              <span className="free-tool-icon">{Icon ? <Icon aria-hidden="true" /> : null}</span>
              <span className="free-tool-body">
                {compact ? (
                  <span className="free-tool-availability">
                    <i aria-hidden="true" />
                    {tool.status}
                  </span>
                ) : directoryMode ? (
                  <span className="free-tool-meta">
                    <small>{categoryLabel(slug)}</small>
                    <small>{tool.status}</small>
                  </span>
                ) : null}
                <h3>{tool.title}</h3>
                <p>{tool.body}</p>
              </span>
              <span className="free-tool-action">
                {isAr ? "ابدأ الآن" : "Start now"}
                <ActionIcon aria-hidden="true" />
              </span>
            </a>
          );
        })}
      </div>

      {directoryMode && visibleTools.length === 0 ? (
        <div className="tools-empty-state">
          <h3>{isAr ? "لم نجد أداة مطابقة" : "No matching tool found"}</h3>
          <p>{isAr ? "جرّب كلمة أقصر أو اختر تصنيفًا مختلفًا." : "Try a shorter term or another category."}</p>
          <button type="button" onClick={() => { setQuery(""); setActiveCategory("all"); }}>
            {isAr ? "عرض جميع الأدوات" : "Show all tools"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
