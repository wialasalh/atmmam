import type { Metadata } from "next";
import Link from "next/link";
import { ActivityRequirementsTool } from "@/components/activity-requirements-tool";
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
  title: "دليل المتطلبات حسب النشاط | أتمم",
  description:
    "أداة مجانية لفرز الجهات والمتطلبات المحتملة حسب نوع النشاط التجاري في السعودية قبل طلب الترخيص أو بدء التأسيس.",
  alternates: { canonical: "/tools/activity-requirements" },
  openGraph: {
    title: `دليل المتطلبات حسب النشاط | ${siteConfig.name}`,
    description:
      "اختر نوع النشاط وحالة الموقع والموظفين لتحصل على مسار أولي للجهات والمتطلبات المحتملة.",
    url: `${siteConfig.url}/tools/activity-requirements`,
    type: "website",
    locale: "ar_SA",
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "دليل المتطلبات حسب النشاط",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SAR" },
  publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
};

export default function ActivityRequirementsPage() {
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
            <strong>دليل المتطلبات حسب النشاط</strong>
          </nav>
          <div className="tool-hero-panel">
            <p className="eyebrow">أداة مجانية</p>
            <h1>دليل المتطلبات حسب النشاط</h1>
            <p>
              اختر وصف النشاط وحالة الموقع والموظفين لتحصل على قراءة أولية للجهات والمتطلبات التي قد تحتاج مراجعتها.
            </p>
            <div className="tool-notice">
              <AlertIcon />
              <div>
                <strong>تنبيه مهم</strong>
                <p>
                  النتيجة لا تغني عن مراجعة الجهة المختصة، لكنها تساعدك على معرفة المسار الأقرب والأسئلة المهمة قبل البدء.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section tool-explain">
          <div className="section-heading compact">
            <p className="eyebrow">ماذا يقدّم الدليل؟</p>
            <h2>مسار أولي للجهات والمتطلبات حسب نشاطك.</h2>
          </div>
          <div className="tool-explain-grid">
            <article>
              <h3>الجهات المحتملة</h3>
              <p>قائمة أوّلية بالجهات الحكومية المرتبطة بنشاطك التجاري.</p>
            </article>
            <article>
              <h3>المتطلبات التقديرية</h3>
              <p>المستندات والاشتراطات المحتملة لكل جهة حسب وصف النشاط.</p>
            </article>
            <article>
              <h3>تنبيهات مبدئية</h3>
              <p>ملاحظات مهمة عن النشاط تساعدك على تجنب المسارات الخاطئة.</p>
            </article>
          </div>
        </section>
        <section className="section labor-tool-section">
          <ActivityRequirementsTool />
        </section>
      </main>
    </>
  );
}
