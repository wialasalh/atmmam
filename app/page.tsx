import { ContactSection } from "@/components/contact-section";
import { AgenciesBar } from "@/components/agencies-bar";
import { BusinessGuidePromo } from "@/components/business-guide-promo";
import { FaqSection } from "@/components/faq-section";
import { FreeToolsSection } from "@/components/free-tools-section";
import { Header } from "@/components/header";
import { HomeGrowthSections } from "@/components/home-growth-sections";
import { HeroSection } from "@/components/hero-section";
import { SiteBanner } from "@/components/site-banner";
import { PackagesSection } from "@/components/packages-section";
import { ServicesSection } from "@/components/services-section";
import { TestimonialsSection } from "@/components/testimonials-section";

export default function HomePage() {
  return (
    <>
      <SiteBanner />
      <Header />
      <main>
        <HeroSection />
        <AgenciesBar />
        <ServicesSection />
        <TestimonialsSection />
        <HomeGrowthSections />
        <PackagesSection />
        <FreeToolsSection compact />
        <BusinessGuidePromo />
        <FaqSection />
        <ContactSection />
      </main>
    </>
  );
}
