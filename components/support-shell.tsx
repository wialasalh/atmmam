import { ticketStatuses } from "@/data/site";

export function SupportShell() {
  return (
    <section className="section support-shell">
      <div className="section-heading">
        <p className="eyebrow">الدعم الفني</p>
        <h1>بوابة دعم تجريبية لمسار التذاكر والمتابعة.</h1>
        <p>
          افتح تذكرة، تابع الرسائل، وراجع حالة الطلب من نفس المتصفح إلى أن يتم ربطها بالنظام الرسمي.
        </p>
      </div>
      <div className="service-list">
        <article className="service-card">
          <span className="service-icon">01</span>
          <h3>فتح تذكرة</h3>
          <p>العميل يصف الطلب أو المشكلة، ويحدد نوع الطلب والأولوية ووسيلة التواصل المناسبة.</p>
          <a className="button primary" href="/support/new">
            فتح تذكرة
          </a>
        </article>
        <article className="service-card">
          <span className="service-icon">02</span>
          <h3>متابعة الحالة</h3>
          <p>كل طلب يحتاج حالة واضحة وسجل ردود ومرفقات حتى يعرف العميل أين وصل طلبه.</p>
          <ul>
            {ticketStatuses.map((status) => (
              <li key={status}>{status}</li>
            ))}
          </ul>
        </article>
        <article className="service-card">
          <span className="service-icon">03</span>
          <h3>لوحة الإدارة</h3>
          <p>تظهر التذاكر المحفوظة محلياً مع مؤشرات سريعة وإمكانية تغيير الحالة لتجربة سير العمل.</p>
          <a className="button secondary" href="/admin/tickets">
            فتح لوحة التذاكر
          </a>
        </article>
      </div>
    </section>
  );
}
