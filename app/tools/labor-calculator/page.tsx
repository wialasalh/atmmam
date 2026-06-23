import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, CircleAlert, FileCheck2, Gauge, ReceiptText } from "lucide-react";
import { Header } from "@/components/header";
import { LaborCalculator } from "@/components/labor-calculator";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "الحاسبة العمالية",
  description:
    "حاسبة عمالية تقديرية لحساب مكافأة نهاية الخدمة، بدل الإجازات، ساعات العمل الإضافية، الأجور غير المستلمة، والتعويض التقديري.",
  alternates: {
    canonical: "/tools/labor-calculator",
  },
  openGraph: {
    title: `الحاسبة العمالية | ${siteConfig.name}`,
    description:
      "أداة تقديرية تساعد العامل وصاحب العمل على فهم بنود المستحقات العمالية قبل طلب مراجعة مختصرة.",
    url: `${siteConfig.url}/tools/labor-calculator`,
    type: "website",
    locale: "ar_SA",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "الحاسبة العمالية",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "SAR",
  },
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

export default function LaborCalculatorPage() {
  return (
    <>
      <Header />
      <main className="labor-calculator-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <section className="section tool-hero labor-tool-hero">
          <nav className="breadcrumb" aria-label="مسار الصفحة">
            <Link href="/">الرئيسية</Link>
            <span>/</span>
            <Link href="/tools">الأدوات</Link>
            <span>/</span>
            <strong>الحاسبة العمالية</strong>
          </nav>
          <div className="tool-hero-panel">
            <div className="labor-hero-copy">
              <span className="labor-hero-icon" aria-hidden="true"><Calculator size={28} /></span>
              <p className="eyebrow">أداة مجانية</p>
              <h1>الحاسبة العمالية</h1>
              <p>
                احسب تقديرًا أوليًا لمكافأة نهاية الخدمة وبدل الإجازات والعمل الإضافي والأجور غير المستلمة،
                مع تفصيل واضح لكل بند.
              </p>
              <div className="tool-notice">
                <CircleAlert aria-hidden="true" size={21} />
                <div>
                  <strong>نتيجة تقديرية</strong>
                  <p>للمراجعة الأولية وليست رأيًا قانونيًا نهائيًا.</p>
                </div>
              </div>
            </div>
            <div className="labor-hero-features" aria-label="مزايا الحاسبة">
              <span><Gauge aria-hidden="true" /><strong>حساب فوري</strong><small>بعد إدخال البيانات</small></span>
              <span><ReceiptText aria-hidden="true" /><strong>تفصيل واضح</strong><small>لكل بند من المستحقات</small></span>
              <span><FileCheck2 aria-hidden="true" /><strong>قابل للطباعة</strong><small>ملخص منظم للنتيجة</small></span>
            </div>
          </div>
        </section>
        <section className="section tool-explain">
          <div className="section-heading compact">
            <p className="eyebrow">ماذا تحسب الأداة؟</p>
            <h2>بنود تساعدك على فهم الصورة قبل التواصل.</h2>
          </div>
          <div className="tool-explain-grid">
            <article>
              <h3>مكافأة نهاية الخدمة</h3>
              <p>تقدير مبني على مدة الخدمة والأجر الأخير وسبب انتهاء العلاقة.</p>
            </article>
            <article>
              <h3>الإجازات والأجور</h3>
              <p>حساب بدل الإجازات غير المستخدمة والأجور عن أيام العمل غير المستلمة.</p>
            </article>
            <article>
              <h3>العمل الإضافي والتعويض</h3>
              <p>تقدير ساعات العمل الإضافية والتعويض عند اختيار الإنهاء دون سبب مشروع.</p>
            </article>
          </div>
        </section>
        <section className="section labor-tool-section">
          <LaborCalculator />
        </section>
      </main>
    </>
  );
}
