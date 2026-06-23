"use client";

import { useEffect, useState } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import { Search, MessageSquare, Check, X, Eye, ChevronLeft, Loader } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [newNote, setNewNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (selected) {
      setMessages([]);
      fetch(`/api/tickets/${selected.id}/messages`).then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          setMessages(d.data || []);
        }
      });
    }
  }, [selected]);

  async function loadTickets() {
    try {
      const url = statusFilter ? `/api/tickets?status=${statusFilter}` : "/api/tickets";
      const res = await fetch(url);
      if (res.ok) {
        const { data } = await res.json();
        setTickets(data || []);
      }
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
      if (selected?.id === ticketId) {
        setSelected({ ...selected, status });
      }
    } catch {}
    setUpdating(false);
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() || !selected) return;
    try {
      await fetch(`/api/tickets/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newNote.trim() }),
      });
      setNewNote("");
      const res = await fetch(`/api/tickets/${selected.id}/messages`);
      if (res.ok) {
        const { data } = await res.json();
        setMessages(data || []);
      }
    } catch {}
  }

  const filtered = tickets.filter((t) =>
    `${t.title} ${t.profiles?.full_name || ""} ${t.profiles?.email || ""}`
      .toLowerCase().includes(search.trim().toLowerCase())
  );

  const statusColors: Record<string, string> = {
    "جديدة": "#0875dc",
    "قيد المراجعة": "#856404",
    "بانتظار العميل": "#8d6e3f",
    "تم الحل": "#16a34a",
    "مغلقة": "#6c757d",
  };

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="tickets" />
      <div className="ops-layout">
        <div className="ops-main">
          <div className="ops-page-header">
            <h1>تذاكر الدعم</h1>
            <div className="ops-filter-tabs">
              {["", "جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setLoading(true); loadTickets(); }}
                  className={`ops-filter-tab ${statusFilter === s ? "active" : ""}`}
                >
                  {s || "الكل"}
                </button>
              ))}
            </div>
          </div>

          <div className="ops-toolbar">
            <label>
              <Search size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في التذاكر..." />
            </label>
          </div>

          {loading ? (
            <div className="ops-table-card"><div className="ops-table-scroll"><table><tbody><tr><td className="ops-empty" colSpan={6}><Loader size={20} className="spin" /> جاري التحميل...</td></tr></tbody></table></div></div>
          ) : filtered.length === 0 ? (
            <div className="ops-table-card"><div className="ops-table-scroll"><table><tbody><tr><td className="ops-empty" colSpan={6}>{search ? "لا توجد نتائج" : "لا توجد تذاكر بعد."}</td></tr></tbody></table></div></div>
          ) : (
            <div className="ops-table-card">
              <div className="ops-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>الموضوع</th>
                      <th>العميل</th>
                      <th>القسم</th>
                      <th>الحالة</th>
                      <th>الأولوية</th>
                      <th>التاريخ</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t.id} onClick={() => setSelected(t)} className={selected?.id === t.id ? "ops-row-active" : ""}>
                        <td><strong style={{ fontSize: ".72rem" }}>{t.title}</strong></td>
                        <td style={{ fontSize: ".65rem" }}>
                          {t.profiles?.full_name || "—"}
                          {t.profiles?.email && <br />}
                          {t.profiles?.email && <small style={{ color: "#8b9dad" }}>{t.profiles.email}</small>}
                        </td>
                        <td style={{ fontSize: ".6rem" }}>{t.category}</td>
                        <td>
                          <span className="ops-status" style={{
                            background: statusColors[t.status] + "20",
                            color: statusColors[t.status],
                            padding: "2px 10px",
                            borderRadius: 999,
                            fontSize: ".6rem",
                            fontWeight: 700,
                          }}>{t.status}</span>
                        </td>
                        <td style={{ fontSize: ".6rem" }}>
                          {t.priority === "عاجلة" ? <span style={{ color: "#dc2626", fontWeight: 700 }}>عاجل</span> :
                           t.priority === "مرتفعة" ? <span style={{ color: "#ea580c", fontWeight: 600 }}>مرتفعة</span> :
                           <span style={{ color: "#6c757d" }}>عادية</span>}
                        </td>
                        <td style={{ fontSize: ".6rem", color: "#8b9dad" }}>
                          {new Date(t.created_at).toLocaleDateString("ar-SA")}
                        </td>
                        <td><Eye size={14} style={{ color: "#8b9dad" }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="ops-summary">
          {selected ? (
            <>
              <div className="ops-summary-head">
                <h2 style={{ fontSize: ".85rem" }}>{selected.title}</h2>
                <button onClick={() => setSelected(null)}>✕</button>
              </div>

              <div style={{ padding: "12px 20px", background: "#f8fafc" }}>
                <dl className="ops-summary-dl">
                  <div><dt>العميل</dt><dd>{selected.profiles?.full_name || "—"}</dd></div>
                  <div><dt>البريد</dt><dd>{selected.profiles?.email || "—"}</dd></div>
                  <div><dt>القسم</dt><dd>{selected.category}</dd></div>
                  <div><dt>الأولوية</dt><dd>{selected.priority}</dd></div>
                  <div><dt>تاريخ الإنشاء</dt><dd>{new Date(selected.created_at).toLocaleDateString("ar-SA")}</dd></div>
                </dl>
              </div>

              <div className="ops-timeline" style={{ padding: "15px 20px" }}>
                <h3>تحديث الحالة</h3>
                <div className="ops-status-actions">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      disabled={updating || s === selected.status}
                      className={`ops-status-btn ${s === selected.status ? "current" : ""}`}
                    >
                      {s === selected.status && <Check size={12} />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ops-timeline" style={{ padding: "15px 20px", flex: 1 }}>
                <h3>الرسائل ({messages.length})</h3>
                <div className="ops-messages-list">
                  {messages.map((msg) => (
                    <div key={msg.id} className="ops-message">
                      <div className="ops-message-header">
                        <strong>{msg.profiles?.full_name || "النظام"}</strong>
                        <small>{new Date(msg.created_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                      </div>
                      <p>{msg.body}</p>
                    </div>
                  ))}
                  <div className="ops-message-reply">
                    <form onSubmit={sendNote}>
                      <input
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="رد..."
                        style={{ flex: 1, border: "1px solid #dfe7ef", borderRadius: 8, padding: "8px 12px", fontSize: ".65rem", font: "inherit" }}
                      />
                      <button type="submit" disabled={!newNote.trim()} className="ops-primary-btn" style={{ padding: "8px 14px", fontSize: ".65rem" }}>
                        إرسال
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 30, textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>
              <MessageSquare size={32} style={{ marginBottom: 10, opacity: .4 }} />
              <p>اختر تذكرة لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
