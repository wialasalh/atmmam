"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import {
  Search, MessageSquare, Check, Send, Loader, Filter,
  Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, Download, ExternalLink, ChevronDown, ChevronUp,
  Hash, MapPin, Briefcase, Globe, Users, Lock, X, Zap, Phone, Mail,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminTicket = {
  id: string; title: string; category: string; priority: string; status: string;
  created_at: string; updated_at: string; user_id: string;
  client_id?: string | null; assigned_to?: string | null; files?: string[] | null;
  profiles?: { full_name: string; email: string } | null;
  clients?: {
    id: string; name: string; client_type: string;
    tax_number?: string | null; commercial_number?: string | null;
    company_activity?: string | null; company_address?: string | null; city?: string | null;
    entity_size?: string | null; employee_count?: number | null;
    company_scope?: string | null; company_status?: string | null;
    phone?: string | null; email?: string | null;
    commercial_register_doc?: string | null; company_license_doc?: string | null;
    national_id_doc?: string | null; zakat_tax_doc?: string | null; national_address_doc?: string | null;
  } | null;
};

type TicketMessage = {
  id: string; ticket_id: string; user_id: string; body: string;
  created_at: string; is_internal?: boolean; message_type?: string;
  sender?: { full_name: string; role: string } | null;
};

type TeamMember  = { id: string; full_name: string; role: string };
type SignedUrl    = { path: string; url: string; label: string };
type RelatedOrder = { id: string; reference_no?: string; status: string; service?: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"];

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  "جديدة":          { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} /> },
  "قيد المراجعة":   { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} /> },
  "بانتظار العميل": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertTriangle size={11} /> },
  "تم الحل":        { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} /> },
  "مغلقة":          { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} /> },
};

