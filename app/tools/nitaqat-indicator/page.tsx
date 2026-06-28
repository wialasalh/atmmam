import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Header } from "@/components/header";
import { NitaqatIndicator } from "@/components/nitaqat-indicator";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "مؤشر نطاقات والتوطين | أتمم",
  description:
    "أداة مجانية لحساب نسبة التوطين المبدئية للمنشأة وتوجيه صاحب العمل لاستخدام حاسبة نطاقات الرسمية في قوى عند الحاجة.",
  alternates: { canonical: "/tools/nitaqat-indicator" },
  openGraph: {
    title: `مؤشر نطاقات والتوطين | ${siteConfig.name}`,
    description:
      "احسب قراءة أولية لنسبة السعوديين إلى إجمالي الموظفين، واعرف متى تحتاج مراجعة وضع نطاقات في قوى.",
    url: `${siteConfig.url}/tools/nitaqat-indicator`,
    type: "website",
    locale: "ar_SA",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "مؤشر نطاقات والتوطين",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
};

export default function NitaqatIndicatorPage() {
  return (
    <>
      <Header />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <section className="section tool-hero">
          <nav className="breadcrumb" aria-label="مسار الصفحة">
            <Link href="/">الرئيسية</Link>
            <span>/</span>
            <Link href="/tools">الأدوات</Link>
            <span>/</span>
            <strong>مؤشر نطاقات والتوطين</strong>
          </nav>
          <div className="tool-hero-panel">
            <p className="eyebrow">أداة مجانية</p>
            <h1>مؤشر نطاقات والتوطين</h1>
            <p>
              احسب قراءة مبدئية لنسبة التوطين في منشأتك، وافهم هل وضعك يحتاج مراجعة قبل استخدام حاسبة قوى الرسمية.
            </p>
            <div className="tool-notice">
              <AlertCircle size={22} />
              <div>
                <strong>ليست نتيجة رسمية</strong>
                <p>
                  هذه الأداة لا تحدد لون النطاق المعتمد. النتيجة الرسمية مرتبطة ببيانات قوى والنشاط الاقتصادي الفرعي وجداول التوطين.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section tool-explain">
          <div className="section-heading compact">
            <p className="eyebrow">ماذا تقدم الأداة؟</p>
            <h2>قراءة مبدئية لنسبة التوطين قبل المراجعة الرسمية.</h2>
          </div>
          <div className="tool-explain-grid">
            <article>
              <h3>نسبة التوطين</h3>
              <p>حساب النسبة المئوية للسعوديين إلى إجمالي الموظفين بناءً على المدخلات.</p>
            </article>
            <article>
              <h3>توجيه أولي</h3>
              <p>مساعدة صاحب المنشأة على معرفة ما إذا كان بحاجة لمراجعة وضع نطاقات.</p>
            </article>
            <article>
              <h3>تقدير أثر التوظيف</h3>
              <p>محاكاة أثر إضافة موظفين سعوديين على نسبة التوطين بشكل فوري.</p>
            </article>
          </div>
        </section>
        <section className="section labor-tool-section">
          <NitaqatIndicator />
        </section>
      </main>
    </>
  );
}
