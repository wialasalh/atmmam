"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTicketId, encodeTicket, saveTicket, Ticket } from "@/lib/tickets";

export function NewTicketForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("طلب قائم");
  const [priority, setPriority] = useState("عادية");
  const [body, setBody] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTitle(params.get("title") ?? "");
    setType(params.get("type") ?? "طلب قائم");
    setPriority(params.get("priority") ?? "عادية");
    setBody(params.get("body") ?? "");
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("فضلاً أكمل بيانات التذكرة أولاً.");
      return;
    }

    const data = new FormData(form);
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: createTicketId(),
      title: String(data.get("title")),
      type: String(data.get("type")),
      requesterName: String(data.get("requesterName") ?? ""),
      contact: String(data.get("contact") ?? ""),
      priority: String(data.get("priority")) as Ticket["priority"],
      body: String(data.get("body")),
      status: "جديدة",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          author: "customer",
          body: String(data.get("body")),
          createdAt: now,
        },
      ],
    };

    saveTicket(ticket);
    setStatus(`تم إنشاء التذكرة ${ticket.id}.`);
    router.push(`/support/tickets?id=${ticket.id}&data=${encodeTicket(ticket)}`);
  }

  return (
    <form className="contact-form" action="/support/tickets" method="get" onSubmit={handleSubmit}>
      <label>
        الاسم
        <input name="requesterName" placeholder="اسم صاحب الطلب" required />
      </label>
      <label>
        وسيلة التواصل
        <input name="contact" placeholder="رقم جوال أو بريد إلكتروني" required />
      </label>
      <label>
        عنوان التذكرة
        <input name="title" placeholder="مثال: مشكلة في منصة قوى" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        نوع الطلب
        <select name="type" required value={type} onChange={(event) => setType(event.target.value)}>
          <option>طلب قائم</option>
          <option>مراجعة عمالية</option>
          <option>استفسار عن خدمة</option>
          <option>مشكلة في مستند</option>
          <option>متابعة باقة</option>
        </select>
      </label>
      <label>
        الأولوية
        <select name="priority" required value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option>عادية</option>
          <option>مرتفعة</option>
          <option>عاجلة</option>
        </select>
      </label>
      <label className="wide-field">
        التفاصيل
        <textarea
          name="body"
          placeholder="اكتب التفاصيل التي تريد من الفريق مراجعتها"
          rows={5}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <button type="submit">حفظ كتذكرة تجريبية</button>
      <p className="form-status" role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}
