import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { services, siteConfig } from "@/data/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((item) => item.id === slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.seoDescription,
    alternates: { canonical: `/services/${service.id}` },
    openGraph: {
      title: `${service.title} | ${siteConfig.name}`,
      description: service.seoDescription,
      url: `${siteConfig.url}/services/${service.id}`,
      type: "website",
      locale: "ar_SA",
    },
  };
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = services.find((item) => item.id === slug);
  if (!service) notFound();

  const serviceUrl = `${siteConfig.url}/services/${service.id}`;
  const painPoints = ("painPoints" in service && Array.isArray(service.painPoints) ? service.painPoints : []) as string[];
  const relatedTools = ("relatedTools" in service && Array.isArray(service.relatedTools) ? service.relatedTools : []) as { label: string; href: string }[];
  const secondaryAction =
    service.id === "accreditation"
      ? { label: "اعرض ملف التأهيل علينا", href: "/#contact" }
      : { label: "شاهد الباقات", href: "/packages" };

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        telephone: "+966592693456",
        areaServed: "SA",
      },
      {
        "@type": "Service",
        "@id": `${serviceUrl}#service`,
        name: service.title,
        description: service.seoDescription,
        serviceType: service.title,
        provider: { "@id": `${siteConfig.url}/#organization` },
        areaServed: { "@type": "Country", name: "Saudi Arabia" },
        audience: service.audience.map((name) => ({ "@type": "Audience", audienceType: name })),
        url: serviceUrl,
      },
      {
        "@type": "FAQPage",
        "@id": `${serviceUrl}#faq`,
        mainEntity: service.faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${serviceUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: "الخدمات", item: `${siteConfig.url}/services` },
          { "@type": "ListItem", position: 3, name: service.title, item: serviceUrl },
        ],
      },
    ],
  };

  return (
    <>
      <Header />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

        <section className="section service-detail">
          <nav className="breadcrumb" aria-label="مسار الصفحة">
            <Link href="/">الرئيسية</Link>
            <span>/</span>
            <Link href="/services">الخدمات</Link>
            <span>/</span>
            <strong>{service.title}</strong>
          </nav>

          <div className="sd-hero">
            <div className="sd-hero-bg" />
            <div className="sd-hero-content">
              <p className="eyebrow">خدمات أتمم</p>
              <h1>{service.title}</h1>
              <p className="sd-lead">{service.headline}</p>
              <p className="sd-body">{service.body}</p>
              <div className="sd-hero-tags">
                {service.audience.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className="sd-actions">
                <Link className="button primary" href="/#contact">
                  اطلب الخدمة
                </Link>
                <Link className="button ghost" href={secondaryAction.href}>
                  {secondaryAction.label}
                </Link>
              </div>
            </div>
          </div>

          <div className="sd-strip">
            <div className="sd-strip-item">
              <span className="sd-strip-head">
                <ClockIcon />
                <span className="sd-strip-label">المدة التقريبية</span>
              </span>
              <span className="sd-strip-value">{service.duration}</span>
            </div>
            <div className="sd-strip-item">
              <span className="sd-strip-head">
                <FileIcon />
                <span className="sd-strip-label">المتطلبات</span>
              </span>
              <span className="sd-strip-value">{service.requirements.length}</span>
            </div>
            <div className="sd-strip-item">
              <span className="sd-strip-head">
                <ListIcon />
                <span className="sd-strip-label">خطوات العمل</span>
              </span>
              <span className="sd-strip-value">{service.process.length}</span>
            </div>
          </div>
        </section>

        <section className="section service-detail">
          <div className="sd-grid">
            <div className="sd-panel">
              <p className="eyebrow">المخرجات</p>
              <h2>ماذا تستلم؟</h2>
              <ul className="sd-list">
                {service.deliverables.map((item) => (
                  <li key={item}>
                    <span className="sd-list-icon"><CheckIcon /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sd-panel">
              <p className="eyebrow">المتطلبات</p>
              <h2>ما نحتاجه منك للبدء</h2>
              <ul className="sd-list">
                {service.requirements.map((item) => (
                  <li key={item}>
                    <span className="sd-list-icon is-warm"><CheckIcon /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="sd-band sd-band-process">
          <div className="section service-detail">
            <div className="section-heading compact">
              <p className="eyebrow">طريقة العمل</p>
              <h2>خطوات واضحة من التشخيص حتى التسليم</h2>
            </div>
            <div className="sd-timeline">
              {service.process.map((item, index) => (
                <div className="sd-timeline-step" key={item}>
                  <span className="sd-timeline-num">{String(index + 1).padStart(2, "0")}</span>
                  <div className="sd-timeline-body">
                    <h3>{item}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {painPoints.length || relatedTools.length ? (
          <section className="section service-detail">
            <div className="sd-grid">
              {painPoints.length ? (
                <div className="sd-panel">
                  <p className="eyebrow">مشاكل شائعة نمنع حدوثها</p>
                  <h2>نبدأ من المشكلة لا من الإجراء</h2>
                  <ul className="sd-list">
                    {painPoints.map((item) => (
                      <li key={item}>
                        <span className="sd-list-icon is-danger"><AlertIcon /></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {relatedTools.length ? (
                <div className="sd-panel sd-panel-accent">
                  <p className="eyebrow">أدوات تساعدك قبل الطلب</p>
                  <h2>جرّب قبل تتواصل</h2>
                  <div className="sd-tools">
                    {relatedTools.map((tool) => (
                      <Link href={tool.href} key={tool.href} className="sd-tool-link">
                        {tool.label}
                        <ArrowLeftIcon />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="section service-detail">
          <div className="section-heading compact">
            <p className="eyebrow">أسئلة شائعة</p>
            <h2>إجابات مختصرة قبل بدء الطلب</h2>
          </div>
          <div className="sd-faq-list">
            {service.faqs.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
