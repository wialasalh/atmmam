"use client";

import { ChevronDown } from "lucide-react";
import { faqs as staticFaqs } from "@/data/site";
import { faqsEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";
import { useEffect, useState } from "react";

type FaqItem = { question: string; answer: string };

export function FaqSection() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const [dbFaqs, setDbFaqs] = useState<FaqItem[] | null>(null);

  useEffect(() => {
    if (!isAr) return;
    fetch("/api/admin/content")
      .then(r => r.json())
      .then(j => { if (Array.isArray(j.data?.faq?.data)) setDbFaqs(j.data.faq.data); })
      .catch(() => {});
  }, [isAr]);

  const data = isAr ? (dbFaqs ?? staticFaqs) : faqsEn;
  const visibleFaqs = data.slice(0, 3);

  return (
    <section className="section faq" id="faq">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isAr ? "الأسئلة الشائعة" : "FAQ"}</p>
          <h2>{isAr ? "أسئلة نفضل الإجابة عنها مبكراً." : "Questions we prefer to answer early."}</h2>
        </div>
        <a className="button secondary section-head-action" href={isAr ? "/faq" : "/en/faq"}>{isAr ? "عرض الأسئلة كاملة" : "View all questions"}</a>
      </div>
      <div className="faq-list">
        {visibleFaqs.map((item, index) => (
          <details key={item.question} name="home-faq" open={index === 0}>
            <summary>
              <span className="faq-index">{String(index + 1).padStart(2, "0")}</span>
              <span>{item.question}</span>
              <ChevronDown aria-hidden="true" size={20} strokeWidth={2.2} />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
