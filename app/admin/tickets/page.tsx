"use client";

import { useEffect, useState, useRef } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import { Search, MessageSquare, Check, Send, Loader, Filter, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";

type AdminTicket = {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: { full_name: string; email: string } | null;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string } | null;
};

const STATUS_OPTIONS = ["جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"];

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  "جديدة":          { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} /> },
  "قيد المراجعة":   { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} /> },
  "بانتظار العميل": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertTriangle size={11} /> },
  "تم الحل":        { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} /> },
  "مغلقة":          { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} /> },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  "عاجلة":   { color: "#dc2626", bg: "#fef2f2", label: "عاجل" },
  "مرتفعة":  { color: "#ea580c", bg: "#fff7ed", label: "مرتفعة" },
  "عادية":   { color: "#6b7280", bg: "#f9fafb", label: "عادية" },
};

const QUICK_REPLIES = [
  "شكراً لتواصلك معنا، سنراجع طلبك قريباً.",
  "تم استلام طلبك وجاري العمل عليه.",
  "نحتاج مستندات إضافية لإكمال الطلب.",
  "تم حل المشكلة بنجاح، هل تحتاج مساعدة أخرى؟",
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [newNote, setNewNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTickets(); }, [statusFilter]);

  useEffect(() => {
    if (selected) {
      setMessages([]);
      fetch(`/api/tickets/${selected.id}/messages`).then(async (r) => {
        if (r.ok) { const d = await r.json(); setMessages(d.data || []); }
      });
    }
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadTickets() {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/tickets?status=${statusFilter}` : "/api/tickets";
      const res = await fetch(url);
      if (res.ok) { const { data } = await res.json(); setTickets(data || []); }
    } catch {}
    setLoading(false);
  }

  async function updateStatus(ticketId: string, status: string) {
    setUpdating(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadTickets();
      if (selected?.id === ticketId) setSelected(prev => prev ? { ...prev, status } : null);
    } catch {}
    setUpdating(false);
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() || !selected) return;
    setSending(true);
    try {
      await fetch(`/api/tickets/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newNote.trim() }),
      });
      setNewNote("");
      setShowQuickReplies(false);
      const res = await fetch(`/api/tickets/${selected.id}/messages`);
      if (res.ok) { const { data } = await res.json(); setMessages(data || []); }
    } catch {}
    setSending(false);
  }

  const filtered = tickets.filter((t) => {
    const matchSearch = `${t.title} ${t.profiles?.full_name || ""} ${t.profiles?.email || ""}`
      .toLowerCase().includes(search.trim().toLowerCase());
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === "جديدة").length,
    inProgress: tickets.filter(t => t.status === "قيد المراجعة").length,
    waiting: tickets.filter(t => t.status === "بانتظار العميل").length,
    urgent: tickets.filter(t => t.priority === "عاجلة").length,
  };

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="tickets" />

      <div className="tkt-layout">

        {/* Left: List */}
        <div className="tkt-list-col">

          {/* Stats bar */}
          <div className="tkt-stats">
            <div className="tkt-stat">
              <span className="tkt-stat-num">{stats.total}</span>
              <span className="tkt-stat-label">إجمالي</span>
            </div>
            <div className="tkt-stat tkt-stat-blue">
              <span className="tkt-stat-num">{stats.new}</span>
              <span className="tkt-stat-label">جديدة</span>
            </div>
            <div className="tkt-stat tkt-stat-amber">
              <span className="tkt-stat-num">{stats.inProgress}</span>
              <span className="tkt-stat-label">قيد المراجعة</span>
            </div>
            <div className="tkt-stat tkt-stat-purple">
              <span className="tkt-stat-num">{stats.waiting}</span>
              <span className="tkt-stat-label">بانتظار العميل</span>
            </div>
            <div className="tkt-stat tkt-stat-red">
              <span className="tkt-stat-num">{stats.urgent}</span>
              <span className="tkt-stat-label">عاجلة</span>
            </div>
          </div>

          {/* Filters */}
          <div className="tkt-filters">
            <div className="tkt-search">
              <Search size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالعنوان أو العميل..." />
            </div>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="tkt-select">
              <option value="">كل الأولويات</option>
              <option value="عاجلة">عاجلة</option>
              <option value="مرتفعة">مرتفعة</option>
              <option value="عادية">عادية</option>
            </select>
          </div>

          {/* Status tabs */}
          <div className="tkt-tabs">
            {["", "جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`tkt-tab ${statusFilter === s ? "active" : ""}`}>
                {s || "الكل"}
                {s === "" && <b>{stats.total}</b>}
                {s === "جديدة" && stats.new > 0 && <b>{stats.new}</b>}
                {s === "بانتظار العميل" && stats.waiting > 0 && <b className="urgent">{stats.waiting}</b>}
              </button>
            ))}
          </div>

          {/* Tickets list */}
          <div className="tkt-list">
            {loading ? (
              <div className="tkt-empty"><Loader size={24} className="spin" /><p>جاري التحميل...</p></div>
            ) : filtered.length === 0 ? (
              <div className="tkt-empty"><MessageSquare size={28} /><p>لا توجد تذاكر</p></div>
            ) : filtered.map(t => {
              const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG["جديدة"];
              const pc = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG["عادية"];
              return (
                <div key={t.id} onClick={() => setSelected(t)} className={`tkt-row ${selected?.id === t.id ? "active" : ""} ${t.priority === "عاجلة" ? "urgent-row" : ""}`}>
                  <div className="tkt-row-top">
                    <strong className="tkt-row-title">{t.title}</strong>
                    <span className="tkt-priority-badge" style={{ color: pc.color, background: pc.bg }}>{pc.label}</span>
                  </div>
                  <div className="tkt-row-meta">
                    <span className="tkt-client-name">{t.profiles?.full_name || "عميل"}</span>
                    <span className="tkt-category">{t.category}</span>
                  </div>
                  <div className="tkt-row-bottom">
                    <span className="tkt-status-badge" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
                      {sc.icon} {t.status}
                    </span>
                    <span className="tkt-date">{new Date(t.updated_at).toLocaleDateString("ar-SA")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="tkt-detail-col">
          {selected ? (
            <>
              {/* Header */}
              <div className="tkt-detail-head">
                <div>
                  <h2 className="tkt-detail-title">{selected.title}</h2>
                  <div className="tkt-detail-meta">
                    <span>{selected.profiles?.full_name || "—"}</span>
                    <span>{selected.profiles?.email || ""}</span>
                    <span>{selected.category}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="tkt-close-btn">✕</button>
              </div>

              {/* Status update */}
              <div className="tkt-status-bar">
                <span className="tkt-status-label">الحالة:</span>
                <div className="tkt-status-btns">
                  {STATUS_OPTIONS.map(s => {
                    const sc = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selected.id, s)}
                        disabled={updating || s === selected.status}
                        className={`tkt-status-btn ${s === selected.status ? "current" : ""}`}
                        style={s === selected.status ? { color: sc.color, background: sc.bg, borderColor: sc.border } : {}}
                      >
                        {s === selected.status && <Check size={11} />}
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Messages */}
              <div className="tkt-messages">
                {messages.length === 0 ? (
                  <div className="tkt-empty" style={{ minHeight: 120 }}>
                    <MessageSquare size={24} /><p>لا توجد رسائل بعد</p>
                  </div>
                ) : messages.map(msg => (
                  <div key={msg.id} className="tkt-msg">
                    <div className="tkt-msg-avatar">{(msg.profiles?.full_name || "د")[0]}</div>
                    <div className="tkt-msg-content">
                      <div className="tkt-msg-header">
                        <strong>{msg.profiles?.full_name || "فريق الدعم"}</strong>
                        <small>{new Date(msg.created_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                      </div>
                      <p className="tkt-msg-body">{msg.body}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies */}
              {showQuickReplies && (
                <div className="tkt-quick-replies">
                  {QUICK_REPLIES.map((r, i) => (
                    <button key={i} onClick={() => { setNewNote(r); setShowQuickReplies(false); }} className="tkt-quick-reply">
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {/* Reply box */}
              <form onSubmit={sendNote} className="tkt-reply-form">
                <button type="button" onClick={() => setShowQuickReplies(!showQuickReplies)} className="tkt-quick-btn" title="ردود جاهزة">
                  <Filter size={14} />
                </button>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  rows={2}
                  className="tkt-reply-input"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendNote(e); } }}
                />
                <button type="submit" disabled={!newNote.trim() || sending} className="tkt-send-btn">
                  {sending ? <Loader size={16} className="spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          ) : (
            <div className="tkt-empty tkt-empty-detail">
              <MessageSquare size={40} />
              <p>اختر تذكرة لعرض التفاصيل والمحادثة</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .tkt-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          height: calc(100vh - 76px);
          overflow: hidden;
        }

        /* List column */
        .tkt-list-col {
          border-left: 1px solid #e5eaf0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f8fafc;
        }

        /* Stats */
        .tkt-stats {
          display: flex;
          gap: 0;
          border-bottom: 1px solid #e5eaf0;
          background: #fff;
        }
        .tkt-stat {
          flex: 1;
          text-align: center;
          padding: 12px 8px;
          border-left: 1px solid #f0f3f8;
        }
        .tkt-stat:last-child { border-left: none; }
        .tkt-stat-num { display: block; font-size: 1.3rem; font-weight: 800; color: #073766; line-height: 1; }
        .tkt-stat-label { display: block; font-size: .55rem; color: #8b9dad; margin-top: 3px; }
        .tkt-stat-blue .tkt-stat-num { color: #0875dc; }
        .tkt-stat-amber .tkt-stat-num { color: #b45309; }
        .tkt-stat-purple .tkt-stat-num { color: #7c3aed; }
        .tkt-stat-red .tkt-stat-num { color: #dc2626; }

        /* Filters */
        .tkt-filters {
          display: flex;
          gap: 8px;
          padding: 10px 12px;
          background: #fff;
          border-bottom: 1px solid #f0f3f8;
        }
        .tkt-search {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 7px;
          background: #f5f8fc;
          border: 1px solid #e5eaf0;
          border-radius: 8px;
          padding: 0 10px;
          color: #8b9dad;
        }
        .tkt-search input {
          border: 0;
          outline: 0;
          background: transparent;
          font: inherit;
          font-size: .7rem;
          width: 100%;
          color: #344d69;
          height: 34px;
        }
        .tkt-select {
          height: 34px;
          border: 1px solid #e5eaf0;
          border-radius: 8px;
          background: #f5f8fc;
          padding: 0 10px;
          font: inherit;
          font-size: .65rem;
          color: #344d69;
        }

        /* Tabs */
        .tkt-tabs {
          display: flex;
          gap: 0;
          background: #fff;
          border-bottom: 1px solid #e5eaf0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tkt-tab {
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: #7a8fa6;
          font: inherit;
          font-size: .65rem;
          font-weight: 700;
          padding: 10px 12px;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .tkt-tab.active { color: #0875dc; }
        .tkt-tab.active::after { content: ""; position: absolute; bottom: 0; right: 0; left: 0; height: 2px; background: #0875dc; }
        .tkt-tab b { background: #e5eaf0; color: #526983; border-radius: 20px; padding: 1px 6px; font-size: .55rem; }
        .tkt-tab b.urgent { background: #fef2f2; color: #dc2626; }

        /* List */
        .tkt-list { flex: 1; overflow-y: auto; padding: 8px; }
        .tkt-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #8b9dad; font-size: .72rem; padding: 40px 20px; }
        .tkt-row {
          background: #fff;
          border: 1px solid #e5eaf0;
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all .15s;
        }
        .tkt-row:hover { border-color: #bddcff; box-shadow: 0 2px 8px rgba(8,117,220,.06); }
        .tkt-row.active { border-color: #0875dc; background: #f0f8ff; box-shadow: 0 2px 12px rgba(8,117,220,.1); }
        .tkt-row.urgent-row { border-right: 3px solid #dc2626; }
        .tkt-row-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .tkt-row-title { font-size: .75rem; color: #1e3a56; font-weight: 700; line-height: 1.4; flex: 1; }
        .tkt-priority-badge { font-size: .55rem; padding: 2px 7px; border-radius: 20px; font-weight: 700; flex-shrink: 0; }
        .tkt-row-meta { display: flex; gap: 8px; margin-bottom: 8px; }
        .tkt-client-name { font-size: .62rem; color: #526983; font-weight: 600; }
        .tkt-category { font-size: .6rem; color: #8b9dad; background: #f5f8fc; padding: 1px 7px; border-radius: 10px; }
        .tkt-row-bottom { display: flex; align-items: center; justify-content: space-between; }
        .tkt-status-badge { display: inline-flex; align-items: center; gap: 4px; font-size: .58rem; padding: 3px 8px; border-radius: 20px; border: 1px solid; font-weight: 700; }
        .tkt-date { font-size: .58rem; color: #aab5c3; }

        /* Detail column */
        .tkt-detail-col {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #fff;
        }
        .tkt-detail-head {
          padding: 18px 22px 14px;
          border-bottom: 1px solid #e5eaf0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          background: #fff;
        }
        .tkt-detail-title { font-size: .95rem; color: #073766; margin: 0 0 6px; font-weight: 700; }
        .tkt-detail-meta { display: flex; gap: 10px; font-size: .62rem; color: #8b9dad; flex-wrap: wrap; }
        .tkt-close-btn { border: 0; background: #f5f8fc; color: #526983; border-radius: 6px; width: 30px; height: 30px; cursor: pointer; font-size: 1rem; flex-shrink: 0; }

        /* Status bar */
        .tkt-status-bar {
          padding: 10px 22px;
          border-bottom: 1px solid #f0f3f8;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fafbfc;
          flex-wrap: wrap;
        }
        .tkt-status-label { font-size: .65rem; color: #7a8fa6; font-weight: 700; flex-shrink: 0; }
        .tkt-status-btns { display: flex; gap: 5px; flex-wrap: wrap; }
        .tkt-status-btn {
          border: 1px solid #e5eaf0;
          background: #fff;
          color: #526983;
          border-radius: 20px;
          padding: 4px 10px;
          font: inherit;
          font-size: .6rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all .15s;
        }
        .tkt-status-btn:hover:not(:disabled) { border-color: #0875dc; color: #0875dc; }
        .tkt-status-btn.current { font-weight: 800; }
        .tkt-status-btn:disabled:not(.current) { opacity: .5; cursor: not-allowed; }

        /* Messages */
        .tkt-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .tkt-msg { display: flex; gap: 10px; align-items: flex-start; }
        .tkt-msg-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #e8f1fb; color: #1758a6;
          display: grid; place-items: center;
          font-size: .7rem; font-weight: 800; flex-shrink: 0;
        }
        .tkt-msg-content { flex: 1; min-width: 0; }
        .tkt-msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .tkt-msg-header strong { font-size: .7rem; color: #1e3a56; }
        .tkt-msg-header small { font-size: .58rem; color: #aab5c3; }
        .tkt-msg-body {
          background: #f5f8fc;
          border: 1px solid #e5eaf0;
          border-radius: 0 10px 10px 10px;
          padding: 10px 14px;
          font-size: .72rem;
          color: #344d69;
          line-height: 1.6;
          margin: 0;
          white-space: pre-wrap;
        }

        /* Quick replies */
        .tkt-quick-replies {
          padding: 10px 22px;
          border-top: 1px solid #f0f3f8;
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: #fafbfc;
        }
        .tkt-quick-reply {
          text-align: right;
          border: 1px solid #e5eaf0;
          background: #fff;
          border-radius: 8px;
          padding: 8px 12px;
          font: inherit;
          font-size: .65rem;
          color: #344d69;
          cursor: pointer;
          transition: all .1s;
        }
        .tkt-quick-reply:hover { border-color: #0875dc; color: #0875dc; background: #f0f8ff; }

        /* Reply form */
        .tkt-reply-form {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          padding: 12px 22px;
          border-top: 1px solid #e5eaf0;
          background: #fff;
        }
        .tkt-quick-btn {
          width: 36px; height: 36px; border-radius: 8px;
          border: 1px solid #e5eaf0; background: #f5f8fc;
          color: #526983; cursor: pointer; display: grid; place-items: center;
          flex-shrink: 0;
        }
        .tkt-reply-input {
          flex: 1;
          border: 1px solid #e5eaf0;
          border-radius: 10px;
          padding: 10px 14px;
          font: inherit;
          font-size: .72rem;
          color: #344d69;
          resize: none;
          background: #f8fafc;
          line-height: 1.5;
        }
        .tkt-reply-input:focus { outline: none; border-color: #0875dc; background: #fff; }
        .tkt-send-btn {
          width: 40px; height: 40px; border-radius: 10px;
          border: 0; background: #0875dc; color: #fff;
          cursor: pointer; display: grid; place-items: center;
          flex-shrink: 0; transition: background .15s;
        }
        .tkt-send-btn:hover:not(:disabled) { background: #065fb8; }
        .tkt-send-btn:disabled { opacity: .5; cursor: not-allowed; }

        .tkt-empty-detail { min-height: 300px; }

        .spin { animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .tkt-layout { grid-template-columns: 1fr; height: auto; }
          .tkt-detail-col { display: ${`none`}; }
          .tkt-list-col { height: calc(100vh - 76px); }
        }
      `}</style>
    </main>
  );
}
