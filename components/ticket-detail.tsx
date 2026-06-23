"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createTicketId, decodeTicket, findTicket, saveTicket, Ticket } from "@/lib/tickets";

export function TicketDetail({ ticketId }: { ticketId?: string }) {
  const searchParams = useSearchParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const resolvedTicketId = ticketId ?? searchParams.get("id") ?? "";
    const storedTicket = resolvedTicketId ? findTicket(resolvedTicketId) : null;
    const ticketFromUrl = searchParams.get("data") ? decodeTicket(searchParams.get("data") ?? "") : null;
    const ticketFromFallbackForm = searchParams.get("title")
      ? buildTicketFromFallbackForm(searchParams)
      : null;
    const resolvedTicket = storedTicket ?? ticketFromUrl ?? ticketFromFallbackForm;

    if (resolvedTicket) {
      saveTicket(resolvedTicket);
    }

    setTicket(resolvedTicket ?? null);
    setLoaded(true);
  }, [searchParams, ticketId]);

  function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ticket || !reply.trim()) {
      setStatus("اكتب تحديثاً قبل الإرسال.");
      return;
    }

    const now = new Date().toISOString();
    const nextTicket: Ticket = {
      ...ticket,
      status: ticket.status === "مغلقة" || ticket.status === "تم الحل" ? "قيد المراجعة" : ticket.status,
      updatedAt: now,
      messages: [
        ...ticket.messages,
        {
          author: "customer",
          body: reply.trim(),
          createdAt: now,
        },
      ],
    };

    saveTicket(nextTicket);
    setTicket(nextTicket);
    setReply("");
    setStatus("تمت إضافة التحديث إلى التذكرة.");
  }

  if (!loaded) {
    return <p>جاري تحميل التذكرة...</p>;
  }

  if (!ticket) {
    return (
      <article className="service-card">
        <span className="service-icon">!</span>
        <h2>لم نجد هذه التذكرة</h2>
        <p>التذاكر التجريبية تحفظ في هذا المتصفح فقط. جرّب فتح التذكرة من نفس الجهاز أو أنشئ تذكرة جديدة.</p>
        <a className="button primary" href="/support/new">
          فتح تذكرة جديدة
        </a>
      </article>
    );
  }

  return (
    <div className="ticket-detail">
      <article className="service-card">
        <span className="service-icon">✓</span>
        <p className="eyebrow">{ticket.status}</p>
        <h1>{ticket.title}</h1>
        <p>رقم التذكرة: {ticket.id}</p>
        <p>نوع الطلب: {ticket.type}</p>
        {ticket.priority ? <p>الأولوية: {ticket.priority}</p> : null}
        {ticket.requesterName ? <p>صاحب الطلب: {ticket.requesterName}</p> : null}
        {ticket.contact ? <p>التواصل: {ticket.contact}</p> : null}
        <p>تاريخ الإنشاء: {new Date(ticket.createdAt).toLocaleString("ar-SA")}</p>
        {ticket.updatedAt ? <p>آخر تحديث: {new Date(ticket.updatedAt).toLocaleString("ar-SA")}</p> : null}
      </article>
      <div className="faq-list">
        {ticket.messages.map((message) => (
          <article className="service-card" key={`${message.createdAt}-${message.author}`}>
            <p className="eyebrow">{message.author === "customer" ? "رسالة العميل" : "رد الفريق"}</p>
            <p>{message.body}</p>
            <small>{new Date(message.createdAt).toLocaleString("ar-SA")}</small>
          </article>
        ))}
      </div>
      <form className="ticket-reply-form" onSubmit={handleReplySubmit}>
        <label>
          إضافة تحديث
          <textarea
            rows={4}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="اكتب أي معلومة جديدة أو مستند مطلوب أو توضيح إضافي"
          />
        </label>
        <button className="button primary" type="submit">
          إضافة التحديث
        </button>
        <p className="form-status" role="status" aria-live="polite">
          {status}
        </p>
      </form>
      <a className="button secondary" href="/admin/tickets">
        عرضها في لوحة التذاكر
      </a>
    </div>
  );
}

function buildTicketFromFallbackForm(searchParams: URLSearchParams): Ticket {
  const now = new Date().toISOString();
  const body = searchParams.get("body") ?? "";

  return {
    id: createTicketId(),
    title: searchParams.get("title") ?? "تذكرة دعم",
    type: searchParams.get("type") ?? "طلب قائم",
    requesterName: searchParams.get("requesterName") ?? "",
    contact: searchParams.get("contact") ?? "",
    priority: (searchParams.get("priority") as Ticket["priority"]) ?? "عادية",
    body,
    status: "جديدة",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        author: "customer",
        body,
        createdAt: now,
      },
    ],
  };
}
