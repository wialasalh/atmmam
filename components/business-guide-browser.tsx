"use client";

import { useMemo, useState } from "react";
import { businessGuide } from "@/data/site";

export function BusinessGuideBrowser() {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);
  const filteredGuide = useMemo(() => {
    if (!normalizedQuery) return businessGuide;
    return businessGuide
      .map((group) => ({
        ...group,
        questions: group.questions.filter((item) => {
          const text = normalize(`${group.category} ${item.question} ${item.answer}`);
          return text.includes(normalizedQuery);
        }),
      }))
      .filter((group) => group.questions.length > 0);
  }, [normalizedQuery]);

  const resultCount = filteredGuide.reduce((total, group) => total + group.questions.length, 0);

  return (
    <>
      <div className="bg-search">
        <div className="bg-search-inner">
          <label className="bg-search-field">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن سؤال..."
            />
          </label>
          {normalizedQuery ? (
            <p className="bg-result-count">{resultCount} نتيجة</p>
          ) : null}
        </div>
      </div>

      <div className="bg-sections">
        {filteredGuide.length ? (
          filteredGuide.map((group) => (
            <section className="bg-section" key={group.category}>
              <div className="bg-section-head">
                <div>
                  <p className="eyebrow">أسئلة شائعة</p>
                  <h2>{group.category}</h2>
                  <p>{group.description}</p>
                </div>
                <a className="button ghost" href={group.href}>
                  الخدمة المرتبطة ←
                </a>
              </div>
              <div className="bg-questions">
                {group.questions.map((item) => (
                  <details className="bg-question" key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="bg-empty">
            <h3>لا توجد نتيجة مطابقة</h3>
            <p>جرّب كلمة أقصر مثل: سجل، رخصة، قوى، ضريبة.</p>
            <button type="button" className="button ghost" onClick={() => setQuery("")}>
              عرض كل الأسئلة
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF\w\s]/g, "")
    .replace(/\s+/g, " ");
}
