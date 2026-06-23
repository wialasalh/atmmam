import type { Metadata } from "next";
import { Header } from "@/components/header";
import { NewTicketForm } from "@/components/new-ticket-form";

export const metadata: Metadata = {
  title: "فتح تذكرة دعم",
  description: "فتح تذكرة دعم فني لمتابعة طلبات وخدمات أتمم.",
};

export default function NewTicketPage() {
  return (
    <>
      <Header />
      <main>
        <section className="section contact">
          <div className="contact-panel">
            <div>
              <p className="eyebrow">تذكرة جديدة</p>
              <h1>صف طلبك كما هو وسنحوله إلى تذكرة متابعة.</h1>
              <p>النموذج يحفظ التذكرة في هذا المتصفح للتجربة، ويعرض لك صفحة متابعة ورقم تذكرة مباشرة.</p>
            </div>
            <NewTicketForm />
          </div>
        </section>
      </main>
    </>
  );
}
