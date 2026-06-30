"use client";
import PageLoader from "@/components/page-loader";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, FileText, ExternalLink, Eye, Edit2, Trash2, UserCheck, UserX,
  AlertTriangle, Users, Building2, UserCog, Activity, X, Phone, Mail,
  CreditCard, User, FileCheck, Clock, Save, CheckCircle, KeyRound,
  MapPin, Download, Receipt, ShoppingBag, Package, MessageSquare, Info,
  ChevronLeft, RefreshCw,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatAppDate } from "@/lib/date-format";

type ClientRecord = {
  id: string; name: string; client_type: string; phone: string;
  email: string | null; commercial_number: string | null; national_id: string | null;
  unified_register_number: string | null; company_address: string | null;
  company_activity: string | null; notes: string | null;
  commercial_register_doc: string | null; company_license_doc: string | null;
  national_id_doc: string | null; user_id: string | null; active: boolean;
  created_at: string; updated_at: string;
  profiles: { id: string; full_name: string } | null;
  commercial_register_expiry: string | null;
};

const S_ORD: Record<string, { label: string; color: string; bg: string }> = {
  new:        { label: "جديد",        color: "#0875dc", bg: "#eaf4ff" },
  pending:    { label: "انتظار",       color: "#b45309", bg: "#fef9ee" },
  processing: { label: "قيد التنفيذ", color: "#0f766e", bg: "#f0fdfa" },
  completed:  { label: "مكتمل",       color: "#15803d", bg: "#f0fdf4" },
  cancelled:  { label: "ملغي",        color: "#dc2626", bg: "#fef2f2" },
};
const S_SUB: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: "نشط",    color: "#15803d", bg: "#f0fdf4" },
  pending:   { label: "انتظار", color: "#b45309", bg: "#fef9ee" },
  cancelled: { label: "ملغي",   color: "#dc2626", bg: "#fef2f2" },
  expired:   { label: "منتهي",  color: "#6b7280", bg: "#f3f4f6" },
};
const S_INV: Record<string, { label: string; color: string; bg: string }> = {
  issued:    { label: "صادرة",  color: "#b45309", bg: "#fef9ee" },
  paid:      { label: "مدفوعة", color: "#15803d", bg: "#f0fdf4" },
  cancelled: { label: "ملغاة",  color: "#dc2626", bg: "#fef2f2" },
};
const S_TKT: Record<string, { label: string; color: string; bg: string }> = {
  new:     { label: "جديدة",  color: "#0875dc", bg: "#eaf4ff" },
  open:    { label: "مفتوحة", color: "#0f766e", bg: "#f0fdfa" },
  pending: { label: "انتظار", color: "#b45309", bg: "#fef9ee" },
  resolved:{ label: "محلولة", color: "#15803d", bg: "#f0fdf4" },
  closed:  { label: "مغلقة",  color: "#6b7280", bg: "#f3f4f6" },
};

type FilterTab = "الكل" | "نشط" | "موقوف" | "مؤسسة" | "فرد";
const FILTER_TABS: FilterTab[] = ["الكل", "نشط", "موقوف", "مؤسسة", "فرد"];

type DetailTab = "info" | "orders" | "subscriptions" | "invoices" | "tickets" | "docs";
const DETAIL_TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: "info",          label: "المعلومات",  icon: <Info size={13} /> },
  { id: "orders",        label: "الطلبات",    icon: <ShoppingBag size={13} /> },
  { id: "subscriptions", label: "الاشتراكات", icon: <Package size={13} /> },
  { id: "invoices",      label: "الفواتير",   icon: <Receipt size={13} /> },
  { id: "tickets",       label: "التذاكر",    icon: <MessageSquare size={13} /> },
  { id: "docs",          label: "المستندات",  icon: <FileText size={13} /> },
];

const AVATAR_COLORS = [
  { bg: "#dbeafe", color: "#1d4ed8" }, { bg: "#dcfce7", color: "#15803d" },
  { bg: "#e0f2fe", color: "#0369a1" }, { bg: "#fef9c3", color: "#a16207" },
  { bg: "#ffe4e6", color: "#be123c" }, { bg: "#f0fdfa", color: "#0f766e" },
];
function av(name: string) { return AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length]; }

function Chip({ cfg }: { cfg: { label: string; color: string; bg: string } }) {
  return <span className="cl-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + "33" }}>{cfg.label}</span>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #dce3eb",
  borderRadius: 8, fontSize: ".75rem", background: "#fff", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};

