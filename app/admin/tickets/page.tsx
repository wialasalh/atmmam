"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import {
  Search, MessageSquare, Check, Send, Loader, Filter,
  Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, Download, ExternalLink, ChevronDown, ChevronUp,
  Hash, MapPin, Briefcase, Globe, Users, Lock, X, Zap,
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  "جديدة":          { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} /> },
  "قيد المراجعة":   { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} /> },
  "بانتظار العميل": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertTriangle size={11} /> },
  "تم الحل":        { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} /> },
  "مغلقة":          { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} /> },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  "عاجلة":  { color: "#dc2626", bg: "#fef2f2", label: "عاجل" },
  "مرتفعة": { color: "#ea580c", bg: "#fff7ed", label: "مرتفعة" },
  "عادية":  { color: "#6b7280", bg: "#f9fafb", label: "عادية" },
};

const ENTITY_SIZE_LABELS: Record<string, string> = { micro: "متناهي الصغر", small: "صغير", medium: "متوسط", large: "كبير" };
const SCOPE_LABELS: Record<string, string>        = { platinum: "البلاتيني", high_green: "الأخضر العالي", medium_green: "الأخضر المتوسط", low_green: "الأخضر المنخفض", red: "الأحمر" };
const STATUS_LABELS: Record<string, string>       = { active: "نشطة", suspended: "معلقة", struck_off: "مشطوبة" };

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSLADot(updated_at: string): { color: string; level: "red" | "orange" | "green"; label: string } {
  const h = (Date.now() - new Date(updated_at).getTime()) / 3600000;
  if (h > 24) return { color: "#dc2626", level: "red",    label: "متأخر (>24س)" };
  if (h > 12) return { color: "#ea580c", level: "orange", label: "تحذير (>12س)" };
  return              { color: "#16a34a", level: "green",  label: "جيد (<12س)"   };
}

