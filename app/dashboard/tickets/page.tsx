"use client";

import { useEffect, useState } from "react";
import {
  LifeBuoy, CalendarDays, CalendarClock, MessageCircle, Phone,
  Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle,
  Loader, MessageSquare, Paperclip, Plus, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAppDate, formatAppDateTime, formatAppRelativeTime } from "@/lib/date-format";

type DbTicket = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  type?: string;
  files?: string[] | null;
  consultation_scheduled_at?: string | null;
  consultation_method?: string | null;
  consultation_status?: string | null;
};

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  "جديدة":           { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={10} />,         label: "جديدة" },
  "قيد المراجعة":    { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={10} />,     label: "قيد المراجعة" },
  "بانتظار العميل":  { color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", icon: <AlertTriangle size={10} />, label: "بانتظار ردك" },
  "تم الحل":         { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={10} />,  label: "تم الحل" },
  "مغلقة":           { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={10} />,       label: "مغلقة" },
  "مغلقة من العميل": { color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", icon: <XCircle size={10} />,       label: "أغلقتها" },
};

const CONS_STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon?: React.ReactNode }> = {
  "جديد":   { label: "جديدة",  color: "#0875dc", bg: "#eaf4ff", border: "#bddcff" },
  "مجدولة": { label: "مجدولة", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={10} /> },
  "منجزة":  { label: "منجزة",  color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={10} /> },
  "ملغاة":  { label: "ملغاة",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle size={10} /> },
};

const METHOD_AR: Record<string, string> = {
  phone: "هاتفي", zoom: "مرئي", in_person: "حضوري", written: "كتابياً"
};

const WHATSAPP_NUMBER = "966592693456";
const WHATSAPP_MSG = encodeURIComponent("مرحباً، أحتاج مساعدة فورية.");
const PAGE_SIZE = 8;

function StatusBadge({ status, type }: { status: string; type?: string }) {
  if (type === "consultation") {
    const cs = CONS_STATUS[status] || CONS_STATUS["جديد"];
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".58rem", fontWeight: 700, color: cs.color, background: cs.bg, border: `1px solid ${cs.border}`, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
        {cs.icon} {cs.label}
      </span>
    );
  }
  const ss = STATUS_CFG[status] || STATUS_CFG["جديدة"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".58rem", fontWeight: 700, color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {ss.icon} {ss.label}
    </span>
  );
}

