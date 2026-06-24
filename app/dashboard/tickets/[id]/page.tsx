"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, ChevronRight, Loader, CheckCircle, Clock, RefreshCw, AlertTriangle, XCircle, Shield } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TicketDetail = {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string };
};

type Message = {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { full_name: string };
};

type StatusHistory = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  "جديدة":          { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} />, label: "جديدة" },
  "قيد المراجعة":   { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} />, label: "قيد المراجعة" },
  "بانتظار العميل": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertTriangle size={11} />, label: "بانتظار ردك" },
  "تم الحل":        { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} />, label: "تم الحل" },
  "مغلقة":          { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} />, label: "مغلقة" },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  "عاجلة":  { color: "#dc2626", bg: "#fef2f2" },
  "مرتفعة": { color: "#ea580c", bg: "#fff7ed" },
  "عادية":  { color: "#6b7280", bg: "#f9fafb" },
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("profiles").select("full_name, role").eq("id", user.id).single().then(({ data }) => {
          if (data) setProfile(data);
        });
      }
    });
    loadTicket();
    loadMessages();
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadTicket() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) { router.replace("/dashboard/tickets"); return; }
      const { data } = await res.json();
      setTicket(data);
    } catch { router.replace("/dashboard/tickets"); }
    setLoading(false);
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      if (res.ok) { const { data } = await res.json(); setMessages(data || []); }
    } catch {}
  }

  async function loadHistory() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/history`);
      if (res.ok) { const { data } = await res.json(); setHistory(data || []); }
    } catch {}
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        await loadMessages();
        await loadTicket();
      }
    } catch {}
    setSending(false);
  }

  if (loading) {
    return (
      <div className="client-dash-page">
        <div className="client-dash-empty"><Loader size={32} className="spin" /><p>جاري التحميل...</p></div>
      </div>
    );
  }
  if (!ticket) return null;

  const ss = STATUS_STYLE[ticket.status] || STATUS_STYLE["جديدة"];
  const ps = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE["عادية"];
  const isClosed = ticket.status === "مغلقة";
  const isWaitingClient = ticket.status === "بانتظار العميل";

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const d = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.msgs.push(msg);
    else grouped.push({ date: d, msgs: [msg] });
  });

  return (
    <div className="client-dash-page" style={{ paddingBottom: 0 }}>

      {/* Back */}
      <Link href="/dashboard/tickets" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".68rem", color: "#526983", textDecoration: "none", marginBottom: 12 }}>
        <ChevronRight size={13} /> العودة لتذاكر الدعم
      </Link>

      {/* Ticket header */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: ".92rem", color: "#073766", fontWeight: 700, lineHeight: 1.4, flex: 1 }}>{ticket.title}</h2>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", padding: "3px 9px", borderRadius: 20, border: `1px solid ${ss.border}`, color: ss.color, background: ss.bg, fontWeight: 700, flexShrink: 0 }}>
            {ss.icon} {ss.label}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: ".6rem", color: "#8b9dad", background: "#f5f8fc", padding: "2px 8px", borderRadius: 10 }}>{ticket.category}</span>
          <span style={{ fontSize: ".6rem", padding: "2px 8px", borderRadius: 10, color: ps.color, background: ps.bg, fontWeight: 700 }}>{ticket.priority}</span>
          <span style={{ fontSize: ".58rem", color: "#aab5c3" }}>· {formatDate(ticket.created_at)}</span>
        </div>
        <p style={{ margin: 0, fontSize: ".72rem", color: "#425c76", lineHeight: 1.7, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", whiteSpace: "pre-wrap", borderRight: "3px solid #e5eaf0" }}>
          {ticket.body}
        </p>

        {/* Activity Timeline */}
        {history.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f3f8" }}>
            <div style={{ fontSize: ".6rem", color: "#8b9dad", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <RefreshCw size={11} /> سجل التحديثات
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {history.map(h => {
                const fc = STATUS_STYLE[h.from_status || ""];
                const tc = STATUS_STYLE[h.to_status];
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: tc?.color || "#8b9dad", marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: ".62rem", color: "#425c76" }}>
                      {h.from_status ? (
                        <><span style={{ color: fc?.color }}>{h.from_status}</span> ← <span style={{ color: tc?.color }}>{h.to_status}</span></>
                      ) : (
                        <span style={{ color: tc?.color }}>{h.to_status}</span>
                      )}
                      {h.note && <span style={{ color: "#8b9dad" }}> — {h.note}</span>}
                      <div style={{ fontSize: ".55rem", color: "#aab5c3", marginTop: 1 }}>
                        {h.profiles?.full_name || "النظام"} · {formatTime(h.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Waiting notice */}
      {isWaitingClient && (
        <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={15} color="#7c3aed" />
          <p style={{ margin: 0, fontSize: ".68rem", color: "#5b21b6", fontWeight: 600 }}>
            فريق الدعم بانتظار ردك على التذكرة.
          </p>
        </div>
      )}

      {/* Chat area */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>

        <div style={{ padding: "12px 18px", borderBottom: "1px solid #f0f3f8", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isClosed ? "#6b7280" : "#22c55e" }} />
          <h3 style={{ margin: 0, fontSize: ".75rem", color: "#073766" }}>المحادثة</h3>
          <span style={{ marginRight: "auto", fontSize: ".6rem", color: "#8b9dad" }}>{messages.length} رسالة</span>
        </div>

        {/* Messages */}
        <div style={{ minHeight: 200, maxHeight: 420, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 }}>

          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 20px", color: "#8b9dad", gap: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f8ff", display: "grid", placeItems: "center" }}>
                <Send size={20} color="#0875dc" />
              </div>
              <p style={{ margin: 0, fontSize: ".72rem" }}>لا توجد رسائل بعد. ابدأ المحادثة!</p>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.date}>
              <div style={{ textAlign: "center", margin: "12px 0" }}>
                <span style={{ fontSize: ".58rem", color: "#aab5c3", background: "#f5f8fc", padding: "3px 10px", borderRadius: 10 }}>{group.date}</span>
              </div>
              {group.msgs.map(msg => {
                const isMe = msg.user_id === userId;
                const isSupport = !isMe;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>

                    {/* Avatar */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: isSupport ? "#e8f1fb" : "#f0fdf4",
                      color: isSupport ? "#1758a6" : "#15803d",
                      display: "grid", placeItems: "center", fontSize: ".6rem", fontWeight: 800,
                    }}>
                      {isSupport ? <Shield size={14} /> : (profile?.full_name?.[0] || "أ")}
                    </div>

                    {/* Bubble */}
                    <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 3, alignItems: isMe ? "flex-end" : "flex-start" }}>
                      <span style={{ fontSize: ".58rem", color: "#aab5c3", paddingInline: 4 }}>
                        {isSupport ? (msg.profiles?.full_name || "فريق الدعم") : "أنت"} · {formatTime(msg.created_at)}
                      </span>
                      <div style={{
                        background: isMe ? "#0875dc" : "#f5f8fc",
                        color: isMe ? "#fff" : "#344d69",
                        borderRadius: isMe ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                        padding: "10px 14px",
                        fontSize: ".72rem",
                        lineHeight: 1.6,
                        border: isMe ? "none" : "1px solid #e5eaf0",
                        whiteSpace: "pre-wrap",
                      }}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {!isClosed ? (
          <form onSubmit={handleSendMessage} style={{ padding: "12px 16px", borderTop: "1px solid #f0f3f8", display: "flex", gap: 8, alignItems: "flex-end", background: "#fafbfc" }}>
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              placeholder="اكتب ردك هنا... (Enter للإرسال)"
              rows={2}
              style={{
                flex: 1, border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 14px",
                font: "inherit", fontSize: ".72rem", color: "#344d69", resize: "none",
                background: "#fff", lineHeight: 1.5, outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#0875dc"}
              onBlur={e => e.target.style.borderColor = "#e5eaf0"}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              style={{
                width: 42, height: 42, borderRadius: 10, border: 0,
                background: !newMessage.trim() || sending ? "#e5eaf0" : "#0875dc",
                color: !newMessage.trim() || sending ? "#8b9dad" : "#fff",
                cursor: !newMessage.trim() || sending ? "not-allowed" : "pointer",
                display: "grid", placeItems: "center", flexShrink: 0, transition: "all .15s",
              }}
            >
              {sending ? <Loader size={16} className="spin" /> : <Send size={16} />}
            </button>
          </form>
        ) : (
          <div style={{ padding: "14px 18px", textAlign: "center", color: "#8b9dad", fontSize: ".68rem", background: "#f8fafc", borderTop: "1px solid #f0f3f8" }}>
            <XCircle size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
            هذه التذكرة مغلقة ولا يمكن إضافة ردود جديدة.
          </div>
        )}
      </div>

      <style>{`.spin { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
