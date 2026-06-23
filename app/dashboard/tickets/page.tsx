"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, AlertTriangle, ChevronLeft, Loader } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DbTicket = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
};

export default function TicketsPage() {
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [tickets, setTickets] = useState<DbTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email_confirmed_at) setEmailConfirmed(true);
    });
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) {
        const { data } = await res.json();
        setTickets(data || []);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <div className="client-dash-page">
      <div className="client-dash-page-header">
        <h2 className="client-dash-page-title">تذاكر الدعم</h2>
        {emailConfirmed ? (
          <Link href="/dashboard/tickets/new" className="client-dash-primary-btn">
            <Plus size={15} /> تذكرة جديدة
          </Link>
        ) : (
          <span className="client-dash-secondary-btn" style={{ opacity: .5, cursor: "not-allowed" }}>
            <Plus size={15} /> تذكرة جديدة
          </span>
        )}
      </div>
      <p className="client-dash-page-desc">تواصل مع فريق أتمم بخصوص طلباتك.</p>

      {!emailConfirmed && (
        <div className="client-dash-section" style={{ background: "#fef9e7", borderColor: "#fde68a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} color="#b8860b" />
            <p style={{ margin: 0, fontSize: ".68rem", color: "#92400e" }}>
              يجب تأكيد البريد الإلكتروني أولاً لفتح تذكرة دعم. تحقق من بريدك الوارد.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="client-dash-empty">
          <Loader size={32} className="spin" />
          <p>جاري التحميل...</p>
        </div>
      ) : tickets.length > 0 ? (
        <div className="client-dash-ticket-list">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/dashboard/tickets/${ticket.id}`}
              className="client-dash-ticket-row"
            >
              <div className="client-dash-ticket-info">
                <strong>{ticket.title}</strong>
                <span className="client-dash-ticket-meta">
                  {ticket.category} — {new Date(ticket.created_at).toLocaleDateString("ar-SA")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`client-dash-ticket-status status-${ticket.status.replace(/ /g, '_')}`}>
                  {ticket.status}
                </span>
                <ChevronLeft size={14} className="client-dash-ticket-arrow" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="client-dash-empty">
          <MessageSquare size={40} />
          <p>لا توجد تذاكر دعم مفتوحة.</p>
        </div>
      )}

      <div className="client-dash-section">
        <h3>تحتاج مساعدة؟</h3>
        <p style={{ fontSize: ".72rem", color: "#6f869b", lineHeight: 1.7 }}>
          يمكنك التواصل معنا مباشرة عبر واتساب.
        </p>
        <a href="https://wa.me/966592693456" target="_blank" rel="noopener" className="client-dash-secondary-btn" style={{ marginTop: 12 }}>واتساب</a>
      </div>
    </div>
  );
}
