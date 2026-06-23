import type { Metadata } from "next";
import "./globals.css";
import "./fixes.css";
import { Footer } from "@/components/footer";
import { LanguageProvider } from "@/lib/language-context";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: "website",
    locale: "ar_SA",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <LanguageProvider>
          {children}
          <Footer />
          <div className="mobile-sticky-bar">
            <span className="mobile-sticky-brand">أتمم</span>
            <span className="mobile-sticky-text">خدمات تأسيس وإدارة المنشآت</span>
            <a className="mobile-sticky-cta" href="/#contact">تواصل معنا</a>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