export default function AdminClientsPage() {
  const { loading: authLoading } = useRoleGuard("admin");
  const [clients, setClients]     = useState<ClientRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search,  setSearch]      = useState("");
  const [filter,  setFilter]      = useState<FilterTab>("الكل");
  const [selected, setSelected]   = useState<ClientRecord | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");
  const [notice, setNotice]       = useState("");
  const [noticeOk, setNoticeOk]   = useState(true);
  const [editing, setEditing]     = useState<ClientRecord | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [passModal, setPassModal] = useState<string | null>(null);
  const [newPass,   setNewPass]   = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [clientDocs, setClientDocs] = useState<any[]>([]);
  const [orders,        setOrders]        = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices,      setInvoices]      = useState<any[]>([]);
  const [tickets,       setTickets]       = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { load(); fetchRole(); }, []);

  useEffect(() => {
    if (!selected) { setClientDocs([]); setOrders([]); setSubscriptions([]); setInvoices([]); setTickets([]); return; }
    setDetailTab("info");
    loadTab("info", selected.id);
  }, [selected]);

  useEffect(() => { if (selected) loadTab(detailTab, selected.id); }, [detailTab]);

  async function loadTab(tab: DetailTab, cid: string) {
    const sb = createSupabaseBrowserClient();
    if (tab === "info" || tab === "docs") {
      const { data } = await sb.from("client_documents").select("*").eq("client_id", cid).order("created_at", { ascending: false });
      if (data) {
        const withUrls = await Promise.all(data.map(async d => {
          const { data: s } = await sb.storage.from("client-documents").createSignedUrl(d.storage_path, 3600);
          return { ...d, signedUrl: s?.signedUrl };
        }));
        setClientDocs(withUrls);
      }
      if (tab === "info") return;
    }
    setTabLoading(true);
    try {
      if (tab === "orders")        { const j = await (await fetch(`/api/admin/orders?client_id=${cid}`)).json();        setOrders(j.data || []); }
      else if (tab === "subscriptions") { const j = await (await fetch(`/api/admin/subscriptions?client_id=${cid}`)).json(); setSubscriptions(j.data || []); }
      else if (tab === "invoices") { const j = await (await fetch(`/api/admin/invoices?client_id=${cid}`)).json();        setInvoices(j.data || []); }
      else if (tab === "tickets")  { const j = await (await fetch(`/api/admin/tickets?client_id=${cid}`)).json();         setTickets(j.data || []); }
    } finally { setTabLoading(false); }
  }

  async function fetchRole() {
    try {
      const res = await fetch("/api/admin/team");
      if (!res.ok) return;
      const payload = await res.json();
      const list: any[] = Array.isArray(payload?.members) ? payload.members : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      const uid = payload?.currentUserId ?? null;
      const me = list.find((m: any) => m.id === uid);
      if (me?.role) { if (me.role !== "admin") router.replace("/admin"); else setIsAdmin(true); }
    } catch { }
  }

  async function load() {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) { const { data } = await res.json(); if (data) setClients(data as ClientRecord[]); }
    } catch { }
    setLoading(false);
  }

  function notice$(msg: string, ok = true) { setNotice(msg); setNoticeOk(ok); window.setTimeout(() => setNotice(""), 2800); }

  async function toggleActive(c: ClientRecord) {
    try {
      const res = await fetch(`/api/admin/clients/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ toggle_active: true }) });
      if (!res.ok) { notice$("تعذر تغيير الحالة", false); return; }
      await load(); notice$(c.active ? "تم إيقاف العميل" : "تم تفعيل العميل");
    } catch { notice$("حدث خطأ", false); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const res = await fetch("/api/admin/clients", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editing.id, name: editing.name, phone: editing.phone, email: editing.email, commercial_number: editing.commercial_number, national_id: editing.national_id, notes: editing.notes }) });
      if (!res.ok) { notice$("تعذر حفظ التعديلات", false); return; }
      const { data: updated } = await res.json();
      setSelected(updated); setEditing(null); load(); notice$("تم حفظ التعديلات");
    } catch { notice$("حدث خطأ", false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/admin/clients", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, permanent: false }) });
      if (!res.ok) { notice$("تعذر حذف العميل", false); return; }
      await load(); setConfirmDel(null); if (selected?.id === id) setSelected(null);
      notice$("تم حذف العميل");
    } catch { notice$("حدث خطأ", false); }
  }

  async function changePassword() {
    if (!passModal || newPass.length < 6) { notice$("كلمة المرور يجب أن تكون 6 أحرف على الأقل", false); return; }
    setPassLoading(true);
    try {
      const res = await fetch("/api/admin/clients/password", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: passModal, newPassword: newPass }) });
      if (!res.ok) { const e = await res.json(); notice$(e.error || "تعذر تغيير كلمة المرور", false); }
      else notice$("تم تغيير كلمة المرور بنجاح");
    } catch { notice$("حدث خطأ", false); }
    setPassLoading(false); setPassModal(null); setNewPass("");
  }

  const userGroupMap = useMemo(() => {
    const map = new Map<string, { profile: ClientRecord["profiles"]; clients: ClientRecord[] }>();
    clients.forEach(c => {
      const key = c.user_id || `__orphan__${c.id}`;
      if (!map.has(key)) map.set(key, { profile: c.profiles, clients: [] });
      map.get(key)!.clients.push(c);
    });
    return map;
  }, [clients]);

  const stats = useMemo(() => ({
    total:     clients.length,
    active:    clients.filter(c => c.active).length,
    inactive:  clients.filter(c => !c.active).length,
    companies: clients.filter(c => c.client_type === "company").length,
    persons:   clients.filter(c => c.client_type !== "company").length,
  }), [clients]);

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("ar");
    const out: { key: string; profile: ClientRecord["profiles"]; clients: ClientRecord[] }[] = [];
    for (const [key, group] of userGroupMap) {
      if (q && !`${group.profile?.full_name || ""} ${group.clients.map(c => c.name).join(" ")} ${group.clients.map(c => c.phone).join(" ")}`.toLocaleLowerCase("ar").includes(q)) continue;
      const primary = group.clients[0];
      if (filter === "نشط"    && !group.clients.some(c => c.active))                        continue;
      if (filter === "موقوف"  && !group.clients.every(c => !c.active))                      continue;
      if (filter === "مؤسسة"  && primary.client_type !== "company")                         continue;
      if (filter === "فرد"    && primary.client_type === "company")                         continue;
      out.push({ key, profile: group.profile, clients: group.clients });
    }
    return out;
  }, [userGroupMap, search, filter]);

  const filterCount = (f: FilterTab) => {
    if (f === "الكل")   return clients.length;
    if (f === "نشط")    return clients.filter(c => c.active).length;
    if (f === "موقوف")  return clients.filter(c => !c.active).length;
    if (f === "مؤسسة")  return clients.filter(c => c.client_type === "company").length;
    if (f === "فرد")    return clients.filter(c => c.client_type !== "company").length;
    return 0;
  };

  if (authLoading) return <PageLoader text="جاري تحميل العملاء..." />;

  return (
    <div className="cl-shell" dir="rtl">
      <style>{`
        .cl-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;color:#173d65;overflow:hidden}
        .cl-head{padding:18px 24px 14px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff)}
        .cl-head-main{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:14px}
        .cl-eyebrow{margin:0 0 4px;color:#0f766e;font-size:.66rem;font-weight:900}
        .cl-head h1{margin:0 0 5px;font-size:1.52rem;color:#073766;letter-spacing:0}
        .cl-head p{margin:0;color:#7f8e9f;font-size:.72rem}
        .cl-actions{display:flex;align-items:center;gap:8px}
        .cl-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer}
        .cl-kpis{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px}
        .cl-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;min-width:0}
        .cl-kpi i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
        .cl-kpi small,.cl-kpi strong{display:block}.cl-kpi small{font-size:.56rem;color:#8190a1;font-weight:800}.cl-kpi strong{font-size:1.22rem;color:#073766;line-height:1;margin-top:4px}
        .cl-workspace{min-height:0;display:grid;grid-template-columns:minmax(300px,420px) minmax(0,1fr);gap:14px;padding:14px 16px 18px}
        .cl-panel{min-height:0;background:#fff;border:1px solid #dfe8f1;border-radius:14px;box-shadow:0 6px 24px rgba(7,55,102,.05);overflow:hidden}
        .cl-queue{display:grid;grid-template-rows:auto 1fr;min-width:0}
        .cl-toolbar{padding:10px 12px;border-bottom:1px solid #edf2f7;background:#fff}
        .cl-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
        .cl-tabs button{height:28px;border:1px solid #dfe8f1;border-radius:7px;background:#f8fafc;color:#65788c;padding:0 8px;font:inherit;font-size:.57rem;font-weight:800;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;cursor:pointer}
        .cl-tabs button.active{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .cl-search{height:36px;border:1px solid #dfe8f1;border-radius:9px;background:#f8fafc;display:flex;align-items:center;gap:7px;padding:0 10px;color:#8b9dad}
        .cl-search input{border:0;outline:0;background:transparent;font:inherit;font-size:.67rem;width:100%;color:#173d65}
        .cl-list{min-height:0;overflow:auto;padding:10px;background:#f8fafc}
        .cl-card{width:100%;border:1px solid #dfe8f1;border-radius:10px;background:#fff;padding:10px 12px;text-align:right;cursor:pointer;margin-bottom:7px;transition:border-color .15s,box-shadow .15s,background .15s;box-sizing:border-box}
        .cl-card:hover{border-color:#bddcff;box-shadow:0 4px 14px rgba(8,117,220,.08)}
        .cl-card.sel{border-color:#0875dc;background:#f0f8ff;box-shadow:0 4px 14px rgba(8,117,220,.1)}
        .cl-card-top{display:flex;gap:8px;align-items:flex-start;direction:rtl}
        .cl-av{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font-size:.68rem;font-weight:900;flex-shrink:0}
        .cl-card-body{flex:1;min-width:0;overflow:hidden}
        .cl-card-name{font-size:.72rem;font-weight:800;color:#173d65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
        .cl-card-ref{font-size:.54rem;color:#8b9dad;font-weight:700;font-family:ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cl-card-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;color:#7f8e9f;font-size:.56rem;margin-top:6px}
        .cl-card-meta span{display:inline-flex;align-items:center;gap:3px}
        .cl-pill,.cl-priority{display:inline-flex;align-items:center;gap:4px;border:1px solid;border-radius:999px;padding:2px 8px;font-size:.54rem;font-weight:800;white-space:nowrap}
        .cl-empty{height:100%;display:grid;place-items:center;text-align:center;color:#8b9dad;padding:30px}
        .cl-empty div{display:grid;gap:8px;justify-items:center}
        /* Detail */
        .cl-detail{min-height:0;display:grid;grid-template-rows:auto auto 1fr;background:#fff}
        .cl-detail-head{padding:18px 20px 0;border-bottom:1px solid #edf2f7;background:linear-gradient(180deg,#fff,#fbfdff)}
        .cl-detail-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
        .cl-detail-icon{width:44px;height:44px;border-radius:12px;background:#eaf4ff;color:#073766;display:grid;place-items:center;font-weight:800;font-size:.95rem;flex-shrink:0}
        .cl-detail-info{flex:1;min-width:0}
        .cl-detail-name{font-size:1rem;font-weight:800;color:#073766;margin-bottom:5px}
        .cl-detail-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:.61rem;color:#7f8e9f}
        .cl-detail-meta span{display:inline-flex;align-items:center;gap:4px}
        .cl-detail-btns{display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0}
        .cl-act-btn{display:inline-flex;align-items:center;gap:4px;border:none;border-radius:7px;padding:5px 10px;font-size:.6rem;font-weight:700;cursor:pointer;transition:opacity .15s}
        .cl-act-btn:hover{opacity:.8}
        .cl-close{width:32px;height:32px;border:1px solid #dfe8f1;border-radius:9px;background:#fff;color:#536a82;display:grid;place-items:center;cursor:pointer;flex-shrink:0}
        .cl-confirm{margin:0 20px 12px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;display:flex;align-items:center;gap:8px;font-size:.64rem}
        .cl-dtabs{display:flex;gap:0;padding:0 20px}
        .cl-dtab{display:inline-flex;align-items:center;gap:5px;padding:9px 13px;font-size:.63rem;font-weight:600;color:#7c8b9b;background:none;border:none;cursor:pointer;border-bottom:2.5px solid transparent;white-space:nowrap;transition:color .15s}
        .cl-dtab.active{color:#0875dc;font-weight:800;border-bottom-color:#0875dc}
        .cl-tab-body{min-height:0;overflow-y:auto;padding:18px 20px 22px}
        /* Info grid */
        .cl-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .cl-info-card{background:#f8fafc;border:1px solid #e4ebf2;border-radius:12px;overflow:hidden}
        .cl-info-card header{min-height:38px;padding:9px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #edf2f7;background:#fbfdff;color:#48617b;font-size:.64rem;font-weight:900}
        .cl-info-card-body{padding:12px 14px}
        .cl-info-row{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f0f4f8}
        .cl-info-row:last-child{border-bottom:none}
        .cl-info-lbl{font-size:.55rem;color:#8b9dad;margin-bottom:1px}
        .cl-info-val{font-size:.68rem;color:#344d69;font-weight:500;word-break:break-word}
        /* Table */
        .cl-table{border:1px solid #e4ebf2;border-radius:12px;overflow:hidden}
        .cl-table-head{display:grid;background:#f4f7fb;border-bottom:1px solid #e4ebf2}
        .cl-th{padding:8px 11px;font-size:.54rem;font-weight:800;color:#4a6075;border-left:1px solid #e4ebf2}
        .cl-th:last-child{border-left:none}
        .cl-tr{display:grid;border-bottom:1px solid #f0f4f8}
        .cl-tr:last-child{border-bottom:none}
        .cl-td{padding:9px 11px;font-size:.62rem;color:#334155;border-left:1px solid #f0f4f8;display:flex;align-items:center}
        .cl-td:last-child{border-left:none}
        /* Doc */
        .cl-doc{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e4ebf2;border-radius:10px;margin-bottom:7px}
        .cl-doc-link{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;background:#eaf4ff;color:#0875dc;text-decoration:none;flex-shrink:0}
        /* Notice */
        .cl-notice{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:10px;font-size:.72rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:400;animation:slideUp .2s}
        @keyframes slideUp{from{transform:translateX(-50%) translateY(10px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        /* Modal */
        .cl-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:300;display:grid;place-items:center}
        .cl-modal{background:#fff;border-radius:14px;padding:24px;box-shadow:0 16px 48px rgba(0,0,0,.18)}
        .cl-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .cl-field label{font-size:.6rem;color:#6b7d93;font-weight:700;display:block;margin-bottom:4px}
        .cl-no-detail{min-height:0;display:grid;place-items:center;background:#f4f7fb}
        @media(max-width:1100px){.cl-workspace{grid-template-columns:minmax(260px,340px) minmax(0,1fr)}}
      `}</style>

      {/* ── Header ── */}
      <div className="cl-head">
        <div className="cl-head-main">
          <div>
            <p className="cl-eyebrow">إدارة النظام</p>
            <h1>العملاء</h1>
            <p>{clients.length} عميل مسجّل في المنظومة</p>
          </div>
          <div className="cl-actions">
            <button className="cl-btn" onClick={() => { setLoading(true); load(); }}><RefreshCw size={14} /> تحديث</button>
          </div>
        </div>
        <div className="cl-kpis">
          {[
            { icon: Users,     label: "الإجمالي",  value: stats.total,     color: "#073766", bg: "#dbeafe" },
            { icon: UserCheck, label: "نشط",        value: stats.active,    color: "#15803d", bg: "#bbf7d0" },
            { icon: UserX,     label: "موقوف",      value: stats.inactive,  color: "#dc2626", bg: "#fecaca" },
            { icon: Building2, label: "مؤسسات",     value: stats.companies, color: "#0f766e", bg: "#99f6e4" },
            { icon: User,      label: "أفراد",      value: stats.persons,   color: "#b45309", bg: "#fde68a" },
          ].map(k => (
            <div key={k.label} className="cl-kpi">
              <i style={{ background: k.bg }}><k.icon size={16} color={k.color} /></i>
              <div><small>{k.label}</small><strong style={{ color: k.color }}>{k.value}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Workspace ── */}
      <div className="cl-workspace">

        {/* Queue */}
        <div className="cl-panel cl-queue">
          <div className="cl-toolbar">
            <div className="cl-tabs">
              {FILTER_TABS.map(f => (
                <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                  {f} <span style={{ opacity: .7 }}>{filterCount(f)}</span>
                </button>
              ))}
            </div>
            <label className="cl-search">
              <Search size={13} color="#a0adb8" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الجوال..." />
            </label>
          </div>

          <div className="cl-list">
            {loading ? (
              <div className="cl-empty"><div><RefreshCw size={22} style={{ opacity: .3 }} /><span style={{ fontSize: ".7rem" }}>جاري التحميل...</span></div></div>
            ) : rows.length === 0 ? (
              <div className="cl-empty"><div><Users size={28} style={{ opacity: .25 }} /><span style={{ fontSize: ".7rem" }}>{search ? "لا توجد نتائج" : "لا يوجد عملاء"}</span></div></div>
            ) : rows.map(acc => {
              const isActive  = acc.clients.some(c => c.active);
              const isSel     = !!(selected && acc.clients.some(c => c.id === selected.id));
              const hasExpiry = acc.clients.some(c => c.commercial_register_expiry && Math.ceil((new Date(c.commercial_register_expiry).getTime() - Date.now()) / 86400000) < 0);
              const soonExp   = !hasExpiry && acc.clients.some(c => c.commercial_register_expiry && Math.ceil((new Date(c.commercial_register_expiry).getTime() - Date.now()) / 86400000) <= 30);
              const a         = av(acc.profile?.full_name || "?");
              const phones    = [...new Set(acc.clients.map(c => c.phone).filter(Boolean))];

              return (
                <button key={acc.key} className={`cl-card${isSel ? " sel" : ""}`}
                  onClick={() => setSelected(acc.clients[0])}
                  style={{ opacity: isActive ? 1 : .65 }}>
                  <div className="cl-card-top">
                    <div className="cl-av" style={{ background: a.bg, color: a.color }}>
                      {(acc.profile?.full_name || "?").charAt(0)}
                    </div>
                    <div className="cl-card-body">
                      <div className="cl-card-name">{acc.profile?.full_name || "بدون حساب"}</div>
                      <div className="cl-card-ref" style={{ direction: "ltr" }}>{phones[0]}</div>
                      <div className="cl-card-meta">
                        <span>{acc.clients[0].client_type === "company" ? <><Building2 size={11} /> مؤسسة</> : <><User size={11} /> فرد</>}</span>
                        {acc.clients.length > 1 && <span style={{ background: "#f0f4f9", color: "#526983", padding: "1px 7px", borderRadius: 10 }}>{acc.clients.length} منشآت</span>}
                        {hasExpiry && <span className="cl-pill" style={{ color: "#dc2626", background: "#fef2f2", borderColor: "#fecaca" }}>سجل منتهي</span>}
                        {soonExp   && <span className="cl-pill" style={{ color: "#d97706", background: "#fffbeb", borderColor: "#fde68a" }}>ينتهي قريباً</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <span className="cl-pill" style={{ color: isActive ? "#15803d" : "#dc2626", background: isActive ? "#f0fdf4" : "#fef2f2", borderColor: isActive ? "#bbf7d0" : "#fecaca" }}>
                        {isActive ? "● نشط" : "● موقوف"}
                      </span>
                      <ChevronLeft size={13} color="#b0bcc9" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {selected ? (
          <div className="cl-panel cl-detail">
            <div className="cl-detail-head">
              <div className="cl-detail-top">
                <div className="cl-detail-icon">{selected.name.charAt(0)}</div>
                <div className="cl-detail-info">
                  <div className="cl-detail-name">{selected.name}</div>
                  <div className="cl-detail-meta">
                    {selected.profiles?.full_name && <span><User size={11} />{selected.profiles.full_name}</span>}
                    <span><Phone size={11} />{selected.phone}</span>
                    {selected.email && <span><Mail size={11} />{selected.email}</span>}
                    <span className="cl-pill" style={{ color: selected.active ? "#15803d" : "#dc2626", background: selected.active ? "#f0fdf4" : "#fef2f2", borderColor: selected.active ? "#bbf7d0" : "#fecaca" }}>
                      {selected.active ? "● نشط" : "● موقوف"}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="cl-detail-btns">
                    <button className="cl-act-btn" style={{ background: "#eaf4ff", color: "#0875dc" }} onClick={() => setEditing({ ...selected })}><Edit2 size={12} /> تعديل</button>
                    <button className="cl-act-btn" style={{ background: selected.active ? "#fef2f2" : "#f0fdf4", color: selected.active ? "#dc2626" : "#15803d" }} onClick={() => toggleActive(selected)}>
                      {selected.active ? <><UserX size={12} /> إيقاف</> : <><UserCheck size={12} /> تفعيل</>}
                    </button>
                    {selected.user_id && <button className="cl-act-btn" style={{ background: "#f0fdfa", color: "#0f766e" }} onClick={() => { setPassModal(selected.user_id!); setNewPass(""); }}><KeyRound size={12} /> كلمة المرور</button>}
                    <button className="cl-act-btn" style={{ background: "#fef2f2", color: "#dc2626" }} onClick={() => setConfirmDel(selected.id)}><Trash2 size={12} /> حذف</button>
                  </div>
                )}
                <button className="cl-close" onClick={() => setSelected(null)}><X size={14} /></button>
              </div>

              {confirmDel === selected.id && (
                <div className="cl-confirm">
                  <AlertTriangle size={13} color="#dc2626" />
                  <span style={{ flex: 1, color: "#991b1b", fontWeight: 600 }}>تأكيد حذف العميل؟</span>
                  <button onClick={() => handleDelete(selected.id)} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: ".62rem", fontWeight: 600, cursor: "pointer" }}>احذف</button>
                  <button onClick={() => setConfirmDel(null)} style={{ background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 10px", fontSize: ".62rem", cursor: "pointer" }}>إلغاء</button>
                </div>
              )}

              <div className="cl-dtabs">
                {DETAIL_TABS.map(t => (
                  <button key={t.id} className={`cl-dtab${detailTab === t.id ? " active" : ""}`} onClick={() => setDetailTab(t.id)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cl-tab-body">
              {tabLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
              ) : detailTab === "info" ? (
                <InfoTab client={selected} docs={clientDocs} />
              ) : detailTab === "orders" ? (
                <OrdersTab orders={orders} />
              ) : detailTab === "subscriptions" ? (
                <SubsTab subs={subscriptions} />
              ) : detailTab === "invoices" ? (
                <InvoicesTab invoices={invoices} />
              ) : detailTab === "tickets" ? (
                <TicketsTab tickets={tickets} />
              ) : (
                <DocsTab client={selected} docs={clientDocs} />
              )}
            </div>
          </div>
        ) : (
          <div className="cl-panel cl-no-detail">
            <div style={{ textAlign: "center", color: "#8b9dad" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: "#eaf4ff", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                <Users size={28} color="#0875dc" style={{ opacity: .5 }} />
              </div>
              <p style={{ fontSize: ".8rem", fontWeight: 700, color: "#5a6b7d", marginBottom: 4 }}>اختر عميلاً لعرض ملفه</p>
              <p style={{ fontSize: ".63rem" }}>الطلبات · الاشتراكات · الفواتير · التذاكر</p>
            </div>
          </div>
        )}
      </div>

      {/* Notice toast */}
      {notice && (
        <div className="cl-notice" style={{ background: noticeOk ? "#f0fdf4" : "#fef2f2", color: noticeOk ? "#15803d" : "#dc2626", border: `1px solid ${noticeOk ? "#bbf7d0" : "#fecaca"}` }}>
          {noticeOk ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} {notice}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="cl-modal-bg" onClick={() => setEditing(null)}>
          <div className="cl-modal" style={{ width: 420, direction: "rtl" }} onClick={e => e.stopPropagation()}>
            <div className="cl-modal-head">
              <span style={{ fontSize: ".82rem", fontWeight: 800, color: "#073766" }}>تعديل {editing.name}</span>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color="#8b9dad" /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {([
                { label: "الاسم",          key: "name" },
                { label: "الجوال",         key: "phone" },
                { label: "البريد",         key: "email" },
                { label: "السجل التجاري",  key: "commercial_number" },
                { label: "رقم الهوية",     key: "national_id" },
              ] as const).map(f => (
                <div key={f.key} className="cl-field">
                  <label>{f.label}</label>
                  <input value={(editing as any)[f.key] || ""} onChange={e => setEditing({ ...editing, [f.key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
              <div className="cl-field">
                <label>ملاحظات</label>
                <textarea value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={saveEdit} style={{ flex: 1, background: "#073766", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Save size={13} /> حفظ</button>
                <button onClick={() => setEditing(null)} style={{ flex: 1, background: "#f0f4f8", color: "#5a6b7d", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", cursor: "pointer" }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password modal */}
      {passModal && (
        <div className="cl-modal-bg" onClick={() => { if (!passLoading) setPassModal(null); }}>
          <div className="cl-modal" style={{ width: 320, direction: "rtl" }} onClick={e => e.stopPropagation()}>
            <div className="cl-modal-head">
              <span style={{ fontSize: ".82rem", fontWeight: 800, color: "#073766" }}>تغيير كلمة المرور</span>
              <button onClick={() => { if (!passLoading) setPassModal(null); }} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color="#8b9dad" /></button>
            </div>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="كلمة المرور الجديدة" autoFocus style={inputStyle} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={changePassword} disabled={passLoading || newPass.length < 6} style={{ flex: 1, background: "#073766", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", fontWeight: 700, cursor: "pointer", opacity: (passLoading || newPass.length < 6) ? .5 : 1 }}>
                {passLoading ? "جاري..." : "حفظ"}
              </button>
              <button onClick={() => { if (!passLoading) setPassModal(null); }} style={{ flex: 1, background: "#f0f4f8", color: "#5a6b7d", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", cursor: "pointer" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function InfoTab({ client, docs }: { client: ClientRecord; docs: any[] }) {
  return (
    <div className="cl-info-grid">
      <div className="cl-info-card">
        <header><User size={13} /> بيانات العميل</header>
        <div className="cl-info-card-body">
          <IRow icon={User}      label="نوع العميل"       value={client.client_type === "company" ? "مؤسسة / شركة" : "فرد"} />
          <IRow icon={Phone}     label="الجوال"           value={client.phone} />
          {client.email             && <IRow icon={Mail}     label="البريد"           value={client.email} />}
          {client.national_id       && <IRow icon={CreditCard} label="رقم الهوية"   value={client.national_id} />}
          {client.commercial_number && <IRow icon={FileText} label="السجل التجاري"   value={client.commercial_number} />}
          {client.unified_register_number && <IRow icon={FileText} label="الرقم الموحد" value={client.unified_register_number} />}
          {client.company_address   && <IRow icon={MapPin}   label="العنوان"         value={client.company_address} />}
          {client.company_activity  && <IRow icon={Activity} label="النشاط التجاري" value={client.company_activity} />}
          {client.notes             && <IRow icon={FileCheck} label="ملاحظات"        value={client.notes} />}
          <IRow icon={Clock} label="تاريخ التسجيل" value={formatAppDate(client.created_at)} />
        </div>
      </div>
      <div className="cl-info-card">
        <header><FileText size={13} /> المستندات</header>
        <div className="cl-info-card-body">
          {[
            { label: "السجل التجاري", path: client.commercial_register_doc },
            { label: "رخصة المنشأة", path: client.company_license_doc },
            { label: "صورة الهوية",  path: client.national_id_doc },
          ].filter(d => d.path).map(d => <DocLink key={d.label} label={d.label} path={d.path!} />)}
          {docs.map(doc => (
            <div key={doc.id} className="cl-doc">
              <FileText size={14} color="#6b7d93" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".63rem", fontWeight: 600, color: "#1a2d40" }}>{doc.filename}</div>
                <div style={{ fontSize: ".53rem", color: "#8b9dad", marginTop: 1 }}>{formatAppDate(doc.created_at)}</div>
              </div>
              {doc.signedUrl && <a href={doc.signedUrl} target="_blank" rel="noopener" className="cl-doc-link"><Download size={11} /></a>}
            </div>
          ))}
          {!client.commercial_register_doc && !client.company_license_doc && !client.national_id_doc && docs.length === 0 && (
            <p style={{ fontSize: ".65rem", color: "#b0bcc9" }}>لا توجد مستندات</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  if (!orders.length) return <Empty icon={ShoppingBag} text="لا توجد طلبات لهذا العميل" />;
  const cols = "130px 1fr 100px 120px 100px";
  return (
    <div className="cl-table">
      <div className="cl-table-head" style={{ gridTemplateColumns: cols }}>
        {["رقم الطلب","الخدمة","الجهة","الحالة","التاريخ"].map(h => <div key={h} className="cl-th">{h}</div>)}
      </div>
      {orders.map(o => {
        const cfg = S_ORD[o.status] || { label: o.status, color: "#526983", bg: "#f3f4f6" };
        return (
          <div key={o.id} className="cl-tr" style={{ gridTemplateColumns: cols }}>
            <div className="cl-td" style={{ color: "#0875dc", fontFamily: "monospace", fontWeight: 700 }}>{o.reference_no || o.id?.slice(0,8)}</div>
            <div className="cl-td">{o.service_name || o.description || "—"}</div>
            <div className="cl-td" style={{ color: "#526983" }}>{o.government_entity || "—"}</div>
            <div className="cl-td"><span className="cl-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + "33" }}>{cfg.label}</span></div>
            <div className="cl-td" style={{ color: "#526983" }}>{formatAppDate(o.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function SubsTab({ subs }: { subs: any[] }) {
  if (!subs.length) return <Empty icon={Package} text="لا توجد اشتراكات لهذا العميل" />;
  const cols = "1fr 100px 110px 100px 100px";
  return (
    <div className="cl-table">
      <div className="cl-table-head" style={{ gridTemplateColumns: cols }}>
        {["الباقة","الحالة","دورة الفوترة","المبلغ","البداية"].map(h => <div key={h} className="cl-th">{h}</div>)}
      </div>
      {subs.map(s => {
        const cfg = S_SUB[s.status] || { label: s.status, color: "#526983", bg: "#f3f4f6" };
        return (
          <div key={s.id} className="cl-tr" style={{ gridTemplateColumns: cols }}>
            <div className="cl-td" style={{ fontWeight: 700, color: "#073766" }}>{s.packages?.name || s.package_name || "—"}</div>
            <div className="cl-td"><span className="cl-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + "33" }}>{cfg.label}</span></div>
            <div className="cl-td" style={{ color: "#526983" }}>{s.billing_cycle === "monthly" ? "شهري" : s.billing_cycle === "yearly" ? "سنوي" : s.billing_cycle || "—"}</div>
            <div className="cl-td" style={{ fontWeight: 700, color: "#073766" }}>{s.amount ? new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(s.amount) : "—"}</div>
            <div className="cl-td" style={{ color: "#526983" }}>{s.start_date ? formatAppDate(s.start_date) : "—"}</div>
          </div>
        );
      })}
    </div>
  );
}

function InvoicesTab({ invoices }: { invoices: any[] }) {
  if (!invoices.length) return <Empty icon={Receipt} text="لا توجد فواتير لهذا العميل" />;
  const total = invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.total_amount, 0);
  const cols = "120px 1fr 100px 120px 100px 44px";
  return (
    <div>
      {total > 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "9px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={14} color="#15803d" />
          <span style={{ fontSize: ".67rem", color: "#15803d", fontWeight: 700 }}>إجمالي المدفوع: {new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(total)} ر.س</span>
        </div>
      )}
      <div className="cl-table">
        <div className="cl-table-head" style={{ gridTemplateColumns: cols }}>
          {["رقم الفاتورة","الخدمة","الحالة","الإجمالي","التاريخ",""].map((h,i) => <div key={i} className="cl-th">{h}</div>)}
        </div>
        {invoices.map(inv => {
          const cfg = S_INV[inv.status] || { label: inv.status, color: "#526983", bg: "#f3f4f6" };
          return (
            <div key={inv.id} className="cl-tr" style={{ gridTemplateColumns: cols }}>
              <div className="cl-td" style={{ color: "#0875dc", fontFamily: "monospace", fontWeight: 700 }}>{inv.invoice_number}</div>
              <div className="cl-td">{inv.service_name || inv.description}</div>
              <div className="cl-td"><span className="cl-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + "33" }}>{cfg.label}</span></div>
              <div className="cl-td" style={{ fontWeight: 700, color: "#073766" }}>{new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(inv.total_amount)}</div>
              <div className="cl-td" style={{ color: "#526983" }}>{formatAppDate(inv.created_at)}</div>
              <div className="cl-td" style={{ justifyContent: "center" }}>
                <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener" style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 6, background: "#eaf4ff", color: "#0875dc" }}><Eye size={11} /></a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketsTab({ tickets }: { tickets: any[] }) {
  if (!tickets.length) return <Empty icon={MessageSquare} text="لا توجد تذاكر لهذا العميل" />;
  const cols = "1fr 100px 100px 100px";
  return (
    <div className="cl-table">
      <div className="cl-table-head" style={{ gridTemplateColumns: cols }}>
        {["العنوان","الحالة","الأولوية","التاريخ"].map(h => <div key={h} className="cl-th">{h}</div>)}
      </div>
      {tickets.map(t => {
        const cfg = S_TKT[t.status] || { label: t.status, color: "#526983", bg: "#f3f4f6" };
        const pc = t.priority === "urgent" ? "#dc2626" : t.priority === "high" ? "#b45309" : "#8b9dad";
        return (
          <div key={t.id} className="cl-tr" style={{ gridTemplateColumns: cols }}>
            <div className="cl-td" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              <span style={{ fontSize: ".64rem", fontWeight: 700, color: "#073766" }}>{t.title}</span>
              <span style={{ fontSize: ".52rem", color: "#a0adb8" }}>{t.id.slice(0,8).toUpperCase()}</span>
            </div>
            <div className="cl-td"><span className="cl-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.color + "33" }}>{cfg.label}</span></div>
            <div className="cl-td" style={{ color: pc, fontWeight: 600, fontSize: ".6rem" }}>
              {t.priority === "urgent" ? "● عاجلة" : t.priority === "high" ? "● مرتفعة" : "● عادية"}
            </div>
            <div className="cl-td" style={{ color: "#526983" }}>{formatAppDate(t.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function DocsTab({ client, docs }: { client: ClientRecord; docs: any[] }) {
  const hasAny = client.commercial_register_doc || client.company_license_doc || client.national_id_doc || docs.length > 0;
  if (!hasAny) return <Empty icon={FileText} text="لا توجد مستندات مرفوعة" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { label: "السجل التجاري", path: client.commercial_register_doc },
        { label: "رخصة المنشأة", path: client.company_license_doc },
        { label: "صورة الهوية",  path: client.national_id_doc },
      ].filter(d => d.path).map(d => <DocLink key={d.label} label={d.label} path={d.path!} />)}
      {docs.map(doc => (
        <div key={doc.id} className="cl-doc">
          <FileText size={14} color="#6b7d93" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: ".65rem", fontWeight: 600, color: "#1a2d40" }}>{doc.filename}</div>
            <div style={{ fontSize: ".55rem", color: "#8b9dad", marginTop: 2 }}>{doc.original_name} · {formatAppDate(doc.created_at)}</div>
          </div>
          {doc.signedUrl && <a href={doc.signedUrl} target="_blank" rel="noopener" className="cl-doc-link"><Download size={13} /></a>}
        </div>
      ))}
    </div>
  );
}

function IRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="cl-info-row">
      <Icon size={13} color="#8b9dad" style={{ marginTop: 2, flexShrink: 0 }} />
      <div><div className="cl-info-lbl">{label}</div><div className="cl-info-val">{value}</div></div>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return <div className="cl-empty"><div><Icon size={28} style={{ opacity: .25 }} /><span style={{ fontSize: ".7rem" }}>{text}</span></div></div>;
}

function DocLink({ label, path }: { label: string; path: string }) {
  const sb = createSupabaseBrowserClient();
  const [url, setUrl] = useState("");
  useEffect(() => {
    sb.storage.from("client-documents").createSignedUrl(path, 3600).then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [path]);
  return (
    <div className="cl-doc">
      <FileText size={14} color="#6b7d93" />
      <span style={{ flex: 1, fontSize: ".65rem", color: "#344d69", fontWeight: 600 }}>{label}</span>
      {url
        ? <a href={url} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", color: "#0875dc", textDecoration: "none", background: "#eaf4ff", padding: "4px 10px", borderRadius: 6 }}><ExternalLink size={10} /> فتح</a>
        : <span style={{ fontSize: ".57rem", color: "#b0bcc9" }}>جاري...</span>
      }
    </div>
  );
}
