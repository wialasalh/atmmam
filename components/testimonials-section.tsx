"use client";

import { testimonials } from "@/data/site";
import { testimonialsEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";
import { Quote } from "lucide-react";

export function TestimonialsSection() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const data = isAr ? testimonials : testimonialsEn;

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("");

  return (
    <section className="section testimonials" id="testimonials">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isAr ? "آراء العملاء" : "Client Testimonials"}</p>
          <h2>{isAr ? "تجارب تحكي الفرق." : "Experiences that show the difference."}</h2>
        </div>
        <p className="testimonials-intro">
          {isAr
            ? "نعتز بأن تكون الإجراءات أوضح، والمتابعة أسهل، والعميل على دراية بكل خطوة."
            : "We make procedures clearer, follow-up easier, and every next step understandable."}
        </p>
      </div>
      <div className="testimonials-grid">
        {data.map((t, index) => (
          <figure className="testimonial-card" key={t.name}>
            <div className="testimonial-card-top">
              <span className="testimonial-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="testimonial-quote-icon" aria-hidden="true">
                <Quote size={22} strokeWidth={2} />
              </span>
            </div>
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              <span className="testimonial-avatar" aria-hidden="true">
                {getInitials(t.name)}
              </span>
              <span className="testimonial-person">
                <strong>{t.name}</strong>
                <span>{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
