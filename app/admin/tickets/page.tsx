"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Search, MessageSquare, Check, Send, Loader, Filter,
  Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, Download, ExternalLink, ChevronDown, ChevronUp,
  Hash, Briefcase, Users, Lock, X, Zap, Phone, Mail,
  Paperclip, FileCheck,
} from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseTicketDetails, getTicketRef } from "@/lib/ticket-details";

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminTicket = {
  id: string; title: string; body?: string; description?: string; category: string; priority: string; status: string;
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

const QUICK_REPLIES: { id: string; title: string; body: string }[] = [];

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

function formatDateLabel(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "اليوم";
  if (date.toDateString() === yesterday.toDateString()) return "أمس";
  return date.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function isStaffRoleCheck(role?: string) {
  return ["admin", "manager", "operator"].includes(role || "");
}

const AV_COLORS = [
  ["#dbeafe","#1d4ed8"], ["#dcfce7","#15803d"], ["#fef9c3","#92400e"],
  ["#fce7f3","#9d174d"], ["#ede9fe","#5b21b6"], ["#ffedd5","#c2410c"],
  ["#ccfbf1","#0f766e"], ["#e0f2fe","#0369a1"],
];
function avatarStyle(name?: string): React.CSSProperties {
  if (!name) return {};
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  const [bg, color] = AV_COLORS[h % AV_COLORS.length];
  return { background: bg, color };
}

function avatar(sender: { full_name?: string; avatar_url?: string } | null | undefined, fallbackImg = "") {
  if (sender?.avatar_url) return <img src={sender.avatar_url} alt={sender.full_name || ""} className="tkt3-av-img" />;
  if (fallbackImg) return <img src={fallbackImg} alt="" className="tkt3-av-img" />;
  return (sender?.full_name || "د")[0].toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const { loading: authLoading } = useRoleGuard("operator");
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
  const [focusedRow,       setFocusedRow]       = useState<string | null>(null);
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
  const [currentUserId,    setCurrentUserId]    = useState("");
  const [currentUserAvatar, setCurrentUserAvatar] = useState("");
  const [liveIndicator,    setLiveIndicator]    = useState<"live" | "polling">("polling");
  const [adminPendingFiles, setAdminPendingFiles] = useState<File[]>([]);
  const [adminUploading,   setAdminUploading]   = useState(false);
  const [cannedResponses,  setCannedResponses]  = useState<{ id: string; title: string; body: string }[]>([]);
  const [newCannedBody,    setNewCannedBody]    = useState("");
  const [addingCanned,     setAddingCanned]     = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const adminFileRef = useRef<HTMLInputElement>(null);
  const lastViewRef = useRef<Record<string, number>>({});
  const [unreadTickets, setUnreadTickets] = useState<Set<string>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

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

  // Auto-select ticket from URL ?selected= param
  useEffect(() => {
    if (tickets.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const ticketId = params.get("selected");
      if (ticketId) {
        const match = tickets.find(t => t.id === ticketId);
        if (match) {
          setSelected(match);
          // Clean URL without reload
          window.history.replaceState(null, "", "/admin/tickets");
        }
      }
    } catch {}
  }, [tickets]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { void loadTickets(); }, [statusFilter]);
  useEffect(() => { void loadTeam(); }, []);
  useEffect(() => {
    void fetch("/api/auth/me").then(async r => {
      if (r.ok) { const { data } = await r.json(); setCurrentUserId(data?.id || ""); setCurrentUserAvatar(data?.avatar_url || ""); }
    });
  }, []);

  // Load canned responses
  useEffect(() => {
    fetch("/api/admin/canned-responses").then(async r => {
      if (r.ok) { const d = await r.json(); setCannedResponses(d.data || []); }
    });
  }, []);

  // Poll tickets every 15s
  useEffect(() => {
    if (statusFilter) return; // don't poll when filtered (intentional browsing)
    const iv = setInterval(() => {
      fetch(`/api/admin/tickets`).then(async r => {
        if (r.ok) { const d = await r.json(); setTickets(d.data || []); }
      });
    }, 15000);
    return () => clearInterval(iv);
  }, [statusFilter]);

  // Load messages when ticket selected + poll every 5s
  useEffect(() => {
    if (!selected) return;
    setMessages([]); setSignedUrls([]); setIsInternal(false); setShowHistory(false);
    const loadMsgs = () =>
      fetch(`/api/tickets/${selected.id}/messages`).then(async r => {
        if (r.ok) { setMessages((await r.json()).data || []); }
      });
    loadMsgs();
    generateSignedUrls(selected);
    const iv = setInterval(loadMsgs, 5000);
    setLiveIndicator("live");
    return () => { clearInterval(iv); setLiveIndicator("polling"); };
  }, [selected]);

  // Poll related orders every 10s
  useEffect(() => {
    const clientId = selected?.clients?.id;
    if (!clientId) { setRelatedOrders([]); return; }
    const loadOrders = () =>
      fetch("/api/admin/orders").then(async r => {
        if (!r.ok) return;
        const all = (await r.json()).data ?? [];
        setRelatedOrders(all.filter((o: { clients?: { id: string } | null }) => o.clients?.id === clientId).slice(0, 5).map((o: { id: string; reference_no?: string; status: string; services?: { name?: string } | null }) => ({ id: o.id, reference_no: o.reference_no, status: o.status, service: o.services?.name })) );
      });
    loadOrders();
    const iv = setInterval(loadOrders, 10000);
    return () => clearInterval(iv);
  }, [selected?.clients?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── API ───────────────────────────────────────────────────────────────────

  async function loadTickets() {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/admin/tickets?status=${statusFilter}` : "/api/admin/tickets";
      const res = await fetch(url);
      if (res.ok) { const { data } = await res.json();
        const ticketsData = (data || []) as AdminTicket[];
        setTickets(ticketsData);
        setUnreadTickets(prev => {
          const next = new Set(prev);
          for (const t of ticketsData) {
            if (t.id === selected?.id) continue;
            const lastView = lastViewRef.current[t.id];
            const updatedAt = new Date(t.updated_at).getTime();
            if (lastView && updatedAt > lastView) next.add(t.id);
          }
          return next;
        });
      }
    } catch { /**/ }
    setLoading(false);
  }

  function selectTicket(t: AdminTicket) {
    lastViewRef.current[t.id] = Date.now();
    setUnreadTickets(prev => { const next = new Set(prev); next.delete(t.id); return next; });
    setSelected(t);
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

  async function updateStatus(ticketId: string, status: string, note = "") {
    setUpdating(true);
    try {
      await fetch(`/api/admin/tickets`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId, status, note }) });
      await loadTickets();
      if (selected?.id === ticketId) setSelected(prev => prev ? { ...prev, status } : null);
    } catch { /**/ }
    setUpdating(false);
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() && adminPendingFiles.length === 0 || !selected) return;
    setSending(true);
    const supabase = createSupabaseBrowserClient();
    const uploadedPaths: string[] = [];
    try {
      if (adminPendingFiles.length) {
        setAdminUploading(true);
        for (const file of adminPendingFiles) {
          const ext = file.name.split(".").pop();
          const path = `tickets/${selected.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: ue } = await supabase.storage.from("ticket-attachments").upload(path, file);
          if (!ue) uploadedPaths.push(path);
        }
        setAdminUploading(false);
      }
      await fetch(`/api/tickets/${selected.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: newNote.trim(), is_internal: isInternal, message_type: "admin_reply" }) });
      if (uploadedPaths.length) {
        await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selected.id, files: uploadedPaths }) });
      }
      setNewNote(""); setIsInternal(false); setShowQuickReplies(false); setAdminPendingFiles([]);
      const res = await fetch(`/api/tickets/${selected.id}/messages`);
      if (res.ok) { const { data } = await res.json(); setMessages(data || []); }
      if (uploadedPaths.length) await loadTickets();
    } catch { /**/ }
    setSending(false);
    setAdminUploading(false);
  }

  function clearFilters() {
    setSearch(""); setPriorityFilter(""); setCategoryFilter(""); setAssignedFilter(""); setDateFrom(""); setDateTo(""); setStatusFilter("");
  }

  async function addCannedResponse() {
    if (!newCannedBody.trim()) return;
    setAddingCanned(true);
    try {
      const title = newCannedBody.trim().slice(0, 40) + (newCannedBody.trim().length > 40 ? "..." : "");
      const res = await fetch("/api/admin/canned-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body: newCannedBody.trim() }),
      });
      if (res.ok) {
        setNewCannedBody("");
        const d = await fetch("/api/admin/canned-responses").then(r => r.ok ? r.json() : { data: [] });
        setCannedResponses(d.data || []);
      }
    } catch { /**/ }
    setAddingCanned(false);
  }

  async function deleteCannedResponse(id: string) {
    if (id.startsWith("def-")) {
      setCannedResponses(p => p.filter(r => r.id !== id));
      return;
    }
    await fetch(`/api/admin/canned-responses?id=${id}`, { method: "DELETE" });
    setCannedResponses(p => p.filter(r => r.id !== id));
  }

  function toggleSection(s: "info" | "docs" | "orders") {
    setOpenSection(p => p === s ? null : s);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return <div style={{display:"grid",placeItems:"center",height:"calc(100vh - 76px)"}}><div style={{width:24,height:24,border:"2px solid #e5ecf3",borderTopColor:"#073766",borderRadius:"50%",animation:"spin .6s linear infinite"}} /></div>;

  return (
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
            ) : filtered.map((t, idx) => {
              const sc   = STATUS_CFG[t.status]    || STATUS_CFG["جديدة"];
              const pc   = PRI_CFG[t.priority]     || PRI_CFG["عادية"];
              const sla  = getSLADot(t.updated_at);
              const isSel = selected?.id === t.id;
              const isHov = hoveredRow === t.id;
              const quickSt = STATUS_OPTIONS.filter(s => s !== t.status && s !== "مغلقة").slice(0, 2);
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectTicket(t)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTicket(t); } }}
                  onMouseEnter={() => setHoveredRow(t.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onFocus={() => setFocusedRow(t.id)}
                  onBlur={() => setFocusedRow(null)}
                  className={`tkt3-card${isSel ? " sel" : ""}${t.priority === "عاجلة" ? " urgent" : ""}`}
                  style={{ animationDelay: `${Math.min(idx * 35, 280)}ms` }}
                >
                  {/* Card top */}
                  <div className="tkt3-card-top">
                    <span className="tkt3-card-id">#{t.id.slice(0,8).toUpperCase()}
                      {unreadTickets.has(t.id) && <span className="tkt3-unread-dot" />}
                    </span>
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

                  {/* Hover/focus quick actions */}
                  {(isHov || focusedRow === t.id) && !isSel && (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="tkt3-live" data-state={liveIndicator}>
                      <span className="tkt3-live-dot" />
                      {liveIndicator === "live" ? "مباشر" : "مباشر"}
                    </span>
                    <button onClick={() => setSelected(null)} className="tkt3-close-btn"><X size={15} /></button>
                  </div>
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
                          onClick={() => {
                            if (isCur) return;
                            setPendingStatus(s);
                            setStatusNote("");
                            setShowStatusModal(true);
                          }}
                          disabled={updating}
                          className={`tkt3-st-pill${isCur ? " cur" : ""}`}
                          style={isCur ? { color: sc.color, background: sc.bg, borderColor: sc.border } : {}}>
                          {isCur && <Check size={10} />}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status change modal */}
                {showStatusModal && (
                  <div className="tkt3-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="tkt3-modal tkt3-modal-sm" onClick={e => e.stopPropagation()}>
                      <div className="tkt3-modal-header">
                        <h3>تغيير الحالة إلى: {pendingStatus}</h3>
                        <button className="tkt3-modal-close" onClick={() => setShowStatusModal(false)}><X size={16} /></button>
                      </div>
                      <div className="tkt3-modal-body">
                        <label className="tkt3-label" style={{ marginBottom: 6, display: "block" }}>الملاحظة (اختياري):</label>
                        <textarea
                          value={statusNote}
                          onChange={e => setStatusNote(e.target.value)}
                          placeholder="اذكر سبب تغيير الحالة..."
                          rows={3}
                          className="tkt3-input"
                          style={{ width: "100%", resize: "vertical" }}
                          autoFocus
                        />
                      </div>
                      <div className="tkt3-modal-footer">
                        <button className="tkt3-btn tkt3-btn-ghost" onClick={() => setShowStatusModal(false)}>إلغاء</button>
                        <button className="tkt3-btn tkt3-btn-primary" onClick={async () => {
                          await updateStatus(selected.id, pendingStatus, statusNote);
                          setShowStatusModal(false);
                        }}>تأكيد التغيير</button>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* ── EXTRA FIELDS (description + details) ── */}
                {(() => {
                  const parsed = parseTicketDetails(selected.body || selected.description);
                  const hasContent = parsed.mainDescription || parsed.extraFields.length > 0;
                  if (!hasContent) return null;
                  return (
                    <div style={{ padding: "10px 20px", borderTop: "1px solid #f0f3f8", background: "#fafbfc" }}>
                      {parsed.mainDescription && (
                        <p style={{ margin: "0 0 8px", fontSize: ".68rem", color: "#425c76", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "#fff", borderRadius: 8, padding: "8px 12px", border: "1px solid #e5eaf0" }}>
                          {parsed.mainDescription}
                        </p>
                      )}
                      {parsed.extraFields.length > 0 && (
                        <div>
                          <div style={{ fontSize: ".6rem", fontWeight: 700, color: "#073766", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                            <FileCheck size={12} /> تفاصيل الطلب
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {parsed.extraFields.map((f, i) => (
                              <div key={i} style={{ background: "#fff", borderRadius: 6, padding: "6px 10px", border: "1px solid #e5eaf0", minWidth: 120 }}>
                                <div style={{ fontSize: ".52rem", color: "#8b9dad", fontWeight: 600, marginBottom: 1 }}>{f.label}</div>
                                <div style={{ fontSize: ".65rem", color: "#1e3a56", fontWeight: 700 }}>{f.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* ── MESSAGES ── */}
              <div className="tkt3-msgs">
                {messages.filter(m => !m.message_type || (m.message_type !== "rating" && m.message_type !== "revision" && m.message_type !== "status_change")).length === 0 ? (
                  <div className="tkt3-msgs-empty"><MessageSquare size={28} color="#c0cbd8" /><p>لا توجد رسائل بعد</p></div>
                ) : messages.filter(m => !m.message_type || (m.message_type !== "rating" && m.message_type !== "revision" && m.message_type !== "status_change")).map((msg, idx) => {
                  const isAdmin    = isStaffRoleCheck(msg.sender?.role);
                  const isIntNote  = !!msg.is_internal;
                  const roleLabel: Record<string, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف عمليات", viewer: "مشاهد" };
                  const senderRole = msg.sender?.role && roleLabel[msg.sender.role] ? roleLabel[msg.sender.role] : "";
                  const name       = isAdmin ? `${msg.sender?.full_name || "فريق الدعم"} · ${senderRole}` : (msg.sender?.full_name || "العميل");
                  const msgDate    = new Date(msg.created_at).toLocaleDateString("ar-SA");
                  const prevDate   = idx > 0 ? new Date(messages[idx-1].created_at).toLocaleDateString("ar-SA") : null;
                  const showDateSep = idx === 0 || msgDate !== prevDate;
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSep && (
                        <div className="tkt3-date-sep">
                          <span>{formatDateLabel(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={`tkt3-msg${isAdmin ? " admin" : " client"}${isIntNote ? " internal" : ""}`}>
                          <div className={`tkt3-av ${isAdmin ? "admin-av" : "client-av"}`} style={msg.sender?.avatar_url ? {} : avatarStyle(msg.sender?.full_name)}>{avatar(msg.sender)}</div>
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
                      </div>
                    </React.Fragment>
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
                      {messages.filter(m => m.message_type === "status_change" || m.message_type === "revision" || m.message_type === "rating").map(m => {
                        let dotBg = "#7c3aed";
                        let body = m.body;
                        if (m.message_type === "revision") dotBg = "#b45309";
                        if (m.message_type === "rating") {
                          dotBg = "#f59e0b";
                          try {
                            const p = JSON.parse(m.body);
                            body = `⭐ تقييم ${p.rating}/5 للمشرف ${p.staff_name}${p.comment ? `: ${p.comment}` : ""}`;
                          } catch {}
                        }
                        return (
                        <div key={m.id} className="tkt3-hist-item"><span className="tkt3-hist-dot" style={{ background: dotBg }} /><div><div className="tkt3-hist-ev">{body}</div><div className="tkt3-hist-t">{fmtTime(m.created_at)}</div></div></div>
                        );
                      })}
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
                            {cannedResponses.length === 0 ? (
                              <div className="tkt3-quick-item" style={{ color: "#aab5c3", fontSize: ".6rem" }}>لا توجد ردود جاهزة</div>
                            ) : cannedResponses.map(r => (
                              <div key={r.id} style={{ display: "flex", alignItems: "stretch" }}>
                                <button className="tkt3-quick-item" style={{ flex: 1, textAlign: "right" }} onClick={() => { setNewNote(r.body); setShowQuickReplies(false); }}>
                                  <strong style={{ display: "block", fontSize: ".62rem", marginBottom: 2 }}>{r.title}</strong>
                                  <span style={{ fontSize: ".58rem", color: "#8b9dad", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{r.body}</span>
                                </button>
                                <button onClick={() => deleteCannedResponse(r.id)} className="tkt3-quick-del" title="حذف"><X size={10} /></button>
                              </div>
                            ))}
                            <div style={{ borderTop: "1px solid #e5eaf0", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                              <textarea className="tkt3-canned-ta" placeholder="نص الرد الجاهز" value={newCannedBody} onChange={e => setNewCannedBody(e.target.value)} rows={2} />
                              <button onClick={addCannedResponse} disabled={addingCanned || !newCannedBody.trim()} className="tkt3-canned-add-btn">
                                {addingCanned ? <Loader size={11} className="spin" /> : "+"} إضافة رد
                              </button>
                            </div>
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
                  <div>
                    {adminPendingFiles.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                        {adminPendingFiles.map((f, i) => (
                          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".58rem", background: "#eaf4ff", color: "#0875dc", borderRadius: 6, padding: "2px 7px", border: "1px solid #bddcff" }}>
                            <FileText size={10} /> {f.name}
                            <button type="button" onClick={() => setAdminPendingFiles(prev => prev.filter((_, j) => j !== i))} style={{ border: 0, background: "transparent", color: "#0875dc", cursor: "pointer", padding: 0 }}><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <input ref={adminFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xlsx,.zip" style={{ display: "none" }}
                        onChange={e => { if (e.target.files?.length) setAdminPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ""; }}
                      />
                      <button type="button" onClick={() => adminFileRef.current?.click()} disabled={adminUploading}
                        className="tkt3-tool-btn" style={{ height: 40, flexShrink: 0 }}>
                        <Paperclip size={12} />
                      </button>
                      <textarea
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder={isInternal ? "اكتب ملاحظة داخلية للفريق..." : "اكتب ردك للعميل هنا..."}
                        rows={2}
                        className={`tkt3-textarea${isInternal ? " int-textarea" : ""}`}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendNote(e); } }}
                      />
                      <button type="submit" disabled={(!newNote.trim() && adminPendingFiles.length === 0) || sending || adminUploading} className="tkt3-send-btn">
                        {adminUploading ? <Loader size={16} className="spin" /> : sending ? <Loader size={16} className="spin" /> : <><Send size={15} /><span>إرسال</span></>}
                      </button>
                    </div>
                  </div>
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
              <div className="tkt3-client-av">
                {(selected.clients?.name || selected.profiles?.full_name || "ع")[0]}
              </div>
              <div>
                <div className="tkt3-client-name-lrg">{selected.profiles?.full_name || selected.clients?.name || "—"}</div>
                {selected.clients?.name && selected.profiles?.full_name && (
                  <div className="tkt3-client-sub">{selected.clients.name}</div>
                )}
                {selected.clients?.client_type && (
                  <span className="tkt3-client-type">
                    {selected.clients.client_type === "company" ? "مالك شركة/ مؤسسة" : "فرد"}
                  </span>
                )}
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


  );
}
