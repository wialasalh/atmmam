import type { Metadata } from "next";
import Link from "next/link";
import { BadgeDollarSign, Building2, CircleAlert, FileCheck2, Layers3 } from "lucide-react";
import { FormationCostEstimator } from "@/components/formation-cost-estimator";
import { Header } from "@/components/header";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "حاسبة تكلفة التأسيس التقريبية | أتمم",
  description:
    "أداة مجانية لتقدير نطاق تكلفة تأسيس مؤسسة أو شركة في السعودية حسب نوع الكيان والشركاء والرخص والملفات الحكومية.",
  alternates: { canonical: "/tools/formation-cost-estimator" },
  openGraph: {
    title: `حاسبة تكلفة التأسيس التقريبية | ${siteConfig.name}`,
    description:
      "احصل على نطاق تكلفة تقديري للتأسيس قبل طلب الخدمة، مع توضيح العوامل التي ترفع أو تخفض التكلفة.",
    url: `${siteConfig.url}/tools/formation-cost-estimator`,
    type: "website",
    locale: "ar_SA",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "حاسبة تكلفة التأسيس التقريبية",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
};

export default function FormationCostEstimatorPage() {
  return (
    <>
      <Header />
      <main className="formation-estimator-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <section className="section tool-hero estimator-tool-hero">
          <nav className="breadcrumb" aria-label="مسار الصفحة">
            <Link href="/">الرئيسية</Link>
            <span>/</span>
            <Link href="/tools">الأدوات</Link>
            <span>/</span>
            <strong>حاسبة تكلفة التأسيس التقريبية</strong>
          </nav>
          <div className="tool-hero-panel">
            <div className="estimator-hero-copy">
              <span className="estimator-hero-icon" aria-hidden="true"><BadgeDollarSign size={28} /></span>
              <p className="eyebrow">أداة مجانية</p>
              <h1>ابنِ نطاق الخدمة وقدّر الميزانية الأولية</h1>
              <p>حوّل متطلبات التأسيس إلى نطاق واضح يساعدك على فهم الميزانية قبل طلب التسعير النهائي.</p>
              <div className="tool-notice">
                <CircleAlert aria-hidden="true" size={21} />
                <div>
                  <strong>تقدير استرشادي</strong>
                  <p>السعر النهائي يتحدد بعد مراجعة النشاط والمستندات والجهات المرتبطة.</p>
                </div>
              </div>
            </div>
            <div className="estimator-hero-features" aria-label="مزايا أداة التقدير">
              <span><Building2 aria-hidden="true" /><strong>حسب نوع الكيان</strong><small>مؤسسة أو شركة أو استثمار أجنبي</small></span>
              <span><Layers3 aria-hidden="true" /><strong>نطاق متكامل</strong><small>رخص وملفات تشغيل ومتابعة</small></span>
              <span><FileCheck2 aria-hidden="true" /><strong>تفصيل واضح</strong><small>للعوامل الداخلة في التقدير</small></span>
            </div>
          </div>
        </section>
        <section className="section tool-explain">
          <div className="section-heading compact">
            <p className="eyebrow">ماذا تقدّر الأداة؟</p>
            <h2>عوامل التكلفة الأساسية في تأسيس المنشأة.</h2>
          </div>
          <div className="tool-explain-grid">
            <article>
              <h3>نوع الكيان والشركاء</h3>
              <p>تقدير حسب نوع المؤسسة أو الشركة وعدد الشركاء وتوزيع الحصص.</p>
            </article>
            <article>
              <h3>الرخص والتصاريح</h3>
              <p>حساب تكلفة الرخص البلدية والتجارية والتصاريح الخاصة بالنشاط.</p>
            </article>
            <article>
              <h3>الملفات الحكومية</h3>
              <p>تقدير تكاليف ما بعد التأسيس مثل قوى والتأمينات والزكاة والضريبة.</p>
            </article>
          </div>
        </section>
        <section className="section labor-tool-section">
          <FormationCostEstimator />
        </section>
      </main>
    </>
  );
}
