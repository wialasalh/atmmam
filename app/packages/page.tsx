import type { Metadata } from "next";
import { Header } from "@/components/header";
import { PackagesSection } from "@/components/packages-section";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "الباقات",
  description:
    "باقات أتمم لخدمات تأسيس المنشآت، إدارة المنصات الحكومية، والالتزامات التشغيلية مع إمكانية تصميم نطاق مخصص.",
  alternates: {
    canonical: "/packages",
  },
  openGraph: {
    title: "الباقات | أتمم",
    description:
      "اختر باقة جاهزة أو صمم نطاق خدمة يناسب وضع منشأتك وطلباتك المفتوحة.",
    url: `${siteConfig.url}/packages`,
  },
};

export default function PackagesPage() {
  return (
    <>
      <Header />
      <main>
        <section className="section">
          <div className="section-heading">
            <p className="eyebrow">الباقات</p>
            <h1>اختر نطاق الخدمة المناسب لمنشأتك.</h1>
            <p>
              ابدأ بإحدى الباقات الجاهزة، أو استخدم أدوات تصميم النطاق وتقدير الميزانية
              للوصول إلى خيار أوضح قبل التواصل.
            </p>
          </div>
        </section>
        <PackagesSection />
      </main>
    </>
  );
}
