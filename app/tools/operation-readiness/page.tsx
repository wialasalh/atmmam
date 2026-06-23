import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Building2, CircleAlert, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import { OperationReadinessCheck } from "@/components/operation-readiness-check";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "فحص ملفات التشغيل الحكومية | أتمم",
  description:
    "أداة مجانية لفحص ملفات ما بعد التأسيس: قوى، التأمينات، الزكاة والضريبة، الرخص، العقود، وحماية الأجور.",
  alternates: { canonical: "/tools/operation-readiness" },
  openGraph: {
    title: `فحص ملفات التشغيل الحكومية | ${siteConfig.name}`,
    description:
      "اعرف نواقص ملفات ما بعد التأسيس قبل أن تتحول إلى ملاحظات في المنصات الحكومية.",
    url: `${siteConfig.url}/tools/operation-readiness`,
    type: "website",
    locale: "ar_SA",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "فحص ملفات التشغيل الحكومية",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
};

export default function OperationReadinessPage() {
  return (
    <>
      <Header />
      <main className="operation-readiness-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <section className="section tool-hero operation-tool-hero">
          <nav className="breadcrumb" aria-label="مسار الصفحة">
            <Link href="/">الرئيسية</Link>
            <span>/</span>
            <Link href="/tools">الأدوات</Link>
            <span>/</span>
            <strong>فحص ملفات التشغيل الحكومية</strong>
          </nav>
          <div className="tool-hero-panel">
            <div className="operation-hero-copy">
              <span className="operation-hero-icon" aria-hidden="true"><ShieldCheck size={29} /></span>
              <p className="eyebrow">أداة مجانية</p>
              <h1>فحص ملفات التشغيل الحكومية</h1>
              <p>
                اعرف مستوى جاهزية منشأتك في الملفات الحكومية الأساسية، واكتشف نقاط المراجعة قبل أن تتحول إلى تعطّل.
              </p>
              <div className="tool-notice">
                <CircleAlert aria-hidden="true" size={21} />
                <div>
                  <strong>قراءة إرشادية</strong>
                  <p>النتيجة تساعدك على ترتيب الأولويات ولا تستبدل مراجعة الملفات الفعلية.</p>
                </div>
              </div>
            </div>
            <div className="operation-hero-features" aria-label="مزايا فحص التشغيل">
              <span><Building2 aria-hidden="true" /><strong>٩ نقاط فحص</strong><small>لملفات التشغيل الأساسية</small></span>
              <span><ClipboardCheck aria-hidden="true" /><strong>نتيجة فورية</strong><small>مع نسبة جاهزية واضحة</small></span>
              <span><BellRing aria-hidden="true" /><strong>أولوية النواقص</strong><small>لتعرف من أين تبدأ</small></span>
            </div>
          </div>
        </section>
        <section className="section tool-explain">
          <div className="section-heading compact">
            <p className="eyebrow">مجالات الفحص</p>
            <h2>6 مجالات رئيسية تغطي ملفات التشغيل الأساسية.</h2>
          </div>
          <div className="tool-explain-grid">
            <article>
              <h3>قوى والتأمينات</h3>
              <p>التحقق من تسجيل المنشأة والموظفين في قوى والتأمينات الاجتماعية.</p>
            </article>
            <article>
              <h3>الزكاة والضريبة</h3>
              <p>مراجعة حالة التسجيل في هيئة الزكاة والضريبة والالتزام بالفاتورة الإلكترونية.</p>
            </article>
            <article>
              <h3>الرخص والعقود</h3>
              <p>فحص صلاحية الرخص البلدية والتجارية والعقود العمالية المقدمة.</p>
            </article>
          </div>
        </section>
        <section className="section labor-tool-section">
          <OperationReadinessCheck />
        </section>
      </main>
    </>
  );
}
