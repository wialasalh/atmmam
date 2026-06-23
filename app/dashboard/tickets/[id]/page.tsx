"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageSquare, Send, ChevronRight, Loader, AlertTriangle, User, Shield } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TicketDetail = {
  id: string;
  title: string;
  description: string;
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

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    } catch {
      router.replace("/dashboard/tickets");
    }
    setLoading(false);
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      if (res.ok) {
        const { data } = await res.json();
        setMessages(data || []);
      }
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

  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  const statusColors: Record<string, string> = {
    "جديدة": "#0875dc",
    "قيد المراجعة": "#856404",
    "بانتظار العميل": "#8d6e3f",
    "تم الحل": "#16a34a",
    "مغلقة": "#6c757d",
  };

  return (
    <div className="client-dash-page">
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard/tickets" className="client-dash-back-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".7rem" }}>
          <ChevronRight size={14} /> العودة للتذاكر
        </Link>
      </div>

      <div className="client-dash-section">
        <div className="ticket-detail-header">
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "1rem", color: "#073766" }}>{ticket.title}</h2>
            <div className="ticket-detail-meta">
              <span>{ticket.category}</span>
              <span style={{ color: statusColors[ticket.status] || "#6c757d" }}>● {ticket.status}</span>
              {ticket.priority === "عاجلة" && <span className="ticket-urgent-badge">عاجل</span>}
            </div>
          </div>
          <small style={{ color: "#8b9dad", fontSize: ".6rem" }}>
            {new Date(ticket.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </small>
        </div>
        <p style={{ fontSize: ".75rem", color: "#425c76", lineHeight: 1.8, margin: "12px 0 0", whiteSpace: "pre-wrap" }}>
          {ticket.description}
        </p>
      </div>

      <div className="client-dash-section" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e9eef3" }}>
          <h3 style={{ margin: 0, fontSize: ".78rem", color: "#073766" }}>المحادثة ({messages.length})</h3>
        </div>

        <div className="ticket-messages-list">
          {messages.length === 0 && (
            <div className="client-dash-empty" style={{ padding: "30px 20px" }}>
              <MessageSquare size={28} />
              <p>لا توجد رسائل بعد. كن أول من يرد.</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === userId;
            const isStaffMsg = !isMe && isStaff === false;
            return (
              <div key={msg.id} className={`ticket-message ${isMe ? "message-mine" : "message-other"}`}>
                <div className="ticket-message-header">
                  <span className="ticket-message-author">
                    {msg.profiles?.full_name || (isStaffMsg ? "فريق الدعم" : "أنت")}
                  </span>
                  <small>{new Date(msg.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</small>
                </div>
                <p className="ticket-message-body">{msg.body}</p>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {ticket.status !== "مغلقة" ? (
          <form onSubmit={handleSendMessage} className="ticket-message-form">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب ردك..."
              className="ticket-message-input"
            />
            <button type="submit" className="ticket-send-btn" disabled={sending || !newMessage.trim()}>
              <Send size={16} />
            </button>
          </form>
        ) : (
          <div style={{ padding: "16px 20px", textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>
            هذه التذكرة مغلقة. لا يمكن إضافة ردود جديدة.
          </div>
        )}
      </div>
    </div>
  );
}
