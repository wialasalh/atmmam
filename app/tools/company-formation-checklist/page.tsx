import type { Metadata } from "next";
import Link from "next/link";
import { CompanyFormationChecklist } from "@/components/company-formation-checklist";
import { Header } from "@/components/header";
import { siteConfig } from "@/data/site";

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

export const metadata: Metadata = {
  title: "قائمة تحقق تأسيس منشأة | أتمم",
  description:
    "أداة مجانية لمعرفة جاهزية تأسيس منشأة أو شركة في السعودية، مع توضيح النواقص والخطوة المقترحة قبل بدء الإجراء.",
  alternates: { canonical: "/tools/company-formation-checklist" },
  openGraph: {
    title: `قائمة تحقق تأسيس منشأة | ${siteConfig.name}`,
    description:
      "اختبر جاهزية التأسيس قبل بدء الطلب: نوع الكيان، النشاط، الاسم التجاري، الشركاء، الرخص، والملفات الحكومية.",
    url: `${siteConfig.url}/tools/company-formation-checklist`,
    type: "website",
    locale: "ar_SA",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "قائمة تحقق تأسيس منشأة",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
};

export default function CompanyFormationChecklistPage() {
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
            <strong>قائمة تحقق تأسيس منشأة</strong>
          </nav>
          <div className="tool-hero-panel">
            <p className="eyebrow">أداة مجانية</p>
            <h1>قائمة تحقق تأسيس منشأة</h1>
            <p>
              اعرف هل أنت جاهز لبدء تأسيس مؤسسة أو شركة، وما التفاصيل التي تحتاج ترتيباً قبل رفع الطلب أو اختيار المسار.
            </p>
            <div className="tool-notice">
              <AlertIcon />
              <div>
                <strong>فائدة الأداة</strong>
                <p>
                  تساعدك على فرز المتطلبات مبكراً: نوع الكيان، النشاط، الاسم التجاري، الشركاء، الرخص، والملفات الحكومية.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section tool-explain">
          <div className="section-heading compact">
            <p className="eyebrow">ماذا تغطي القائمة؟</p>
            <h2>6 محاور رئيسية لتقييم جاهزية التأسيس.</h2>
          </div>
          <div className="tool-explain-grid">
            <article>
              <h3>الكيان والنشاط</h3>
              <p>التحقق من وضوح نوع الكيان القانوني والنشاط التجاري المناسب.</p>
            </article>
            <article>
              <h3>الشركاء والاسم</h3>
              <p>مدى جاهزية بيانات الشركاء والاسم التجاري وحقوق العلامة.</p>
            </article>
            <article>
              <h3>الرخص والملفات</h3>
              <p>تقدير الاحتياج للرخص البلدية والتجارية والملفات الحكومية بعد التأسيس.</p>
            </article>
          </div>
        </section>
        <section className="section labor-tool-section">
          <CompanyFormationChecklist />
        </section>
      </main>
    </>
  );
}
