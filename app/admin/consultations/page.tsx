"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatAppDate, formatAppDateTime, formatAppFullDateTime, formatAppRelativeTime, fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  AlertTriangle, ArrowDownUp, Building2, Calendar, CalendarCheck2,
  CalendarClock, CheckCircle2, ChevronLeft, Clock, DollarSign,
  ExternalLink, Link2, Loader2, Mail, MapPin, MessageSquare, PenLine,
  Phone, RefreshCw, Search, Send, Sparkles, User, UserCheck, Video, X,
} from "lucide-react";

type Consultation = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  consultation_method: string | null;
  consultation_phone: string | null;
  consultation_scheduled_at: string | null;
  consultation_meeting_link: string | null;
  consultation_price: number | null;
  consultation_status: string | null;
  clients: { id: string; name: string; client_type: string; phone?: string; email?: string; city?: string } | null;
  profiles: { full_name: string; email: string } | null;
};

type TeamMember = { id: string; full_name: string; role: string };
type Notice = { msg: string; type: "ok" | "err" };
type QueueFilter = "all" | "needsScheduling" | "today" | "upcoming" | "unassigned";

const METHOD_META: Record<string, { label: string; short: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  phone:     { label: "مكالمة هاتفية", short: "هاتف", icon: Phone,   color: "#0875dc", bg: "#eaf4ff", border: "#bddcff" },
  zoom:      { label: "اتصال مرئي",    short: "مرئي", icon: Video,   color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
  in_person: { label: "حضوري",         short: "حضوري", icon: MapPin, color: "#b45309", bg: "#fef9ee", border: "#fde68a" },
  written:   { label: "كتابياً",       short: "كتابي", icon: PenLine, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "جديد":   { label: "جديد",   color: "#0875dc", bg: "#eaf4ff", border: "#bfdbfe" },
  "مجدولة": { label: "مجدولة", color: "#b45309", bg: "#fef9ee", border: "#fde68a" },
  "منجزة":  { label: "منجزة",  color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  "ملغاة":  { label: "ملغاة",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

const STATUS_ORDER = ["جديد", "مجدولة", "منجزة", "ملغاة"];
const ROLE_LABEL: Record<string, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف" };

const queueFilters: Array<{ key: QueueFilter; label: string; icon: React.ElementType }> = [
  { key: "all", label: "كل الاستشارات", icon: CalendarClock },
  { key: "needsScheduling", label: "تحتاج جدولة", icon: AlertTriangle },
  { key: "today", label: "اليوم", icon: CalendarCheck2 },
  { key: "upcoming", label: "القادمة", icon: Clock },
  { key: "unassigned", label: "غير مسندة", icon: UserCheck },
];

function statusOf(item: Consultation) {
  return item.consultation_status || "جديد";
}

function methodOf(item: Consultation) {
  return item.consultation_method || "phone";
}

function isToday(date: string | null) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isUpcoming(date: string | null) {
  return Boolean(date && new Date(date).getTime() > Date.now() && !isToday(date));
}

function isOverdue(item: Consultation) {
  return Boolean(item.consultation_scheduled_at && new Date(item.consultation_scheduled_at).getTime() < Date.now() && !["منجزة", "ملغاة"].includes(statusOf(item)));
}

function initials(name?: string) {
  return (name || "؟").trim().slice(0, 2);
}

const inputStyle: React.CSSProperties = {
  height: 42,
  border: "1.5px solid #dfe8f1",
  borderRadius: 10,
  padding: "0 12px",
  font: "inherit",
  fontSize: ".73rem",
  color: "#173d65",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  colorScheme: "light",
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META["جديد"];
  return (
    <span className="consult-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
      {meta.label}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const meta = METHOD_META[method] || METHOD_META.phone;
  const Icon = meta.icon;
  return (
    <span className="consult-method" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
      <Icon size={12} /> {meta.short}
    </span>
  );
}

export default function ConsultationsPage() {
  const { loading } = useRoleGuard("operator");
  const [items, setItems] = useState<Consultation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sortNewest, setSortNewest] = useState(true);

  const [editStatus, setEditStatus] = useState("جديد");
  const [editMethod, setEditMethod] = useState("phone");
  const [editScheduled, setEditScheduled] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editAssigned, setEditAssigned] = useState("");

  async function load(keepSelectedId?: string) {
    setDataLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/consultations", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error || "تعذر تحميل الاستشارات");
        return;
      }
      const nextItems = (json.data || []) as Consultation[];
      setItems(nextItems);
      setTeamMembers(json.teamMembers || []);
      const id = keepSelectedId || selected?.id;
      if (id) {
        const fresh = nextItems.find(item => item.id === id);
        if (fresh) openItem(fresh);
      }
    } catch {
      setLoadError("تعذر الاتصال بالخادم");
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openItem(c: Consultation) {
    setSelected(c);
    setEditStatus(statusOf(c));
    setEditMethod(methodOf(c));
    setEditScheduled(toDateTimeLocalValue(c.consultation_scheduled_at));
    setEditLink(c.consultation_meeting_link || "");
    setEditPrice(c.consultation_price != null ? String(c.consultation_price) : "");
    setEditNote("");
    setEditAssigned(c.assigned_to || "");
  }

  async function saveChanges() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          assigned_to: editAssigned || null,
          consultation_status: editStatus,
          consultation_method: editMethod,
          consultation_scheduled_at: fromDateTimeLocalValue(editScheduled),
          consultation_meeting_link: editLink || null,
          consultation_price: editPrice ? Number(editPrice) : null,
          note: editNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ msg: json.error || "تعذر الحفظ", type: "err" });
        return;
      }
      await load(selected.id);
      setNotice({ msg: "تم حفظ الاستشارة وإرسال التحديث للعميل", type: "ok" });
      setTimeout(() => setNotice(null), 2600);
    } catch {
      setNotice({ msg: "تعذر الاتصال بالخادم", type: "err" });
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const base: Record<string, number> = { "جديد": 0, "مجدولة": 0, "منجزة": 0, "ملغاة": 0 };
    for (const item of items) base[statusOf(item)] = (base[statusOf(item)] || 0) + 1;
    return {
      statuses: base,
      needsScheduling: items.filter(item => statusOf(item) === "جديد" || !item.consultation_scheduled_at).length,
      today: items.filter(item => isToday(item.consultation_scheduled_at)).length,
      unassigned: items.filter(item => !item.assigned_to).length,
      overdue: items.filter(isOverdue).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter(item => filter === "الكل" || statusOf(item) === filter)
      .filter(item => {
        if (queueFilter === "needsScheduling") return statusOf(item) === "جديد" || !item.consultation_scheduled_at;
        if (queueFilter === "today") return isToday(item.consultation_scheduled_at);
        if (queueFilter === "upcoming") return isUpcoming(item.consultation_scheduled_at);
        if (queueFilter === "unassigned") return !item.assigned_to;
        return true;
      })
      .filter(item => {
        if (!term) return true;
        return [
          item.title,
          item.description || "",
          item.clients?.name || "",
          item.clients?.phone || "",
          item.clients?.email || "",
          item.profiles?.full_name || "",
          item.profiles?.email || "",
        ].some(value => value.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        const aDate = new Date(a.consultation_scheduled_at || a.created_at).getTime();
        const bDate = new Date(b.consultation_scheduled_at || b.created_at).getTime();
        return sortNewest ? bDate - aDate : aDate - bDate;
      });
  }, [filter, items, queueFilter, search, sortNewest]);

  const selectedMethod = selected ? METHOD_META[methodOf(selected)] || METHOD_META.phone : METHOD_META.phone;
  const selectedAssignee = selected ? teamMembers.find(member => member.id === selected.assigned_to) : null;
  const selectedClientName = selected?.clients?.name || selected?.profiles?.full_name || "عميل غير محدد";
  const canSave = Boolean(selected) && !saving;

  if (loading || (dataLoading && items.length === 0)) {
    return (
      <div
        className="consult-loading"
        dir="rtl"
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "grid",
          placeItems: "center",
          background: "#f4f7fb",
          color: "#61748a",
          padding: 24,
        }}
      >
        <div style={{
          minWidth: 240,
          border: "1px solid #dfe8f1",
          borderRadius: 14,
          background: "#fff",
          boxShadow: "0 10px 30px rgba(7,55,102,.08)",
          padding: "22px 24px",
          display: "grid",
          justifyItems: "center",
          gap: 10,
          fontSize: ".74rem",
          fontWeight: 800,
        }}>
          <Loader2 size={24} style={{ animation: "spin .7s linear infinite", color: "#0875dc" }} />
          <span>جاري تحميل الاستشارات...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="consult-admin" dir="rtl">
      <style>{`
        .consult-admin{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;overflow:hidden;background:#f4f7fb;color:#173d65}
        .consult-head{padding:22px 24px 16px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff)}
        .consult-head-main{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px}
        .consult-eyebrow{margin:0 0 4px;color:#168d80;font-size:.66rem;font-weight:900}
        .consult-head h1{margin:0 0 5px;font-size:1.55rem;color:#073766;letter-spacing:0}
        .consult-head p{margin:0;color:#7f8e9f;font-size:.72rem}
        .consult-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .consult-action-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer;text-decoration:none}
        .consult-action-btn.primary{background:#073766;border-color:#073766;color:#fff}
        .consult-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px}
        .consult-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:12px;padding:13px 14px;display:flex;align-items:center;gap:10px;min-width:0}
        .consult-kpi-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
        .consult-kpi small,.consult-kpi strong{display:block}
        .consult-kpi small{font-size:.56rem;color:#8190a1;font-weight:700}
        .consult-kpi strong{font-size:1.25rem;color:#073766;line-height:1;margin-top:4px}
        .consult-workspace{min-height:0;display:grid;grid-template-columns:minmax(420px,520px) minmax(0,1fr);gap:14px;padding:14px 16px 18px}
        .consult-panel{min-height:0;background:#fff;border:1px solid #dfe8f1;border-radius:14px;box-shadow:0 6px 24px rgba(7,55,102,.05);overflow:hidden}
        .consult-list-panel{display:grid;grid-template-rows:auto 1fr}
        .consult-toolbar{padding:14px;border-bottom:1px solid #edf2f7;background:#fff}
        .consult-tabs{display:flex;gap:6px;overflow:auto;padding-bottom:2px;margin-bottom:12px;scrollbar-width:none}
        .consult-tabs button{height:34px;border:1px solid #dfe8f1;border-radius:9px;background:#f8fafc;color:#65788c;padding:0 11px;font:inherit;font-size:.61rem;font-weight:800;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .consult-tabs button.active{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .consult-tools{display:grid;grid-template-columns:1fr auto;gap:8px}
        .consult-search{height:38px;border:1px solid #dfe8f1;border-radius:10px;background:#f8fafc;display:flex;align-items:center;gap:8px;padding:0 11px;color:#8b9dad}
        .consult-search input{border:0;outline:0;background:transparent;font:inherit;font-size:.68rem;width:100%;color:#173d65}
        .consult-sort{height:38px;border:1px solid #dfe8f1;border-radius:10px;background:#fff;color:#536a82;padding:0 11px;font:inherit;font-size:.62rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .consult-status-row{display:flex;gap:6px;overflow:auto;margin-top:10px;scrollbar-width:none}
        .consult-status-row button{height:32px;border:1px solid #dfe8f1;border-radius:999px;background:#fff;color:#65788c;padding:0 10px;font:inherit;font-size:.59rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
        .consult-status-row button.active{color:#073766;background:#f0f7ff;border-color:#bddcff}
        .consult-list{min-height:0;overflow:auto;padding:10px;background:#f8fafc}
        .consult-card{width:100%;border:1px solid #dfe8f1;border-radius:12px;background:#fff;padding:12px;text-align:right;cursor:pointer;margin-bottom:9px;transition:border-color .15s,box-shadow .15s,transform .15s,background .15s}
        .consult-card:hover{border-color:#bddcff;box-shadow:0 8px 24px rgba(8,117,220,.08);transform:translateY(-1px)}
        .consult-card.active{border-color:#0875dc;background:#f0f8ff;box-shadow:0 8px 24px rgba(8,117,220,.1)}
        .consult-card.overdue{border-right:4px solid #dc2626}
        .consult-card-top{display:flex;gap:10px;align-items:flex-start}
        .consult-avatar{width:38px;height:38px;border-radius:11px;background:#eaf4ff;color:#0875dc;display:grid;place-items:center;font-size:.72rem;font-weight:900;flex-shrink:0}
        .consult-card-body{flex:1;min-width:0}
        .consult-card h2{margin:0 0 6px;font-size:.76rem;line-height:1.45;color:#173d65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .consult-card-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:#7f8e9f;font-size:.58rem}
        .consult-card-meta span{display:inline-flex;align-items:center;gap:4px;min-width:0}
        .consult-card-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
        .consult-badges{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .consult-badge,.consult-method{display:inline-flex;align-items:center;gap:4px;border:1px solid;border-radius:999px;padding:3px 8px;font-size:.55rem;font-weight:900;white-space:nowrap}
        .consult-time{font-size:.56rem;color:#6f8193;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
        .consult-empty{height:100%;display:grid;place-items:center;text-align:center;color:#8b9dad;padding:30px}
        .consult-empty div{display:grid;gap:8px;justify-items:center}
        .consult-detail{min-height:0;display:grid;grid-template-rows:auto 1fr auto;background:#fff}
        .consult-detail-head{padding:18px 20px 16px;border-bottom:1px solid #edf2f7;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;background:linear-gradient(180deg,#fff,#fbfdff)}
        .consult-detail-title{display:flex;align-items:flex-start;gap:12px;min-width:0}
        .consult-detail-icon{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
        .consult-detail h2{margin:0 0 7px;font-size:1rem;line-height:1.45;color:#073766}
        .consult-detail-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.61rem;color:#7f8e9f}
        .consult-detail-meta span,.consult-detail-meta a{display:inline-flex;align-items:center;gap:4px;color:inherit;text-decoration:none}
        .consult-close{width:32px;height:32px;border:1px solid #dfe8f1;border-radius:9px;background:#fff;color:#536a82;display:grid;place-items:center;cursor:pointer;flex-shrink:0}
        .consult-detail-body{min-height:0;overflow:auto;padding:18px 20px 22px}
        .consult-section{border:1px solid #e4ebf2;border-radius:12px;background:#fff;margin-bottom:14px;overflow:hidden}
        .consult-section header{height:42px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #edf2f7;background:#fbfdff;color:#48617b;font-size:.64rem;font-weight:900}
        .consult-section-content{padding:14px}
        .consult-description{margin:0;color:#3d5872;font-size:.72rem;line-height:1.85;white-space:pre-wrap}
        .consult-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
        .consult-info{border:1px solid #edf2f7;border-radius:10px;background:#f8fafc;padding:10px}
        .consult-info small,.consult-info strong{display:block}
        .consult-info small{font-size:.55rem;color:#8795a5;font-weight:800;margin-bottom:5px}
        .consult-info strong{font-size:.69rem;color:#173d65;line-height:1.5;word-break:break-word}
        .consult-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .consult-field{display:grid;gap:6px;min-width:0}
        .consult-field.full{grid-column:1/-1}
        .consult-field span{font-size:.62rem;font-weight:900;color:#48617b;display:inline-flex;align-items:center;gap:5px}
        .consult-field select,.consult-field input[type="datetime-local"],.consult-field input[type="date"],.consult-field input[type="number"]{background-color:#fff!important;color:#173d65!important;border-color:#cddbe8!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.75);color-scheme:light}
        .consult-field select{-webkit-appearance:none!important;appearance:none!important;accent-color:#0875dc;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%230875dc' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")!important;background-repeat:no-repeat!important;background-position:left 14px center!important;background-size:14px 14px!important;padding-left:40px!important}
        .consult-field select option{background:#fff;color:#173d65}
        .consult-field select option:checked{background:#eaf4ff;color:#073766;font-weight:800}
        .consult-field select:focus,.consult-field input:focus,.consult-field textarea:focus{border-color:#0875dc!important;box-shadow:0 0 0 3px rgba(8,117,220,.1)}
        .consult-field select:disabled,.consult-field input:disabled,.consult-field textarea:disabled{background:#f6f8fb!important;color:#7f8e9f!important}
        .consult-textarea{min-height:86px;padding:10px 12px!important;resize:vertical;line-height:1.7}
        .consult-footer{border-top:1px solid #edf2f7;padding:12px 16px;background:#fbfdff;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .consult-footer-note{font-size:.58rem;color:#7f8e9f;display:flex;align-items:center;gap:6px}
        .consult-save{height:40px;border:0;border-radius:10px;background:#073766;color:#fff;padding:0 18px;font:inherit;font-size:.7rem;font-weight:900;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
        .consult-save:disabled{opacity:.6;cursor:not-allowed}
        .consult-blank{height:100%;display:grid;place-items:center;text-align:center;color:#7f8e9f;background:linear-gradient(180deg,#fff,#f8fbff)}
        .consult-blank-card{max-width:320px;display:grid;gap:10px;justify-items:center}
        .consult-blank-icon{width:68px;height:68px;border-radius:20px;background:#eaf4ff;color:#0875dc;display:grid;place-items:center}
        .consult-blank h2{margin:0;color:#073766;font-size:1rem}
        .consult-blank p{margin:0;font-size:.7rem;line-height:1.8}
        .consult-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);color:#fff;padding:10px 18px;border-radius:11px;font-size:.72rem;font-weight:800;box-shadow:0 12px 32px rgba(0,0,0,.2);z-index:1000;display:flex;align-items:center;gap:8px}
        .consult-loading{height:calc(100vh - 76px);display:grid;place-items:center;align-content:center;gap:10px;color:#61748a;font-size:.74rem}
        .consult-loading svg{animation:spin .7s linear infinite;color:#0875dc}
        @media(max-width:1100px){.consult-kpis{grid-template-columns:repeat(3,1fr)}.consult-workspace{grid-template-columns:390px minmax(0,1fr)}.consult-info-grid{grid-template-columns:1fr 1fr}}
        @media(max-width:840px){.consult-admin{height:auto;min-height:calc(100vh - 60px);overflow:visible}.consult-head-main{align-items:flex-start;flex-direction:column}.consult-kpis{grid-template-columns:1fr 1fr}.consult-workspace{display:flex;flex-direction:column;overflow:visible}.consult-panel{min-height:420px}.consult-list-panel{max-height:620px}.consult-info-grid,.consult-form-grid{grid-template-columns:1fr}.consult-detail{min-height:680px}.consult-footer{align-items:flex-start;flex-direction:column}.consult-save{width:100%;justify-content:center}}
        @media(max-width:560px){.consult-head{padding:18px 14px 12px}.consult-workspace{padding:10px}.consult-kpis{grid-template-columns:1fr}.consult-tools{grid-template-columns:1fr}.consult-sort{justify-content:center}.consult-card-bottom{align-items:flex-start;flex-direction:column}.consult-detail-head{padding:15px}.consult-detail-body{padding:14px}.consult-section-content{padding:12px}}
      `}</style>

      <header className="consult-head">
        <div className="consult-head-main">
          <div>
            <p className="consult-eyebrow">مركز الاستشارات</p>
            <h1>إدارة الاستشارات</h1>
            <p>جدولة، إسناد، وتسعير الاستشارات مع إرسال تحديث واضح للعميل من نفس الصفحة.</p>
          </div>
          <div className="consult-actions">
            <button className="consult-action-btn" onClick={() => void load(selected?.id)} disabled={dataLoading}>
              {dataLoading ? <Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> : <RefreshCw size={14} />}
              تحديث
            </button>
            {selected?.consultation_meeting_link && (
              <a className="consult-action-btn primary" href={selected.consultation_meeting_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> فتح الاجتماع
              </a>
            )}
          </div>
        </div>

        <div className="consult-kpis">
          {[
            { label: "إجمالي الاستشارات", value: items.length, icon: CalendarClock, color: "#0875dc", bg: "#eaf4ff" },
            { label: "تحتاج جدولة", value: stats.needsScheduling, icon: AlertTriangle, color: "#b45309", bg: "#fef9ee" },
            { label: "مواعيد اليوم", value: stats.today, icon: CalendarCheck2, color: "#0f766e", bg: "#f0fdfa" },
            { label: "غير مسندة", value: stats.unassigned, icon: UserCheck, color: "#7c3aed", bg: "#f5f3ff" },
            { label: "متأخرة", value: stats.overdue, icon: Clock, color: "#dc2626", bg: "#fef2f2" },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <article className="consult-kpi" key={kpi.label}>
                <span className="consult-kpi-icon" style={{ background: kpi.bg, color: kpi.color }}><Icon size={17} /></span>
                <div>
                  <small>{kpi.label}</small>
                  <strong style={{ color: kpi.color }}>{kpi.value}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </header>

      <div className="consult-workspace">
        <aside className="consult-panel consult-list-panel">
          <div className="consult-toolbar">
            <div className="consult-tabs">
              {queueFilters.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.key} className={queueFilter === item.key ? "active" : ""} onClick={() => setQueueFilter(item.key)}>
                    <Icon size={12} /> {item.label}
                  </button>
                );
              })}
            </div>

            <div className="consult-tools">
              <label className="consult-search">
                <Search size={13} />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="بحث بالعميل، العنوان، البريد، الهاتف..." />
              </label>
              <button className="consult-sort" onClick={() => setSortNewest(value => !value)}>
                <ArrowDownUp size={13} /> {sortNewest ? "الأحدث" : "الأقرب"}
              </button>
            </div>

            <div className="consult-status-row">
              <button className={filter === "الكل" ? "active" : ""} onClick={() => setFilter("الكل")}>الكل <b>{items.length}</b></button>
              {STATUS_ORDER.map(status => (
                <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>
                  {status} <b>{stats.statuses[status] || 0}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="consult-list">
            {loadError ? (
              <div className="consult-empty">
                <div>
                  <AlertTriangle size={30} color="#dc2626" />
                  <strong>{loadError}</strong>
                  <button className="consult-action-btn" onClick={() => void load()}>إعادة المحاولة</button>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="consult-empty">
                <div>
                  <CalendarClock size={30} />
                  <strong>لا توجد استشارات مطابقة</strong>
                  <span>غيّر البحث أو الفلتر لعرض نتائج أخرى.</span>
                </div>
              </div>
            ) : visible.map(item => {
              const clientName = item.clients?.name || item.profiles?.full_name || "عميل غير محدد";
              const assignee = teamMembers.find(member => member.id === item.assigned_to);
              const active = selected?.id === item.id;
              return (
                <button key={item.id} className={`consult-card ${active ? "active" : ""} ${isOverdue(item) ? "overdue" : ""}`} onClick={() => openItem(item)}>
                  <div className="consult-card-top">
                    <span className="consult-avatar">{initials(clientName)}</span>
                    <div className="consult-card-body">
                      <h2>{item.title || "استشارة بدون عنوان"}</h2>
                      <div className="consult-card-meta">
                        <span><Building2 size={10} /> {clientName}</span>
                        <span><User size={10} /> {item.profiles?.full_name || "مستخدم"}</span>
                        {assignee && <span style={{ color: "#0875dc", fontWeight: 800 }}><UserCheck size={10} /> {assignee.full_name}</span>}
                      </div>
                      <div className="consult-card-bottom">
                        <div className="consult-badges">
                          <StatusBadge status={statusOf(item)} />
                          <MethodBadge method={methodOf(item)} />
                        </div>
                        <span className="consult-time">
                          <Clock size={10} />
                          {item.consultation_scheduled_at ? formatAppDateTime(item.consultation_scheduled_at) : `فتح: ${formatAppDate(item.created_at)}`}
                        </span>
                      </div>
                    </div>
                    <ChevronLeft size={14} color="#b7c4d1" style={{ marginTop: 12, flexShrink: 0 }} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="consult-panel consult-detail">
          {selected ? (
            <>
              <div className="consult-detail-head">
                <div className="consult-detail-title">
                  <span className="consult-detail-icon" style={{ background: selectedMethod.bg, color: selectedMethod.color }}>
                    {(() => {
                      const Icon = selectedMethod.icon;
                      return <Icon size={20} />;
                    })()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="consult-badges" style={{ marginBottom: 8 }}>
                      <StatusBadge status={statusOf(selected)} />
                      <MethodBadge method={methodOf(selected)} />
                      {isOverdue(selected) && <span className="consult-badge" style={{ color: "#dc2626", background: "#fef2f2", borderColor: "#fecaca" }}>متأخرة</span>}
                    </div>
                    <h2>{selected.title || "استشارة بدون عنوان"}</h2>
                    <div className="consult-detail-meta">
                      <span><Building2 size={11} /> {selectedClientName}</span>
                      <span><Calendar size={11} /> فتحت {formatAppDate(selected.created_at)}</span>
                      <span><RefreshCw size={11} /> آخر تحديث {formatAppRelativeTime(selected.updated_at)}</span>
                    </div>
                  </div>
                </div>
                <button className="consult-close" onClick={() => setSelected(null)} aria-label="إغلاق التفاصيل"><X size={14} /></button>
              </div>

              <div className="consult-detail-body">
                <section className="consult-section">
                  <header>
                    <span><MessageSquare size={13} /> ملخص الاستشارة</span>
                    <small>#{selected.id.replace(/-/g, "").slice(0, 8).toUpperCase()}</small>
                  </header>
                  <div className="consult-section-content">
                    <p className="consult-description">{selected.description || "لا يوجد وصف مرفق من العميل."}</p>
                  </div>
                </section>

                <section className="consult-section">
                  <header><span><User size={13} /> بيانات العميل والتواصل</span></header>
                  <div className="consult-section-content consult-info-grid">
                    <div className="consult-info">
                      <small>العميل</small>
                      <strong>{selectedClientName}</strong>
                    </div>
                    <div className="consult-info">
                      <small>الهاتف</small>
                      <strong>{selected.consultation_phone || selected.clients?.phone || "غير متوفر"}</strong>
                    </div>
                    <div className="consult-info">
                      <small>البريد</small>
                      <strong>{selected.clients?.email || selected.profiles?.email || "غير متوفر"}</strong>
                    </div>
                    <div className="consult-info">
                      <small>المسؤول الحالي</small>
                      <strong>{selectedAssignee?.full_name || "غير مسندة"}</strong>
                    </div>
                    <div className="consult-info">
                      <small>الموعد</small>
                      <strong>{selected.consultation_scheduled_at ? formatAppFullDateTime(selected.consultation_scheduled_at) : "لم يحدد"}</strong>
                    </div>
                    <div className="consult-info">
                      <small>السعر</small>
                      <strong>{selected.consultation_price != null ? `${selected.consultation_price} ر.س` : "لم يحدد"}</strong>
                    </div>
                  </div>
                  <div className="consult-section-content" style={{ paddingTop: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(selected.consultation_phone || selected.clients?.phone) && (
                      <a className="consult-action-btn" href={`tel:${selected.consultation_phone || selected.clients?.phone}`}><Phone size={13} /> اتصال</a>
                    )}
                    {(selected.clients?.email || selected.profiles?.email) && (
                      <a className="consult-action-btn" href={`mailto:${selected.clients?.email || selected.profiles?.email}`}><Mail size={13} /> بريد</a>
                    )}
                    {selected.consultation_meeting_link && (
                      <a className="consult-action-btn" href={selected.consultation_meeting_link} target="_blank" rel="noopener noreferrer"><Link2 size={13} /> رابط الاجتماع</a>
                    )}
                  </div>
                </section>

                <section className="consult-section">
                  <header><span><Sparkles size={13} /> تحديث الاستشارة</span></header>
                  <div className="consult-section-content consult-form-grid">
                    {teamMembers.length > 0 && (
                      <label className="consult-field full">
                        <span><UserCheck size={12} /> المسؤول</span>
                        <select value={editAssigned} onChange={event => setEditAssigned(event.target.value)} style={inputStyle}>
                          <option value="">غير مسندة</option>
                          {teamMembers.map(member => (
                            <option key={member.id} value={member.id}>{member.full_name} ({ROLE_LABEL[member.role] || member.role})</option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className="consult-field">
                      <span>الحالة</span>
                      <select value={editStatus} onChange={event => setEditStatus(event.target.value)} style={inputStyle}>
                        {STATUS_ORDER.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>

                    <label className="consult-field">
                      <span>طريقة الاستشارة</span>
                      <select value={editMethod} onChange={event => setEditMethod(event.target.value)} style={inputStyle}>
                        {Object.entries(METHOD_META).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                      </select>
                    </label>

                    <label className="consult-field">
                      <span><Clock size={12} /> الموعد</span>
                      <input type="datetime-local" value={editScheduled} onChange={event => setEditScheduled(event.target.value)} style={inputStyle} />
                    </label>

                    <label className="consult-field">
                      <span><DollarSign size={12} /> السعر (ر.س)</span>
                      <input type="number" min="0" step="0.01" value={editPrice} onChange={event => setEditPrice(event.target.value)} placeholder="غير محدد" style={inputStyle} />
                    </label>

                    {editMethod === "zoom" && (
                      <label className="consult-field full">
                        <span><Video size={12} /> رابط الاتصال المرئي</span>
                        <input value={editLink} onChange={event => setEditLink(event.target.value)} placeholder="https://zoom.us/..." style={inputStyle} />
                      </label>
                    )}

                    <label className="consult-field full">
                      <span><MessageSquare size={12} /> ملاحظة تظهر للعميل مع التحديث</span>
                      <textarea className="consult-textarea" value={editNote} onChange={event => setEditNote(event.target.value)} placeholder="مثال: تم تأكيد الموعد، يرجى تجهيز السجل التجاري والأسئلة قبل الاجتماع." style={inputStyle} />
                    </label>
                  </div>
                </section>
              </div>

              <footer className="consult-footer">
                <span className="consult-footer-note"><Send size={13} /> الحفظ يحدّث سجل الاستشارة ويرسل رسالة ضمن تذكرة العميل.</span>
                <button className="consult-save" onClick={saveChanges} disabled={!canSave}>
                  {saving ? <Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> : <CheckCircle2 size={14} />}
                  {saving ? "جاري الحفظ..." : "حفظ وإرسال التحديث"}
                </button>
              </footer>
            </>
          ) : (
            <div className="consult-blank">
              <div className="consult-blank-card">
                <span className="consult-blank-icon"><CalendarClock size={30} /></span>
                <h2>اختر استشارة لبدء المعالجة</h2>
                <p>القائمة على اليمين تعرض الأولويات، الجدولة، والإسناد. افتح أي استشارة لتحديث حالتها وإرسال التفاصيل للعميل.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {notice && (
        <div className="consult-toast" style={{ background: notice.type === "ok" ? "#073766" : "#dc2626" }}>
          {notice.type === "ok" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {notice.msg}
        </div>
      )}
    </section>
  );
}
