import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { TicketDetail } from "@/components/ticket-detail";

export const metadata: Metadata = {
  title: "متابعة تذكرة",
  description: "متابعة حالة تذكرة أتمم وإضافة تحديثات عليها من نفس المتصفح.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SupportTicketPage() {
  return (
    <>
      <Header />
      <main>
        <section className="section support-shell">
          <div className="section-heading">
            <p className="eyebrow">متابعة الطلب</p>
            <h1>تابع حالة تذكرتك وأضف أي تفاصيل جديدة.</h1>
            <p>تُحفظ التذكرة التجريبية في هذا المتصفح، لذلك افتحها من الجهاز نفسه.</p>
          </div>
          <Suspense fallback={<p>جاري تحميل التذكرة...</p>}>
            <TicketDetail />
          </Suspense>
        </section>
      </main>
    </>
  );
}
