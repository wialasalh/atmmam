import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { ContactSection } from "@/components/contact-section";
import { freeTools, services, serviceStages } from "@/data/site";

export const metadata: Metadata = {
  title: "الخدمات",
  description: "خدمات أتمم لتأسيس الشركات، إدارة المنصات الحكومية، التراخيص، الموارد البشرية، الزكاة والضريبة.",
};

export default function ServicesPage() {
  const priorityServices = services;
  const featuredStages = serviceStages.slice(0, 6);
  const featuredTools = freeTools.slice(0, 4);

  return (
    <>
      <Header />
      <main>
        <section className="section services-index">
          <div className="services-index-hero">
            <div className="services-index-hero-bg" />
            <div className="services-index-hero-content">
              <p className="eyebrow">دليل الخدمات</p>
              <h1>اختر المسار المناسب بدل البحث بين إجراءات كثيرة.</h1>
              <p>
                رتبنا الخدمات حسب وضع المنشأة: تأسيس، تشغيل، ترخيص، ملاحظة، أو التزام يحتاج متابعة.
                ابدأ من المرحلة الأقرب لك، ثم ادخل إلى تفاصيل الخدمة المناسبة.
              </p>
              <div className="services-index-notice">
                <AlertCircle size={22} />
                <div>
                  <strong>قبل اختيار الخدمة</strong>
                  <p>إذا لم تعرف أين تقع حالتك، أرسل وصفاً مختصراً وسنوجهك للمسار الأنسب قبل التسعير.</p>
                </div>
              </div>
              <div className="services-index-actions">
                <Link className="button primary" href="/#contact">ابدأ بطلبك</Link>
                <Link className="button ghost" href="/tools">جرّب الأدوات المجانية</Link>
              </div>
            </div>
          </div>

          <div className="section-heading compact">
            <p className="eyebrow">ابدأ من وضعك</p>
            <h2>أي مرحلة تشبه حالتك؟</h2>
            <p>هذه ليست خدمات إضافية، بل مدخل سريع يساعدك تصل للخدمة المناسبة بدون قراءة كل التفاصيل.</p>
          </div>
          <div className="services-stages-grid">
            {featuredStages.map((stage, i) => (
              <Link className="services-stage-card" href={stage.href} key={stage.name}>
                <span className="services-stage-tag">{stage.focus}</span>
                <h3>{stage.name}</h3>
                <p>{stage.body}</p>
                <span className="services-stage-link">
                  اعرف المسار
                  <ArrowLeft size={16} />
                </span>
              </Link>
            ))}
          </div>

          <div className="section-heading compact">
            <p className="eyebrow">الخدمات الأساسية</p>
            <h2>اختر الخدمة التي تريد معرفة تفاصيلها.</h2>
            <p>كل صفحة خدمة توضّح متى تناسبك، ما مخرجاتها، المتطلبات، والأسئلة الأكثر شيوعاً.</p>
          </div>
          <div className="services-list">
            {priorityServices.map((service) => (
              <article className="services-item" key={service.id}>
                <span className="services-item-num">{service.number}</span>
                <div className="services-item-body">
                  <h3>{service.title}</h3>
                  <p>{service.headline}</p>
                  <div className="services-item-points">
                    {service.points.slice(0, 3).map((point) => (
                      <span key={point}>{point}</span>
                    ))}
                  </div>
                </div>
                <Link className="services-item-link" href={`/services/${service.id}`}>
                  تفاصيل الخدمة
                </Link>
              </article>
            ))}
          </div>

          <div className="services-split">
            <section>
              <div className="section-heading compact">
                <p className="eyebrow">قبل الطلب</p>
                <h2>أدوات تساعدك تفهم وضعك أولاً</h2>
                <p>استخدم أداة مجانية إذا كنت تحتاج تقديراً أو قائمة تحقق قبل التواصل.</p>
              </div>
              <div className="services-tools-links">
                {featuredTools.map((tool) => (
                  <Link href={tool.href} key={tool.href}>
                    {tool.title}
                  </Link>
                ))}
              </div>
            </section>
            <section className="services-cta-section">
              <div className="section-heading compact">
                <p className="eyebrow">قرار سريع</p>
                <h2>لا تعرف الخدمة المناسبة؟</h2>
                <p>اكتب لنا الحالة كما هي: تنبيه، مستند ناقص، سجل جديد، أو طلب متوقف. سنحدد لك المسار قبل البدء.</p>
              </div>
              <Link className="button primary" href="/#contact">
                اعرض حالتك علينا
              </Link>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