const PRI_CFG: Record<string, { color: string; bg: string; dot: string }> = {
  "عاجلة":  { color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" },
  "مرتفعة": { color: "#ea580c", bg: "#fff7ed", dot: "#ea580c" },
  "عادية":  { color: "#6b7280", bg: "#f9fafb", dot: "#9ca3af" },
};

const ENTITY_SIZE_LABELS: Record<string, string> = { micro: "متناهي الصغر", small: "صغير", medium: "متوسط", large: "كبير" };
const SCOPE_LABELS: Record<string, string>        = { platinum: "البلاتيني", high_green: "الأخضر العالي", medium_green: "الأخضر المتوسط", low_green: "الأخضر المنخفض", red: "الأحمر" };
const CO_STATUS_LABELS: Record<string, string>    = { active: "نشطة", suspended: "معلقة", struck_off: "مشطوبة" };

const DOC_FIELDS: { field: string; label: string }[] = [
  { field: "commercial_register_doc", label: "السجل التجاري" },
  { field: "company_license_doc",     label: "رخصة المنشأة" },
  { field: "national_id_doc",         label: "بطاقة الهوية" },
  { field: "zakat_tax_doc",           label: "وثيقة الزكاة والضريبة" },
  { field: "national_address_doc",    label: "العنوان الوطني" },
];

const QUICK_REPLIES = [
  "شكراً لتواصلك معنا، سنراجع طلبك قريباً.",
  "تم استلام طلبك وجاري العمل عليه.",
  "نحتاج مستندات إضافية لإكمال الطلب.",
  "تم حل المشكلة بنجاح، هل تحتاج مساعدة أخرى؟",
  "سيتواصل معك أحد أعضاء فريقنا في أقرب وقت ممكن.",
];

const ORDER_STATUS_AR: Record<string, string> = {
  new: "جديد", waiting_documents: "بانتظار المستندات",
  in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي", blocked: "معلق",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSLADot(updated_at: string) {
  const h = (Date.now() - new Date(updated_at).getTime()) / 3600000;
  if (h > 24) return { color: "#dc2626", level: "red"    as const, label: "متأخر >24س" };
  if (h > 12) return { color: "#ea580c", level: "orange" as const, label: "تحذير >12س" };
  return              { color: "#16a34a", level: "green"  as const, label: "جيد <12س"   };
}

function getSLAPanel(t: AdminTicket) {
  const elapsed  = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
  const target   = t.priority === "عاجلة" ? 4 : t.priority === "مرتفعة" ? 8 : 24;
  const pct      = Math.min(100, (elapsed / target) * 100);
  const remaining = Math.max(0, target - elapsed);
  const color    = pct >= 100 ? "#dc2626" : pct >= 75 ? "#ea580c" : "#16a34a";
  const rLabel   = pct >= 100 ? "تجاوز الـ SLA" : remaining < 1 ? "أقل من ساعة" : `${Math.round(remaining)} ساعة متبقية`;
  return { pct, target, color, rLabel, overdue: pct >= 100 };
}

function formatAge(d: string) {
  const h = (Date.now() - new Date(d).getTime()) / 3600000;
  if (h < 1)  return "أقل من ساعة";
  if (h < 24) return `منذ ${Math.floor(h)} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

function isToday(d: string) {
  const a = new Date(d), b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isAdminRole(role?: string) {
  return ["admin", "manager", "operator"].includes(role || "");
}

function avatar(name: string) {
  return (name || "د")[0].toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const [tickets,          setTickets]          = useState<AdminTicket[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState("");
  const [selected,         setSelected]         = useState<AdminTicket | null>(null);
  const [messages,         setMessages]         = useState<TicketMessage[]>([]);
  const [statusFilter,     setStatusFilter]     = useState("");
  const [priorityFilter,   setPriorityFilter]   = useState("");
  const [categoryFilter,   setCategoryFilter]   = useState("");
  const [assignedFilter,   setAssignedFilter]   = useState("");
  const [dateFrom,         setDateFrom]         = useState("");
  const [dateTo,           setDateTo]           = useState("");
  const [showAdvanced,     setShowAdvanced]     = useState(false);
  const [hoveredRow,       setHoveredRow]       = useState<string | null>(null);
  const [newNote,          setNewNote]          = useState("");
  const [updating,         setUpdating]         = useState(false);
  const [sending,          setSending]          = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [signedUrls,       setSignedUrls]       = useState<SignedUrl[]>([]);
  const [loadingUrls,      setLoadingUrls]      = useState(false);
  const [isInternal,       setIsInternal]       = useState(false);
  const [teamMembers,      setTeamMembers]      = useState<TeamMember[]>([]);
  const [showHistory,      setShowHistory]      = useState(false);
  const [relatedOrders,    setRelatedOrders]    = useState<RelatedOrder[]>([]);
  const [openSection,      setOpenSection]      = useState<"info" | "docs" | "orders" | null>("info");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Derived ──────────────────────────────────────────────────────────────

  const categories = useMemo(() => [...new Set(tickets.map(t => t.category).filter(Boolean))], [tickets]);

  const activeFilterCount = [priorityFilter, categoryFilter, assignedFilter, dateFrom, dateTo].filter(Boolean).length;

  const filtered = useMemo(() => tickets.filter(t => {
    const q = search.trim().toLowerCase();
    if (q && !`#${t.id.slice(0,8).toUpperCase()} ${t.title} ${t.profiles?.full_name ?? ""} ${t.clients?.name ?? ""}`.toLowerCase().includes(q)) return false;
    if (statusFilter   && t.status   !== statusFilter)   return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (assignedFilter && t.assigned_to !== assignedFilter) return false;
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }), [tickets, search, statusFilter, priorityFilter, categoryFilter, assignedFilter, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    total:         tickets.length,
    urgent:        tickets.filter(t => t.priority === "عاجلة").length,
    newCount:      tickets.filter(t => t.status === "جديدة").length,
    resolvedToday: tickets.filter(t => t.status === "تم الحل" && isToday(t.updated_at)).length,
  }), [tickets]);

  const clientTicketCount   = useMemo(() => selected ? tickets.filter(t => selected.client_id ? t.client_id === selected.client_id : t.user_id === selected.user_id).length : 0, [tickets, selected]);
  const clientResolvedCount = useMemo(() => selected ? tickets.filter(t => (selected.client_id ? t.client_id === selected.client_id : t.user_id === selected.user_id) && t.status === "تم الحل").length : 0, [tickets, selected]);
  const detailSLA = selected && !["تم الحل", "مغلقة"].includes(selected.status) ? getSLAPanel(selected) : null;
  const clientDocs = useMemo(() => signedUrls.filter(u => !u.label.startsWith("مرفق:")), [signedUrls]);
  const ticketAttachments = useMemo(() => signedUrls.filter(u => u.label.startsWith("مرفق:")), [signedUrls]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { void loadTickets(); }, [statusFilter]);
  useEffect(() => { void loadTeam(); }, []);

  useEffect(() => {
    if (!selected) return;
    setMessages([]); setSignedUrls([]); setIsInternal(false); setShowHistory(false);
    void fetch(`/api/tickets/${selected.id}/messages`).then(async r => {
      if (r.ok) { const d = await r.json(); setMessages(d.data || []); }
    });
    void generateSignedUrls(selected);
  }, [selected]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const iv = setInterval(() => setTickets(ts => [...ts]), 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const clientId = selected?.clients?.id;
    if (!clientId) { setRelatedOrders([]); return; }
    fetch("/api/admin/orders")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        type RawOrder = { id: string; reference_no?: string; status: string; clients?: { id: string } | null; services?: { name?: string } | null };
        const all = (data?.data ?? []) as RawOrder[];
        setRelatedOrders(all.filter(o => o.clients?.id === clientId).map(o => ({ id: o.id, reference_no: o.reference_no, status: o.status, service: o.services?.name })).slice(0, 5));
      })
      .catch(() => {});
  }, [selected?.clients?.id]);

  // ── API ───────────────────────────────────────────────────────────────────

  async function loadTickets() {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/admin/tickets?status=${statusFilter}` : "/api/admin/tickets";
      const res = await fetch(url);
      if (res.ok) { const { data } = await res.json(); setTickets(data || []); }
    } catch { /**/ }
    setLoading(false);
  }

  async function loadTeam() {
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) { const d = await res.json(); setTeamMembers(d.members || []); }
    } catch { /**/ }
  }

  async function assignTicket(assignedTo: string | null) {
    if (!selected) return;
    try {
      await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selected.id, assignedTo }) });
      setSelected(prev => prev ? { ...prev, assigned_to: assignedTo } : null);
    } catch { /**/ }
  }

  async function generateSignedUrls(ticket: AdminTicket) {
    const supabase = createSupabaseBrowserClient();
    setLoadingUrls(true);
    const results: SignedUrl[] = [];
    if (ticket.clients) {
      for (const { field, label } of DOC_FIELDS) {
        const path = ticket.clients[field as keyof typeof ticket.clients] as string | null;
        if (path) {
          const { data } = await supabase.storage.from("client-documents").createSignedUrl(path, 3600);
          if (data?.signedUrl) results.push({ path, url: data.signedUrl, label });
        }
      }
    }
    if (ticket.files?.length) {
      for (const path of ticket.files) {
        const fileName = path.split("/").pop() || path;
        const { data } = await supabase.storage.from("ticket-attachments").createSignedUrl(path, 3600);
        if (data?.signedUrl) results.push({ path, url: data.signedUrl, label: `مرفق: ${fileName}` });
      }
    }
    setSignedUrls(results);
    setLoadingUrls(false);
  }

  async function updateStatus(ticketId: string, status: string) {
    setUpdating(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      await loadTickets();
      if (selected?.id === ticketId) setSelected(prev => prev ? { ...prev, status } : null);
    } catch { /**/ }
    setUpdating(false);
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() || !selected) return;
    setSending(true);
    try {
      await fetch(`/api/tickets/${selected.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: newNote.trim(), is_internal: isInternal }) });
      setNewNote(""); setIsInternal(false); setShowQuickReplies(false);
      const res = await fetch(`/api/tickets/${selected.id}/messages`);
      if (res.ok) { const { data } = await res.json(); setMessages(data || []); }
    } catch { /**/ }
    setSending(false);
  }

  function clearFilters() {
    setSearch(""); setPriorityFilter(""); setCategoryFilter(""); setAssignedFilter(""); setDateFrom(""); setDateTo(""); setStatusFilter("");
  }

  function toggleSection(s: "info" | "docs" | "orders") {
    setOpenSection(p => p === s ? null : s);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="tickets" />

      <div className="tkt3-shell">

        {/* ══════════════════ LEFT: TICKET LIST ══════════════════ */}
        <aside className="tkt3-list-col">

          {/* Stats */}
          <div className="tkt3-stats">
            {[
              { label: "إجمالي",       num: stats.total,         accent: "#344d69" },
              { label: "عاجلة",         num: stats.urgent,        accent: "#dc2626" },
              { label: "جديدة",         num: stats.newCount,      accent: "#0875dc" },
              { label: "تم الحل اليوم", num: stats.resolvedToday, accent: "#15803d" },
            ].map(s => (
              <div key={s.label} className="tkt3-stat" style={{ borderTop: `3px solid ${s.accent}` }}>
                <span className="tkt3-stat-num" style={{ color: s.accent }}>{s.num}</span>
                <span className="tkt3-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="tkt3-search-wrap">
            <Search size={14} color="#8b9dad" />
            <input
              className="tkt3-search-inp"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث بالرقم، العنوان، العميل، المنشأة..."
            />
            {search && <button onClick={() => setSearch("")} className="tkt3-inp-clear"><X size={12} /></button>}
          </div>

          {/* Filter row */}
          <div className="tkt3-filter-row">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="tkt3-sel">
              <option value="">الأولوية</option>
              <option value="عاجلة">عاجلة</option>
              <option value="مرتفعة">مرتفعة</option>
              <option value="عادية">عادية</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="tkt3-sel">
              <option value="">التصنيف</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowAdvanced(v => !v)} className={`tkt3-filter-btn${showAdvanced ? " active" : ""}`}>
              <Filter size={12} />
              {activeFilterCount > 0 && <span className="tkt3-badge">{activeFilterCount}</span>}
            </button>
            {(activeFilterCount > 0 || search || priorityFilter) && (
              <button onClick={clearFilters} className="tkt3-clear-btn" title="مسح الفلاتر"><X size={12} /></button>
            )}
          </div>

          {/* Advanced */}
          {showAdvanced && (
            <div className="tkt3-adv-row">
              <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="tkt3-sel" style={{ flex: 1 }}>
                <option value="">كل المسؤولين</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              <div className="tkt3-date-range">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="tkt3-date-inp" />
                <span style={{ color: "#c0cbd8", fontSize: ".68rem" }}>—</span>
                <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="tkt3-date-inp" />
              </div>
            </div>
          )}

          {/* Status tabs */}
          <div className="tkt3-tabs">
            {["", "جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`tkt3-tab${statusFilter === s ? " active" : ""}`}>
                {s || "الكل"}
              </button>
            ))}
          </div>

          {/* Results */}
          {(activeFilterCount > 0 || search || priorityFilter) && (
            <div className="tkt3-results-bar">
              <strong>{filtered.length}</strong> / {tickets.length} تذكرة
            </div>
          )}

          {/* Cards */}
          <div className="tkt3-cards">
            {loading ? (
              <div className="tkt3-empty-list"><Loader size={22} className="spin" /><p>جاري التحميل...</p></div>
            ) : filtered.length === 0 ? (
              <div className="tkt3-empty-list"><MessageSquare size={26} /><p>لا توجد تذاكر</p></div>
            ) : filtered.map(t => {
              const sc   = STATUS_CFG[t.status]    || STATUS_CFG["جديدة"];
              const pc   = PRI_CFG[t.priority]     || PRI_CFG["عادية"];
              const sla  = getSLADot(t.updated_at);
              const isSel = selected?.id === t.id;
              const isHov = hoveredRow === t.id;
              const quickSt = STATUS_OPTIONS.filter(s => s !== t.status && s !== "مغلقة").slice(0, 2);
              return (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  onMouseEnter={() => setHoveredRow(t.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`tkt3-card${isSel ? " sel" : ""}${t.priority === "عاجلة" ? " urgent" : ""}`}
                >
                  {/* Card top */}
                  <div className="tkt3-card-top">
                    <span className="tkt3-card-id">#{t.id.slice(0,8).toUpperCase()}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="tkt3-pri-pill" style={{ color: pc.color, background: pc.bg }}>{t.priority}</span>
                      <span className="tkt3-sla-dot" style={{ background: sla.color, boxShadow: sla.level !== "green" ? `0 0 5px ${sla.color}88` : "none" }} title={`SLA: ${sla.label}`} />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="tkt3-card-title">{t.title}</div>

                  {/* Client */}
                  <div className="tkt3-card-meta">
                    {t.clients?.name
                      ? <span className="tkt3-co-chip"><Building2 size={10} /> {t.clients.name}</span>
                      : <span className="tkt3-client-name">{t.profiles?.full_name || "عميل"}</span>
                    }
                    {t.category && <span className="tkt3-cat-chip">{t.category}</span>}
                  </div>

                  {/* Bottom */}
                  <div className="tkt3-card-foot">
                    <span className="tkt3-status-pill" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
                      {sc.icon} {t.status}
                    </span>
                    <span className="tkt3-age">{formatAge(t.created_at)}</span>
                  </div>

                  {/* Hover quick actions */}
                  {isHov && !isSel && (
                    <div className="tkt3-quick" onClick={e => e.stopPropagation()}>
                      <span className="tkt3-quick-lbl">نقل إلى:</span>
                      {quickSt.map(s => {
                        const qsc = STATUS_CFG[s];
                        return (
                          <button key={s} onClick={e => { e.stopPropagation(); void updateStatus(t.id, s); }}
                            className="tkt3-quick-btn" style={{ color: qsc.color, background: qsc.bg, borderColor: qsc.border }}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ══════════════════ CENTER: DETAIL / CHAT ══════════════════ */}
        <div className="tkt3-center-col">
          {!selected ? (
            <div className="tkt3-center-empty">
              <div className="tkt3-center-empty-icon"><MessageSquare size={40} color="#c0cbd8" /></div>
              <p>اختر تذكرة من القائمة لعرض المحادثة</p>
            </div>
          ) : (
            <>
              {/* ── TOP HEADER ── */}
              <div className="tkt3-dh">
                <div className="tkt3-dh-top">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tkt3-dh-id"><Hash size={11} />#{selected.id.slice(0,8).toUpperCase()} · {selected.category}</div>
                    <h2 className="tkt3-dh-title">{selected.title}</h2>
                    <div className="tkt3-dh-sub">
                      <span>{selected.profiles?.full_name || "—"}</span>
                      {selected.profiles?.email && <span style={{ color: "#aab5c3" }}>{selected.profiles.email}</span>}
                      <span>أُنشئت {formatAge(selected.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="tkt3-close-btn"><X size={15} /></button>
                </div>

                {/* Status pills */}
                <div className="tkt3-status-row">
                  <span className="tkt3-label">الحالة:</span>
                  <div className="tkt3-status-pills">
                    {STATUS_OPTIONS.map(s => {
                      const sc = STATUS_CFG[s];
                      const isCur = s === selected.status;
                      return (
                        <button key={s}
                          onClick={() => !isCur && updateStatus(selected.id, s)}
                          disabled={updating}
                          className={`tkt3-st-pill${isCur ? " cur" : ""}`}
                          style={isCur ? { color: sc.color, background: sc.bg, borderColor: sc.border } : {}}>
                          {isCur && <Check size={10} />}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Assign */}
                <div className="tkt3-assign-row">
                  <Users size={13} color="#8b9dad" />
                  <span className="tkt3-label">تعيين لـ:</span>
                  <select value={selected.assigned_to || ""} onChange={e => assignTicket(e.target.value || null)} className="tkt3-assign-sel">
                    <option value="">غير معين</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>

                {/* SLA bar */}
                {detailSLA && (
                  <div className="tkt3-sla-row">
                    <Zap size={12} color={detailSLA.color} />
                    <span className="tkt3-sla-lbl" style={{ color: detailSLA.color }}>
                      {detailSLA.overdue ? "تجاوز الـ SLA" : "SLA نشط"}
                    </span>
                    <div className="tkt3-sla-track">
                      <div className="tkt3-sla-fill" style={{ width: `${detailSLA.pct}%`, background: detailSLA.color }} />
                    </div>
                    <span className="tkt3-sla-time">{detailSLA.rLabel}</span>
                    <span className="tkt3-sla-pct" style={{ color: detailSLA.color }}>{Math.round(detailSLA.pct)}%</span>
                  </div>
                )}
              </div>

              {/* ── MESSAGES ── */}
              <div className="tkt3-msgs">
                {messages.length === 0 ? (
                  <div className="tkt3-msgs-empty"><MessageSquare size={28} color="#c0cbd8" /><p>لا توجد رسائل بعد</p></div>
                ) : messages.map(msg => {
                  const isAdmin    = isAdminRole(msg.sender?.role);
                  const isIntNote  = !!msg.is_internal;
                  const name       = msg.sender?.full_name || (isAdmin ? "فريق الدعم" : "العميل");
                  return (
                    <div key={msg.id} className={`tkt3-msg${isAdmin ? " admin" : " client"}${isIntNote ? " internal" : ""}`}>
                      {!isAdmin && (
                        <div className="tkt3-av client-av">{avatar(name)}</div>
                      )}
                      <div className="tkt3-msg-body">
                        <div className="tkt3-msg-meta">
                          {isIntNote && <span className="tkt3-int-tag"><Lock size={9} /> داخلية</span>}
                          <strong>{name}</strong>
                          <small>{fmtTime(msg.created_at)}</small>
                        </div>
                        <div className={`tkt3-bubble${isAdmin ? " admin-bubble" : " client-bubble"}${isIntNote ? " int-bubble" : ""}`}>
                          {msg.body}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="tkt3-av admin-av">{avatar(name)}</div>
                      )}
                    </div>
                  );
                })}

                {/* History */}
                <div className="tkt3-history">
                  <button className="tkt3-history-toggle" onClick={() => setShowHistory(v => !v)}>
                    <Clock size={11} /> سجل التذكرة {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                  {showHistory && (
                    <div className="tkt3-history-body">
                      <div className="tkt3-hist-item"><span className="tkt3-hist-dot" style={{ background: "#0875dc" }} /><div><div className="tkt3-hist-ev">تم إنشاء التذكرة</div><div className="tkt3-hist-t">{new Date(selected.created_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div></div>
                      {messages.filter(m => m.message_type === "status_change").map(m => (
                        <div key={m.id} className="tkt3-hist-item"><span className="tkt3-hist-dot" style={{ background: "#7c3aed" }} /><div><div className="tkt3-hist-ev">{m.body}</div><div className="tkt3-hist-t">{fmtTime(m.created_at)}</div></div></div>
                      ))}
                      <div className="tkt3-hist-item"><span className="tkt3-hist-dot" style={{ background: "#15803d" }} /><div><div className="tkt3-hist-ev">آخر تحديث</div><div className="tkt3-hist-t">{new Date(selected.updated_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div></div>
                    </div>
                  )}
                </div>

                <div ref={messagesEndRef} />
              </div>

              {/* ── REPLY AREA ── */}
              <div className="tkt3-reply-wrap">
                {/* Tools row */}
                <div className="tkt3-reply-tools">
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowQuickReplies(v => !v)} className={`tkt3-tool-btn${showQuickReplies ? " active" : ""}`}>
                      <Filter size={12} /> ردود جاهزة <ChevronDown size={11} />
                    </button>
                    {showQuickReplies && (
                      <div className="tkt3-quick-menu">
                        {QUICK_REPLIES.map((r, i) => (
                          <button key={i} className="tkt3-quick-item" onClick={() => { setNewNote(r); setShowQuickReplies(false); }}>{r}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="tkt3-reply-toggle">
                    <button onClick={() => setIsInternal(false)} className={`tkt3-tog${!isInternal ? " tog-active-blue" : ""}`}>
                      رد للعميل
                    </button>
                    <button onClick={() => setIsInternal(true)} className={`tkt3-tog${isInternal ? " tog-active-amber" : ""}`}>
                      <Lock size={11} /> ملاحظة داخلية
                    </button>
                  </div>
                </div>

                {/* Textarea + send */}
                <form onSubmit={sendNote} className="tkt3-reply-form">
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder={isInternal ? "اكتب ملاحظة داخلية للفريق..." : "اكتب ردك للعميل هنا..."}
                    rows={3}
                    className={`tkt3-textarea${isInternal ? " int-textarea" : ""}`}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendNote(e); } }}
                  />
                  <button type="submit" disabled={!newNote.trim() || sending} className="tkt3-send-btn">
                    {sending ? <Loader size={16} className="spin" /> : <><Send size={15} /><span>إرسال</span></>}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* ══════════════════ RIGHT: CLIENT INFO ══════════════════ */}
        {selected && (
          <aside className="tkt3-client-col">

            {/* Client identity */}
            <div className="tkt3-client-hero">
              <div className="tkt3-client-av">{avatar(selected.clients?.name || selected.profiles?.full_name || "ع")}</div>
              <div>
                <div className="tkt3-client-name-lrg">{selected.clients?.name || selected.profiles?.full_name || "—"}</div>
                {selected.clients?.name && selected.profiles?.full_name && (
                  <div className="tkt3-client-sub">{selected.profiles.full_name}</div>
                )}
                {selected.clients?.client_type && <span className="tkt3-client-type">{selected.clients.client_type}</span>}
              </div>
            </div>

            {/* Quick contact */}
            <div className="tkt3-contact-row">
              {selected.clients?.phone && (
                <a href={`tel:${selected.clients.phone}`} className="tkt3-contact-btn">
                  <Phone size={13} /> {selected.clients.phone}
                </a>
              )}
              {(selected.clients?.email || selected.profiles?.email) && (
                <a href={`mailto:${selected.clients?.email || selected.profiles?.email}`} className="tkt3-contact-btn email">
                  <Mail size={13} /> {selected.clients?.email || selected.profiles?.email}
                </a>
              )}
            </div>

            {/* Activity mini-stats */}
            <div className="tkt3-mini-stats">
              <div className="tkt3-mini-stat">
                <span className="tkt3-mini-num">{clientTicketCount}</span>
                <span className="tkt3-mini-lbl">تذاكر</span>
              </div>
              <div className="tkt3-mini-stat">
                <span className="tkt3-mini-num" style={{ color: "#15803d" }}>{clientResolvedCount}</span>
                <span className="tkt3-mini-lbl">محلولة</span>
              </div>
              <div className="tkt3-mini-stat">
                <span className="tkt3-mini-num" style={{ fontSize: ".6rem" }}>{formatAge(selected.updated_at)}</span>
                <span className="tkt3-mini-lbl">آخر نشاط</span>
              </div>
            </div>

            {/* ── Collapsible: Company Info ── */}
            {selected.clients && (
              <div className="tkt3-section">
                <button className="tkt3-sec-toggle" onClick={() => toggleSection("info")}>
                  <Building2 size={13} color="#0875dc" /> <span>بيانات المنشأة</span>
                  {openSection === "info" ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {openSection === "info" && (
                  <div className="tkt3-sec-body">
                    {[
                      { label: "الرقم الضريبي",  value: selected.clients.tax_number },
                      { label: "السجل التجاري",  value: selected.clients.commercial_number },
                      { label: "المدينة",         value: selected.clients.city },
                      { label: "النشاط",          value: selected.clients.company_activity },
                      { label: "العنوان",         value: selected.clients.company_address },
                      { label: "حجم الكيان",      value: selected.clients.entity_size ? ENTITY_SIZE_LABELS[selected.clients.entity_size] : null },
                      { label: "النطاق",          value: selected.clients.company_scope ? SCOPE_LABELS[selected.clients.company_scope] : null },
                      { label: "الحالة",          value: selected.clients.company_status ? CO_STATUS_LABELS[selected.clients.company_status] : null },
                      { label: "الموظفون",        value: selected.clients.employee_count != null ? String(selected.clients.employee_count) : null },
                    ].filter(r => r.value).map(r => (
                      <div key={r.label} className="tkt3-info-row">
                        <span className="tkt3-info-lbl">{r.label}</span>
                        <span className="tkt3-info-val">{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Collapsible: Documents ── */}
            <div className="tkt3-section">
              <button className="tkt3-sec-toggle" onClick={() => toggleSection("docs")}>
                <FileText size={13} color="#7c3aed" /> <span>المستندات</span>
                {loadingUrls
                  ? <Loader size={11} className="spin" style={{ marginRight: "auto" }} />
                  : <span className="tkt3-sec-count">{signedUrls.length}</span>
                }
                {openSection === "docs" ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {openSection === "docs" && (
                <div className="tkt3-sec-body">
                  {signedUrls.length === 0 ? (
                    <div className="tkt3-sec-empty">لا توجد مستندات مرفوعة</div>
                  ) : (
                    <>
                      {clientDocs.length > 0 && (
                        <>
                          <div className="tkt3-doc-group-lbl">مستندات المنشأة</div>
                          {clientDocs.map((doc, i) => (
                            <div key={i} className="tkt3-doc-row">
                              <FileText size={12} color="#7c3aed" />
                              <span className="tkt3-doc-name">{doc.label}</span>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tkt3-doc-btn view"><ExternalLink size={10} /></a>
                              <a href={doc.url} download className="tkt3-doc-btn dl"><Download size={10} /></a>
                            </div>
                          ))}
                        </>
                      )}
                      {ticketAttachments.length > 0 && (
                        <>
                          <div className="tkt3-doc-group-lbl" style={{ marginTop: 8 }}>مرفقات التذكرة</div>
                          {ticketAttachments.map((doc, i) => (
                            <div key={i} className="tkt3-doc-row">
                              <FileText size={12} color="#526983" />
                              <span className="tkt3-doc-name">{doc.label.replace("مرفق: ", "")}</span>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tkt3-doc-btn view"><ExternalLink size={10} /></a>
                              <a href={doc.url} download className="tkt3-doc-btn dl"><Download size={10} /></a>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Collapsible: Related Orders ── */}
            <div className="tkt3-section">
              <button className="tkt3-sec-toggle" onClick={() => toggleSection("orders")}>
                <Briefcase size={13} color="#0875dc" /> <span>الطلبات المرتبطة</span>
                {relatedOrders.length > 0 && <span className="tkt3-sec-count" style={{ background: "#eaf4ff", color: "#0875dc" }}>{relatedOrders.length}</span>}
                {openSection === "orders" ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {openSection === "orders" && (
                <div className="tkt3-sec-body">
                  {relatedOrders.length === 0 ? (
                    <div className="tkt3-sec-empty">لا توجد طلبات مرتبطة</div>
                  ) : relatedOrders.map(o => (
                    <a key={o.id} href="/admin/orders" className="tkt3-order-row">
                      <div>
                        <div className="tkt3-order-ref">{o.reference_no || o.id.slice(0,8).toUpperCase()}</div>
                        <div className="tkt3-order-svc">{o.service}</div>
                      </div>
                      <span className="tkt3-order-st">{ORDER_STATUS_AR[o.status] ?? o.status}</span>
                    </a>
                  ))}
                  {relatedOrders.length > 0 && (
                    <a href="/admin/orders" className="tkt3-orders-link">عرض كل الطلبات <ExternalLink size={10} /></a>
                  )}
                </div>
              )}
            </div>

          </aside>
        )}
      </div>

      <style>{`
        /* ════ SHELL ════ */
        .tkt3-shell {
          display: grid;
          grid-template-columns: 400px 1fr;
          height: calc(100vh - 76px);
          overflow: hidden;
        }
        .tkt3-shell:has(.tkt3-client-col) {
          grid-template-columns: 400px 1fr 300px;
        }

        /* ════ LEFT: LIST ════ */
        .tkt3-list-col {
          display: flex; flex-direction: column; overflow: hidden;
          background: #f8fafc; border-left: 1px solid #e5eaf0;
        }

        /* Stats */
        .tkt3-stats { display: flex; background: #fff; border-bottom: 1px solid #e5eaf0; flex-shrink: 0; }
        .tkt3-stat { flex: 1; text-align: center; padding: 12px 6px 10px; border-left: 1px solid #f0f3f8; }
        .tkt3-stat:last-child { border-left: none; }
        .tkt3-stat-num { display: block; font-size: 1.35rem; font-weight: 900; line-height: 1; margin-bottom: 4px; }
        .tkt3-stat-lbl { display: block; font-size: .52rem; color: #8b9dad; }

        /* Search */
        .tkt3-search-wrap { display: flex; align-items: center; gap: 8px; margin: 10px 10px 0; background: #fff; border: 1.5px solid #e5eaf0; border-radius: 10px; padding: 0 12px; height: 38px; flex-shrink: 0; transition: border-color .15s; }
        .tkt3-search-wrap:focus-within { border-color: #0875dc; }
        .tkt3-search-inp { flex: 1; border: 0; outline: 0; background: transparent; font: inherit; font-size: .7rem; color: #344d69; }
        .tkt3-inp-clear { border: 0; background: transparent; color: #aab5c3; cursor: pointer; display: grid; place-items: center; padding: 2px; }

        /* Filter row */
        .tkt3-filter-row { display: flex; align-items: center; gap: 6px; padding: 8px 10px; flex-shrink: 0; }
        .tkt3-sel { height: 32px; border: 1px solid #e5eaf0; border-radius: 8px; background: #fff; padding: 0 8px; font: inherit; font-size: .64rem; color: #344d69; outline: none; flex: 1; }
        .tkt3-filter-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; width: 36px; border: 1px solid #e5eaf0; border-radius: 8px; background: #fff; color: #526983; cursor: pointer; font: inherit; position: relative; flex-shrink: 0; transition: all .15s; }
        .tkt3-filter-btn.active, .tkt3-filter-btn:hover { border-color: #0875dc; color: #0875dc; background: #eaf4ff; }
        .tkt3-badge { position: absolute; top: -5px; left: -5px; background: #dc2626; color: #fff; border-radius: 10px; font-size: .5rem; font-weight: 800; padding: 1px 4px; min-width: 14px; text-align: center; line-height: 1.4; }
        .tkt3-clear-btn { display: inline-grid; place-items: center; width: 32px; height: 32px; border: 1px solid #fca5a5; border-radius: 8px; background: #fef2f2; color: #dc2626; cursor: pointer; flex-shrink: 0; transition: all .15s; }
        .tkt3-clear-btn:hover { background: #fee2e2; }

        /* Advanced */
        .tkt3-adv-row { display: flex; gap: 6px; padding: 0 10px 8px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
        .tkt3-date-range { display: flex; align-items: center; gap: 5px; background: #fff; border: 1px solid #e5eaf0; border-radius: 8px; padding: 0 10px; height: 32px; flex: 1; min-width: 160px; }
        .tkt3-date-inp { border: 0; outline: 0; background: transparent; font: inherit; font-size: .6rem; color: #344d69; flex: 1; min-width: 0; }

        /* Status tabs */
        .tkt3-tabs { display: flex; background: #fff; border-bottom: 1px solid #e5eaf0; overflow-x: auto; scrollbar-width: none; flex-shrink: 0; }
        .tkt3-tab { flex-shrink: 0; border: 0; background: transparent; color: #7a8fa6; font: inherit; font-size: .62rem; font-weight: 700; padding: 9px 11px; cursor: pointer; position: relative; white-space: nowrap; transition: color .15s; }
        .tkt3-tab.active { color: #0875dc; }
        .tkt3-tab.active::after { content: ""; position: absolute; bottom: 0; right: 0; left: 0; height: 2px; background: #0875dc; border-radius: 2px 2px 0 0; }

        /* Results bar */
        .tkt3-results-bar { padding: 4px 10px; background: #eaf4ff; border-bottom: 1px solid #bddcff; font-size: .6rem; color: #0875dc; flex-shrink: 0; }
        .tkt3-results-bar strong { font-weight: 800; }

        /* Cards */
        .tkt3-cards { flex: 1; overflow-y: auto; padding: 8px; }
        .tkt3-empty-list { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #8b9dad; font-size: .7rem; padding: 40px 20px; }

        .tkt3-card { background: #fff; border: 1.5px solid #e5eaf0; border-radius: 12px; padding: 12px 14px; margin-bottom: 7px; cursor: pointer; transition: all .15s; position: relative; }
        .tkt3-card:hover { border-color: #bddcff; box-shadow: 0 2px 10px rgba(8,117,220,.07); transform: translateY(-1px); }
        .tkt3-card.sel { border-color: #0875dc; background: #f0f8ff; box-shadow: 0 2px 14px rgba(8,117,220,.12); }
        .tkt3-card.urgent { border-right: 3px solid #dc2626; }

        .tkt3-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .tkt3-card-id { font-size: .56rem; color: #aab5c3; font-family: monospace; font-weight: 700; background: #f5f8fc; border-radius: 5px; padding: 1px 6px; }
        .tkt3-pri-pill { font-size: .54rem; padding: 2px 7px; border-radius: 12px; font-weight: 800; }
        .tkt3-sla-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        .tkt3-card-title { font-size: .75rem; color: #1e3a56; font-weight: 700; line-height: 1.4; margin-bottom: 7px; }

        .tkt3-card-meta { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
        .tkt3-co-chip { display: inline-flex; align-items: center; gap: 3px; font-size: .58rem; color: #0875dc; background: #eaf4ff; padding: 2px 8px; border-radius: 8px; font-weight: 600; }
        .tkt3-client-name { font-size: .6rem; color: #526983; font-weight: 600; }
        .tkt3-cat-chip { font-size: .56rem; color: #7a8fa6; background: #f5f8fc; padding: 2px 7px; border-radius: 8px; border: 1px solid #e5eaf0; }

        .tkt3-card-foot { display: flex; align-items: center; justify-content: space-between; }
        .tkt3-status-pill { display: inline-flex; align-items: center; gap: 4px; font-size: .56rem; padding: 3px 8px; border-radius: 12px; border: 1px solid; font-weight: 700; }
        .tkt3-age { font-size: .56rem; color: #aab5c3; }

        .tkt3-quick { margin-top: 9px; padding-top: 9px; border-top: 1px dashed #e5eaf0; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .tkt3-quick-lbl { font-size: .56rem; color: #7a8fa6; font-weight: 700; }
        .tkt3-quick-btn { border: 1px solid; border-radius: 12px; padding: 2px 9px; font: inherit; font-size: .54rem; font-weight: 700; cursor: pointer; transition: filter .1s; }
        .tkt3-quick-btn:hover { filter: brightness(.92); }

        /* ════ CENTER: DETAIL ════ */
        .tkt3-center-col { display: flex; flex-direction: column; overflow: hidden; background: #fff; }
        .tkt3-center-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #aab5c3; font-size: .78rem; }
        .tkt3-center-empty-icon { width: 72px; height: 72px; border-radius: 50%; background: #f5f8fc; display: grid; place-items: center; }

        /* Detail header */
        .tkt3-dh { border-bottom: 1px solid #e5eaf0; background: #fff; flex-shrink: 0; padding-bottom: 10px; }
        .tkt3-dh-top { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px 10px; }
        .tkt3-dh-id { display: inline-flex; align-items: center; gap: 4px; font-size: .58rem; color: #8b9dad; background: #f5f8fc; border: 1px solid #e5eaf0; border-radius: 6px; padding: 2px 8px; font-family: monospace; margin-bottom: 5px; }
        .tkt3-dh-title { font-size: 1rem; color: #073766; font-weight: 800; margin: 0 0 6px; line-height: 1.35; }
        .tkt3-dh-sub { display: flex; gap: 10px; font-size: .62rem; color: #8b9dad; flex-wrap: wrap; }
        .tkt3-close-btn { border: 0; background: #f5f8fc; color: #526983; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; transition: all .15s; }
        .tkt3-close-btn:hover { background: #fee2e2; color: #dc2626; }

        .tkt3-label { font-size: .62rem; color: #7a8fa6; font-weight: 700; flex-shrink: 0; }
        .tkt3-status-row { display: flex; align-items: center; gap: 8px; padding: 8px 20px; border-top: 1px solid #f0f3f8; flex-wrap: wrap; }
        .tkt3-status-pills { display: flex; gap: 5px; flex-wrap: wrap; }
        .tkt3-st-pill { border: 1.5px solid #e5eaf0; background: #fff; color: #526983; border-radius: 20px; padding: 4px 11px; font: inherit; font-size: .6rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all .15s; }
        .tkt3-st-pill:hover:not(:disabled):not(.cur) { border-color: #0875dc; color: #0875dc; background: #f0f8ff; }
        .tkt3-st-pill.cur { font-weight: 800; }
        .tkt3-st-pill:disabled { opacity: .55; cursor: not-allowed; }

        .tkt3-assign-row { display: flex; align-items: center; gap: 8px; padding: 8px 20px; border-top: 1px solid #f0f3f8; }
        .tkt3-assign-sel { height: 28px; border: 1px solid #e5eaf0; border-radius: 8px; background: #f8fafc; padding: 0 8px; font: inherit; font-size: .62rem; color: #344d69; flex: 1; max-width: 240px; outline: none; }

        .tkt3-sla-row { display: flex; align-items: center; gap: 8px; padding: 8px 20px 10px; border-top: 1px solid #f0f3f8; }
        .tkt3-sla-lbl { font-size: .62rem; font-weight: 700; flex-shrink: 0; }
        .tkt3-sla-track { flex: 1; height: 5px; border-radius: 5px; background: #e5eaf0; overflow: hidden; }
        .tkt3-sla-fill { height: 100%; border-radius: 5px; transition: width .4s; }
        .tkt3-sla-time { font-size: .6rem; color: #526983; flex-shrink: 0; }
        .tkt3-sla-pct { font-size: .6rem; font-weight: 800; flex-shrink: 0; min-width: 32px; text-align: center; }

        /* Messages */
        .tkt3-msgs { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc; }
        .tkt3-msgs-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #aab5c3; font-size: .7rem; padding: 40px; flex: 1; }

        .tkt3-msg { display: flex; gap: 10px; align-items: flex-end; }
        .tkt3-msg.admin { flex-direction: row-reverse; }
        .tkt3-msg.internal .tkt3-bubble { background: #fef9c3 !important; border-color: #fde047 !important; }

        .tkt3-av { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: .7rem; font-weight: 800; flex-shrink: 0; }
        .client-av { background: #e8f1fb; color: #1758a6; }
        .admin-av  { background: #e8f8f0; color: #166534; }

        .tkt3-msg-body { max-width: 75%; display: flex; flex-direction: column; gap: 4px; }
        .tkt3-msg.admin .tkt3-msg-body { align-items: flex-end; }
        .tkt3-msg.client .tkt3-msg-body { align-items: flex-start; }

        .tkt3-msg-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .tkt3-msg.admin .tkt3-msg-meta { flex-direction: row-reverse; }
        .tkt3-msg-meta strong { font-size: .65rem; color: #344d69; }
        .tkt3-msg-meta small { font-size: .56rem; color: #aab5c3; }
        .tkt3-int-tag { display: inline-flex; align-items: center; gap: 3px; font-size: .54rem; color: #d97706; background: #fef9ee; border: 1px solid #fde68a; border-radius: 10px; padding: 1px 5px; font-weight: 700; }

        .tkt3-bubble { padding: 10px 14px; border-radius: 12px; font-size: .72rem; line-height: 1.65; white-space: pre-wrap; border: 1px solid transparent; }
        .admin-bubble  { background: #0875dc; color: #fff; border-radius: 12px 12px 4px 12px; }
        .client-bubble { background: #fff; color: #344d69; border-color: #e5eaf0; border-radius: 12px 12px 12px 4px; }
        .int-bubble    { background: #fef9c3; color: #78350f; border-color: #fde047; border-radius: 12px; }

        /* History */
        .tkt3-history { margin-top: 8px; border-top: 1px dashed #e0e7ef; }
        .tkt3-history-toggle { display: flex; align-items: center; gap: 6px; width: 100%; border: 0; background: transparent; color: #8b9dad; font: inherit; font-size: .62rem; font-weight: 700; cursor: pointer; padding: 10px 0; }
        .tkt3-history-body { padding: 0 0 8px; display: flex; flex-direction: column; gap: 8px; }
        .tkt3-hist-item { display: flex; align-items: flex-start; gap: 10px; }
        .tkt3-hist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .tkt3-hist-ev { font-size: .63rem; color: #344d69; font-weight: 600; }
        .tkt3-hist-t  { font-size: .57rem; color: #aab5c3; margin-top: 2px; }

        /* Reply */
        .tkt3-reply-wrap { flex-shrink: 0; border-top: 1.5px solid #e5eaf0; background: #fff; }
        .tkt3-reply-tools { display: flex; align-items: center; gap: 8px; padding: 10px 16px 6px; flex-wrap: wrap; }
        .tkt3-tool-btn { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #e5eaf0; background: #f5f8fc; color: #526983; border-radius: 8px; padding: 5px 11px; font: inherit; font-size: .62rem; font-weight: 600; cursor: pointer; transition: all .15s; }
        .tkt3-tool-btn.active, .tkt3-tool-btn:hover { border-color: #0875dc; color: #0875dc; background: #eaf4ff; }
        .tkt3-quick-menu { position: absolute; bottom: calc(100% + 6px); right: 0; background: #fff; border: 1px solid #e5eaf0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.10); min-width: 280px; z-index: 99; overflow: hidden; }
        .tkt3-quick-item { display: block; width: 100%; border: 0; background: transparent; color: #344d69; font: inherit; font-size: .65rem; text-align: right; padding: 10px 14px; cursor: pointer; transition: background .1s; }
        .tkt3-quick-item:hover { background: #f0f8ff; }

        .tkt3-reply-toggle { display: flex; border: 1.5px solid #e5eaf0; border-radius: 8px; overflow: hidden; margin-right: auto; }
        .tkt3-tog { border: 0; background: #f5f8fc; color: #7a8fa6; font: inherit; font-size: .62rem; font-weight: 700; padding: 5px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all .15s; }
        .tog-active-blue  { background: #eaf4ff; color: #0875dc; }
        .tog-active-amber { background: #fef9ee; color: #d97706; }

        .tkt3-reply-form { display: flex; gap: 10px; padding: 8px 16px 14px; align-items: flex-end; }
        .tkt3-textarea { flex: 1; border: 1.5px solid #e5eaf0; border-radius: 10px; padding: 10px 14px; font: inherit; font-size: .72rem; color: #344d69; resize: none; background: #f8fafc; line-height: 1.55; outline: none; transition: border-color .15s; }
        .tkt3-textarea:focus { border-color: #0875dc; background: #fff; }
        .int-textarea { border-color: #fde68a !important; background: #fef9ee !important; }
        .tkt3-send-btn { display: inline-flex; align-items: center; gap: 6px; border: 0; background: #0875dc; color: #fff; border-radius: 10px; padding: 0 16px; height: 40px; font: inherit; font-size: .68rem; font-weight: 700; cursor: pointer; flex-shrink: 0; transition: background .15s; }
        .tkt3-send-btn:hover:not(:disabled) { background: #065fb8; }
        .tkt3-send-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ════ RIGHT: CLIENT ════ */
        .tkt3-client-col { display: flex; flex-direction: column; overflow-y: auto; border-right: 1px solid #e5eaf0; background: #fff; }

        /* Hero */
        .tkt3-client-hero { display: flex; gap: 12px; align-items: flex-start; padding: 18px 16px 14px; border-bottom: 1px solid #f0f3f8; }
        .tkt3-client-av { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #0875dc, #073766); color: #fff; display: grid; place-items: center; font-size: .95rem; font-weight: 800; flex-shrink: 0; }
        .tkt3-client-name-lrg { font-size: .82rem; font-weight: 800; color: #073766; line-height: 1.3; }
        .tkt3-client-sub { font-size: .62rem; color: #8b9dad; margin-top: 2px; }
        .tkt3-client-type { display: inline-block; margin-top: 5px; font-size: .56rem; color: #7c3aed; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 2px 8px; font-weight: 700; }

        /* Contact */
        .tkt3-contact-row { display: flex; flex-direction: column; gap: 6px; padding: 10px 16px; border-bottom: 1px solid #f0f3f8; }
        .tkt3-contact-btn { display: inline-flex; align-items: center; gap: 7px; font-size: .65rem; color: #344d69; text-decoration: none; background: #f5f8fc; border: 1px solid #e5eaf0; border-radius: 8px; padding: 7px 11px; transition: all .15s; direction: ltr; justify-content: flex-start; }
        .tkt3-contact-btn:hover { border-color: #0875dc; color: #0875dc; background: #eaf4ff; }
        .tkt3-contact-btn.email:hover { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }

        /* Mini stats */
        .tkt3-mini-stats { display: flex; padding: 10px 16px; border-bottom: 1px solid #f0f3f8; gap: 6px; }
        .tkt3-mini-stat { flex: 1; text-align: center; background: #f8fafc; border: 1px solid #e5eaf0; border-radius: 8px; padding: 8px 4px; }
        .tkt3-mini-num { display: block; font-size: 1rem; font-weight: 900; color: #073766; line-height: 1; margin-bottom: 3px; }
        .tkt3-mini-lbl { font-size: .5rem; color: #8b9dad; }

        /* Collapsible sections */
        .tkt3-section { border-bottom: 1px solid #f0f3f8; }
        .tkt3-sec-toggle { display: flex; align-items: center; gap: 8px; width: 100%; padding: 11px 16px; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: .68rem; font-weight: 700; color: #344d69; text-align: right; transition: background .15s; }
        .tkt3-sec-toggle:hover { background: #f8fafc; }
        .tkt3-sec-toggle span { flex: 1; text-align: right; }
        .tkt3-sec-count { margin-right: auto; font-size: .54rem; font-weight: 800; padding: 1px 7px; border-radius: 10px; background: #f0f3f8; color: #526983; }
        .tkt3-sec-body { padding: 0 16px 12px; }
        .tkt3-sec-empty { font-size: .62rem; color: #aab5c3; text-align: center; padding: 10px; }

        /* Info rows */
        .tkt3-info-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f5f8fc; }
        .tkt3-info-row:last-child { border-bottom: none; }
        .tkt3-info-lbl { font-size: .59rem; color: #8b9dad; flex-shrink: 0; }
        .tkt3-info-val { font-size: .62rem; color: #1e3a56; font-weight: 600; text-align: left; }

        /* Docs */
        .tkt3-doc-group-lbl { font-size: .58rem; color: #7a8fa6; font-weight: 700; margin-bottom: 5px; }
        .tkt3-doc-row { display: flex; align-items: center; gap: 7px; padding: 6px 0; border-bottom: 1px solid #f5f8fc; }
        .tkt3-doc-row:last-child { border-bottom: none; }
        .tkt3-doc-name { font-size: .62rem; color: #344d69; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tkt3-doc-btn { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 6px; text-decoration: none; transition: all .15s; flex-shrink: 0; }
        .tkt3-doc-btn.view { color: #0875dc; background: #eaf4ff; border: 1px solid #bddcff; }
        .tkt3-doc-btn.view:hover { background: #dbeeff; }
        .tkt3-doc-btn.dl { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .tkt3-doc-btn.dl:hover { background: #dcfce7; }

        /* Orders */
        .tkt3-order-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 0; border-bottom: 1px solid #f5f8fc; text-decoration: none; transition: all .15s; }
        .tkt3-order-row:last-of-type { border-bottom: none; }
        .tkt3-order-row:hover .tkt3-order-ref { color: #0875dc; }
        .tkt3-order-ref { font-size: .62rem; font-weight: 800; color: #073766; font-family: monospace; direction: ltr; display: block; }
        .tkt3-order-svc { font-size: .56rem; color: #8b9dad; margin-top: 1px; }
        .tkt3-order-st { font-size: .54rem; font-weight: 700; color: #0875dc; background: #eaf4ff; padding: 2px 7px; border-radius: 10px; white-space: nowrap; flex-shrink: 0; }
        .tkt3-orders-link { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-size: .6rem; color: #0875dc; font-weight: 600; text-decoration: none; }
        .tkt3-orders-link:hover { text-decoration: underline; }

        /* ════ UTILS ════ */
        .spin { animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1100px) {
          .tkt3-shell, .tkt3-shell:has(.tkt3-client-col) { grid-template-columns: 380px 1fr; }
          .tkt3-client-col { display: none; }
        }
        @media (max-width: 720px) {
          .tkt3-shell, .tkt3-shell:has(.tkt3-client-col) { grid-template-columns: 1fr; height: auto; }
          .tkt3-center-col { display: none; }
          .tkt3-list-col { height: calc(100vh - 76px); }
        }
      `}</style>
    </main>
  );
}
