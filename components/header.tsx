"use client";

import { useState } from "react";
import { Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/data/site";
import { siteConfigEn } from "@/data/site-en";
import { useLocale } from "@/lib/language-context";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const isAr = locale === "ar";
  const data = isAr ? siteConfig : siteConfigEn;

  return (
    <header className="site-header" id="top">
      <nav className="nav" aria-label={isAr ? "التنقل الرئيسي" : "Main navigation"}>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="primary-menu"
          aria-label={open ? (isAr ? "إغلاق القائمة" : "Close menu") : (isAr ? "فتح القائمة" : "Open menu")}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <a className="brand" href="/">
          <img className="brand-lockup" src="/assets/logo/atmmam-ai-lockup.png" alt={data.name} />
        </a>

        <div className={`nav-links ${open ? "is-open" : ""}`} id="primary-menu">
          {data.nav.map((item) => {
            const itemPath = item.href.split("#")[0];
            const isActive = itemPath !== "/" && (pathname === itemPath || pathname.startsWith(`${itemPath}/`));
            const isHelpStart = item.href.includes("/faq");
            const isContact = item.href.includes("#contact");
            const linkClassName = [
              isActive ? "is-active" : "",
              isHelpStart ? "nav-section-break" : "",
              isContact ? "nav-contact-link" : "",
              "badge" in item ? "has-nav-badge" : "",
            ].filter(Boolean).join(" ");

            return (
            <a className={linkClassName} href={item.href} key={item.href} onClick={() => setOpen(false)} aria-current={isActive ? "page" : undefined} aria-label={item.label}>
              <span>{item.label}</span>
              {"badge" in item ? <b className="nav-badge" aria-hidden="true">{item.badge}</b> : null}
            </a>
          )})}
        </div>

        <div className="nav-tools">
          <a className="nav-login" href="/login">{isAr ? "تسجيل الدخول" : "Login"}</a>
          <a className="nav-action" href="/register">{isAr ? "إنشاء حساب" : "Sign up"}</a>
          <button
            className="language-toggle"
            type="button"
            aria-label={isAr ? "English" : "العربية"}
            onClick={() => setLocale(isAr ? "en" : "ar")}
          >
            <Globe2 aria-hidden="true" />
            <span style={{ opacity: isAr ? 1 : 0.4 }}>ع</span>
            <em style={{ opacity: isAr ? 0.4 : 1 }}>EN</em>
          </button>
        </div>
      </nav>
    </header>
  );
}