export default function SupportCenterPage() {
  const [tickets, setTickets] = useState<DbTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailOk, setEmailOk] = useState(false);
  const [activeTab, setActiveTab] = useState<"tickets" | "consultations">("tickets");
  const [page, setPage] = useState(1);
  const [showChannels, setShowChannels] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase.auth.getUser(),
      fetch("/api/tickets"),
    ]).then(async ([{ data: { user } }, r]) => {
      if (user?.email_confirmed_at) setEmailOk(true);
      if (r.ok) { const j = await r.json(); setTickets(j.data || []); }
    }).finally(() => setLoading(false));
  }, []);

  const consultations  = tickets.filter(t => t.type === "consultation");
  const supportTickets = tickets.filter(t => t.type !== "consultation");
  const rows = activeTab === "tickets" ? supportTickets : consultations;
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows   = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const openT   = supportTickets.filter(t => !["مغلقة","تم الحل","مغلقة من العميل"].includes(t.status)).length;
  const waitT   = supportTickets.filter(t => t.status === "بانتظار العميل").length;
  const openC   = consultations.filter(t => !["منجزة","ملغاة"].includes(t.consultation_status || "")).length;

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const PRIORITY_COLOR: Record<string, string> = {
    "عاجلة": "#dc2626", "مرتفعة": "#b45309", "عادية": "#0875dc"
  };

  return (
    <div style={{ direction: "rtl", maxWidth: 900, margin: "0 auto" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 3px", fontSize: "1.15rem", fontWeight: 800, color: "#073766" }}>مركز الدعم</h1>
          <p style={{ margin: 0, fontSize: ".68rem", color: "#8b9dad" }}>إدارة تذاكرك واستشاراتك في مكان واحد</p>
        </div>
        {/* Quick actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowChannels(v => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".65rem", fontWeight: 700, color: "#526983", background: "#fff", border: "1.5px solid #e0e7ef", padding: "7px 14px", borderRadius: 10, cursor: "pointer" }}>
              <MessageCircle size={13} /> تواصل معنا <ChevronDown size={12} style={{ transform: showChannels ? "rotate(180deg)" : "none", transition: ".2s" }} />
            </button>
            {showChannels && (
              <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", background: "#fff", border: "1.5px solid #e0e7ef", borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,.1)", zIndex: 100, minWidth: 220, overflow: "hidden" }}>
                {[
                  { href: `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`, icon: <MessageCircle size={14} color="#0d9488" />, bg: "#f0fdfa", label: "واتساب", sub: "دردشة فورية", ext: true },
                  { href: "tel:+966592693456", icon: <Phone size={14} color="#15803d" />, bg: "#f0fdf4", label: "اتصل بنا", sub: "+966 59 269 3456", ext: false },
                ].map((ch, i) => (
                  <a key={i} href={ch.href} target={ch.ext ? "_blank" : undefined} rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i === 0 ? "1px solid #f1f5f9" : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: ch.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>{ch.icon}</div>
                    <div>
                      <div style={{ fontSize: ".67rem", fontWeight: 700, color: "#073766" }}>{ch.label}</div>
                      <div style={{ fontSize: ".58rem", color: "#8b9dad" }}>{ch.sub}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          <Link href={activeTab === "tickets" ? "/dashboard/tickets/new" : "/dashboard/tickets/new?type=consultation"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".65rem", fontWeight: 700, color: "#fff", background: "#0875dc", padding: "7px 16px", borderRadius: 10, textDecoration: "none", boxShadow: "0 2px 8px rgba(8,117,220,.25)" }}>
            <Plus size={13} /> {activeTab === "tickets" ? "تذكرة جديدة" : "استشارة جديدة"}
          </Link>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "تذاكر مفتوحة",  value: openT, color: "#0875dc", bg: "linear-gradient(135deg,#eaf4ff,#dbeafe)", icon: <LifeBuoy size={16} color="#0875dc" /> },
          { label: "تنتظر ردك",     value: waitT, color: "#b45309", bg: "linear-gradient(135deg,#fef9ee,#fef3c7)", icon: <AlertTriangle size={16} color="#b45309" /> },
          { label: "استشارات نشطة", value: openC, color: "#0f766e", bg: "linear-gradient(135deg,#f0fdfa,#e0f7f4)", icon: <CalendarDays size={16} color="#0f766e" /> },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: ".58rem", color: "#8b9dad", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Panel ── */}
      <div style={{ background: "#fff", border: "1.5px solid #e0e7ef", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(8,55,102,.04)" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e8edf5", padding: "0 16px", background: "#fafbfc" }}>
          {[
            { id: "tickets" as const,       label: "تذاكر الدعم",  icon: <LifeBuoy size={13} />,   count: supportTickets.length, urgentCount: waitT },
            { id: "consultations" as const, label: "الاستشارات",   icon: <CalendarDays size={13} />, count: consultations.length,  urgentCount: 0 },
          ].map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "13px 16px", fontSize: ".68rem", fontWeight: active ? 800 : 600, color: active ? "#0875dc" : "#7c8b9b", background: "none", border: "none", cursor: "pointer", borderBottom: active ? "2.5px solid #0875dc" : "2.5px solid transparent", marginBottom: -1.5, transition: "color .15s", whiteSpace: "nowrap" }}>
                {tab.icon}
                {tab.label}
                <span style={{ fontSize: ".55rem", fontWeight: 700, background: active ? "#eaf4ff" : "#f1f5f9", color: active ? "#0875dc" : "#8b9dad", padding: "1px 7px", borderRadius: 20 }}>
                  {tab.count}
                </span>
                {tab.urgentCount > 0 && (
                  <span style={{ fontSize: ".52rem", fontWeight: 800, background: "#fef9ee", color: "#b45309", padding: "1px 6px", borderRadius: 20, border: "1px solid #fde68a" }}>
                    {tab.urgentCount} تنتظر
                  </span>
                )}
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          {rows.length > PAGE_SIZE && (
            <span style={{ fontSize: ".58rem", color: "#8b9dad" }}>
              {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, rows.length)} من {rows.length}
            </span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
            <Loader size={22} color="#0875dc" style={{ animation: "spin .6s linear infinite" }} />
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", padding: "56px 24px", textAlign: "center" }}>
            {activeTab === "tickets"
              ? <MessageSquare size={36} color="#d1dae3" strokeWidth={1.5} />
              : <CalendarClock size={36} color="#d1dae3" strokeWidth={1.5} />}
            <p style={{ margin: "12px 0 4px", fontSize: ".75rem", fontWeight: 700, color: "#8b9dad" }}>
              {activeTab === "tickets" ? "لا توجد تذاكر دعم بعد" : "لا توجد استشارات بعد"}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: ".64rem", color: "#b0bcc9" }}>
              {activeTab === "tickets" ? "ابدأ بفتح تذكرة وسيرد عليك الفريق خلال 24 ساعة" : "احجز استشارة مع أحد متخصصينا"}
            </p>
            <Link href={activeTab === "tickets" ? "/dashboard/tickets/new" : "/dashboard/tickets/new?type=consultation"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".65rem", fontWeight: 700, color: "#fff", background: "#0875dc", padding: "8px 18px", borderRadius: 10, textDecoration: "none" }}>
              <Plus size={13} /> {activeTab === "tickets" ? "تذكرة جديدة" : "استشارة جديدة"}
            </Link>
          </div>
        ) : (
          <>
            {/* Data rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "#f8fafc" }}>
            {pageRows.map(t => {
              const isOpen = !["مغلقة","تم الحل","مغلقة من العميل","منجزة","ملغاة"].includes(t.status);
              const needsClient = activeTab === "tickets" && t.status === "بانتظار العميل";
              const accentColor = PRIORITY_COLOR[t.priority || ""] || "#0875dc";

              if (activeTab === "tickets") {
                return (
                  <Link key={t.id} href={`/dashboard/tickets/${t.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ background: "#fff", border: `1.5px solid ${needsClient ? "#99f6e4" : "#dbe5ef"}`, borderRadius: 14, boxShadow: needsClient ? "0 8px 24px rgba(15,118,110,.1)" : "0 3px 14px rgba(7,55,102,.06)", overflow: "hidden", transition: "all .15s", borderRight: `4px solid ${needsClient ? "#0f766e" : accentColor}` }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(8,117,220,.12)"; e.currentTarget.style.borderColor = needsClient ? "#14b8a6" : "#bddcff"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = needsClient ? "0 8px 24px rgba(15,118,110,.1)" : "0 3px 14px rgba(7,55,102,.06)"; e.currentTarget.style.borderColor = needsClient ? "#99f6e4" : "#dbe5ef"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 7 }}>
                            <span style={{ fontSize: ".58rem", fontWeight: 800, color: "#0875dc", fontFamily: "monospace", background: "#eaf4ff", padding: "2px 7px", borderRadius: 6, border: "1px solid #bddcff" }}>
                              مرجع #{t.id.replace(/-/g,"").slice(0,7).toUpperCase()}
                            </span>
                            <StatusBadge status={t.status} />
                            {needsClient && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".56rem", padding: "2px 8px", borderRadius: 20, border: "1px solid #99f6e4", color: "#0f766e", background: "#f0fdfa", fontWeight: 900 }}>
                                <AlertTriangle size={10} /> بانتظار ردك
                              </span>
                            )}
                            {t.category && <span style={{ fontSize: ".58rem", color: "#526983", background: "#f0f4f9", padding: "3px 8px", borderRadius: 20, border: "1px solid #e5eaf0", fontWeight: 600 }}>{t.category}</span>}
                          </div>
                          <span style={{ display: "block", fontSize: ".76rem", fontWeight: 800, color: "#073766", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                        </div>
                        {isOpen && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "block", boxShadow: "0 0 0 3px #dcfce7", marginTop: 7 }} />}
                      </div>
                      <div style={{ padding: "0 16px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: ".58rem", color: "#7c8b9b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarDays size={10} /> فتح: {formatAppDate(t.created_at)}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#526983", fontWeight: 700 }}><RefreshCw size={10} /> آخر تحديث: {formatAppRelativeTime(t.updated_at)}</span>
                        {t.files && t.files.length > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#a0adb8" }}>
                            <Paperclip size={9} /> {t.files.length} مرفق
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              } else {
                const cs = t.consultation_status ? CONS_STATUS[t.consultation_status] : CONS_STATUS["جديد"];
                return (
                  <Link key={t.id} href={`/dashboard/tickets/${t.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ background: "#fff", border: "1.5px solid #dbe5ef", borderRadius: 14, boxShadow: "0 3px 14px rgba(7,55,102,.06)", overflow: "hidden", transition: "all .15s", borderRight: `4px solid ${cs?.color || "#0875dc"}` }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(8,117,220,.12)"; e.currentTarget.style.borderColor = "#bddcff"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 3px 14px rgba(7,55,102,.06)"; e.currentTarget.style.borderColor = "#dbe5ef"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: ".58rem", fontWeight: 800, color: "#0875dc", fontFamily: "monospace", background: "#eaf4ff", padding: "2px 7px", borderRadius: 6, border: "1px solid #bddcff" }}>
                            مرجع #{t.id.replace(/-/g,"").slice(0,7).toUpperCase()}
                          </span>
                          <StatusBadge status={t.consultation_status || "جديد"} type="consultation" />
                          {t.consultation_method && <span style={{ fontSize: ".58rem", color: "#526983", background: "#f0f4f9", padding: "3px 8px", borderRadius: 20, border: "1px solid #e5eaf0", fontWeight: 600 }}>{METHOD_AR[t.consultation_method] || t.consultation_method}</span>}
                        </div>
                        <span style={{ fontSize: ".76rem", fontWeight: 800, color: "#073766", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                      </div>
                      <div style={{ padding: "0 16px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: ".58rem", color: "#7c8b9b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarDays size={10} /> فتح: {formatAppDate(t.created_at)}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#526983", fontWeight: 700 }}><RefreshCw size={10} /> آخر تحديث: {formatAppRelativeTime(t.updated_at)}</span>
                        {t.consultation_scheduled_at ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0875dc", fontWeight: 700 }}>
                            <CalendarClock size={10} />
                            الموعد: {formatAppDateTime(t.consultation_scheduled_at)}
                          </span>
                        ) : <span style={{ color: "#aab5c3" }}>الموعد لم يُحدد</span>}
                        {t.files && t.files.length > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#a0adb8" }}>
                            <Paperclip size={9} /> {t.files.length} مرفق
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              }
            })}
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1.5px solid #e8edf5", background: "#fafbfc" }}>
                <span style={{ fontSize: ".6rem", color: "#8b9dad" }}>
                  الصفحة {page} من {totalPages}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    style={{ border: "1px solid #e0e7ef", borderRadius: 8, padding: "5px 12px", fontSize: ".6rem", fontWeight: 700, color: page===1?"#c0cbd8":"#526983", background: page===1?"#f8fafc":"#fff", cursor: page===1?"not-allowed":"pointer" }}>
                    السابق
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ border: "1px solid "+(p===page?"#0875dc":"#e0e7ef"), borderRadius: 8, padding: "5px 11px", fontSize: ".6rem", fontWeight: 700, color: p===page?"#fff":"#526983", background: p===page?"#0875dc":"#fff", cursor: "pointer", minWidth: 32 }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                    style={{ border: "1px solid #e0e7ef", borderRadius: 8, padding: "5px 12px", fontSize: ".6rem", fontWeight: 700, color: page===totalPages?"#c0cbd8":"#526983", background: page===totalPages?"#f8fafc":"#fff", cursor: page===totalPages?"not-allowed":"pointer" }}>
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Backdrop for channels dropdown */}
      {showChannels && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowChannels(false)} />
      )}
    </div>
  );
}
