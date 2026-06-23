const situations = [
  {
    title: "أؤسس منشأة",
    body: "ابدأ من الشكل القانوني، السجل، والمتطلبات الأساسية قبل إطلاق النشاط.",
    href: "/services/company-formation",
    meta: "تأسيس وسجل",
  },
  {
    title: "لدي مشكلة في منصة",
    body: "رتّب التنبيهات والطلبات المعلقة في قوى، مدد، مقيم، بلدي أو غيرها.",
    href: "/services/government-platforms",
    meta: "منصات حكومية",
  },
  {
    title: "أحتاج ترخيص أو متابعة",
    body: "اعرف الجهة والمتطلبات والخطوة التالية قبل رفع الطلب أو الرد على الملاحظة.",
    href: "/services/licenses",
    meta: "تراخيص وملاحظات",
  },
];

export function SituationSelector() {
  return (
    <section className="section situation-section" aria-labelledby="situation-title">
      <div className="situation-panel">
        <div className="situation-head">
          <p className="eyebrow">اختر وضعك الحالي</p>
          <h2 id="situation-title">ابدأ من الحالة الأقرب لك.</h2>
        </div>
        <div className="situation-grid">
          {situations.map((item) => (
            <a className="situation-card" href={item.href} key={item.title}>
              <span>{item.meta}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
