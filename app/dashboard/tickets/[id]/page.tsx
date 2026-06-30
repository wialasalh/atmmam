"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader, CheckCircle2, Clock, RefreshCw, AlertTriangle, XCircle, FileText, Hash, Shield, Star, CalendarClock, X, Send, MapPin, Video, Phone, PenLine, BadgeCheck, Ban } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseTicketDetails, getTicketRef } from "@/lib/ticket-details";
import { formatAppDate, formatAppDateTime } from "@/lib/date-format";

type TicketDetail = {
  id: string; title: string; body: string;
  category: string; priority: string; status: string; type?: string;
  created_at: string; updated_at: string; files?: string[];
  consultation_method?: string | null;
  consultation_phone?: string | null;
  consultation_scheduled_at?: string | null;
  consultation_price?: number | null;
  consultation_status?: string | null;
};

type Reply = {
  id: string; user_id: string; body: string; created_at: string;
  is_internal?: boolean; message_type?: string;
  sender?: { full_name: string; role: string; avatar_url?: string };
};

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  "جديدة":          { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} />,         label: "جديدة" },
  "قيد المراجعة":   { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} />,     label: "قيد المراجعة" },
  "بانتظار العميل": { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <AlertTriangle size={11} />, label: "بانتظار توضيحك" },
  "تم الحل":        { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={11} />,  label: "تم الحل" },
  "مغلقة":              { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} />,   label: "مغلقة" },
  "مغلقة من العميل":   { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} />,   label: "مغلقة" },
};

const METHOD_ICON: Record<string, React.ReactNode> = {
  "مكالمة هاتفية": <Phone size={14} />,
  "اتصال مرئي":    <Video size={14} />,
  "حضوري":         <MapPin size={14} />,
  "كتابياً":        <PenLine size={14} />,
};

function parseConsultationReply(body: string) {
  const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
  const result: { status?: string; date?: string; method?: string; price?: string; link?: string; note?: string[] } = { note: [] };
  for (const line of lines) {
    if (line.startsWith("تم جدولة") || line.startsWith("تمت الاستشارة") || line.startsWith("تم إلغاء")) { result.status = line; }
    else if (line.startsWith("الموعد:")) { result.date = line.replace("الموعد:", "").trim(); }
    else if (line.startsWith("طريقة التواصل:")) { result.method = line.replace("طريقة التواصل:", "").trim(); }
    else if (line.startsWith("رسوم الاستشارة:")) { result.price = line.replace("رسوم الاستشارة:", "").trim(); }
    else if (line.startsWith("رابط الاجتماع:")) { result.link = line.replace("رابط الاجتماع:", "").trim(); }
    else { result.note!.push(line); }
  }
  return result;
}

function isConsultationReply(body: string) {
  return body.includes("تم جدولة الاستشارة") || body.includes("تمت الاستشارة") || body.includes("تم إلغاء الاستشارة");
}

function formatDate(d: string) {
  return formatAppDate(d);
}
function formatTime(d: string) {
  return formatAppDateTime(d);
}

