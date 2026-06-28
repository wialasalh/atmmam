"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, AlertTriangle, ChevronLeft, Loader, Clock, CheckCircle, XCircle, RefreshCw, Search, MessageCircle } from "lucide-react";
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

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  "جديدة":          { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={10} /> },
  "قيد المراجعة":   { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={10} /> },
  "بانتظار العميل": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertTriangle size={10} /> },
  "تم الحل":        { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={10} /> },
  "مغلقة":          { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={10} /> },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  "عاجلة":  { color: "#dc2626", bg: "#fef2f2" },
  "مرتفعة": { color: "#ea580c", bg: "#fff7ed" },
  "عادية":  { color: "#6b7280", bg: "#f9fafb" },
};

export default function TicketsPage() {
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [tickets, setTickets] = useState<DbTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase.auth.getUser(),
      fetch("/api/tickets").then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }))
    ]).then(([{ data: { user } }, json]) => {
      if (user?.email_confirmed_at) setEmailConfirmed(true);
      setTickets(json.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function loadTickets() {
    const res = await fetch("/api/tickets").catch(() => null);
    if (res?.ok) { const { data } = await res.json(); setTickets(data || []); }
    setLoading(false);
  }

  const filtered = tickets.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || t.status === filter;
    return matchSearch && matchFilter;
  });

  const openCount = tickets.filter(t => !["مغلقة", "تم الحل"].includes(t.status)).length;

  return (
    <div className="client-dash-page">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 className="client-dash-page-title" style={{ marginBottom: 2 }}>تذاكر الدعم</h2>
          <p className="client-dash-page-desc" style={{ margin: 0 }}>تواصل مع فريق أتمم بخصوص طلباتك.</p>
        </div>
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

      {/* Email warning */}
      {!emailConfirmed && (
        <div style={{ background: "#fef9e7", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} color="#b8860b" />
          <p style={{ margin: 0, fontSize: ".68rem", color: "#92400e" }}>
            يجب تأكيد البريد الإلكتروني أولاً لفتح تذكرة دعم. تحقق من بريدك الوارد.
          </p>
        </div>
      )}

      {/* Stats */}
      {tickets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "إجمالي التذاكر", value: tickets.length, color: "#073766", bg: "#eaf4ff" },
            { label: "تذاكر مفتوحة", value: openCount, color: "#0875dc", bg: "#dbeafe" },
            { label: "تم الحل", value: tickets.filter(t => t.status === "تم الحل").length, color: "#15803d", bg: "#dcfce7" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: ".6rem", color: "#526983", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search & filter */}
      {tickets.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, background: "#f5f8fc", border: "1px solid #e5eaf0", borderRadius: 8, padding: "0 10px" }}>
            <Search size={13} color="#8b9dad" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث في تذاكرك..."
              style={{ border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: ".7rem", color: "#344d69", height: 34, width: "100%" }}
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ height: 36, border: "1px solid #e5eaf0", borderRadius: 8, background: "#f5f8fc", padding: "0 10px", font: "inherit", fontSize: ".65rem", color: "#344d69" }}
          >
            <option value="">كل الحالات</option>
            {["جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="client-dash-empty"><Loader size={32} className="spin" /><p>جاري التحميل...</p></div>
      ) : filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(ticket => {
            const ss = STATUS_STYLE[ticket.status] || STATUS_STYLE["جديدة"];
            const ps = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE["عادية"];
            return (
              <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#fff",
                  border: "1px solid #e5eaf0",
                  borderRadius: 12,
                  padding: "14px 16px",
                  transition: "all .15s",
                  borderRight: ticket.priority === "عاجلة" ? "3px solid #dc2626" : "1px solid #e5eaf0",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#bddcff")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = ticket.priority === "عاجلة" ? "#dc2626" : "#e5eaf0")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <strong style={{ fontSize: ".78rem", color: "#1e3a56", lineHeight: 1.4, flex: 1 }}>{ticket.title}</strong>
                    <span style={{ fontSize: ".58rem", padding: "2px 8px", borderRadius: 20, fontWeight: 700, color: ps.color, background: ps.bg, flexShrink: 0 }}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: ".6rem", color: "#8b9dad", background: "#f5f8fc", padding: "2px 8px", borderRadius: 10 }}>{ticket.category}</span>
                      <span style={{ fontSize: ".58rem", color: "#aab5c3" }}>{new Date(ticket.created_at).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", padding: "3px 8px", borderRadius: 20, border: `1px solid ${ss.border}`, color: ss.color, background: ss.bg, fontWeight: 700 }}>
                      {ss.icon} {ticket.status}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="client-dash-empty">
          <MessageSquare size={40} />
          <p>{search ? "لا توجد نتائج للبحث" : "لا توجد تذاكر دعم بعد."}</p>
          {!search && emailConfirmed && (
            <Link href="/dashboard/tickets/new" className="client-dash-primary-btn" style={{ marginTop: 8 }}>
              <Plus size={14} /> افتح تذكرة جديدة
            </Link>
          )}
        </div>
      )}

      {/* Help section */}
      <div className="client-dash-section" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: ".78rem", marginBottom: 6 }}>تحتاج مساعدة فورية؟</h3>
        <p style={{ fontSize: ".72rem", color: "#6f869b", lineHeight: 1.7, margin: "0 0 12px" }}>
          يمكنك التواصل معنا مباشرة عبر واتساب للحالات العاجلة.
        </p>
        <a href="https://wa.me/966592693456" target="_blank" rel="noopener" className="client-dash-secondary-btn">
          <MessageCircle size={12} /> واتساب
        </a>
      </div>
    </div>
  );
}
