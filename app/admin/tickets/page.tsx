"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Search, MessageSquare, Check, Send, Loader, Filter,
  Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, Download, ExternalLink, ChevronDown, ChevronUp,
  Hash, Briefcase, Users, Lock, X, Zap, Phone, Mail,
  Paperclip, FileCheck, CreditCard, UserCircle,
} from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseTicketDetails } from "@/lib/ticket-details";
// CSS loaded via app/admin/layout.tsx

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminTicket = {
  id: string; title: string; body?: string; description?: string; category: string; priority: string; status: string;
  created_at: string; updated_at: string; user_id: string;
  client_id?: string | null; assigned_to?: string | null; files?: string[] | null;
  profiles?: { full_name: string; email: string; avatar_url?: string } | null;
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
  sender?: { full_name: string; role: string; avatar_url?: string } | null;
};

type TeamMember  = { id: string; full_name: string; role: string };
type SignedUrl    = { path: string; url: string; label: string };
type RelatedOrder = { id: string; reference_no?: string; status: string; service?: string };

type ActiveSubscription = {
  id: string; client_id: string; package_id: string; status: string;
  employee_count: number; base_price: number; total_price: number;
  billing_cycle: string; start_date: string; end_date: string | null;
  packages: {
    id: string; title_ar: string; tier_ar: string; category: string;
    billing_cycle: string; price: number; features: string[];
  } | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"];

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  "جديدة":          { color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} /> },
  "قيد المراجعة":   { color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} /> },
  "بانتظار العميل": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertTriangle size={11} /> },
  "تم الحل":        { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} /> },
  "مغلقة":          { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} /> },
};

const PRI_CFG: Record<string, { color: string; bg: string }> = {
  "عاجلة":  { color: "#dc2626", bg: "#fef2f2" },
  "مرتفعة": { color: "#ea580c", bg: "#fff7ed" },
  "عادية":  { color: "#6b7280", bg: "#f9fafb" },
};