function AttachmentsCard({ files, ticketId }: { files: string[]; ticketId: string }) {
  const [urls, setUrls] = useState<{ name: string; url: string }[]>([]);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all(files.map(async path => {
      const name = path.split("/").pop() || path;
      const { data } = await supabase.storage.from("ticket-attachments").createSignedUrl(path, 3600);
      return data?.signedUrl ? { name, url: data.signedUrl } : null;
    })).then(results => setUrls(results.filter(Boolean) as { name: string; url: string }[]));
  }, [files]);
  if (!urls.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0f4f8", display: "flex", alignItems: "center", gap: 7 }}>
        <FileText size={13} color="#526983" />
        <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#344d69" }}>المرفقات</span>
        <span style={{ marginRight: "auto", fontSize: ".58rem", color: "#8b9dad" }}>{urls.length} ملف</span>
      </div>
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {urls.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", border: "1px solid #e5eaf0", borderRadius: 9, textDecoration: "none" }}>
            <FileText size={14} color="#0875dc" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: ".68rem", color: "#344d69", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
            <span style={{ fontSize: ".58rem", color: "#0875dc", fontWeight: 700, flexShrink: 0 }}>فتح ↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const params     = useParams();
  const router     = useRouter();
  const searchParams = useSearchParams();
  const ticketId   = params.id as string;
  const isNewConsultation = searchParams.get("consultation") === "1";

  const [ticket,   setTicket]   = useState<TicketDetail | null>(null);
  const [replies,  setReplies]  = useState<Reply[]>([]);
  const [userId,   setUserId]   = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [clarify,  setClarify]  = useState("");
  const [sending,  setSending]  = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [closing,   setClosing]  = useState(false);
  const [localRating, setLocalRating] = useState(0);
  const [ratingNote,  setRatingNote]  = useState("");
  const [ratingDone,  setRatingDone]  = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    load();
  }, []);

  async function load() {
    try {
      const [tr, mr] = await Promise.all([
        fetch(`/api/tickets/${ticketId}`),
        fetch(`/api/tickets/${ticketId}/messages`),
      ]);
      if (!tr.ok) { if (tr.status === 404) router.replace("/dashboard/tickets"); return; }
      const { data } = await tr.json();
      setTicket(data);
      if (mr.ok) {
        const { data: msgs } = await mr.json();
        const visible = (msgs || []).filter((m: Reply) =>
          !m.is_internal &&
          m.message_type !== "status_change" &&
          m.message_type !== "revision" &&
          m.message_type !== "rating"
        );
        setReplies(visible);
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendClarification() {
    if (!clarify.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, body: clarify.trim() }),
      });
      if (res.ok) { setClarify(""); await load(); }
    } finally { setSending(false); }
  }

  async function closeTicket() {
    setClosing(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "مغلقة من العميل", note: closeNote.trim() }),
      });
      if (res.ok) { setShowClose(false); await load(); }
    } finally { setClosing(false); }
  }

  async function submitRating() {
    const staffReply = replies.find(r => r.sender?.role !== "client" && r.sender?.role !== "viewer");
    if (!staffReply || !localRating) return;
    setSubmittingRating(true);
    try {
      await fetch(`/api/tickets/${ticketId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffReply.user_id, rating: localRating, comment: ratingNote }),
      });
      setRatingDone(true);
    } finally { setSubmittingRating(false); }
  }

  if (loading) return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 300 }}>
      <Loader size={28} color="#0875dc" style={{ animation: "spin .7s linear infinite" }} />
    </div>
  );
  if (!ticket) return null;

  const ss = STATUS_CFG[ticket.status] || STATUS_CFG["جديدة"];
  const ticketRef = getTicketRef(ticket.id);
  const parsed = parseTicketDetails(ticket.body);
  const isConsultation = ticket.type === "consultation";
  const isClosed = ["مغلقة","مغلقة من العميل"].includes(ticket.status);
  const isResolved = ticket.status === "تم الحل";
  const isWaiting = ticket.status === "بانتظار العميل";
  const PRIORITY_MAP: Record<string,string> = { normal:"عادية", urgent:"عاجلة", high:"مرتفعة" };
  const priority = PRIORITY_MAP[ticket.priority] ?? ticket.priority;

  // Staff replies only
  const staffReplies = replies.filter(r =>
    r.message_type === "admin_reply" ||
    (r.sender && !["client", "viewer"].includes(r.sender.role))
  );
  const clientReplies = replies.filter(r =>
    r.message_type !== "admin_reply" &&
    (!r.sender || r.sender.role === "client")
  );
  const hasStaffReplied = staffReplies.length > 0;

  return (
    <div style={{ direction: "rtl" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back */}
      <Link href="/dashboard/tickets" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".65rem", color: "#8b9dad", textDecoration: "none", marginBottom: 16 }}>
        <ChevronRight size={13} /> العودة لمركز الدعم
      </Link>

      {/* New consultation banner */}
      {isNewConsultation && !hasStaffReplied && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#15803d", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <CalendarClock size={19} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: ".78rem", fontWeight: 800, color: "#14532d", marginBottom: 4 }}>تم استلام طلب استشارتك</div>
            <div style={{ fontSize: ".67rem", color: "#166534", lineHeight: 1.7 }}>سيتواصل معك فريق أتمم خلال ٢٤ ساعة لتأكيد الموعد والرسوم.</div>
          </div>
        </div>
      )}

      {/* ── Ticket Card ── */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ height: 3, background: ss.color }} />
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: ".6rem", fontFamily: "monospace", color: "#8b9dad", fontWeight: 700, background: "#f5f8fc", padding: "3px 9px", borderRadius: 6, border: "1px solid #e5eaf0", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Hash size={10} /> {ticketRef}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", padding: "3px 10px", borderRadius: 20, border: `1px solid ${ss.border}`, color: ss.color, background: ss.bg, fontWeight: 700 }}>
              {ss.icon} {ss.label}
            </span>
            {priority !== "عادية" && (
              <span style={{ fontSize: ".58rem", padding: "3px 9px", borderRadius: 20, color: priority === "عاجلة" ? "#dc2626" : "#ea580c", background: priority === "عاجلة" ? "#fef2f2" : "#fff7ed", fontWeight: 700 }}>
                {priority}
              </span>
            )}
            <span style={{ marginRight: "auto", fontSize: ".57rem", color: "#b0bcc9" }}>
              {formatDate(ticket.created_at)}
            </span>
          </div>

          <h2 style={{ margin: "0 0 10px", fontSize: ".95rem", fontWeight: 800, color: "#073766" }}>{ticket.title}</h2>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: ".6rem", color: "#526983", background: "#f0f4f9", padding: "3px 9px", borderRadius: 7, border: "1px solid #e5eaf0", fontWeight: 600 }}>{ticket.category}</span>
            {isConsultation && (
              <span style={{ fontSize: ".58rem", color: "#0875dc", background: "#eaf4ff", padding: "3px 9px", borderRadius: 7, fontWeight: 700 }}>استشارة</span>
            )}
          </div>

          {/* ── Quick Actions ── */}
          <div style={{ paddingTop: 12, borderTop: "1px solid #f0f4f8" }}>
            <div style={{ fontSize: ".58rem", fontWeight: 700, color: "#8b9dad", marginBottom: 8, letterSpacing: ".04em" }}>إجراءات سريعة</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!isClosed && isConsultation && (
                <a href="/dashboard/tickets/new?type=consultation"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eaf4ff", color: "#0875dc", border: "1px solid #bddcff", borderRadius: 8, padding: "6px 12px", font: "inherit", fontSize: ".62rem", fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>
                  <CalendarClock size={12} /> جدولة استشارة جديدة
                </a>
              )}
              {!isClosed && !isConsultation && (
                <a href="/dashboard/tickets/new?type=consultation"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eaf4ff", color: "#0875dc", border: "1px solid #bddcff", borderRadius: 8, padding: "6px 12px", font: "inherit", fontSize: ".62rem", fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>
                  <CalendarClock size={12} /> طلب استشارة
                </a>
              )}
              {!isClosed && (
                <button onClick={() => { setCloseNote(""); setShowClose(true); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 12px", font: "inherit", fontSize: ".62rem", fontWeight: 700, cursor: "pointer" }}>
                  <XCircle size={12} /> {isConsultation ? "إلغاء الاستشارة" : "إغلاق التذكرة"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Request Details ── */}
      {isConsultation ? (
        <div style={{ background: "#fff", border: "1px solid #bddcff", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#eaf4ff,#e8f1fb)", padding: "12px 18px", borderBottom: "1px solid #bddcff", display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarClock size={15} color="#0875dc" />
            <span style={{ fontSize: ".72rem", fontWeight: 800, color: "#073766" }}>تفاصيل طلب الاستشارة</span>
          </div>
          <div style={{ padding: "16px 18px", display: "grid", gap: 12 }}>
            {/* Description — strip the preferred time line */}
            {(parsed.mainDescription || ticket.body) && (
              <div style={{ background: "#f0f6ff", borderRadius: 10, padding: "12px 14px", borderRight: "3px solid #0875dc" }}>
                <div style={{ fontSize: ".57rem", color: "#0875dc", fontWeight: 700, marginBottom: 5 }}>موضوع الاستشارة</div>
                <p style={{ margin: 0, fontSize: ".73rem", color: "#344d69", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {(parsed.mainDescription || ticket.body).replace(/\n?الوقت المفضل للاستشارة:[^\n]*/g, "").trim()}
                </p>
              </div>
            )}
            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ticket.consultation_method && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f5f8fc", borderRadius: 10, padding: "10px 12px", border: "1px solid #e5eaf0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8f1fb", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {METHOD_ICON[{ phone: "مكالمة هاتفية", zoom: "اتصال مرئي", in_person: "حضوري", written: "كتابياً" }[ticket.consultation_method] || ""] || <Phone size={14} color="#0875dc" />}
                  </div>
                  <div>
                    <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>طريقة التواصل</div>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#073766" }}>
                      {{ phone: "مكالمة هاتفية", zoom: "اتصال مرئي", in_person: "حضوري", written: "كتابياً" }[ticket.consultation_method] || ticket.consultation_method}
                    </div>
                  </div>
                </div>
              )}
              {ticket.consultation_phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f5f8fc", borderRadius: 10, padding: "10px 12px", border: "1px solid #e5eaf0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8f1fb", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Phone size={14} color="#0875dc" />
                  </div>
                  <div>
                    <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>رقم الجوال</div>
                    <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#073766", direction: "ltr", textAlign: "right" }}>{ticket.consultation_phone}</div>
                  </div>
                </div>
              )}
              {(() => {
                const match = ticket.body?.match(/الوقت المفضل للاستشارة:\s*([^\n·]+)(?:\s*·\s*([^\n]+))?/);
                if (!match) return null;
                const date = match[1]?.trim() || "";
                const time = match[2]?.trim() || "";
                return (
                  <>
                    {date && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f5f8fc", borderRadius: 10, padding: "10px 12px", border: "1px solid #e5eaf0" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef9ee", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <CalendarClock size={14} color="#b45309" />
                        </div>
                        <div>
                          <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>التاريخ المفضل</div>
                          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#92400e" }}>{date}</div>
                        </div>
                      </div>
                    )}
                    {time && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f5f8fc", borderRadius: 10, padding: "10px 12px", border: "1px solid #e5eaf0" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef9ee", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <Clock size={14} color="#b45309" />
                        </div>
                        <div>
                          <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>الوقت المفضل</div>
                          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#92400e" }}>{time}</div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Other extra fields */}
            {parsed.extraFields.filter(f => !f.label.includes("الوقت المفضل")).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 8 }}>
                {parsed.extraFields.filter(f => !f.label.includes("الوقت المفضل")).map((f, i) => (
                  <div key={i} style={{ background: "#f7f9fc", borderRadius: 8, padding: "8px 10px", border: "1px solid #e5eaf0" }}>
                    <div style={{ fontSize: ".54rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: ".68rem", color: "#1e3a56", fontWeight: 700 }}>{f.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: ".62rem", fontWeight: 700, color: "#48617b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={13} /> تفاصيل الطلب
          </div>
          <p style={{ margin: 0, fontSize: ".73rem", color: "#344d69", lineHeight: 1.8, whiteSpace: "pre-wrap", borderRight: "3px solid #e5eaf0", paddingRight: 12 }}>
            {parsed.mainDescription || ticket.body}
          </p>
          {parsed.extraFields.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 8 }}>
              {parsed.extraFields.map((f, i) => (
                <div key={i} style={{ background: "#f7f9fc", borderRadius: 8, padding: "8px 10px", border: "1px solid #e5eaf0" }}>
                  <div style={{ fontSize: ".54rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: ".68rem", color: "#1e3a56", fontWeight: 700 }}>{f.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Waiting notice → clarification box ── */}
      {isWaiting && !isClosed && (
        <div style={{ background: "#fff", border: "1.5px solid #bae6fd", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ background: "#eaf4ff", padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={16} color="#0875dc" />
            <div>
              <div style={{ fontSize: ".72rem", fontWeight: 800, color: "#073766" }}>الفريق يطلب توضيحاً</div>
              <div style={{ fontSize: ".62rem", color: "#073766", marginTop: 2 }}>يرجى الرد على آخر رسالة من الفريق أدناه</div>
            </div>
          </div>
          <div style={{ padding: "14px 18px" }}>
            <textarea value={clarify} onChange={e => setClarify(e.target.value)} rows={3} placeholder="اكتب ردك هنا..."
              style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 12px", font: "inherit", fontSize: ".72rem", color: "#344d69", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#0f766e"}
              onBlur={e => e.target.style.borderColor = "#e5eaf0"}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={sendClarification} disabled={!clarify.trim() || sending}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: clarify.trim() ? "#0f766e" : "#e5eaf0", color: clarify.trim() ? "#fff" : "#8b9dad", border: 0, borderRadius: 8, padding: "8px 18px", font: "inherit", fontSize: ".65rem", fontWeight: 700, cursor: clarify.trim() ? "pointer" : "not-allowed", transition: "all .15s" }}>
                {sending ? <Loader size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Send size={13} />}
                {sending ? "جاري الإرسال..." : "إرسال الرد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attachments ── */}
      {ticket.files && ticket.files.length > 0 && (
        <AttachmentsCard files={ticket.files} ticketId={ticket.id} />
      )}

      {/* ── Staff replies ── */}
      {hasStaffReplied ? (
        <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #f0f4f8", display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={14} color="#0875dc" />
            <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#073766" }}>ردود الفريق</span>
            <span style={{ marginRight: "auto", fontSize: ".6rem", color: "#8b9dad" }}>{staffReplies.length} رد</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {staffReplies.map((r, i) => (
              <div key={r.id} style={{ padding: "16px 18px", borderBottom: i < staffReplies.length - 1 ? "1px solid #f5f8fc" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8f1fb", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {r.sender?.avatar_url
                      ? <img src={r.sender.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      : <Shield size={14} color="#1758a6" />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#073766" }}>{r.sender?.full_name || "فريق الدعم"}</div>
                    <div style={{ fontSize: ".58rem", color: "#a0aec0" }}>{formatTime(r.created_at)}</div>
                  </div>
                </div>
                {isConsultationReply(r.body) ? (() => {
                  const c = parseConsultationReply(r.body);
                  const isCancelled = c.status?.includes("إلغاء");
                  const isDone = c.status?.includes("تمت");
                  const accent = isCancelled ? "#dc2626" : isDone ? "#15803d" : "#0875dc";
                  const accentBg = isCancelled ? "#fef2f2" : isDone ? "#f0fdf4" : "#eaf4ff";
                  const accentBorder = isCancelled ? "#fecaca" : isDone ? "#bbf7d0" : "#bddcff";
                  return (
                    <div style={{ border: `1.5px solid ${accentBorder}`, borderRadius: 12, overflow: "hidden" }}>
                      {/* Status banner */}
                      <div style={{ background: accentBg, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${accentBorder}` }}>
                        {isCancelled ? <Ban size={16} color={accent} /> : <BadgeCheck size={16} color={accent} />}
                        <span style={{ fontSize: ".75rem", fontWeight: 800, color: accent }}>{c.status?.replace(" ✅","").replace(" ❌","")}</span>
                      </div>
                      {/* Details grid */}
                      <div style={{ padding: "14px 16px", background: "#fff", display: "grid", gap: 10 }}>
                        {c.date && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: accentBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                              <CalendarClock size={14} color={accent} />
                            </div>
                            <div>
                              <div style={{ fontSize: ".57rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>موعد الاستشارة</div>
                              <div style={{ fontSize: ".75rem", fontWeight: 800, color: "#073766" }}>{c.date}</div>
                            </div>
                          </div>
                        )}
                        {c.method && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f5f8fc", display: "grid", placeItems: "center", flexShrink: 0, color: "#526983" }}>
                              {METHOD_ICON[c.method] || <Phone size={14} />}
                            </div>
                            <div>
                              <div style={{ fontSize: ".57rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>طريقة التواصل</div>
                              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#344d69" }}>{c.method}</div>
                            </div>
                          </div>
                        )}
                        {c.price && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f0fdf4", display: "grid", placeItems: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: ".6rem", fontWeight: 800, color: "#15803d" }}>ر.س</span>
                            </div>
                            <div>
                              <div style={{ fontSize: ".57rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>رسوم الاستشارة</div>
                              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#15803d" }}>{c.price}</div>
                            </div>
                          </div>
                        )}
                        {c.link && (
                          <a href={c.link} target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 8, background: "#eaf4ff", border: "1px solid #bddcff", borderRadius: 8, padding: "8px 12px", textDecoration: "none" }}>
                            <Video size={14} color="#0875dc" />
                            <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#0875dc" }}>انضم للاجتماع</span>
                          </a>
                        )}
                        {c.note && c.note.length > 0 && (
                          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: ".7rem", color: "#526983", lineHeight: 1.7 }}>
                            {c.note.join("\n")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                <div style={{ fontSize: ".73rem", color: "#344d69", lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f0f3f8" }}>
                  {r.body}
                </div>
                )}
              </div>
            ))}
          </div>
          {/* Client replies after staff */}
          {clientReplies.filter(r => r.user_id === userId).map(r => (
            <div key={r.id} style={{ padding: "14px 18px", borderTop: "1px solid #f5f8fc", background: "#fafbfc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#526983" }}>ردك</div>
                <div style={{ fontSize: ".58rem", color: "#a0aec0" }}>{formatTime(r.created_at)}</div>
              </div>
              <div style={{ fontSize: ".72rem", color: "#344d69", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{r.body}</div>
            </div>
          ))}
        </div>
      ) : !isClosed && !isWaiting ? (
        <div style={{ background: "#f8fafc", border: "1px dashed #d1dde8", borderRadius: 14, padding: "28px 20px", textAlign: "center", marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#eaf4ff", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <Clock size={22} color="#0875dc" />
          </div>
          <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#344d69", marginBottom: 4 }}>في انتظار رد الفريق</div>
          <div style={{ fontSize: ".63rem", color: "#8b9dad" }}>سيرد عليك الفريق المختص خلال ٢٤ ساعة عمل</div>
        </div>
      ) : null}

      {/* ── Rating ── */}
      {(isClosed || isResolved) && hasStaffReplied && !ratingDone && (
        <div style={{ background: "linear-gradient(135deg,#fffbeb 0%,#fff 100%)", border: "1.5px solid #fde68a", borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px 14px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fef3c7", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Star size={22} color="#f59e0b" fill="#f59e0b" />
            </div>
            <div style={{ fontSize: ".82rem", fontWeight: 800, color: "#073766", marginBottom: 4 }}>كيف كانت تجربتك؟</div>
            <div style={{ fontSize: ".65rem", color: "#7c8b9b", marginBottom: 18 }}>تقييمك يساعدنا على تحسين خدمتنا</div>
            {/* Stars */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setLocalRating(s)}
                  style={{ border: 0, background: "transparent", cursor: "pointer", padding: 2, transition: "transform .1s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  <Star size={32} fill={localRating >= s ? "#f59e0b" : "#f1f5f9"} color={localRating >= s ? "#f59e0b" : "#cbd5e1"} style={{ transition: "all .15s" }} />
                </button>
              ))}
            </div>
            {/* Label */}
            {localRating > 0 && (
              <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#f59e0b", marginBottom: 14 }}>
                {["", "سيء جداً 😞", "سيء 😕", "مقبول 😐", "جيد 😊", "ممتاز! 🌟"][localRating]}
              </div>
            )}
            {/* Comment */}
            <textarea value={ratingNote} onChange={e => setRatingNote(e.target.value)} rows={2}
              placeholder="أضف تعليقاً (اختياري)..."
              style={{ width: "100%", border: "1.5px solid #e5eaf0", borderRadius: 10, padding: "10px 12px", font: "inherit", fontSize: ".68rem", color: "#344d69", resize: "none", boxSizing: "border-box", outline: "none", marginBottom: 14, background: "#fff", transition: "border-color .15s" }}
              onFocus={e => e.target.style.borderColor = "#f59e0b"}
              onBlur={e => e.target.style.borderColor = "#e5eaf0"} />
            <button onClick={submitRating} disabled={!localRating || submittingRating}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: localRating ? "#f59e0b" : "#e5eaf0", color: localRating ? "#fff" : "#8b9dad", border: 0, borderRadius: 10, padding: "10px 28px", font: "inherit", fontSize: ".7rem", fontWeight: 700, cursor: localRating ? "pointer" : "not-allowed", transition: "all .15s" }}>
              {submittingRating ? <Loader size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Star size={13} fill="currentColor" />}
              إرسال التقييم
            </button>
          </div>
        </div>
      )}
      {ratingDone && (
        <div style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#fff 100%)", border: "1.5px solid #bbf7d0", borderRadius: 16, padding: "24px 18px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🌟</div>
          <div style={{ fontSize: ".82rem", fontWeight: 800, color: "#073766", marginBottom: 4 }}>شكراً على تقييمك!</div>
          <div style={{ fontSize: ".65rem", color: "#526983" }}>رأيك يساعدنا على تحسين تجربتك دائماً</div>
        </div>
      )}

      {/* Close modal */}
      {showClose && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 999, display: "grid", placeItems: "center", padding: 20 }} onClick={() => setShowClose(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f0f3f8" }}>
              <span style={{ fontSize: ".82rem", fontWeight: 800, color: "#dc2626" }}>
                {isConsultation ? "إلغاء الاستشارة" : "إغلاق التذكرة"}
              </span>
              <button onClick={() => setShowClose(false)} style={{ border: 0, background: "#f5f8fc", borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "grid", placeItems: "center" }}><X size={14} /></button>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <p style={{ fontSize: ".7rem", color: "#526983", margin: "0 0 12px", lineHeight: 1.7 }}>
                {isConsultation
                  ? "سيتم إلغاء طلب الاستشارة ولن تتمكن من استعادتها."
                  : "سيتم إغلاق التذكرة نهائياً وحذفها خلال 24 ساعة."}
              </p>
              <label style={{ fontSize: ".62rem", fontWeight: 700, color: "#344d69", display: "block", marginBottom: 4 }}>السبب (اختياري)</label>
              <textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={3}
                placeholder="مثال: تم حل الموضوع..."
                style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 8, padding: "8px 10px", font: "inherit", fontSize: ".7rem", color: "#344d69", resize: "vertical", boxSizing: "border-box", outline: "none" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid #f0f3f8" }}>
              <button onClick={() => setShowClose(false)} style={{ background: "transparent", color: "#526983", border: "1px solid #e5eaf0", borderRadius: 8, padding: "7px 14px", font: "inherit", fontSize: ".65rem", fontWeight: 700, cursor: "pointer" }}>رجوع</button>
              <button onClick={closeTicket} disabled={closing}
                style={{ background: "#dc2626", color: "#fff", border: 0, borderRadius: 8, padding: "7px 16px", font: "inherit", fontSize: ".65rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {closing ? <Loader size={12} style={{ animation: "spin .7s linear infinite" }} /> : null}
                {isConsultation ? "إلغاء الاستشارة" : "إغلاق التذكرة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
