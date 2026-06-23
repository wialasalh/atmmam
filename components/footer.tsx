"use client";

import type { MouseEvent } from "react";
import { ArrowUp, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/data/site";
import { siteConfigEn, footerEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";

export function Footer() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const data = isAr ? siteConfig : siteConfigEn;

  const handleBackToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <div className="footer-brand-head">
            <img className="footer-brand-lockup" src="/assets/logo/atmmam-ai-lockup.png" alt={isAr ? `${siteConfig.name} لخدمات الأعمال` : footerEn.brand} />
          </div>
          <p className="footer-description">
            {isAr ? "نرتّب إجراءات منشأتك ونوضح لك الخطوة التالية بين الجهات والمنصات." : "We organize your business procedures and clarify the next step across authorities and platforms."}
          </p>
          <p className="footer-addr">
            <MapPin aria-hidden="true" size={15} />
            {isAr ? "الدمام - شارع الملك فهد بن عبدالعزيز" : footerEn.address}
          </p>
        </div>
        <nav className="footer-nav" aria-label={isAr ? "روابط الفوتر" : "Footer links"}>
          <strong>{isAr ? "روابط سريعة" : "Quick links"}</strong>
          <div className="footer-links">
            {data.nav.map((item) => (
              <a href={isAr ? item.href : `/en${item.href}`} key={item.href}>{item.label}</a>
            ))}
          </div>
        </nav>
        <div className="footer-contact">
          <strong>{isAr ? "تواصل مباشرة" : "Contact directly"}</strong>
          <a href="https://wa.me/966592693456" target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden="true" size={17} />
            <span>{isAr ? "واتساب" : "WhatsApp"}</span>
          </a>
          <a href="tel:+966592693456">
            <Phone aria-hidden="true" size={17} />
            <span dir="ltr">+966 59 269 3456</span>
          </a>
          <a href="mailto:info@atmmam.com.sa">
            <Mail aria-hidden="true" size={17} />
            <span>info@atmmam.com.sa</span>
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-copy">{isAr ? `© 2026 ${siteConfig.name} لخدمات الأعمال` : footerEn.copyright}</p>
        <a className="footer-back-top" href="#top" onClick={handleBackToTop}>
          <span>{isAr ? "العودة للأعلى" : "Back to top"}</span>
          <ArrowUp aria-hidden="true" size={15} />
        </a>
      </div>
    </footer>
  );
}
