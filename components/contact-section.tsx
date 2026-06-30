"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, MessageCircle, Phone, Send } from "lucide-react";
import { useLocale } from "@/lib/language-context";

export function ContactSection() {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const { locale } = useLocale();
  const ar = locale === "ar";
  const phoneDisplay = "+966 59 269 3456";
  const phoneInternational = "966592693456";
  const [contactEmail, setContactEmail] = useState("info@atmmam.com.sa");

  useEffect(() => {
    fetch("/api/admin/content")
      .then(r => r.json())
      .then(j => {
        const email = j.data?.settings_contact?.data?.email;
        if (email) setContactEmail(email);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setSending(true);
    setStatus("");
    const formData = new FormData(form);
    const subject = ar ? "طلب تشخيص جديد من موقع أتمم" : "New diagnosis request from Atmmam";
    const emailBody = [
      subject,
      "",
      `Name: ${formData.get("name") ?? ""}`,
      `Phone: ${formData.get("phone") ?? ""}`,
      `Service: ${formData.get("service") ?? ""}`,
      "",
      `Case: ${formData.get("message") ?? ""}`,
    ].join("\n");

    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    form.reset();
    setSending(false);
    setStatus(
      ar
        ? "جهّزنا الرسالة في بريدك. إذا لم تفتح، تواصل معنا مباشرة عبر واتساب."
        : "Your email is ready. If it did not open, contact us directly on WhatsApp.",
    );
  }

  return (
    <section className="section contact contact-compact" id="contact">
      <div className="contact-panel contact-panel-compact">
        <div className="contact-info">
          <p className="contact-kicker">{ar ? "ابدأ التشخيص" : "Start diagnosis"}</p>
          <h2 className="contact-title">
            {ar ? "خلّنا نفهم طلبك أولاً." : "Let us understand your request first."}
          </h2>
          <p className="contact-desc">
            {ar
              ? "اكتب المشكلة كما ظهرت لك، وسنحدد الجهة والخطوة الأولى."
              : "Describe the issue as it appeared, and we will identify the authority and first step."}
          </p>

          <div className="contact-quick-actions" aria-label={ar ? "التواصل المباشر" : "Direct contact"}>
            <a href={`https://wa.me/${phoneInternational}`} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden="true" />
              <span>
                <small>{ar ? "الأسرع" : "Fastest"}</small>
                <strong>{ar ? "تواصل عبر واتساب" : "Contact on WhatsApp"}</strong>
              </span>
            </a>
            <a href={`tel:+${phoneInternational}`}>
              <Phone aria-hidden="true" />
              <span>
                <small>{ar ? "اتصال مباشر" : "Direct call"}</small>
                <strong>{phoneDisplay}</strong>
              </span>
            </a>
          </div>
        </div>

        <form className="cform contact-diagnosis-form" onSubmit={handleSubmit}>
          <div className="cform-head">
            <span className="cform-badge">{ar ? "تشخيص أولي" : "Initial diagnosis"}</span>
            <strong>{ar ? "أربع خانات تكفينا لنبدأ." : "Four fields are enough to begin."}</strong>
          </div>

          <div className="cform-row">
            <label>
              <span>{ar ? "الاسم" : "Name"}</span>
              <input autoComplete="name" name="name" placeholder={ar ? "اسمك الكامل" : "Full name"} required />
            </label>
            <label>
              <span>{ar ? "رقم التواصل" : "Phone"}</span>
              <input autoComplete="tel" inputMode="tel" name="phone" placeholder="+966" required type="tel" />
            </label>
          </div>

          <label className="contact-service-field">
            <span>{ar ? "وش تحتاج؟" : "What do you need?"}</span>
            <span className="contact-select-wrap">
              <select name="service" defaultValue="" required>
                <option value="" disabled>{ar ? "اختر الأقرب لطلبك" : "Choose the closest match"}</option>
                <option>{ar ? "تأسيس شركة" : "Company formation"}</option>
                <option>{ar ? "منصة حكومية" : "Government platform"}</option>
                <option>{ar ? "ترخيص أو تصريح" : "License or permit"}</option>
                <option>{ar ? "زكاة وضريبة" : "Zakat and tax"}</option>
                <option>{ar ? "موارد بشرية" : "Human resources"}</option>
                <option>{ar ? "طلب آخر" : "Other request"}</option>
              </select>
              <ChevronDown aria-hidden="true" size={15} strokeWidth={2.4} />
            </span>
          </label>

          <label>
            <span>{ar ? "صف المشكلة باختصار" : "Briefly describe the issue"}</span>
            <textarea
              name="message"
              placeholder={ar ? "مثال: ظهر تنبيه في قوى ولا أعرف الإجراء المطلوب..." : "e.g. A notice appeared in Qiwa and I am unsure what to do..."}
              required
              rows={3}
              maxLength={800}
            />
          </label>

          <button type="submit" disabled={sending}>
            <span>{sending ? (ar ? "جاري التجهيز…" : "Preparing...") : (ar ? "إرسال الطلب" : "Submit request")}</span>
            <Send aria-hidden="true" size={17} />
          </button>
          {status ? <p className="cstatus ok" role="status">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}
