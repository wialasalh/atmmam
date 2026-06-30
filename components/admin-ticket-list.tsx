"use client";

import { useEffect, useState } from "react";
import { readTickets, saveTicket, Ticket, TicketStatus } from "@/lib/tickets";
import { AlertCircle, CheckCircle } from "lucide-react";
import { formatAppDateTime } from "@/lib/date-format";

const workflowStatuses: TicketStatus[] = ["جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"];

export function AdminTicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    setTickets(readTickets());
  }, []);

  function updateStatus(ticket: Ticket, status: TicketStatus) {
    const updatedTicket = {
      ...ticket,
      status,
      updatedAt: new Date().toISOString(),
    };

    saveTicket(updatedTicket);
    setTickets((currentTickets) => currentTickets.map((item) => (item.id === ticket.id ? updatedTicket : item)));
  }

  if (!tickets.length) {
    return (
      <article className="service-card">
        <span className="service-icon">0</span>
        <h3>لا توجد تذاكر محفوظة</h3>
        <p>أنشئ تذكرة تجريبية أولاً من صفحة الدعم، وستظهر هنا في هذا المتصفح.</p>
        <a className="button primary" href="/support/new">
          فتح تذكرة
        </a>
      </article>
    );
  }

  const openTickets = tickets.filter((ticket) => ticket.status !== "تم الحل" && ticket.status !== "مغلقة").length;
  const urgentTickets = tickets.filter((ticket) => ticket.priority === "عاجلة").length;

  return (
    <>
      <div className="ticket-stats" aria-label="ملخص التذاكر">
        <span>
          <strong>{tickets.length}</strong>
          إجمالي التذاكر
        </span>
        <span>
          <strong>{openTickets}</strong>
          مفتوحة
        </span>
        <span>
          <strong>{urgentTickets}</strong>
          عاجلة
        </span>
      </div>

      <div className="service-list">
        {tickets.map((ticket) => (
          <article className="service-card ticket-card" key={ticket.id}>
            <span className="service-icon">{ticket.status === "جديدة" ? <AlertCircle size={12} /> : <CheckCircle size={12} />}</span>
            <p className="eyebrow">{ticket.status}</p>
            <h3>{ticket.title}</h3>
            <p>رقم التذكرة: {ticket.id}</p>
            <p>نوع الطلب: {ticket.type}</p>
            {ticket.priority ? <p>الأولوية: {ticket.priority}</p> : null}
            {ticket.requesterName ? <p>العميل: {ticket.requesterName}</p> : null}
            {ticket.updatedAt ? <p>آخر تحديث: {formatAppDateTime(ticket.updatedAt)}</p> : null}
            <div className="ticket-status-actions" aria-label={`تغيير حالة ${ticket.title}`}>
              {workflowStatuses.map((status) => (
                <button
                  className={ticket.status === status ? "is-active" : ""}
                  key={status}
                  type="button"
                  onClick={() => updateStatus(ticket, status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <a className="button secondary" href={`/support/tickets?id=${ticket.id}`}>
              فتح التذكرة
            </a>
          </article>
        ))}
      </div>
    </>
  );
}
