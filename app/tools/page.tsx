import type { Metadata } from "next";
import { FreeToolsSection } from "@/components/free-tools-section";
import { Header } from "@/components/header";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "الأدوات المجانية",
  description:
    "أدوات مجانية لأصحاب المنشآت في السعودية: الحاسبة العمالية، قائمة تحقق التأسيس، ودليل المتطلبات حسب النشاط.",
  alternates: {
    canonical: "/tools",
  },
  openGraph: {
    title: "الأدوات المجانية | أتمم",
    description:
      "مركز أدوات مجاني يساعد صاحب المنشأة قبل طلب الخدمة: حاسبات، قوائم تحقق، ودلائل عملية.",
    url: `${siteConfig.url}/tools`,
  },
};

export default function ToolsPage() {
  return (
    <>
      <Header />
      <main>
        <section className="section tools-page">
          <div className="tools-hero">
            <div className="tools-hero-bg" />
            <div className="tools-hero-content">
              <p className="eyebrow">مركز الأدوات</p>
              <h1>اعرف خطوتك التالية بأداة واضحة ومجانية.</h1>
              <p>
                اختر ما تريد معرفته، وأجب عن أسئلة قصيرة لتحصل على تقدير أولي أو قائمة عملية
                تساعدك قبل بدء الإجراء.
              </p>
              <div className="tools-hero-proof" aria-label="مزايا مركز الأدوات">
                <span><strong>6</strong> أدوات تعمل الآن</span>
                <span><strong>3</strong> مجالات رئيسية</span>
                <span><strong>مجانية</strong> دون تسجيل</span>
              </div>
            </div>
          </div>
        </section>
        <FreeToolsSection directoryMode />
      </main>
    </>
  );
}