const ENTITY_SIZE_LABELS: Record<string, string> = { micro: "متناهي الصغر", small: "صغير", medium: "متوسط", large: "كبير" };
const SCOPE_LABELS:       Record<string, string> = { platinum: "البلاتيني", high_green: "الأخضر العالي", medium_green: "الأخضر المتوسط", low_green: "الأخضر المنخفض", red: "الأحمر" };
const CO_STATUS_LABELS:   Record<string, string> = { active: "نشطة", suspended: "معلقة", struck_off: "مشطوبة" };
const ORDER_STATUS_AR:    Record<string, string> = { new: "جديد", waiting_documents: "بانتظار المستندات", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي", blocked: "معلق" };

const DOC_FIELDS: { field: string; label: string }[] = [
  { field: "commercial_register_doc", label: "السجل التجاري" },
  { field: "company_license_doc",     label: "رخصة المنشأة" },
  { field: "national_id_doc",         label: "بطاقة الهوية" },
  { field: "zakat_tax_doc",           label: "وثيقة الزكاة" },
  { field: "national_address_doc",    label: "العنوان الوطني" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSLADot(updated_at: string) {
  const h = (Date.now() - new Date(updated_at).getTime()) / 3600000;
  if (h > 24) return { color: "#dc2626", label: "متأخر >24س" };
  if (h > 12) return { color: "#ea580c", label: "تحذير >12س" };
  return              { color: "#16a34a", label: "جيد <12س"   };
}

function getSLAPanel(t: AdminTicket) {
  const elapsed   = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
  const target    = t.priority === "عاجلة" ? 4 : t.priority === "مرتفعة" ? 8 : 24;
  const pct       = Math.min(100, (elapsed / target) * 100);
  const remaining = Math.max(0, target - elapsed);
  const color     = pct >= 100 ? "#dc2626" : pct >= 75 ? "#ea580c" : "#16a34a";
  const rLabel    = pct >= 100 ? "تجاوز الـ SLA" : remaining < 1 ? "أقل من ساعة" : `${Math.round(remaining)} ساعة متبقية`;
  return { pct, color, rLabel, overdue: pct >= 100 };
}

function formatAge(d: string) {
  const h = (Date.now() - new Date(d).getTime()) / 3600000;
  if (h < 1) return "أقل من ساعة";
  if (h < 24) return `${Math.floor(h)} ساعة`;
  return `${Math.floor(h / 24)} يوم`;
}

function isToday(d: string) {
  const a = new Date(d), b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(d: string) {
  return new Date(d).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(d: string) {
  const date = new Date(d), today = new Date();
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

function AvatarNode({ sender }: { sender?: { full_name?: string; avatar_url?: string } | null }) {
  if (sender?.avatar_url) return <img src={sender.avatar_url} alt="" className="tkt-av-img" />;
  return <>{(sender?.full_name || "د")[0].toUpperCase()}</>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const { loading: authLoading } = useRoleGuard("operator");

  // ── State ─────────────────────────────────────────────────────────────────
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
  const [subscriptions,    setSubscriptions]    = useState<ActiveSubscription[]>([]);
  const [loadingSub,       setLoadingSub]       = useState(false);
  const [openSection,      setOpenSection]      = useState<"info" | "docs" | "orders" | "subscription" | null>("subscription");
  const [currentUserId,    setCurrentUserId]    = useState("");
  const [currentUserAvatar,setCurrentUserAvatar]= useState("");
  const [liveIndicator,    setLiveIndicator]    = useState<"live" | "polling">("polling");
  const [adminPendingFiles,setAdminPendingFiles]= useState<File[]>([]);
  const [adminUploading,   setAdminUploading]   = useState(false);
  const [cannedResponses,  setCannedResponses]  = useState<{ id: string; title: string; body: string }[]>([]);
  const [newCannedBody,    setNewCannedBody]    = useState("");
  const [addingCanned,     setAddingCanned]     = useState(false);
  const [unreadTickets,    setUnreadTickets]    = useState<Set<string>>(new Set());
  const [showStatusModal,  setShowStatusModal]  = useState(false);
  const [pendingStatus,    setPendingStatus]    = useState("");
  const [statusNote,       setStatusNote]       = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const adminFileRef   = useRef<HTMLInputElement>(null);
  const lastViewRef    = useRef<Record<string, number>>({});

  // ── Derived ───────────────────────────────────────────────────────────────

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
  const detailSLA  = selected && !["تم الحل", "مغلقة"].includes(selected.status) ? getSLAPanel(selected) : null;
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
        if (match) { setSelected(match); window.history.replaceState(null, "", "/admin/tickets"); }
      }
    } catch {}
  }, [tickets]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { void loadTickets(); }, [statusFilter]);
  useEffect(() => { void loadTeam(); }, []);
  useEffect(() => {
    fetch("/api/auth/me").then(async r => {
      if (r.ok) { const { data } = await r.json(); setCurrentUserId(data?.id || ""); setCurrentUserAvatar(data?.avatar_url || ""); }
    });
  }, []);
  useEffect(() => {
    fetch("/api/admin/canned-responses").then(async r => {
      if (r.ok) { const d = await r.json(); setCannedResponses(d.data || []); }
    });
  }, []);
  useEffect(() => {
    if (statusFilter) return;
    const iv = setInterval(() => {
      fetch("/api/admin/tickets").then(async r => { if (r.ok) { const d = await r.json(); setTickets(d.data || []); } });
    }, 15000);
    return () => clearInterval(iv);
  }, [statusFilter]);

  useEffect(() => {
    if (!selected?.clients?.id) { setSubscriptions([]); return; }
    setLoadingSub(true);
    fetch(`/api/client/active-subscription?client_id=${selected.clients.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(res => setSubscriptions(res?.subscriptions || []))
      .catch(() => setSubscriptions([]))
      .finally(() => setLoadingSub(false));
  }, [selected?.clients?.id]);

  useEffect(() => {
    if (!selected) return;
    setMessages([]); setSignedUrls([]); setIsInternal(false); setShowHistory(false);
    const loadMsgs = () => fetch(`/api/tickets/${selected.id}/messages`).then(async r => { if (r.ok) setMessages((await r.json()).data || []); });
    loadMsgs();
    generateSignedUrls(selected);
    const iv = setInterval(loadMsgs, 5000);
    setLiveIndicator("live");
    return () => { clearInterval(iv); setLiveIndicator("polling"); };
  }, [selected]);

  useEffect(() => {
    const clientId = selected?.clients?.id;
    if (!clientId) { setRelatedOrders([]); return; }
    const loadOrders = () => fetch("/api/admin/orders").then(async r => {
      if (!r.ok) return;
      const all = (await r.json()).data ?? [];
      setRelatedOrders(all.filter((o: { clients?: { id: string } | null }) => o.clients?.id === clientId).slice(0, 5).map((o: { id: string; reference_no?: string; status: string; services?: { name?: string } | null }) => ({ id: o.id, reference_no: o.reference_no, status: o.status, service: o.services?.name })));
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
      if (res.ok) {
        const { data } = await res.json();
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
    setOpenSection("subscription");
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
    const { data: clientDocsData } = await supabase.from("client_documents").select("*").eq("client_id", ticket.client_id);
    if (clientDocsData) {
      for (const doc of clientDocsData) {
        const { data } = await supabase.storage.from("client-documents").createSignedUrl(doc.storage_path, 3600);
        if (data?.signedUrl) results.push({ path: doc.storage_path, url: data.signedUrl, label: doc.filename });
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
      await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId, status, note }) });
      await loadTickets();
      if (selected?.id === ticketId) setSelected(prev => prev ? { ...prev, status } : null);
    } catch { /**/ }
    setUpdating(false);
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if ((!newNote.trim() && adminPendingFiles.length === 0) || !selected) return;
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
      const res = await fetch("/api/admin/canned-responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body: newCannedBody.trim() }) });
      if (res.ok) {
        setNewCannedBody("");
        const d = await fetch("/api/admin/canned-responses").then(r => r.ok ? r.json() : { data: [] });
        setCannedResponses(d.data || []);
      }
    } catch { /**/ }
    setAddingCanned(false);
  }

  async function deleteCannedResponse(id: string) {
    if (id.startsWith("def-")) { setCannedResponses(p => p.filter(r => r.id !== id)); return; }
    await fetch(`/api/admin/canned-responses?id=${id}`, { method: "DELETE" });
    setCannedResponses(p => p.filter(r => r.id !== id));
  }

  function toggleSection(s: "info" | "docs" | "orders" | "subscription") {
    setOpenSection(p => p === s ? null : s);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ display: "grid", placeItems: "center", height: "calc(100vh - 76px)" }}>
      <div style={{ width: 24, height: 24, border: "2px solid #e2e8f0", borderTopColor: "#073766", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
    </div>
  );

  const visibleMessages = messages.filter(m => !m.message_type || !["rating","revision","status_change"].includes(m.message_type));
  const historyMessages = messages.filter(m => m.message_type === "status_change" || m.message_type === "revision" || m.message_type === "rating");

  return (
    <div className="tkt-shell">

      {/* ══════════ COL 1: TICKET LIST ══════════ */}
      <aside className="tkt-list">

        {/* Stats */}
        <div className="tkt-stats">
          {[
            { label: "إجمالي",       num: stats.total,         color: "#334155" },
            { label: "عاجلة",        num: stats.urgent,        color: "#dc2626" },
            { label: "جديدة",        num: stats.newCount,      color: "#0875dc" },
            { label: "حُلّت اليوم",  num: stats.resolvedToday, color: "#16a34a" },
          ].map(s => (
            <div key={s.label} className="tkt-stat" style={{ borderTop: `3px solid ${s.color}` }}>
              <span className="tkt-stat-num" style={{ color: s.color }}>{s.num}</span>
              <span className="tkt-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="tkt-search">
          <Search size={14} color="#94a3b8" />
          <input className="tkt-search-inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالعنوان، العميل، المنشأة..." />
          {search && <button onClick={() => setSearch("")} className="tkt-icon-btn"><X size={12} /></button>}
        </div>

        {/* Filters */}
        <div className="tkt-filters">
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="tkt-sel">
            <option value="">الأولوية</option>
            <option value="عاجلة">عاجلة</option>
            <option value="مرتفعة">مرتفعة</option>
            <option value="عادية">عادية</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="tkt-sel">
            <option value="">التصنيف</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowAdvanced(v => !v)} className={`tkt-icon-btn${showAdvanced ? " active" : ""}`} title="فلاتر متقدمة">
            <Filter size={13} />
            {activeFilterCount > 0 && <span className="tkt-badge">{activeFilterCount}</span>}
          </button>
          {(activeFilterCount > 0 || search || priorityFilter) && (
            <button onClick={clearFilters} className="tkt-clear-btn" title="مسح الفلاتر"><X size={12} /></button>
          )}
        </div>

        {/* Advanced */}
        {showAdvanced && (
          <div className="tkt-adv">
            <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="tkt-sel" style={{ flex: 1 }}>
              <option value="">كل المسؤولين</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="tkt-date-inp" />
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="tkt-date-inp" />
          </div>
        )}

        {/* Status tabs */}
        <div className="tkt-tabs">
          {["", "جديدة", "قيد المراجعة", "بانتظار العميل", "تم الحل", "مغلقة"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`tkt-tab${statusFilter === s ? " active" : ""}`}>
              {s || "الكل"}
            </button>
          ))}
        </div>

        {(activeFilterCount > 0 || search || priorityFilter) && (
          <div className="tkt-results"><strong>{filtered.length}</strong> / {tickets.length} تذكرة</div>
        )}

        {/* Cards */}
        <div className="tkt-cards">
          {loading ? (
            <div className="tkt-empty"><Loader size={22} className="spin" /><p>جاري التحميل...</p></div>
          ) : filtered.length === 0 ? (
            <div className="tkt-empty"><MessageSquare size={26} /><p>لا توجد تذاكر</p></div>
          ) : filtered.map((t, idx) => {
            const sc    = STATUS_CFG[t.status]  || STATUS_CFG["جديدة"];
            const pc    = PRI_CFG[t.priority]   || PRI_CFG["عادية"];
            const sla   = getSLADot(t.updated_at);
            const isSel = selected?.id === t.id;
            const isHov = hoveredRow === t.id;
            const quickSt = STATUS_OPTIONS.filter(s => s !== t.status && s !== "مغلقة").slice(0, 2);
            return (
              <div
                key={t.id}
                role="button" tabIndex={0}
                onClick={() => selectTicket(t)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectTicket(t); } }}
                onMouseEnter={() => setHoveredRow(t.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onFocus={() => setFocusedRow(t.id)}
                onBlur={() => setFocusedRow(null)}
                className={`tkt-card${isSel ? " sel" : ""}${t.priority === "عاجلة" ? " urgent" : ""}`}
                style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
              >
                <div className="tkt-card-top">
                  <span className="tkt-card-id">
                    #{t.id.slice(0,8).toUpperCase()}
                    {unreadTickets.has(t.id) && <span className="tkt-unread-dot" />}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span className="tkt-pri-pill" style={{ color: pc.color, background: pc.bg }}>{t.priority}</span>
                    <span className="tkt-sla-dot" style={{ background: sla.color, boxShadow: sla.color !== "#16a34a" ? `0 0 5px ${sla.color}88` : "none" }} title={sla.label} />
                  </div>
                </div>
                <div className="tkt-card-title">{t.title}</div>
                <div className="tkt-card-meta">
                  {t.clients?.name
                    ? <span className="tkt-co-chip"><Building2 size={10} /> {t.clients.name}</span>
                    : <span className="tkt-client-name">{t.profiles?.full_name || "عميل"}</span>
                  }
                  {t.category && <span className="tkt-cat-chip">{t.category}</span>}
                </div>
                <div className="tkt-card-foot">
                  <span className="tkt-status-pill" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
                    {sc.icon} {t.status}
                  </span>
                  <span className="tkt-age">منذ {formatAge(t.created_at)}</span>
                </div>
                {(isHov || focusedRow === t.id) && !isSel && (
                  <div className="tkt-quick" onClick={e => e.stopPropagation()}>
                    <span className="tkt-quick-lbl">نقل:</span>
                    {quickSt.map(s => {
                      const qsc = STATUS_CFG[s];
                      return (
                        <button key={s} onClick={e => { e.stopPropagation(); void updateStatus(t.id, s); }}
                          className="tkt-quick-btn" style={{ color: qsc.color, background: qsc.bg, borderColor: qsc.border }}>
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

      {/* ══════════ COL 2: CHAT ══════════ */}
      <div className="tkt-chat">
        {!selected ? (
          <div className="tkt-chat-empty">
            <div className="tkt-chat-empty-icon"><MessageSquare size={32} color="#c0cbd8" /></div>
            <h3>مركز الدعم الفني</h3>
            <p>اختر تذكرة من القائمة لعرض المحادثة والرد عليها</p>
            <div className="tkt-chat-empty-stats">
              {[
                { n: stats.total,         l: "إجمالي التذاكر",  c: "#073766" },
                { n: stats.urgent,        l: "عاجلة",           c: "#dc2626" },
                { n: stats.newCount,      l: "جديدة",           c: "#0875dc" },
                { n: stats.resolvedToday, l: "حُلّت اليوم",    c: "#16a34a" },
              ].map(s => (
                <div key={s.l} className="tkt-chat-empty-stat">
                  <strong style={{ color: s.c }}>{s.n}</strong>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="tkt-chat-head">
              <div className="tkt-chat-head-top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tkt-ticket-ref">
                    <Hash size={11} />
                    <span style={{ fontFamily: "monospace" }}>{selected.id.slice(0,8).toUpperCase()}</span>
                    <span>·</span>
                    <span>{selected.category}</span>
                    <span>·</span>
                    <span>منذ {formatAge(selected.created_at)}</span>
                  </div>
                  <h2 className="tkt-ticket-title">{selected.title}</h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span className="tkt-live-badge"><span className="tkt-live-dot" /> مباشر</span>
                  <button onClick={() => setSelected(null)} className="tkt-close-btn"><X size={14} /></button>
                </div>
              </div>

              {/* Status */}
              <div className="tkt-status-row">
                <span className="tkt-label">الحالة:</span>
                <div className="tkt-status-pills">
                  {STATUS_OPTIONS.map(s => {
                    const sc = STATUS_CFG[s];
                    const isCur = s === selected.status;
                    return (
                      <button key={s}
                        onClick={() => { if (isCur) return; setPendingStatus(s); setStatusNote(""); setShowStatusModal(true); }}
                        disabled={updating}
                        className={`tkt-st-pill${isCur ? " cur" : ""}`}
                        style={isCur ? { color: sc.color, background: sc.bg, borderColor: sc.border } : {}}>
                        {isCur && <Check size={10} />}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assign */}
              <div className="tkt-assign-row">
                <Users size={13} color="#94a3b8" />
                <span className="tkt-label">المسؤول:</span>
                <select value={selected.assigned_to || ""} onChange={e => assignTicket(e.target.value || null)} className="tkt-assign-sel">
                  <option value="">غير معين</option>
                  {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>

              {/* SLA */}
              {detailSLA && (
                <div className="tkt-sla-row">
                  <Zap size={12} color={detailSLA.color} />
                  <span className="tkt-sla-lbl" style={{ color: detailSLA.color }}>
                    {detailSLA.overdue ? "تجاوز الـ SLA" : "SLA نشط"}
                  </span>
                  <div className="tkt-sla-track">
                    <div className="tkt-sla-fill" style={{ width: `${detailSLA.pct}%`, background: detailSLA.color }} />
                  </div>
                  <span className="tkt-sla-time">{detailSLA.rLabel}</span>
                  <span className="tkt-sla-pct" style={{ color: detailSLA.color }}>{Math.round(detailSLA.pct)}%</span>
                </div>
              )}
            </div>

            {/* Status modal */}
            {showStatusModal && (
              <div className="tkt-overlay" onClick={() => setShowStatusModal(false)}>
                <div className="tkt-modal tkt-modal-sm" onClick={e => e.stopPropagation()}>
                  <div className="tkt-modal-header">
                    <h3>تغيير الحالة إلى: {pendingStatus}</h3>
                    <button className="tkt-modal-close" onClick={() => setShowStatusModal(false)}><X size={16} /></button>
                  </div>
                  <div className="tkt-modal-body">
                    <label className="tkt-label" style={{ display: "block", marginBottom: 6 }}>ملاحظة (اختياري):</label>
                    <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="سبب تغيير الحالة..." rows={3} className="tkt-textarea" style={{ width: "100%", resize: "vertical" }} autoFocus />
                  </div>
                  <div className="tkt-modal-footer">
                    <button className="tkt-btn tkt-btn-ghost" onClick={() => setShowStatusModal(false)}>إلغاء</button>
                    <button className="tkt-btn tkt-btn-primary" onClick={async () => { await updateStatus(selected.id, pendingStatus, statusNote); setShowStatusModal(false); }}>تأكيد</button>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {(() => {
              const parsed = parseTicketDetails(selected.body || selected.description);
              if (!parsed.mainDescription && parsed.extraFields.length === 0) return null;
              return (
                <div className="tkt-desc">
                  {parsed.mainDescription && (
                    <p style={{ margin: "0 0 8px", fontSize: ".68rem", color: "#425c76", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>
                      {parsed.mainDescription}
                    </p>
                  )}
                  {parsed.extraFields.length > 0 && (
                    <div>
                      <div style={{ fontSize: ".58rem", fontWeight: 700, color: "#073766", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                        <FileCheck size={11} /> تفاصيل الطلب
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {parsed.extraFields.map((f, i) => (
                          <div key={i} style={{ background: "#fff", borderRadius: 7, padding: "6px 10px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: ".5rem", color: "#94a3b8", fontWeight: 600, marginBottom: 1 }}>{f.label}</div>
                            <div style={{ fontSize: ".64rem", color: "#1e3a56", fontWeight: 700 }}>{f.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Messages */}
            <div className="tkt-msgs">
              {visibleMessages.length === 0 ? (
                <div className="tkt-msgs-empty"><MessageSquare size={28} color="#c0cbd8" /><p>لا توجد رسائل بعد</p></div>
              ) : visibleMessages.map((msg, idx) => {
                const isAdmin   = isStaffRoleCheck(msg.sender?.role);
                const isIntNote = !!msg.is_internal;
                const roleLabel: Record<string, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف عمليات", viewer: "مشاهد" };
                const name = isAdmin ? `${msg.sender?.full_name || "فريق الدعم"}${msg.sender?.role ? ` · ${roleLabel[msg.sender.role] || ""}` : ""}` : (msg.sender?.full_name || "العميل");
                const msgDate  = new Date(msg.created_at).toLocaleDateString("ar-SA");
                const prevDate = idx > 0 ? new Date(visibleMessages[idx-1].created_at).toLocaleDateString("ar-SA") : null;
                return (
                  <React.Fragment key={msg.id}>
                    {(idx === 0 || msgDate !== prevDate) && (
                      <div className="tkt-date-sep"><span>{formatDateLabel(msg.created_at)}</span></div>
                    )}
                    <div className={`tkt-msg${isAdmin ? " admin" : " client"}${isIntNote ? " internal" : ""}`}>
                      <div className={`tkt-av ${isAdmin ? "admin-av" : "client-av"}`} style={msg.sender?.avatar_url ? {} : avatarStyle(msg.sender?.full_name)}>
                        <AvatarNode sender={msg.sender} />
                      </div>
                      <div className="tkt-msg-body">
                        <div className="tkt-msg-meta">
                          {isIntNote && <span className="tkt-int-tag"><Lock size={9} /> داخلية</span>}
                          <strong>{name}</strong>
                          <small>{fmtTime(msg.created_at)}</small>
                        </div>
                        <div className={`tkt-bubble${isAdmin ? " admin-bubble" : " client-bubble"}`}>{msg.body}</div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* History */}
              <div className="tkt-history">
                <button className="tkt-history-toggle" onClick={() => setShowHistory(v => !v)}>
                  <Clock size={11} /> سجل التذكرة {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {showHistory && (
                  <div className="tkt-history-body">
                    <div className="tkt-hist-item"><span className="tkt-hist-dot" style={{ background: "#0875dc" }} /><div><div className="tkt-hist-ev">تم إنشاء التذكرة</div><div className="tkt-hist-t">{new Date(selected.created_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div></div>
                    {historyMessages.map(m => {
                      let dotBg = "#7c3aed", body = m.body;
                      if (m.message_type === "revision") dotBg = "#b45309";
                      if (m.message_type === "rating") {
                        dotBg = "#f59e0b";
                        try { const p = JSON.parse(m.body); body = `⭐ تقييم ${p.rating}/5 للمشرف ${p.staff_name}${p.comment ? `: ${p.comment}` : ""}`; } catch {}
                      }
                      return <div key={m.id} className="tkt-hist-item"><span className="tkt-hist-dot" style={{ background: dotBg }} /><div><div className="tkt-hist-ev">{body}</div><div className="tkt-hist-t">{fmtTime(m.created_at)}</div></div></div>;
                    })}
                    <div className="tkt-hist-item"><span className="tkt-hist-dot" style={{ background: "#15803d" }} /><div><div className="tkt-hist-ev">آخر تحديث</div><div className="tkt-hist-t">{new Date(selected.updated_at).toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div></div>
                  </div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </div>

            {/* Reply Area */}
            <div className="tkt-reply">
              <div className="tkt-reply-tools">
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowQuickReplies(v => !v)} className={`tkt-tool-btn${showQuickReplies ? " active" : ""}`}>
                    <Filter size={12} /> ردود جاهزة <ChevronDown size={11} />
                  </button>
                  {showQuickReplies && (
                    <div className="tkt-quick-menu">
                      {cannedResponses.length === 0 ? (
                        <div className="tkt-quick-item" style={{ color: "#94a3b8", fontSize: ".6rem" }}>لا توجد ردود جاهزة</div>
                      ) : cannedResponses.map(r => (
                        <div key={r.id} style={{ display: "flex", alignItems: "stretch" }}>
                          <button className="tkt-quick-item" style={{ flex: 1, textAlign: "right" }} onClick={() => { setNewNote(r.body); setShowQuickReplies(false); }}>
                            <strong style={{ display: "block", fontSize: ".62rem", marginBottom: 2 }}>{r.title}</strong>
                            <span style={{ fontSize: ".58rem", color: "#8b9dad", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{r.body}</span>
                          </button>
                          <button onClick={() => deleteCannedResponse(r.id)} className="tkt-quick-del" title="حذف"><X size={10} /></button>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid #e2e8f0", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        <textarea className="tkt-canned-ta" placeholder="نص الرد الجاهز..." value={newCannedBody} onChange={e => setNewCannedBody(e.target.value)} rows={2} />
                        <button onClick={addCannedResponse} disabled={addingCanned || !newCannedBody.trim()} className="tkt-canned-add-btn">
                          {addingCanned ? <Loader size={11} className="spin" /> : "+"} إضافة رد
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="tkt-reply-toggle">
                  <button onClick={() => setIsInternal(false)} className={`tkt-tog${!isInternal ? " tog-active-blue" : ""}`}>رد للعميل</button>
                  <button onClick={() => setIsInternal(true)}  className={`tkt-tog${isInternal ? " tog-active-amber" : ""}`}><Lock size={11} /> داخلية</button>
                </div>
              </div>

              <form onSubmit={sendNote} className="tkt-reply-form">
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
                  <button type="button" onClick={() => adminFileRef.current?.click()} disabled={adminUploading} className="tkt-tool-btn" style={{ height: 40, flexShrink: 0 }}>
                    <Paperclip size={12} />
                  </button>
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder={isInternal ? "اكتب ملاحظة داخلية للفريق..." : "اكتب ردك للعميل هنا..."}
                    rows={2}
                    className={`tkt-textarea${isInternal ? " int-textarea" : ""}`}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendNote(e); } }}
                  />
                  <button type="submit" disabled={(!newNote.trim() && adminPendingFiles.length === 0) || sending || adminUploading} className="tkt-send-btn">
                    {(sending || adminUploading) ? <Loader size={16} className="spin" /> : <><Send size={15} /><span>إرسال</span></>}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ══════════ COL 3: CLIENT PANEL ══════════ */}
      <div className="tkt-panel">
        {!selected ? (
          <div className="tkt-panel-empty">
            <UserCircle size={40} color="#cbd5e1" />
            <p>اختر تذكرة لعرض<br />بيانات العميل</p>
          </div>
        ) : (
          <>
            {/* Client Header */}
            {selected.clients ? (
              <div className="tkt-cl-head">
                <div className="tkt-cl-av">
                  {(selected.clients.name || "ع")[0]}
                </div>
                <div className="tkt-cl-name">{selected.profiles?.full_name || selected.clients.name}</div>
                {selected.profiles?.full_name && selected.clients.name && (
                  <div className="tkt-cl-company">{selected.clients.name}</div>
                )}
                <div>
                  <span className="tkt-cl-status-badge" style={{
                    background: selected.clients.company_status === "active" ? "rgba(22,163,74,.25)" : "rgba(220,38,38,.25)",
                    color: selected.clients.company_status === "active" ? "#bbf7d0" : "#fecaca",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                    {CO_STATUS_LABELS[selected.clients.company_status || ""] || "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="tkt-cl-head">
                <div className="tkt-cl-av"><UserCircle size={28} color="rgba(255,255,255,.7)" /></div>
                <div className="tkt-cl-name">{selected.profiles?.full_name || "مستخدم"}</div>
                <div className="tkt-cl-company">{selected.profiles?.email || ""}</div>
              </div>
            )}

            {/* Contact info */}
            {(selected.clients?.phone || selected.clients?.email || selected.profiles?.email) && (
              <div className="tkt-cl-contact">
                {selected.clients?.phone && (
                  <a href={`tel:${selected.clients.phone}`} className="tkt-cl-contact-item">
                    <Phone size={13} color="#0875dc" />
                    <span>{selected.clients.phone}</span>
                  </a>
                )}
                {(selected.clients?.email || selected.profiles?.email) && (
                  <a href={`mailto:${selected.clients?.email || selected.profiles?.email}`} className="tkt-cl-contact-item">
                    <Mail size={13} color="#7c3aed" />
                    <span>{selected.clients?.email || selected.profiles?.email}</span>
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="tkt-cl-stats">
              <div className="tkt-cl-stat">
                <strong style={{ color: "#073766" }}>{clientTicketCount}</strong>
                <span>إجمالي التذاكر</span>
              </div>
              <div className="tkt-cl-stat">
                <strong style={{ color: "#16a34a" }}>{clientResolvedCount}</strong>
                <span>تم حلها</span>
              </div>
            </div>

            {/* ── Active Subscriptions ── */}
            <div className="tkt-sec">
              <button className="tkt-sec-head" onClick={() => toggleSection("subscription")}>
                <CreditCard size={14} color="#16a34a" />
                <span className="tkt-sec-title">الباقات النشطة</span>
                {loadingSub
                  ? <Loader size={11} className="spin" />
                  : subscriptions.length > 0
                    ? <span className="tkt-sec-badge" style={{ background: "#f0fdf4", color: "#16a34a" }}>{subscriptions.length}</span>
                    : null
                }
                {openSection === "subscription" ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
              </button>
              {openSection === "subscription" && (
                <div className="tkt-sec-body">
                  {loadingSub ? (
                    <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8", fontSize: ".62rem" }}>جاري التحميل...</div>
                  ) : subscriptions.length > 0 ? subscriptions.map(sub => (
                    <div key={sub.id} className="tkt-sub-card">
                      <div className="tkt-sub-tier">{sub.packages?.tier_ar || sub.packages?.category || "—"}</div>
                      <div className="tkt-sub-name">{sub.packages?.title_ar || "باقة نشطة"}</div>
                      <div className="tkt-sub-price-row">
                        <div>
                          <div className="tkt-sub-price">{sub.total_price.toLocaleString("ar-SA")} ر.س</div>
                          <div className="tkt-sub-cycle">{sub.billing_cycle === "monthly" ? "شهرياً" : sub.billing_cycle === "yearly" ? "سنوياً" : sub.billing_cycle}</div>
                        </div>
                        {sub.employee_count > 0 && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: ".9rem", fontWeight: 900 }}>{sub.employee_count}</div>
                            <div style={{ fontSize: ".5rem", opacity: .7 }}>موظف</div>
                          </div>
                        )}
                      </div>
                      <div className="tkt-sub-dates">
                        <span>بداية: {sub.start_date}</span>
                        <span>{sub.end_date ? `نهاية: ${sub.end_date}` : "مستمر"}</span>
                      </div>
                      {sub.packages?.features && sub.packages.features.length > 0 && (
                        <div className="tkt-sub-features">
                          {sub.packages.features.slice(0, 3).map((f, i) => (
                            <div key={i} className="tkt-sub-feat"><CheckCircle size={9} /> {f}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div style={{ fontSize: ".62rem", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>لا توجد باقات نشطة</div>
                  )}
                </div>
              )}
            </div>

            {/* ── Company Info ── */}
            {selected.clients && (
              <div className="tkt-sec">
                <button className="tkt-sec-head" onClick={() => toggleSection("info")}>
                  <Building2 size={14} color="#0875dc" />
                  <span className="tkt-sec-title">بيانات المنشأة</span>
                  {openSection === "info" ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
                </button>
                {openSection === "info" && (
                  <div className="tkt-sec-body">
                    <div className="tkt-info-grid">
                      {[
                        { label: "الرقم الضريبي",  value: selected.clients.tax_number },
                        { label: "السجل التجاري",  value: selected.clients.commercial_number },
                        { label: "المدينة",         value: selected.clients.city },
                        { label: "النشاط",          value: selected.clients.company_activity },
                        { label: "حجم الكيان",      value: selected.clients.entity_size ? ENTITY_SIZE_LABELS[selected.clients.entity_size] : null },
                        { label: "النطاق",          value: selected.clients.company_scope ? SCOPE_LABELS[selected.clients.company_scope] : null },
                        { label: "الموظفون",        value: selected.clients.employee_count != null ? String(selected.clients.employee_count) : null },
                        { label: "العنوان",         value: selected.clients.company_address },
                      ].filter(r => r.value).map(r => (
                        <div key={r.label} className="tkt-info-cell">
                          <div className="tkt-info-lbl">{r.label}</div>
                          <div className="tkt-info-val">{r.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Documents ── */}
            <div className="tkt-sec">
              <button className="tkt-sec-head" onClick={() => toggleSection("docs")}>
                <FileText size={14} color="#7c3aed" />
                <span className="tkt-sec-title">المستندات</span>
                {loadingUrls
                  ? <Loader size={11} className="spin" />
                  : <span className="tkt-sec-badge" style={{ background: "#f5f3ff", color: "#7c3aed" }}>{signedUrls.length}</span>
                }
                {openSection === "docs" ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
              </button>
              {openSection === "docs" && (
                <div className="tkt-sec-body">
                  {signedUrls.length === 0 ? (
                    <div style={{ fontSize: ".62rem", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>لا توجد مستندات</div>
                  ) : (
                    <>
                      {clientDocs.length > 0 && (
                        <>
                          <div style={{ fontSize: ".56rem", color: "#7a8fa6", fontWeight: 700, marginBottom: 6 }}>مستندات المنشأة</div>
                          {clientDocs.map((doc, i) => (
                            <div key={i} className="tkt-doc-item">
                              <FileText size={12} color="#7c3aed" />
                              <span className="tkt-doc-label">{doc.label}</span>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tkt-doc-btn" style={{ color: "#0875dc", background: "#eaf4ff", borderColor: "#bddcff" }}><ExternalLink size={10} /></a>
                              <a href={doc.url} download className="tkt-doc-btn" style={{ color: "#15803d", background: "#f0fdf4", borderColor: "#bbf7d0" }}><Download size={10} /></a>
                            </div>
                          ))}
                        </>
                      )}
                      {ticketAttachments.length > 0 && (
                        <>
                          <div style={{ fontSize: ".56rem", color: "#7a8fa6", fontWeight: 700, marginBottom: 6, marginTop: 10 }}>مرفقات التذكرة</div>
                          {ticketAttachments.map((doc, i) => (
                            <div key={i} className="tkt-doc-item">
                              <Paperclip size={12} color="#64748b" />
                              <span className="tkt-doc-label">{doc.label.replace("مرفق: ", "")}</span>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tkt-doc-btn" style={{ color: "#0875dc", background: "#eaf4ff", borderColor: "#bddcff" }}><ExternalLink size={10} /></a>
                              <a href={doc.url} download className="tkt-doc-btn" style={{ color: "#15803d", background: "#f0fdf4", borderColor: "#bbf7d0" }}><Download size={10} /></a>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Related Orders ── */}
            <div className="tkt-sec">
              <button className="tkt-sec-head" onClick={() => toggleSection("orders")}>
                <Briefcase size={14} color="#ea580c" />
                <span className="tkt-sec-title">الطلبات المرتبطة</span>
                {relatedOrders.length > 0 && (
                  <span className="tkt-sec-badge" style={{ background: "#fff7ed", color: "#ea580c" }}>{relatedOrders.length}</span>
                )}
                {openSection === "orders" ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
              </button>
              {openSection === "orders" && (
                <div className="tkt-sec-body">
                  {relatedOrders.length === 0 ? (
                    <div style={{ fontSize: ".62rem", color: "#94a3b8", textAlign: "center", padding: "10px 0" }}>لا توجد طلبات مرتبطة</div>
                  ) : (
                    <>
                      {relatedOrders.map(o => (
                        <a key={o.id} href="/admin/orders" className="tkt-order-item">
                          <div>
                            <div className="tkt-order-ref">{o.reference_no || o.id.slice(0,8).toUpperCase()}</div>
                            {o.service && <div className="tkt-order-svc">{o.service}</div>}
                          </div>
                          <span className="tkt-order-st" style={{ background: "#eaf4ff", color: "#0875dc" }}>
                            {ORDER_STATUS_AR[o.status] ?? o.status}
                          </span>
                        </a>
                      ))}
                      <a href="/admin/orders" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: ".6rem", color: "#0875dc", fontWeight: 600, textDecoration: "none" }}>
                        عرض كل الطلبات <ExternalLink size={10} />
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>

          </>
        )}
      </div>

    </div>
  );
}