function getSLAPanel(t: AdminTicket) {
  const elapsed = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
  const target  = t.priority === "عاجلة" ? 4 : t.priority === "مرتفعة" ? 8 : 24;
  const pct     = Math.min(100, (elapsed / target) * 100);
  const remaining = Math.max(0, target - elapsed);
  const color   = pct >= 100 ? "#dc2626" : pct >= 75 ? "#ea580c" : "#16a34a";
  const rLabel  = pct >= 100 ? "تجاوز الـ SLA" : remaining < 1 ? "أقل من ساعة" : `${Math.round(remaining)} ساعة متبقية`;
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const [tickets,             setTickets]             = useState<AdminTicket[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [search,              setSearch]              = useState("");
  const [selected,            setSelected]            = useState<AdminTicket | null>(null);
  const [messages,            setMessages]            = useState<TicketMessage[]>([]);
  const [statusFilter,        setStatusFilter]        = useState("");
  const [priorityFilter,      setPriorityFilter]      = useState("");
  const [categoryFilter,      setCategoryFilter]      = useState("");
  const [assignedFilter,      setAssignedFilter]      = useState("");
  const [dateFrom,            setDateFrom]            = useState("");
  const [dateTo,              setDateTo]              = useState("");
  const [showAdvanced,        setShowAdvanced]        = useState(false);
  const [hoveredRow,          setHoveredRow]          = useState<string | null>(null);
  const [newNote,             setNewNote]             = useState("");
  const [updating,            setUpdating]            = useState(false);
  const [sending,             setSending]             = useState(false);
  const [showQuickReplies,    setShowQuickReplies]    = useState(false);
  const [showFacilityPanel,   setShowFacilityPanel]   = useState(true);
  const [signedUrls,          setSignedUrls]          = useState<SignedUrl[]>([]);
  const [loadingUrls,         setLoadingUrls]         = useState(false);
  const [isInternal,          setIsInternal]          = useState(false);
  const [teamMembers,         setTeamMembers]         = useState<TeamMember[]>([]);
  const [showHistory,         setShowHistory]         = useState(false);
  const [relatedOrders,       setRelatedOrders]       = useState<RelatedOrder[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Derived ──────────────────────────────────────────────────────────────

  const categories = useMemo(() => [...new Set(tickets.map(t => t.category).filter(Boolean))], [tickets]);

  const activeFilterCount = [categoryFilter, assignedFilter, dateFrom, dateTo].filter(Boolean).length;

  const filtered = useMemo(() => tickets.filter(t => {
    const q = search.trim().toLowerCase();
    if (q && !`#${t.id.slice(0,8).toUpperCase()} ${t.title} ${t.profiles?.full_name ?? ""} ${t.clients?.name ?? ""}`.toLowerCase().includes(q)) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (assignedFilter && t.assigned_to !== assignedFilter) return false;
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }), [tickets, search, priorityFilter, categoryFilter, assignedFilter, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    total:         tickets.length,
    urgent:        tickets.filter(t => t.priority === "عاجلة").length,
    new:           tickets.filter(t => t.status === "جديدة").length,
    inProgress:    tickets.filter(t => t.status === "قيد المراجعة").length,
    waiting:       tickets.filter(t => t.status === "بانتظار العميل").length,
    resolvedToday: tickets.filter(t => t.status === "تم الحل" && isToday(t.updated_at)).length,
  }), [tickets]);

  const clientTicketCount = useMemo(() => selected
    ? tickets.filter(t => selected.client_id ? t.client_id === selected.client_id : t.user_id === selected.user_id).length
    : 0, [tickets, selected]);

  const clientResolvedCount = useMemo(() => selected
    ? tickets.filter(t => (selected.client_id ? t.client_id === selected.client_id : t.user_id === selected.user_id) && t.status === "تم الحل").length
    : 0, [tickets, selected]);

  const detailSLA = selected && !["تم الحل","مغلقة"].includes(selected.status)
    ? getSLAPanel(selected) : null;

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { void loadTickets(); }, [statusFilter]);
  useEffect(() => { void loadTeam(); }, []);

  useEffect(() => {
    if (!selected) return;
    setMessages([]); setSignedUrls([]); setShowFacilityPanel(true); setIsInternal(false); setShowHistory(false);
    void fetch(`/api/tickets/${selected.id}/messages`).then(async r => {
      if (r.ok) { const d = await r.json(); setMessages(d.data || []); }
    });
    void generateSignedUrls(selected);
  }, [selected]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // SLA refresh every 60s
  useEffect(() => {
    const iv = setInterval(() => setTickets(ts => [...ts]), 60000);
    return () => clearInterval(iv);
  }, []);

  // Related orders for selected ticket's client
  useEffect(() => {
    const clientId = selected?.clients?.id;
    if (!clientId) { setRelatedOrders([]); return; }
    fetch("/api/admin/orders")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        type RawOrder = { id: string; reference_no?: string; status: string; clients?: { id: string } | null; services?: { name?: string } | null };
        const all = (data?.data ?? []) as RawOrder[];
        setRelatedOrders(
          all
            .filter(o => o.clients?.id === clientId)
            .map(o => ({ id: o.id, reference_no: o.reference_no, status: o.status, service: o.services?.name }))
            .slice(0, 5)
        );
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

  function clearAllFilters() {
    setSearch(""); setPriorityFilter(""); setCategoryFilter(""); setAssignedFilter(""); setDateFrom(""); setDateTo(""); setStatusFilter("");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="tickets" />

      <div className="tkt-layout">

        {/* ══ LIST COLUMN ══ */}
        <div className="tkt-list-col">

          {/* Stats bar */}
          <div className="tkt-stats">
            {[
              { label: "إجمالي التذاكر", num: stats.total,         cls: "" },
              { label: "عاجلة",           num: stats.urgent,        cls: "tkt-stat-red" },
              { label: "جديدة",           num: stats.new,           cls: "tkt-stat-blue" },
              { label: "قيد المراجعة",    num: stats.inProgress,    cls: "tkt-stat-amber" },
              { label: "تم الحل اليوم",   num: stats.resolvedToday, cls: "tkt-stat-green" },
            ].map(s => (
              <div key={s.label} className={`tkt-stat ${s.cls}`}>
                <span className="tkt-stat-num">{s.num}</span>
                <span className="tkt-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Primary filter row */}
          <div className="tkt-filters">
            <div className="tkt-search">
              <Search size={14} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="رقم التذكرة، العنوان، العميل، المنشأة..." />
            </div>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="tkt-select">
              <option value="">كل الأولويات</option>
              <option value="عاجلة">عاجلة</option>
              <option value="مرتفعة">مرتفعة</option>
              <option value="عادية">عادية</option>
            </select>
            <button onClick={() => setShowAdvanced(v => !v)} className={`tkt-pro-adv-btn${showAdvanced ? " tkt-pro-adv-active" : ""}`}>
              <Filter size={13} />
              فلاتر
              {activeFilterCount > 0 && <span className="tkt-pro-filter-badge">{activeFilterCount}</span>}
            </button>
            {(activeFilterCount > 0 || priorityFilter || search) && (
              <button onClick={clearAllFilters} className="tkt-pro-clear-btn" title="مسح جميع الفلاتر">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="tkt-pro-filter-row">
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="tkt-select tkt-pro-filter-sel">
                <option value="">كل التصنيفات</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="tkt-select tkt-pro-filter-sel">
                <option value="">كل المسؤولين</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              <div className="tkt-pro-date-group">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="tkt-pro-date-input" />
                <span style={{ color: "#c0cbd8", fontSize: ".7rem" }}>—</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="tkt-pro-date-input" />
              </div>
            </div>
          )}

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

          {/* Results count when filtering */}
          {(activeFilterCount > 0 || search || priorityFilter) && (
            <div className="tkt-pro-results-bar">
              عرض <strong>{filtered.length}</strong> من {tickets.length} تذكرة
            </div>
          )}

          {/* Ticket list */}
          <div className="tkt-list">
            {loading ? (
              <div className="tkt-empty"><Loader size={24} className="spin" /><p>جاري التحميل...</p></div>
            ) : filtered.length === 0 ? (
              <div className="tkt-empty"><MessageSquare size={28} /><p>لا توجد تذاكر</p></div>
            ) : filtered.map(t => {
              const sc  = STATUS_CONFIG[t.status]   || STATUS_CONFIG["جديدة"];
              const pc  = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG["عادية"];
              const sla = getSLADot(t.updated_at);
              const isHov = hoveredRow === t.id;
              const isSel = selected?.id === t.id;
              const quickSt = STATUS_OPTIONS.filter(s => s !== t.status && s !== "مغلقة").slice(0, 2);
              return (
                <div key={t.id}
                  onClick={() => setSelected(t)}
                  onMouseEnter={() => setHoveredRow(t.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`tkt-row ${isSel ? "active" : ""} ${t.priority === "عاجلة" ? "urgent-row" : ""}`}
                >
                  <div className="tkt-row-top">
                    <strong className="tkt-row-title">{t.title}</strong>
                    <div className="tkt-pro-row-badges">
                      <span className="tkt-priority-badge" style={{ color: pc.color, background: pc.bg }}>{pc.label}</span>
                      <span className={`tkt-pro-sla-dot tkt-pro-sla-${sla.level}`} title={`SLA: ${sla.label}`} />
                    </div>
                  </div>
                  <div className="tkt-row-meta">
                    <span className="tkt-client-name">{t.profiles?.full_name || "عميل"}</span>
                    {t.clients?.name && <span className="tkt-facility-badge"><Building2 size={10} /> {t.clients.name}</span>}
                    <span className="tkt-category">{t.category}</span>
                  </div>
                  <div className="tkt-row-bottom">
                    <span className="tkt-status-badge" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
                      {sc.icon} {t.status}
                    </span>
                    <span className="tkt-pro-age">{formatAge(t.created_at)}</span>
                  </div>
                  {/* Hover quick actions */}
                  {isHov && !isSel && (
                    <div className="tkt-pro-quick-actions" onClick={e => e.stopPropagation()}>
                      <span className="tkt-pro-quick-label">نقل إلى:</span>
                      {quickSt.map(s => {
                        const qsc = STATUS_CONFIG[s];
                        return (
                          <button key={s} onClick={e => { e.stopPropagation(); void updateStatus(t.id, s); }}
                            className="tkt-pro-quick-btn" style={{ color: qsc.color, background: qsc.bg, borderColor: qsc.border }}>
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
        </div>

        {/* ══ DETAIL COLUMN ══ */}
        <div className="tkt-detail-col">
          {selected ? (
            <>
              {/* Fixed header */}
              <div className="tkt-detail-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tkt-pro-ticket-id"><Hash size={10} /> #{selected.id.slice(0,8).toUpperCase()}</div>
                  <h2 className="tkt-detail-title">{selected.title}</h2>
                  <div className="tkt-detail-meta">
                    <span>{selected.profiles?.full_name || "—"}</span>
                    <span>{selected.profiles?.email || ""}</span>
                    <span>{selected.category}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="tkt-close-btn">✕</button>
              </div>

              {/* Scrollable body */}
              <div className="tkt-pro-detail-scroll">

                {/* Status bar */}
                <div className="tkt-status-bar">
                  <span className="tkt-status-label">الحالة:</span>
                  <div className="tkt-status-btns">
                    {STATUS_OPTIONS.map(s => {
                      const sc = STATUS_CONFIG[s];
                      return (
                        <button key={s} onClick={() => updateStatus(selected.id, s)}
                          disabled={updating || s === selected.status}
                          className={`tkt-status-btn ${s === selected.status ? "current" : ""}`}
                          style={s === selected.status ? { color: sc.color, background: sc.bg, borderColor: sc.border } : {}}>
                          {s === selected.status && <Check size={11} />} {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Assign */}
                <div className="tkt-new-assign-bar" dir="rtl">
                  <Users size={13} color="#7a8fa6" />
                  <span className="tkt-new-assign-label">تعيين لـ:</span>
                  <select value={selected.assigned_to || ""} onChange={e => assignTicket(e.target.value || null)} className="tkt-new-assign-select">
                    <option value="">غير معين</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>

                {/* SLA Panel */}
                {detailSLA && (
                  <div className="tkt-pro-sla-panel">
                    <div className="tkt-pro-sla-head">
                      <Zap size={13} color={detailSLA.color} />
                      <span style={{ color: detailSLA.color, fontWeight: 700, fontSize: ".65rem" }}>
                        {detailSLA.overdue ? "تجاوز الـ SLA" : "SLA نشط"}
                      </span>
                      <span className="tkt-pro-sla-time">{detailSLA.rLabel}</span>
                      <span className="tkt-pro-sla-pct" style={{ color: detailSLA.color }}>{Math.round(detailSLA.pct)}%</span>
                    </div>
                    <div className="tkt-pro-sla-track">
                      <div className="tkt-pro-sla-fill" style={{ width: `${detailSLA.pct}%`, background: detailSLA.color }} />
                    </div>
                    <div className="tkt-pro-sla-meta">
                      <span>أنشئت {formatAge(selected.created_at)}</span>
                      <span>·</span>
                      <span>آخر تحديث {formatAge(selected.updated_at)}</span>
                      <span>·</span>
                      <span>هدف: {detailSLA.target} ساعة</span>
                    </div>
                  </div>
                )}

                {/* Client Activity */}
                {clientTicketCount > 0 && (
                  <div className="tkt-pro-client-activity">
                    <div className="tkt-pro-ca-title"><Users size={13} color="#526983" /> نشاط العميل</div>
                    <div className="tkt-pro-ca-row">
                      <div className="tkt-pro-ca-item">
                        <div className="tkt-pro-ca-num">{clientTicketCount}</div>
                        <div className="tkt-pro-ca-label">إجمالي التذاكر</div>
                      </div>
                      <div className="tkt-pro-ca-item">
                        <div className="tkt-pro-ca-num">{clientResolvedCount}</div>
                        <div className="tkt-pro-ca-label">تم حلها</div>
                      </div>
                      <div className="tkt-pro-ca-item">
                        <div className="tkt-pro-ca-num" style={{ fontSize: ".7rem" }}>{formatAge(selected.updated_at)}</div>
                        <div className="tkt-pro-ca-label">آخر نشاط</div>
                      </div>
                      {selected.clients?.phone && (
                        <div className="tkt-pro-ca-item">
                          <div className="tkt-pro-ca-num" style={{ fontSize: ".62rem", direction: "ltr" }}>{selected.clients.phone}</div>
                          <div className="tkt-pro-ca-label">الجوال</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Related Orders */}
                {relatedOrders.length > 0 && (
                  <div style={{ padding: "11px 22px", borderBottom: "1px solid #f0f3f8" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".65rem", fontWeight: 700, color: "#344d69", marginBottom: 9 }}>
                      <Briefcase size={13} color="#0875dc" /> الطلبات المرتبطة
                      <span style={{ marginRight: "auto", background: "#eaf4ff", color: "#0875dc", fontSize: ".54rem", padding: "1px 7px", borderRadius: 10, fontWeight: 800, border: "1px solid #bddcff" }}>{relatedOrders.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {relatedOrders.map(o => {
                        const statusAr: Record<string,string> = { new: "جديد", waiting_documents: "بانتظار المستندات", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي", blocked: "معلق" };
                        const label = statusAr[o.status] ?? o.status;
                        return (
                          <a key={o.id} href="/admin"
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#f8fafc", border: "1px solid #e5eaf0", borderRadius: 8, textDecoration: "none", transition: "border-color .15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "#0875dc"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "#e5eaf0"}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: ".62rem", fontWeight: 800, color: "#073766", fontFamily: "monospace", direction: "ltr" }}>{o.reference_no || o.id.slice(0,8).toUpperCase()}</div>
                              <div style={{ fontSize: ".54rem", color: "#8b9dad", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.service}</div>
                            </div>
                            <span style={{ fontSize: ".53rem", fontWeight: 700, padding: "2px 7px", borderRadius: 12, background: "#eaf4ff", color: "#0875dc", whiteSpace: "nowrap" }}>{label}</span>
                          </a>
                        );
                      })}
                    </div>
                    <a href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: ".62rem", color: "#0875dc", fontWeight: 600, textDecoration: "none" }}>
                      عرض الطلبات <ExternalLink size={11} />
                    </a>
                  </div>
                )}

                {/* Facility Panel */}
                {(selected.clients || (selected.files && selected.files.length > 0)) && (
                  <div className="tkt-facility-panel">
                    <button className="tkt-facility-toggle" onClick={() => setShowFacilityPanel(!showFacilityPanel)}>
                      <Building2 size={14} color="#0875dc" />
                      <span>بيانات المنشأة المرتبطة{selected.clients?.name && <strong> — {selected.clients.name}</strong>}</span>
                      {showFacilityPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showFacilityPanel && (
                      <div className="tkt-facility-body">
                        {selected.clients && (
                          <>
                            <div className="tkt-facility-grid">
                              <InfoCell icon={Building2} label="اسم المنشأة"   value={selected.clients.name} />
                              <InfoCell icon={Hash}      label="الرقم الضريبي" value={selected.clients.tax_number} />
                              <InfoCell icon={FileText}  label="السجل التجاري" value={selected.clients.commercial_number} />
                              <InfoCell icon={MapPin}    label="المدينة"       value={selected.clients.city} />
                              <InfoCell icon={Briefcase} label="النشاط"        value={selected.clients.company_activity} />
                              <InfoCell icon={MapPin}    label="العنوان"       value={selected.clients.company_address} />
                              <InfoCell icon={Globe}     label="حجم الكيان"    value={selected.clients.entity_size ? ENTITY_SIZE_LABELS[selected.clients.entity_size] : null} />
                              <InfoCell icon={Globe}     label="نطاق المنشأة"  value={selected.clients.company_scope ? SCOPE_LABELS[selected.clients.company_scope] : null} />
                              <InfoCell icon={Globe}     label="حالة المنشأة"  value={selected.clients.company_status ? STATUS_LABELS[selected.clients.company_status] : null} />
                              {selected.clients.employee_count != null && <InfoCell icon={Globe} label="عدد الموظفين" value={String(selected.clients.employee_count)} />}
                            </div>
                            <div className="tkt-docs-section">
                              <p className="tkt-docs-title"><FileText size={13} /> مستندات المنشأة</p>
                              {loadingUrls ? (
                                <div style={{ fontSize: ".62rem", color: "#8b9dad", padding: "6px 0" }}>جاري تحميل الروابط...</div>
                              ) : signedUrls.length === 0 ? (
                                <div style={{ fontSize: ".62rem", color: "#aab5c3", padding: "6px 0" }}>لا توجد مستندات مرفوعة</div>
                              ) : (
                                <div className="tkt-docs-list">
                                  {signedUrls.map((doc, i) => (
                                    <div key={i} className="tkt-doc-row">
                                      <FileText size={13} color="#526983" style={{ flexShrink: 0 }} />
                                      <span className="tkt-doc-name">{doc.label}</span>
                                      <div style={{ display: "flex", gap: 6, marginRight: "auto" }}>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tkt-doc-btn tkt-doc-view"><ExternalLink size={11} /> عرض</a>
                                        <a href={doc.url} download className="tkt-doc-btn tkt-doc-download"><Download size={11} /> تحميل</a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        {selected.files && selected.files.length > 0 && !selected.clients && (
                          <div className="tkt-docs-section">
                            <p className="tkt-docs-title"><FileText size={13} /> مرفقات التذكرة</p>
                            {loadingUrls ? <div style={{ fontSize: ".62rem", color: "#8b9dad" }}>جاري التحميل...</div> : (
                              <div className="tkt-docs-list">
                                {signedUrls.filter(u => u.label.startsWith("مرفق:")).map((doc, i) => (
                                  <div key={i} className="tkt-doc-row">
                                    <FileText size={13} color="#526983" style={{ flexShrink: 0 }} />
                                    <span className="tkt-doc-name">{doc.label.replace("مرفق: ", "")}</span>
                                    <div style={{ display: "flex", gap: 6, marginRight: "auto" }}>
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tkt-doc-btn tkt-doc-view"><ExternalLink size={11} /> عرض</a>
                                      <a href={doc.url} download className="tkt-doc-btn tkt-doc-download"><Download size={11} /> تحميل</a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div className="tkt-messages">
                  {messages.length === 0 ? (
                    <div className="tkt-empty" style={{ minHeight: 80 }}><MessageSquare size={24} /><p>لا توجد رسائل بعد</p></div>
                  ) : messages.map(msg => (
                    <div key={msg.id} className={`tkt-msg${msg.is_internal ? " tkt-new-msg-internal" : ""}`}>
                      <div className="tkt-msg-avatar">{(msg.sender?.full_name || "د")[0]}</div>
                      <div className="tkt-msg-content">
                        <div className="tkt-msg-header">
                          <strong>{msg.sender?.full_name || "فريق الدعم"}</strong>
                          {msg.is_internal && <span className="tkt-new-internal-badge"><Lock size={9} /> داخلية</span>}
                          <small>{new Date(msg.created_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                        </div>
                        <p className={`tkt-msg-body${msg.is_internal ? " tkt-new-msg-internal-body" : ""}`}>{msg.body}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* History */}
                <div className="tkt-new-history" dir="rtl">
                  <button type="button" className="tkt-new-history-toggle" onClick={() => setShowHistory(v => !v)}>
                    <Clock size={12} /><span>سجل التذكرة</span>
                    {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showHistory && (
                    <div className="tkt-new-history-body">
                      <div className="tkt-new-history-item">
                        <span className="tkt-new-history-dot tkt-new-dot-create" />
                        <div>
                          <div className="tkt-new-history-event">تم إنشاء التذكرة</div>
                          <div className="tkt-new-history-time">{new Date(selected.created_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                      {messages.filter(m => m.message_type === "status_change").map(m => (
                        <div key={m.id} className="tkt-new-history-item">
                          <span className="tkt-new-history-dot tkt-new-dot-status" />
                          <div>
                            <div className="tkt-new-history-event">{m.body}</div>
                            <div className="tkt-new-history-time">{new Date(m.created_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                      ))}
                      <div className="tkt-new-history-item">
                        <span className="tkt-new-history-dot tkt-new-dot-update" />
                        <div>
                          <div className="tkt-new-history-event">آخر تحديث</div>
                          <div className="tkt-new-history-time">{new Date(selected.updated_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>{/* end scroll */}

              {/* Fixed bottom reply area */}
              <div className="tkt-new-reply-tools" dir="rtl">
                <button type="button" onClick={() => setShowQuickReplies(v => !v)}
                  className={`tkt-new-canned-btn${showQuickReplies ? " tkt-new-canned-active" : ""}`}>
                  <Filter size={12} /> ردود جاهزة
                </button>
                <button type="button" onClick={() => setIsInternal(v => !v)}
                  className={`tkt-new-internal-btn${isInternal ? " tkt-new-internal-active" : ""}`}>
                  <Lock size={12} /> ملاحظة داخلية
                </button>
              </div>

              {showQuickReplies && (
                <div className="tkt-quick-replies">
                  {QUICK_REPLIES.map((r, i) => (
                    <button key={i} onClick={() => { setNewNote(r); setShowQuickReplies(false); }} className="tkt-quick-reply">{r}</button>
                  ))}
                </div>
              )}

              <form onSubmit={sendNote} className="tkt-reply-form" dir="rtl">
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                  placeholder={isInternal ? "اكتب ملاحظتك الداخلية..." : "اكتب ردك هنا..."}
                  rows={2} className={`tkt-reply-input${isInternal ? " tkt-new-internal-input" : ""}`}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendNote(e); } }} />
                <button type="submit" disabled={!newNote.trim() || sending} className="tkt-send-btn">
                  {sending ? <Loader size={16} className="spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          ) : (
            <div className="tkt-empty tkt-empty-detail">
              <MessageSquare size={40} /><p>اختر تذكرة لعرض التفاصيل والمحادثة</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ── Core layout ── */
        .tkt-layout { display: grid; grid-template-columns: 420px 1fr; height: calc(100vh - 76px); overflow: hidden; }
        .tkt-list-col { border-left: 1px solid #e5eaf0; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc; }
        .tkt-detail-col { display: flex; flex-direction: column; overflow: hidden; background: #fff; }

        /* ── Stats ── */
        .tkt-stats { display: flex; border-bottom: 1px solid #e5eaf0; background: #fff; flex-shrink: 0; }
        .tkt-stat { flex: 1; text-align: center; padding: 10px 5px; border-left: 1px solid #f0f3f8; }
        .tkt-stat:last-child { border-left: none; }
        .tkt-stat-num { display: block; font-size: 1.2rem; font-weight: 800; color: #073766; line-height: 1; }
        .tkt-stat-label { display: block; font-size: .48rem; color: #8b9dad; margin-top: 3px; }
        .tkt-stat-blue  .tkt-stat-num { color: #0875dc; }
        .tkt-stat-amber .tkt-stat-num { color: #b45309; }
        .tkt-stat-red   .tkt-stat-num { color: #dc2626; }
        .tkt-stat-green .tkt-stat-num { color: #15803d; }

        /* ── Filters ── */
        .tkt-filters { display: flex; gap: 7px; padding: 10px 12px; background: #fff; border-bottom: 1px solid #f0f3f8; align-items: center; flex-shrink: 0; }
        .tkt-search { flex: 1; display: flex; align-items: center; gap: 7px; background: #f5f8fc; border: 1px solid #e5eaf0; border-radius: 8px; padding: 0 10px; color: #8b9dad; }
        .tkt-search input { border: 0; outline: 0; background: transparent; font: inherit; font-size: .68rem; width: 100%; color: #344d69; height: 34px; }
        .tkt-select { height: 34px; border: 1px solid #e5eaf0; border-radius: 8px; background: #f5f8fc; padding: 0 10px; font: inherit; font-size: .65rem; color: #344d69; outline: none; }

        /* ── Status tabs ── */
        .tkt-tabs { display: flex; background: #fff; border-bottom: 1px solid #e5eaf0; overflow-x: auto; scrollbar-width: none; flex-shrink: 0; }
        .tkt-tab { flex-shrink: 0; border: 0; background: transparent; color: #7a8fa6; font: inherit; font-size: .65rem; font-weight: 700; padding: 10px 12px; cursor: pointer; position: relative; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
        .tkt-tab.active { color: #0875dc; }
        .tkt-tab.active::after { content: ""; position: absolute; bottom: 0; right: 0; left: 0; height: 2px; background: #0875dc; }
        .tkt-tab b { background: #e5eaf0; color: #526983; border-radius: 20px; padding: 1px 6px; font-size: .55rem; }
        .tkt-tab b.urgent { background: #fef2f2; color: #dc2626; }

        /* ── List ── */
        .tkt-list { flex: 1; overflow-y: auto; padding: 8px; }
        .tkt-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #8b9dad; font-size: .72rem; padding: 40px 20px; }
        .tkt-row { background: #fff; border: 1px solid #e5eaf0; border-radius: 10px; padding: 12px 14px; margin-bottom: 6px; cursor: pointer; transition: all .15s; }
        .tkt-row:hover { border-color: #bddcff; box-shadow: 0 2px 8px rgba(8,117,220,.06); }
        .tkt-row.active { border-color: #0875dc; background: #f0f8ff; box-shadow: 0 2px 12px rgba(8,117,220,.1); }
        .tkt-row.urgent-row { border-right: 3px solid #dc2626; }
        .tkt-row-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .tkt-row-title { font-size: .75rem; color: #1e3a56; font-weight: 700; line-height: 1.4; flex: 1; }
        .tkt-priority-badge { font-size: .55rem; padding: 2px 7px; border-radius: 20px; font-weight: 700; flex-shrink: 0; }
        .tkt-row-meta { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
        .tkt-client-name { font-size: .62rem; color: #526983; font-weight: 600; }
        .tkt-facility-badge { display: inline-flex; align-items: center; gap: 3px; font-size: .58rem; color: #0875dc; background: #eaf4ff; padding: 2px 7px; border-radius: 8px; font-weight: 600; }
        .tkt-category { font-size: .6rem; color: #8b9dad; background: #f5f8fc; padding: 1px 7px; border-radius: 10px; }
        .tkt-row-bottom { display: flex; align-items: center; justify-content: space-between; }
        .tkt-status-badge { display: inline-flex; align-items: center; gap: 4px; font-size: .58rem; padding: 3px 8px; border-radius: 20px; border: 1px solid; font-weight: 700; }
        .tkt-date { font-size: .58rem; color: #aab5c3; }

        /* ── Detail ── */
        .tkt-detail-head { padding: 16px 22px 12px; border-bottom: 1px solid #e5eaf0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; background: #fff; flex-shrink: 0; }
        .tkt-detail-title { font-size: .95rem; color: #073766; margin: 4px 0 6px; font-weight: 700; }
        .tkt-detail-meta { display: flex; gap: 10px; font-size: .62rem; color: #8b9dad; flex-wrap: wrap; }
        .tkt-close-btn { border: 0; background: #f5f8fc; color: #526983; border-radius: 6px; width: 30px; height: 30px; cursor: pointer; font-size: 1rem; flex-shrink: 0; }
        .tkt-status-bar { padding: 10px 22px; border-bottom: 1px solid #f0f3f8; display: flex; align-items: center; gap: 10px; background: #fafbfc; flex-wrap: wrap; }
        .tkt-status-label { font-size: .65rem; color: #7a8fa6; font-weight: 700; flex-shrink: 0; }
        .tkt-status-btns { display: flex; gap: 5px; flex-wrap: wrap; }
        .tkt-status-btn { border: 1px solid #e5eaf0; background: #fff; color: #526983; border-radius: 20px; padding: 4px 10px; font: inherit; font-size: .6rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all .15s; }
        .tkt-status-btn:hover:not(:disabled) { border-color: #0875dc; color: #0875dc; }
        .tkt-status-btn.current { font-weight: 800; }
        .tkt-status-btn:disabled:not(.current) { opacity: .5; cursor: not-allowed; }

        /* ── Facility panel ── */
        .tkt-facility-panel { border-bottom: 1px solid #e5eaf0; background: #f8fafc; }
        .tkt-facility-toggle { width: 100%; display: flex; align-items: center; gap: 8px; padding: 10px 22px; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: .7rem; font-weight: 700; color: #073766; text-align: right; }
        .tkt-facility-toggle span { flex: 1; text-align: right; }
        .tkt-facility-toggle strong { color: #0875dc; }
        .tkt-facility-body { padding: 0 22px 14px; }
        .tkt-facility-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-bottom: 14px; }
        .tkt-info-cell { background: #fff; border: 1px solid #e5eaf0; border-radius: 8px; padding: 8px 12px; }
        .tkt-info-label { display: flex; align-items: center; gap: 5px; font-size: .58rem; color: #8b9dad; margin-bottom: 3px; }
        .tkt-info-value { font-size: .7rem; color: #1e3a56; font-weight: 600; }
        .tkt-docs-section { margin-top: 6px; }
        .tkt-docs-title { display: flex; align-items: center; gap: 6px; font-size: .65rem; font-weight: 700; color: #425c76; margin: 0 0 8px; }
        .tkt-docs-list { display: flex; flex-direction: column; gap: 5px; }
        .tkt-doc-row { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5eaf0; border-radius: 8px; padding: 8px 12px; }
        .tkt-doc-name { font-size: .65rem; color: #344d69; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tkt-doc-btn { display: inline-flex; align-items: center; gap: 4px; font-size: .58rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-decoration: none; transition: all .15s; }
        .tkt-doc-view { color: #0875dc; background: #eaf4ff; border: 1px solid #bddcff; }
        .tkt-doc-view:hover { background: #dbeeff; }
        .tkt-doc-download { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .tkt-doc-download:hover { background: #dcfce7; }

        /* ── Messages ── */
        .tkt-messages { padding: 16px 22px; display: flex; flex-direction: column; gap: 14px; min-height: 100px; }
        .tkt-msg { display: flex; gap: 10px; align-items: flex-start; }
        .tkt-msg-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e8f1fb; color: #1758a6; display: grid; place-items: center; font-size: .7rem; font-weight: 800; flex-shrink: 0; }
        .tkt-msg-content { flex: 1; min-width: 0; }
        .tkt-msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .tkt-msg-header strong { font-size: .7rem; color: #1e3a56; }
        .tkt-msg-header small { font-size: .58rem; color: #aab5c3; }
        .tkt-msg-body { background: #f5f8fc; border: 1px solid #e5eaf0; border-radius: 0 10px 10px 10px; padding: 10px 14px; font-size: .72rem; color: #344d69; line-height: 1.6; margin: 0; white-space: pre-wrap; }

        /* ── Reply ── */
        .tkt-quick-replies { padding: 10px 22px; border-top: 1px solid #f0f3f8; display: flex; flex-direction: column; gap: 5px; background: #fafbfc; flex-shrink: 0; }
        .tkt-quick-reply { text-align: right; border: 1px solid #e5eaf0; background: #fff; border-radius: 8px; padding: 8px 12px; font: inherit; font-size: .65rem; color: #344d69; cursor: pointer; transition: all .1s; }
        .tkt-quick-reply:hover { border-color: #0875dc; color: #0875dc; background: #f0f8ff; }
        .tkt-reply-form { display: flex; gap: 8px; align-items: flex-end; padding: 12px 22px; border-top: 1px solid #e5eaf0; background: #fff; flex-shrink: 0; }
        .tkt-reply-input { flex: 1; border: 1px solid #e5eaf0; border-radius: 10px; padding: 10px 14px; font: inherit; font-size: .72rem; color: #344d69; resize: none; background: #f8fafc; line-height: 1.5; }
        .tkt-reply-input:focus { outline: none; border-color: #0875dc; background: #fff; }
        .tkt-send-btn { width: 40px; height: 40px; border-radius: 10px; border: 0; background: #0875dc; color: #fff; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; transition: background .15s; }
        .tkt-send-btn:hover:not(:disabled) { background: #065fb8; }
        .tkt-send-btn:disabled { opacity: .5; cursor: not-allowed; }
        .tkt-empty-detail { min-height: 300px; }

        /* ── Assign / history / internal ── */
        .tkt-new-assign-bar { display: flex; align-items: center; gap: 8px; padding: 8px 22px; border-bottom: 1px solid #f0f3f8; background: #fafbfc; flex-wrap: wrap; }
        .tkt-new-assign-label { font-size: .62rem; color: #7a8fa6; font-weight: 700; flex-shrink: 0; }
        .tkt-new-assign-select { height: 28px; border: 1px solid #e5eaf0; border-radius: 6px; background: #fff; padding: 0 8px; font: inherit; font-size: .62rem; color: #344d69; flex: 1; max-width: 220px; }
        .tkt-new-reply-tools { display: flex; gap: 6px; align-items: center; padding: 8px 22px 4px; background: #fff; direction: rtl; border-top: 1px solid #f0f3f8; flex-shrink: 0; }
        .tkt-new-canned-btn { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #e5eaf0; background: #f5f8fc; color: #526983; border-radius: 6px; padding: 4px 10px; font: inherit; font-size: .62rem; cursor: pointer; transition: all .15s; }
        .tkt-new-canned-btn:hover, .tkt-new-canned-active { border-color: #0875dc !important; color: #0875dc !important; background: #eaf4ff !important; }
        .tkt-new-internal-btn { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #e5eaf0; background: #f5f8fc; color: #526983; border-radius: 6px; padding: 4px 10px; font: inherit; font-size: .62rem; cursor: pointer; transition: all .15s; }
        .tkt-new-internal-btn:hover { border-color: #d97706; color: #d97706; }
        .tkt-new-internal-active { border-color: #d97706 !important; color: #d97706 !important; background: #fef9ee !important; }
        .tkt-new-internal-input { border-color: #fde68a !important; background: #fef9ee !important; }
        .tkt-new-msg-internal { background: #fefce8; border-radius: 8px; padding: 4px 8px; margin: -4px -8px; }
        .tkt-new-msg-internal-body { background: #fef9c3 !important; border-color: #fde047 !important; }
        .tkt-new-internal-badge { display: inline-flex; align-items: center; gap: 3px; font-size: .55rem; color: #d97706; background: #fef9ee; border: 1px solid #fde68a; border-radius: 10px; padding: 1px 5px; font-weight: 700; margin: 0 4px; vertical-align: middle; }
        .tkt-new-history { border-top: 1px solid #f0f3f8; background: #fafbfc; direction: rtl; }
        .tkt-new-history-toggle { width: 100%; display: flex; align-items: center; gap: 7px; padding: 8px 22px; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: .65rem; font-weight: 700; color: #526983; direction: rtl; text-align: right; }
        .tkt-new-history-toggle span { flex: 1; text-align: right; }
        .tkt-new-history-body { padding: 0 22px 12px; display: flex; flex-direction: column; gap: 8px; }
        .tkt-new-history-item { display: flex; align-items: flex-start; gap: 10px; }
        .tkt-new-history-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .tkt-new-dot-create { background: #0875dc; }
        .tkt-new-dot-status { background: #7c3aed; }
        .tkt-new-dot-update { background: #15803d; }
        .tkt-new-history-event { font-size: .65rem; color: #344d69; font-weight: 600; }
        .tkt-new-history-time  { font-size: .58rem; color: #aab5c3; margin-top: 2px; }

        /* ══ tkt-pro-* NEW enhancements ══ */
        .tkt-pro-adv-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 11px; border: 1px solid #e5eaf0; border-radius: 8px; background: #f5f8fc; color: #526983; font: inherit; font-size: .65rem; font-weight: 700; cursor: pointer; transition: all .15s; white-space: nowrap; }
        .tkt-pro-adv-btn:hover, .tkt-pro-adv-active { border-color: #0875dc !important; color: #0875dc !important; background: #eaf4ff !important; }
        .tkt-pro-filter-badge { background: #dc2626; color: #fff; border-radius: 10px; font-size: .52rem; font-weight: 800; padding: 1px 5px; min-width: 16px; text-align: center; line-height: 1.4; }
        .tkt-pro-clear-btn { display: inline-grid; place-items: center; width: 34px; height: 34px; border: 1px solid #fca5a5; border-radius: 8px; background: #fef2f2; color: #dc2626; cursor: pointer; flex-shrink: 0; transition: all .15s; }
        .tkt-pro-clear-btn:hover { background: #fee2e2; }
        .tkt-pro-filter-row { display: flex; gap: 8px; padding: 8px 12px; background: #f5f8fc; border-bottom: 1px solid #e5eaf0; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
        .tkt-pro-filter-sel { flex: 1; min-width: 110px; }
        .tkt-pro-date-group { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e5eaf0; border-radius: 8px; padding: 0 10px; height: 34px; flex: 1; min-width: 190px; }
        .tkt-pro-date-input { border: 0; outline: 0; background: transparent; font: inherit; font-size: .62rem; color: #344d69; height: 100%; min-width: 0; flex: 1; }
        .tkt-pro-results-bar { padding: 5px 12px; background: #eaf4ff; border-bottom: 1px solid #bddcff; font-size: .62rem; color: #0875dc; flex-shrink: 0; }
        .tkt-pro-results-bar strong { font-weight: 800; }
        .tkt-pro-row-badges { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
        .tkt-pro-sla-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .tkt-pro-sla-red    { background: #dc2626; box-shadow: 0 0 5px rgba(220,38,38,.55); }
        .tkt-pro-sla-orange { background: #ea580c; box-shadow: 0 0 5px rgba(234,88,12,.45); }
        .tkt-pro-sla-green  { background: #16a34a; }
        .tkt-pro-age { font-size: .56rem; color: #aab5c3; }
        .tkt-pro-quick-actions { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e5eaf0; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .tkt-pro-quick-label { font-size: .58rem; color: #7a8fa6; font-weight: 700; }
        .tkt-pro-quick-btn { border: 1px solid; border-radius: 12px; padding: 2px 9px; font: inherit; font-size: .56rem; font-weight: 700; cursor: pointer; transition: filter .1s; }
        .tkt-pro-quick-btn:hover { filter: brightness(.93); }
        .tkt-pro-ticket-id { display: inline-flex; align-items: center; gap: 4px; font-size: .58rem; color: #8b9dad; background: #f5f8fc; border: 1px solid #e5eaf0; border-radius: 6px; padding: 2px 7px; margin-bottom: 4px; font-family: monospace; }
        .tkt-pro-detail-scroll { flex: 1; overflow-y: auto; }
        .tkt-pro-sla-panel { padding: 11px 22px; border-bottom: 1px solid #f0f3f8; background: #fafbfc; }
        .tkt-pro-sla-head { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
        .tkt-pro-sla-time { flex: 1; font-size: .62rem; color: #526983; }
        .tkt-pro-sla-pct { font-size: .6rem; font-weight: 800; }
        .tkt-pro-sla-track { height: 5px; border-radius: 5px; background: #e5eaf0; overflow: hidden; margin-bottom: 6px; }
        .tkt-pro-sla-fill { height: 100%; border-radius: 5px; transition: width .4s; }
        .tkt-pro-sla-meta { display: flex; gap: 8px; font-size: .57rem; color: #8b9dad; flex-wrap: wrap; }
        .tkt-pro-client-activity { padding: 11px 22px; border-bottom: 1px solid #f0f3f8; }
        .tkt-pro-ca-title { display: flex; align-items: center; gap: 6px; font-size: .65rem; font-weight: 700; color: #344d69; margin-bottom: 9px; }
        .tkt-pro-ca-row { display: flex; gap: 7px; }
        .tkt-pro-ca-item { flex: 1; background: #f8fafc; border: 1px solid #e5eaf0; border-radius: 8px; padding: 7px 6px; text-align: center; }
        .tkt-pro-ca-num { font-size: 1rem; font-weight: 800; color: #073766; line-height: 1; margin-bottom: 3px; }
        .tkt-pro-ca-label { font-size: .5rem; color: #8b9dad; }

        /* ── Utils ── */
        .spin { animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .tkt-layout { grid-template-columns: 1fr; height: auto; }
          .tkt-detail-col { display: none; }
          .tkt-list-col { height: calc(100vh - 76px); }
        }
      `}</style>
    </main>
  );
}

function InfoCell({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string; value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="tkt-info-cell">
      <div className="tkt-info-label"><Icon size={11} color="#8b9dad" /> {label}</div>
      <div className="tkt-info-value">{value}</div>
    </div>
  );
}
