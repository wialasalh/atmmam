import type { Metadata } from "next";
import { Header } from "@/components/header";
import { faqGroups } from "@/data/faq";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "إجابات على أكثر الأسئلة شيوعاً عن خدمات أتمم، تأسيس الشركات، المنصات الحكومية، الباقات، والتواصل.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: `الأسئلة الشائعة | ${siteConfig.name}`,
    description:
      "صفحة أسئلة وأجوبة تساعد أصحاب المنشآت والمستثمرين على فهم طريقة العمل قبل طلب الخدمة.",
    url: `${siteConfig.url}/faq`,
    type: "website",
    locale: "ar_SA",
  },
};

export default function FaqPage() {
  const faqUrl = `${siteConfig.url}/faq`;
  const questionCount = faqGroups.reduce((total, group) => total + group.questions.length, 0);
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${faqUrl}#faq`,
    mainEntity: faqGroups.flatMap((group) =>
      group.questions.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };

  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <section className="section bg-page faq-page">
          <nav className="breadcrumb" aria-label="مسار الصفحة">
            <a href="/">الرئيسية</a>
            <span>/</span>
            <strong>الأسئلة الشائعة</strong>
          </nav>

          <div className="bg-hero">
            <div className="bg-hero-bg" />
            <p className="eyebrow">أسئلة وأجوبة</p>
            <h1>الأسئلة الشائعة</h1>
            <p>
              إجابات مباشرة على الأسئلة التي تصلنا قبل بدء الخدمة، من التأسيس
              والمنصات الحكومية إلى الباقات وطريقة التواصل.
            </p>
            <div className="bg-hero-stats">
              <span>
                <strong>{faqGroups.length}</strong>
                أقسام
              </span>
              <span>
                <strong>{questionCount}</strong>
                سؤال وجواب
              </span>
            </div>
          </div>

          <div className="faq-category-nav" aria-label="تصنيفات الأسئلة">
            {faqGroups.map((group) => (
              <a href={`#${slugify(group.category)}`} key={group.category}>
                {group.category}
              </a>
            ))}
          </div>

          <div className="bg-sections">
            {faqGroups.map((group) => (
              <section className="bg-section" id={slugify(group.category)} key={group.category}>
                <div className="bg-section-head">
                  <div>
                    <p className="eyebrow">الأسئلة الشائعة</p>
                    <h2>{group.category}</h2>
                    <p>{group.description}</p>
                  </div>
                </div>
                <div className="bg-questions">
                  {group.questions.map((item, index) => (
                    <details className="bg-question" key={item.question} open={index === 0}>
                      <summary>{item.question}</summary>
                      <p>{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function slugify(value: string) {
  return value.replace(/\s+/g, "-");
}
