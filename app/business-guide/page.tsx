import type { Metadata } from "next";
import { BusinessGuideBrowser } from "@/components/business-guide-browser";
import { Header } from "@/components/header";
import { businessGuide, siteConfig } from "@/data/site";

const popularQuestions = [
  "ما الفرق بين المؤسسة والشركة؟",
  "ما الفرق بين السجل التجاري والرخصة البلدية؟",
  "كيف تحسب مكافأة نهاية الخدمة؟",
  "ما هي حماية الأجور؟",
];

export const metadata: Metadata = {
  title: "دليل الأعمال",
  description:
    "إجابات مختصرة على أهم أسئلة تأسيس المنشآت، الرخص، المنصات الحكومية، الموارد البشرية، والزكاة والضريبة.",
  alternates: { canonical: "/business-guide" },
  openGraph: {
    title: `دليل الأعمال | ${siteConfig.name}`,
    description:
      "مركز معرفة مختصر لأصحاب المنشآت في السعودية قبل بدء إجراءات التأسيس والتراخيص والمنصات.",
    url: `${siteConfig.url}/business-guide`,
    type: "website",
    locale: "ar_SA",
  },
};

export default function BusinessGuidePage() {
  const guideUrl = `${siteConfig.url}/business-guide`;
  const questionsCount = businessGuide.reduce(
    (total, group) => total + group.questions.length,
    0,
  );
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${guideUrl}#faq`,
    mainEntity: businessGuide.flatMap((group) =>
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
        <section className="section bg-page">
          <nav className="breadcrumb" aria-label="مسار الصفحة">
            <a href="/">الرئيسية</a>
            <span>/</span>
            <strong>دليل الأعمال</strong>
          </nav>

          <div className="bg-hero">
            <div className="bg-hero-bg" />
            <p className="eyebrow">مركز معرفة</p>
            <h1>دليل الأعمال</h1>
            <p>
              إجابات مختصرة على أكثر الأسئلة التي يبحث عنها أصحاب المنشآت قبل
              التأسيس أو الترخيص أو التعامل مع المنصات الحكومية.
            </p>
            <div className="bg-hero-stats">
              <span>
                <strong>{businessGuide.length}</strong>
                أقسام
              </span>
              <span>
                <strong>{questionsCount}</strong>
                سؤال وجواب
              </span>
            </div>
            <div className="bg-hero-tags">
              {popularQuestions.map((q) => (
                <span key={q}>{q}</span>
              ))}
            </div>
          </div>

          <BusinessGuideBrowser />
        </section>
      </main>
    </>
  );
}
