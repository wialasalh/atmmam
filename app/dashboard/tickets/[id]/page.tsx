"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, ChevronRight, Loader, CheckCircle, Clock, RefreshCw, AlertTriangle, XCircle, Shield, Paperclip, X, FileText, Download, ExternalLink, Hash, Building2, Users, FileCheck, Star } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseTicketDetails, getTicketRef } from "@/lib/ticket-details";

type TicketDetail = {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  files?: string[];
  profiles?: { full_name: string; email: string };
};

type Message = {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  created_at: string;
  message_type?: string;
  is_internal?: boolean;
  sender?: { full_name: string; role: string; avatar_url?: string };
};

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير عمليات",
  operator: "مشرف",
  client: "عميل",
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
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [ticketFiles, setTicketFiles] = useState<{ path: string; name: string; url?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [ratings, setRatings] = useState<Record<string, { rating: number; comment: string; submitted: boolean }>>({});
  const [submittingRating, setSubmittingRating] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [localRating, setLocalRating] = useState(0);
  const [localComment, setLocalComment] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Initial load + auth
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

  // Poll messages every 5s
  useEffect(() => {
    const iv = setInterval(loadMessages, 5000);
    return () => clearInterval(iv);
  }, []);

  // Poll ticket data every 15s
  useEffect(() => {
    const iv = setInterval(loadTicket, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadTicket() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) {
        if (res.status === 404) router.replace("/dashboard/tickets");
        setLoading(false);
        return;
      }
      const { data } = await res.json();
      setTicket(data);
      if (data?.files?.length) {
        const supabase = createSupabaseBrowserClient();
        const files = await Promise.all(data.files.map(async (fp: string) => {
          const { data: signed } = await supabase.storage.from("ticket-attachments").createSignedUrl(fp, 3600);
          return { path: fp, name: fp.split("/").pop() || fp, url: signed?.signedUrl };
        }));
        setTicketFiles(files.filter((f): f is typeof f & { url: string } => !!f.url));
      } else {
        setTicketFiles([]);
      }
    } catch { /* network error — keep previous state */ }
    setLoading(false);
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      if (res.ok) { const { data } = await res.json(); setMessages(data || []); }
    } catch {}
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    setSending(true);
    const supabase = createSupabaseBrowserClient();
    const uploadedPaths: string[] = [];
    try {
      // Upload pending files
      if (pendingFiles.length) {
        setUploading(true);
        for (const file of pendingFiles) {
          const ext = file.name.split(".").pop();
          const path = `tickets/${ticketId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("ticket-attachments").upload(path, file);
          if (!uploadErr) uploadedPaths.push(path);
        }
        setUploading(false);
      }

      // Send message
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, body: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        setPendingFiles([]);
        // Add file paths to ticket
        if (uploadedPaths.length && ticket) {
          await supabase.from("tickets").update({ files: [...(ticket.files || []), ...uploadedPaths] }).eq("id", ticketId);
        }
        await loadMessages();
        await loadTicket();
      }
    } catch {}
    setSending(false);
    setUploading(false);
  }

  if (loading) {
    return (
      <div className="client-dash-page">
        <div className="client-dash-empty"><Loader size={32} className="spin" /><p>جاري التحميل...</p></div>
      </div>
    );
  }
  if (!ticket) return null;

  const parsed = parseTicketDetails(ticket.body);
  const ticketRef = getTicketRef(ticket.id);
  const ss = STATUS_STYLE[ticket.status] || STATUS_STYLE["جديدة"];
  const ps = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE["عادية"];
  const isClosed = ticket.status === "مغلقة";
  const isResolved = ticket.status === "تم الحل";
  const canRate = isClosed || isResolved;
  const isWaitingClient = ticket.status === "بانتظار العميل";

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.filter(m => !m.is_internal && (!m.message_type || (m.message_type !== "rating" && m.message_type !== "status_change"))).forEach(msg => {
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
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>

        {/* Top bar: ref + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 0", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".75rem", fontWeight: 800, color: "#0875dc", fontFamily: "monospace", direction: "ltr" }}>
            <Hash size={13} /> {ticketRef}
          </span>
          <span style={{ marginRight: "auto" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", padding: "3px 9px", borderRadius: 20, border: `1px solid ${ss.border}`, color: ss.color, background: ss.bg, fontWeight: 700 }}>
            {ss.icon} {ss.label}
          </span>
        </div>

        {/* Title */}
        <h2 style={{ margin: "8px 18px 0", fontSize: ".92rem", color: "#073766", fontWeight: 700, lineHeight: 1.4 }}>{ticket.title}</h2>

        {/* Meta badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 18px 0" }}>
          <span style={{ fontSize: ".6rem", color: "#8b9dad", background: "#f5f8fc", padding: "2px 8px", borderRadius: 10 }}>{ticket.category}</span>
          <span style={{ fontSize: ".6rem", padding: "2px 8px", borderRadius: 10, color: ps.color, background: ps.bg, fontWeight: 700 }}>{ticket.priority}</span>
          <span style={{ fontSize: ".58rem", color: "#aab5c3" }}>· {formatDate(ticket.created_at)}</span>
        </div>

        {/* Description */}
        <p style={{ margin: "10px 18px 0", fontSize: ".72rem", color: "#425c76", lineHeight: 1.7, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", whiteSpace: "pre-wrap", borderRight: "3px solid #e5eaf0" }}>
          {parsed.mainDescription}
        </p>

        {/* Last edited indicator */}
        {new Date(ticket.updated_at).getTime() > new Date(ticket.created_at).getTime() + 60000 && (
          <div style={{ padding: "0px 18px 10px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "5px 10px", fontSize: ".6rem", color: "#92400e", fontWeight: 600 }}>
              <FileText size={12} style={{ color: "#d97706" }} />
              آخر تعديل: {new Date(ticket.updated_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        )}

        {/* Extra fields */}
        {parsed.extraFields.length > 0 && (
          <div style={{ padding: "12px 18px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: ".62rem", fontWeight: 700, color: "#073766", display: "flex", alignItems: "center", gap: 5 }}>
              <FileCheck size={13} /> تفاصيل الطلب
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {parsed.extraFields.map((f, i) => (
                <div key={i} style={{ background: "#f5f8fc", borderRadius: 8, padding: "8px 10px", border: "1px solid #e5eaf0" }}>
                  <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: ".68rem", color: "#1e3a56", fontWeight: 700 }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isClosed && (
          <div style={{ padding: "0px 18px 14px", display: "flex", gap: 8 }}>
            <button onClick={() => { setEditTitle(ticket.title); setEditBody(ticket.body || ""); setShowEditModal(true); }} className="client-dash-secondary-btn" style={{ fontSize: ".62rem", padding: "6px 12px" }}>
              <FileText size={13} /> تعديل التذكرة
            </button>
            <button onClick={() => { setCancelReason(""); setShowCancelModal(true); }} className="client-dash-secondary-btn" style={{ fontSize: ".62rem", padding: "6px 12px", color: "#dc2626", borderColor: "#fecaca" }}>
              <XCircle size={13} /> إلغاء التذكرة
            </button>
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
          <span style={{ marginRight: "auto", fontSize: ".6rem", color: "#8b9dad", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="live-pulse" style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
            مباشر
            <span style={{ marginRight: 4 }}>{messages.length} رسالة</span>
          </span>
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
                const senderRole = msg.sender?.role || "client";
                const roleLabel = ROLE_LABELS[senderRole] || senderRole;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row" : "row-reverse", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>

                    {/* Avatar */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: isSupport ? "#e8f1fb" : "#f0fdf4",
                      color: isSupport ? "#1758a6" : "#15803d",
                      display: "grid", placeItems: "center", fontSize: ".6rem", fontWeight: 800, overflow: "hidden",
                    }}>
                      {isSupport ? (
                        msg.sender?.avatar_url ? (
                          <img src={msg.sender.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Shield size={14} />
                        )
                      ) : (profile?.full_name?.[0] || "أ")}
                    </div>

                    {/* Bubble */}
                    <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 3, alignItems: isMe ? "flex-start" : "flex-end" }}>
                      <span style={{ fontSize: ".58rem", color: "#aab5c3", paddingInline: 4 }}>
                        {isSupport ? (msg.sender?.full_name || "فريق الدعم") : "أنت"}
                        <span style={{ fontSize: ".55rem", opacity: 0.7 }}> · {roleLabel}</span>
                        <span> · {formatTime(msg.created_at)}</span>
                      </span>
                      <div style={{
                        background: isMe ? "#0875dc" : "#f5f8fc",
                        color: isMe ? "#fff" : "#344d69",
                        borderRadius: isMe ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                        padding: "10px 14px",
                        fontSize: ".72rem",
                        lineHeight: 1.6,
                        border: isMe ? "none" : "1px solid #e5eaf0",
                        whiteSpace: "pre-wrap",
                      }}>
                        {msg.body}
                      </div>
                      {/* Attachments for this message */}
                      {ticketFiles.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                          {ticketFiles.map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener" style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: ".6rem", color: isMe ? "#93c5fd" : "#0875dc",
                              textDecoration: "none", padding: "2px 6px",
                              background: isMe ? "rgba(255,255,255,.1)" : "#eaf4ff",
                              borderRadius: 6,
                            }}>
                              <Download size={10} /> {f.name}
                            </a>
                          ))}
                        </div>
                      )}
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
          <form onSubmit={handleSendMessage} style={{ padding: "12px 16px", borderTop: "1px solid #f0f3f8", background: "#fafbfc" }}>
            {/* Pending file badges */}
            {pendingFiles.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {pendingFiles.map((f, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", background: "#eaf4ff", color: "#0875dc", borderRadius: 6, padding: "3px 8px", border: "1px solid #bddcff" }}>
                    <FileText size={11} />
                    {f.name}
                    <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} style={{ border: 0, background: "transparent", color: "#0875dc", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  placeholder="اكتب ردك هنا... (Enter للإرسال)"
                  rows={2}
                  style={{
                    width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 14px",
                    font: "inherit", fontSize: ".72rem", color: "#344d69", resize: "none",
                    background: "#fff", lineHeight: 1.5, outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#0875dc"}
                  onBlur={e => e.target.style.borderColor = "#e5eaf0"}
                />
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xlsx,.zip"
                  style={{ display: "none" }}
                  onChange={e => {
                    if (e.target.files?.length) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: "1px solid #e5eaf0",
                    background: "#f5f8fc", color: "#526983", cursor: "pointer",
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}
                >
                  <Paperclip size={15} />
                </button>
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && pendingFiles.length === 0) || sending || uploading}
                  style={{
                    width: 42, height: 42, borderRadius: 10, border: 0,
                    background: (!newMessage.trim() && pendingFiles.length === 0) || sending || uploading ? "#e5eaf0" : "#0875dc",
                    color: (!newMessage.trim() && pendingFiles.length === 0) || sending || uploading ? "#8b9dad" : "#fff",
                    cursor: (!newMessage.trim() && pendingFiles.length === 0) || sending || uploading ? "not-allowed" : "pointer",
                    display: "grid", placeItems: "center", flexShrink: 0, transition: "all .15s",
                  }}
                >
                  {uploading ? <Loader size={16} className="spin" /> : sending ? <Loader size={16} className="spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div style={{ padding: "14px 18px", textAlign: "center", color: "#8b9dad", fontSize: ".68rem", background: "#f8fafc", borderTop: "1px solid #f0f3f8" }}>
            <XCircle size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} />
            هذه التذكرة مغلقة ولا يمكن إضافة ردود جديدة.
          </div>
        )}
      </div>

      {/* Rating section */}
      {canRate && (() => {
        const staffMap = new Map<string, { id: string; name: string }>();
        messages.forEach(msg => {
          if (msg.sender && msg.sender.role !== "client" && msg.sender.role !== "viewer") {
            if (!staffMap.has(msg.user_id)) {
              staffMap.set(msg.user_id, { id: msg.user_id, name: msg.sender.full_name || "موظف" });
            }
          }
        });
        const staffList = Array.from(staffMap.values());

        if (staffList.length === 0) return null;

        const alreadyRatedStaff = staffList.filter(s => ratings[s.id]?.submitted);
        const pendingStaff = staffList.filter(s => !ratings[s.id]?.submitted);
        const currentSel = selectedStaff && pendingStaff.find(s => s.id === selectedStaff) ? selectedStaff : pendingStaff[0]?.id || "";

        return (
          <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #f0f3f8", display: "flex", alignItems: "center", gap: 8 }}>
              <Star size={14} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: ".75rem", color: "#073766" }}>تقييم الخدمة</h3>
              {pendingStaff.length === 0 && <span style={{ marginRight: "auto", fontSize: ".6rem", color: "#15803d", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}><CheckCircle size={12} /> تم تقييم الجميع</span>}
            </div>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Already rated summary */}
              {alreadyRatedStaff.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {alreadyRatedStaff.map(s => {
                    const r = ratings[s.id];
                    return (
                      <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".58rem", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 8px", fontWeight: 600 }}>
                        <Star size={14} strokeWidth={1.5} fill="#f59e0b" color="#f59e0b" />
                        {s.name} ({r.rating}/5)
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Pending rating */}
              {pendingStaff.length > 0 && (
                <>
                  {/* Select staff */}
                  <div>
                    <label style={{ fontSize: ".6rem", fontWeight: 700, color: "#526983", display: "block", marginBottom: 4 }}>اختر الموظف:</label>
                    <select
                      value={currentSel}
                      onChange={e => { setSelectedStaff(e.target.value); setLocalRating(0); setLocalComment(""); }}
                      style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 8, padding: "7px 10px", font: "inherit", fontSize: ".68rem", color: "#344d69", background: "#f8fafc", outline: "none" }}
                    >
                      {pendingStaff.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stars */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: ".6rem", color: "#7a8fa6", marginLeft: 8 }}>التقييم:</span>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setLocalRating(s)} style={{ border: 0, background: "transparent", cursor: "pointer", padding: 2, display: "grid", placeItems: "center" }}>
                        <Star size={22} fill={localRating >= s ? "#f59e0b" : "#e5eaf0"} color={localRating >= s ? "#f59e0b" : "#e5eaf0"} />
                      </button>
                    ))}
                    {localRating > 0 && <span style={{ fontSize: ".6rem", color: "#7a8fa6", marginRight: 4, fontWeight: 700 }}>{localRating}/5</span>}
                  </div>

                  {/* Comment */}
                  <textarea
                    value={localComment}
                    onChange={e => setLocalComment(e.target.value)}
                    placeholder="أكتب تعليقك (اختياري)..."
                    rows={2}
                    style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 8, padding: "7px 10px", font: "inherit", fontSize: ".65rem", color: "#344d69", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5, outline: "none" }}
                  />

                  {/* Submit */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ratingError && (
                      <div style={{ fontSize: ".6rem", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", fontWeight: 600 }}>
                        {ratingError}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        disabled={!localRating || submittingRating || !currentSel}
                        onClick={async () => {
                          setRatingError("");
                          if (!currentSel) { setRatingError("الرجاء اختيار الموظف"); return; }
                          setSubmittingRating(true);
                          try {
                            const res = await fetch(`/api/tickets/${ticketId}/rating`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ staff_id: currentSel, rating: localRating, comment: localComment || "" }),
                            });
                            const json = await res.json().catch(() => ({}));
                            if (res.ok) {
                              setRatings(prev => ({ ...prev, [currentSel]: { rating: localRating, comment: localComment, submitted: true } }));
                              setLocalRating(0);
                              setLocalComment("");
                              setRatingError("");
                              loadMessages();
                              const next = pendingStaff.find(s => s.id !== currentSel);
                              if (next) setSelectedStaff(next.id);
                            } else {
                              setRatingError(json?.error || "فشل إرسال التقييم، حاول مرة أخرى");
                            }
                          } catch (e) {
                            setRatingError("حدث خطأ في الاتصال، حاول مرة أخرى");
                          }
                          setSubmittingRating(false);
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          border: 0, background: !localRating || submittingRating || !currentSel ? "#e5eaf0" : "#f59e0b",
                          color: !localRating || submittingRating || !currentSel ? "#8b9dad" : "#fff",
                          borderRadius: 8, padding: "7px 16px", font: "inherit", fontSize: ".65rem", fontWeight: 700, cursor: !localRating || !currentSel ? "not-allowed" : "pointer", transition: "all .15s",
                        }}
                      >
                        {submittingRating ? <Loader size={12} className="spin" /> : <Star size={12} fill="#fff" />}
                        {submittingRating ? "جاري الإرسال..." : "إرسال التقييم"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Edit modal */}
      {showEditModal && (
        <div className="dash-overlay" onClick={() => setShowEditModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>تعديل التذكرة</h3>
              <button className="dash-modal-close" onClick={() => setShowEditModal(false)}><X size={16} /></button>
            </div>
            <div className="dash-modal-body">
              <label className="dash-label">العنوان</label>
              <input className="dash-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              <label className="dash-label" style={{ marginTop: 12 }}>الوصف</label>
              <textarea className="dash-input dash-textarea" value={editBody} onChange={e => setEditBody(e.target.value)} rows={4} />
            </div>
            <div className="dash-modal-footer">
              <button className="dash-btn dash-btn-ghost" onClick={() => setShowEditModal(false)}>إلغاء</button>
              <button className="dash-btn dash-btn-primary" disabled={savingEdit || !editTitle.trim()} onClick={async () => {
                setSavingEdit(true);
                try {
                  const res = await fetch(`/api/tickets/${ticketId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: editTitle, body: editBody }),
                  });
                  if (res.ok) {
                    setShowEditModal(false);
                    await loadTicket();
                  } else {
                    const err = await res.json().catch(() => ({}));
                    alert(err.error || "تعذر حفظ التعديلات");
                  }
                } catch { alert("حدث خطأ في الاتصال"); }
                setSavingEdit(false);
              }}>{savingEdit ? <Loader size={14} className="spin" /> : "حفظ التعديلات"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="dash-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3 style={{ color: "#dc2626" }}>إلغاء التذكرة</h3>
              <button className="dash-modal-close" onClick={() => setShowCancelModal(false)}><X size={16} /></button>
            </div>
            <div className="dash-modal-body">
              <p style={{ fontSize: ".7rem", color: "#6f869b", margin: "0 0 12px" }}>سيتم إغلاق التذكرة ولن تتمكن من إضافة ردود جديدة.</p>
              <label className="dash-label">سبب الإلغاء (اختياري)</label>
              <textarea className="dash-input dash-textarea" value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} placeholder="اذكر سبب الإلغاء..." />
            </div>
            <div className="dash-modal-footer">
              <button className="dash-btn dash-btn-ghost" onClick={() => setShowCancelModal(false)}>رجوع</button>
              <button className="dash-btn dash-btn-danger" disabled={cancelling} onClick={async () => {
                setCancelling(true);
                try {
                  const res = await fetch(`/api/tickets/${ticketId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "مغلقة", note: cancelReason.trim() || "إلغاء من قبل العميل" }),
                  });
                  if (res.ok) {
                    setShowCancelModal(false);
                    await loadTicket();
                    await loadMessages();
                  } else {
                    const err = await res.json().catch(() => ({}));
                    alert(err.error || "تعذر إلغاء التذكرة");
                  }
                } catch { alert("حدث خطأ في الاتصال"); }
                setCancelling(false);
              }}>{cancelling ? <Loader size={14} className="spin" /> : "تأكيد الإلغاء"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .live-pulse { animation: pulse-dot 1.5s ease-in-out infinite; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
        .dash-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 999; display: grid; place-items: center; padding: 20px; }
        .dash-modal { background: #fff; border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,.18); width: 100%; max-width: 480px; overflow: hidden; }
        .dash-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f0f3f8; }
        .dash-modal-header h3 { margin: 0; font-size: .82rem; color: #073766; font-weight: 800; }
        .dash-modal-close { border: 0; background: #f5f8fc; color: #7a8fa6; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: grid; place-items: center; transition: all .15s; }
        .dash-modal-close:hover { background: #fee2e2; color: #dc2626; }
        .dash-modal-body { padding: 16px 18px; }
        .dash-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid #f0f3f8; }
        .dash-label { display: block; font-size: .62rem; font-weight: 700; color: #344d69; margin-bottom: 4px; }
        .dash-input { width: 100%; border: 1px solid #e5eaf0; border-radius: 8px; padding: 8px 10px; font: inherit; font-size: .72rem; color: #344d69; background: #fff; outline: none; box-sizing: border-box; }
        .dash-input:focus { border-color: #0875dc; }
        .dash-textarea { resize: vertical; min-height: 80px; line-height: 1.6; }
        .dash-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 8px 14px; font: inherit; font-size: .65rem; font-weight: 700; cursor: pointer; transition: all .15s; }
        .dash-btn:disabled { opacity: .5; cursor: not-allowed; }
        .dash-btn-ghost { background: transparent; color: #526983; border: 1px solid #e5eaf0; }
        .dash-btn-ghost:hover:not(:disabled) { background: #f5f8fc; }
        .dash-btn-primary { background: #0875dc; color: #fff; border: 0; }
        .dash-btn-primary:hover:not(:disabled) { background: #065fb8; }
        .dash-btn-danger { background: #dc2626; color: #fff; border: 0; }
        .dash-btn-danger:hover:not(:disabled) { background: #b91c1c; }
      `}</style>
    </div>
  );
}
