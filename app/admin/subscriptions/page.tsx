"use client";
import PageLoader from "@/components/page-loader";

import { useEffect, useState, useMemo } from "react";
import {
  CircleDollarSign, Search, Plus, X, Loader2, XCircle,
  Pencil, RefreshCw, Clock, Trash2, CheckCircle, AlertCircle,
  CalendarDays, BadgeDollarSign, MoreHorizontal,
} from "lucide-react";
import { formatAppDate } from "@/lib/date-format";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

type ClientRecord = { id: string; name: string; email: string | null; phone: string | null };
type PackageRecord = {
  id: string; title_ar: string; tier_ar: string; category: string;
  billing_cycle: string; price: number; features: any;
  max_employees: number; extra_employee_price: number;
};
type SubRecord = {
  id: string; client_id: string; package_id: string; status: string; employee_count: number;
  base_price: number; extra_price: number; tax_amount: number; total_price: number;
  billing_cycle: string; start_date: string; end_date: string | null;
  created_at: string; updated_at: string; updated_by: string | null;
  packages: PackageRecord | null; clients: { id: string; name: string } | null;
};
type EventRecord = {
  id: string; subscription_id: string; event_type: string;
  previous_data: any; new_data: any; price: number; notes: string;
  created_at: string; profiles: { id: string; full_name: string } | null;
};

const EVENT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  created:      { label: "إنشاء",       color: "#15803d", bg: "#f0fdf4" },
  extension:    { label: "تمديد",        color: "#b45309", bg: "#fff7ed" },
  renewal:      { label: "تجديد",        color: "#1d4ed8", bg: "#eff6ff" },
  cancellation: { label: "إلغاء",        color: "#dc2626", bg: "#fef2f2" },
  reactivation: { label: "إعادة تفعيل", color: "#15803d", bg: "#f0fdf4" },
  modification: { label: "تعديل",        color: "#64748b", bg: "#f8fafc" },
};

const STATUSES = [
  { value: "active",    label: "نشط",          color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  { value: "pending",   label: "قيد الانتظار", color: "#b45309", bg: "#fff7ed", border: "#fed7aa" },
  { value: "cancelled", label: "ملغي",          color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  { value: "expired",   label: "منتهي",         color: "#64748b", bg: "#f3f4f6", border: "#e5e7eb" },
];

const CYCLE_LABELS: Record<string, string> = {
  monthly: "شهري", yearly: "سنوي", quarterly: "ربع سنوي", "one-time": "مرة واحدة",
};

type FilterTab = "الكل" | "active" | "pending" | "cancelled" | "expired";
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "الكل",      label: "الكل" },
  { id: "active",    label: "نشط" },
  { id: "pending",   label: "قيد الانتظار" },
  { id: "cancelled", label: "ملغي" },
  { id: "expired",   label: "منتهي" },
];

function sCfg(s: string) { return STATUSES.find(x => x.value === s) || STATUSES[3]; }

const SEL: React.CSSProperties = {
  height: 36, border: "1px solid #dfe8f1", borderRadius: 8,
  padding: "0 12px 0 28px", font: "inherit", fontSize: ".68rem",
  color: "#1a2d40", background: "#fff", outline: "none",
  WebkitAppearance: "none", appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "left 10px center",
};
const FIELD: React.CSSProperties = {
  width: "100%", height: 38, border: "1px solid #dfe8f1", borderRadius: 9,
  padding: "0 12px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none",
};

export default function AdminSubscriptionsPage() {
  const { loading: authLoading } = useRoleGuard("admin");
  const [subs,     setSubs]     = useState<SubRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [clients,  setClients]  = useState<ClientRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [tab,      setTab]      = useState<FilterTab>("الكل");
  const [search,   setSearch]   = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<SubRecord | null>(null);
  const [form, setForm] = useState({
    client_id: "", package_id: "", employee_count: 0,
    status: "active", start_date: "", end_date: "",
    extension_price: "", extension_notes: "",
  });
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState("");
  const [showHistory,   setShowHistory]   = useState(false);
  const [historySub,    setHistorySub]    = useState<SubRecord | null>(null);
  const [historyEvents, setHistoryEvents] = useState<EventRecord[]>([]);
  const [histLoading,   setHistLoading]   = useState(false);
  const [histHint,      setHistHint]      = useState<string | null>(null);
  const [openMenu,      setOpenMenu]      = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

  async function load() {
    setLoading(true);
    try {
      const [s, c, p] = await Promise.all([
        fetch("/api/admin/subscriptions"),
        fetch("/api/admin/clients"),
        fetch("/api/admin/packages"),
      ]);
      if (s.ok) { const d = await s.json(); setSubs(d.data || []); }
      if (c.ok) { const d = await c.json(); setClients(d.data || []); }
      if (p.ok) { const d = await p.json(); setPackages(d.data || []); }
    } catch { } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.package_id) { setMsg("error:اختر العميل والباقة"); return; }
    setSaving(true); setMsg("");
    try {
      if (editTarget) {
        const body: Record<string, any> = { id: editTarget.id, status: form.status, employee_count: Number(form.employee_count), end_date: form.end_date };
        if (form.extension_price) { body.extension_price = Number(form.extension_price); body.extension_notes = form.extension_notes; }
        const res = await fetch("/api/admin/subscriptions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).error);
        setMsg("success:تم تحديث الاشتراك بنجاح");
      } else {
        const res = await fetch("/api/admin/subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, employee_count: Number(form.employee_count) }) });
        if (!res.ok) throw new Error((await res.json()).error);
        setMsg("success:تم إنشاء الاشتراك بنجاح");
      }
      setShowModal(false); setEditTarget(null);
      setForm({ client_id: "", package_id: "", employee_count: 0, status: "active", start_date: "", end_date: "", extension_price: "", extension_notes: "" });
      load();
    } catch (err) { setMsg("error:" + (err instanceof Error ? err.message : "فشل")); }
    setSaving(false);
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا الاشتراك نهائياً؟")) return;
    try { const r = await fetch(`/api/admin/subscriptions/${id}`, { method: "DELETE" }); if (r.ok) load(); } catch { }
  }

  async function handleCancel(id: string) {
    if (!confirm("إلغاء هذا الاشتراك؟")) return;
    try {
      const r = await fetch("/api/admin/subscriptions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: "cancelled" }) });
      if (r.ok) load();
    } catch { }
  }

  function openHistory(sub: SubRecord) {
    setHistorySub(sub); setHistLoading(true); setShowHistory(true); setHistHint(null);
    fetch(`/api/admin/subscriptions/events?subscription_id=${sub.id}`)
      .then(r => r.json()).then(d => { setHistoryEvents(d.data || []); setHistHint(d.hint || null); })
      .catch(() => {}).finally(() => setHistLoading(false));
  }

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const pkgMap    = useMemo(() => Object.fromEntries(packages.map(p => [p.id, p])), [packages]);

  const stats = useMemo(() => ({
    total:  subs.length,
    active: subs.filter(s => s.status === "active").length,
    mrr: subs.filter(s => s.status === "active").reduce((a, s) => {
      if (s.billing_cycle === "one-time")  return a;
      if (s.billing_cycle === "yearly")    return a + (s.total_price || 0) / 12;
      if (s.billing_cycle === "quarterly") return a + (s.total_price || 0) / 3;
      return a + (s.total_price || 0);
    }, 0),
    expiring: subs.filter(s => { if (!s.end_date) return false; const d = (new Date(s.end_date).getTime() - Date.now()) / 86400000; return d >= 0 && d <= 30; }).length,
  }), [subs]);

  const tabCount = (t: FilterTab) => t === "الكل" ? subs.length : subs.filter(s => s.status === t).length;

  const visible = useMemo(() => subs.filter(s => {
    const cl = s.clients?.name || clientMap[s.client_id]?.name || "";
    const pk = s.packages?.title_ar || pkgMap[s.package_id]?.title_ar || "";
    const q  = search.trim().toLocaleLowerCase("ar");
    return (!q || cl.toLocaleLowerCase("ar").includes(q) || pk.includes(search))
        && (tab === "الكل" || s.status === tab);
  }), [subs, search, tab, clientMap, pkgMap]);

  if (authLoading) return <PageLoader text="جاري تحميل الاشتراكات..." />;

  return (
    <div className="sub-shell" dir="rtl">
      <style>{`
        .sub-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;color:#173d65;overflow:hidden}
        .sub-head{padding:18px 24px 14px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff);flex-shrink:0}
        .sub-head-main{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
        .sub-eyebrow{margin:0 0 4px;color:#0f766e;font-size:.66rem;font-weight:900}
        .sub-head h1{margin:0 0 5px;font-size:1.52rem;color:#073766}
        .sub-head p{margin:0;color:#7f8e9f;font-size:.72rem}
        .sub-head-actions{display:flex;gap:8px;align-items:center}
        .sub-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer}
        .sub-btn.primary{background:#073766;border-color:#073766;color:#fff}
        .sub-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .sub-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .sub-kpi i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
        .sub-kpi small,.sub-kpi strong{display:block}.sub-kpi small{font-size:.56rem;color:#8190a1;font-weight:800}.sub-kpi strong{font-size:1.22rem;color:#073766;line-height:1;margin-top:4px}
        /* Body */
        .sub-body{min-height:0;overflow:auto;padding:16px 20px 20px}
        /* Toolbar */
        .sub-toolbar{background:#fff;border:1px solid #dfe8f1;border-radius:14px 14px 0 0;padding:12px 14px;border-bottom:1px solid #edf2f7;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .sub-tabs{display:flex;gap:4px;flex-wrap:wrap}
        .sub-tab{height:28px;border:1px solid #dfe8f1;border-radius:7px;background:#f8fafc;color:#65788c;padding:0 10px;font:inherit;font-size:.58rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;cursor:pointer}
        .sub-tab.active{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .sub-search{height:34px;border:1px solid #dfe8f1;border-radius:8px;background:#f8fafc;display:flex;align-items:center;gap:7px;padding:0 10px;color:#8b9dad;min-width:200px}
        .sub-search input{border:0;outline:0;background:transparent;font:inherit;font-size:.67rem;width:100%;color:#173d65}
        .sub-count{font-size:.62rem;color:#8b9dad;margin-right:auto;white-space:nowrap}
        /* Table */
        .sub-table-wrap{background:#fff;border:1px solid #dfe8f1;border-radius:0 0 14px 14px;overflow:hidden}
        .sub-table{width:100%;border-collapse:collapse;font-size:.67rem}
        .sub-table thead tr{background:#f4f7fb;border-bottom:1px solid #e4ebf2}
        .sub-table th{padding:10px 14px;text-align:right;font-weight:800;color:#425c76;font-size:.6rem;white-space:nowrap}
        .sub-table th.ctr{text-align:center}
        .sub-table tbody tr{border-bottom:1px solid #f0f4f8;transition:background .12s}
        .sub-table tbody tr:last-child{border-bottom:none}
        .sub-table tbody tr:hover{background:#fafbfd}
        .sub-table td{padding:12px 14px;vertical-align:middle}
        .sub-table td.ctr{text-align:center}
        /* Client cell */
        .sub-client{display:flex;align-items:center;gap:9px}
        .sub-av{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;font-size:.65rem;font-weight:800;flex-shrink:0}
        .sub-client-name{font-weight:700;color:#173d65;font-size:.7rem;white-space:nowrap}
        .sub-client-type{font-size:.56rem;color:#8b9dad;margin-top:1px}
        /* Package cell */
        .sub-pkg-name{font-weight:700;color:#073766;font-size:.68rem}
        .sub-pkg-cat{font-size:.56rem;color:#8b9dad;margin-top:1px}
        /* Status pill */
        .sub-pill{display:inline-flex;align-items:center;border:1px solid;border-radius:999px;padding:3px 10px;font-size:.57rem;font-weight:800;white-space:nowrap}
        /* Price */
        .sub-price{font-weight:800;color:#073766;font-size:.78rem}
        .sub-price-unit{font-size:.55rem;color:#8b9dad}
        /* Period */
        .sub-period{font-size:.6rem;color:#526983;line-height:1.6}
        .sub-period.warn{display:inline-flex;align-items:center;gap:4px;background:#fff7ed;color:#b45309;font-weight:800;padding:2px 8px;border-radius:20px;border:1px solid #fed7aa;font-size:.57rem}
        /* Actions */
        .sub-actions{display:inline-flex;gap:4px;justify-content:center;align-items:center}
        .sub-icon-btn{width:30px;height:30px;border:1px solid #e5eaf0;border-radius:8px;background:#fff;color:#526983;cursor:pointer;display:grid;place-items:center;transition:border-color .12s,background .12s,color .12s;flex-shrink:0}
        .sub-icon-btn:hover{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .sub-icon-btn.hist:hover{background:#f0fdfa;border-color:#99f6e4;color:#0f766e}
        .sub-menu-wrap{position:relative}
        .sub-menu-btn{width:30px;height:30px;border:1px solid #e5eaf0;border-radius:8px;background:#fff;color:#8b9dad;cursor:pointer;display:grid;place-items:center;transition:border-color .12s,background .12s}
        .sub-menu-btn:hover,.sub-menu-btn.open{background:#f4f7fb;border-color:#d0dae6;color:#526983}
        .sub-menu{position:absolute;top:calc(100% + 5px);left:0;min-width:130px;background:#fff;border:1px solid #e4ebf2;border-radius:10px;box-shadow:0 8px 24px rgba(7,55,102,.1);z-index:50;overflow:hidden;animation:fadeIn .12s}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .sub-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;background:none;font:inherit;font-size:.63rem;font-weight:700;cursor:pointer;color:#526983;text-align:right;transition:background .1s}
        .sub-menu-item:hover{background:#f4f7fb}
        .sub-menu-item.danger{color:#dc2626}
        .sub-menu-item.danger:hover{background:#fef2f2}
        .sub-menu-sep{height:1px;background:#f0f4f8;margin:3px 0}
        /* Empty */
        .sub-empty{padding:80px 20px;text-align:center;color:#8b9dad;background:#fff}
        /* Modals */
        .sub-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:900;display:grid;place-items:center;padding:20px}
        .sub-modal{background:#fff;border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.18)}
        .sub-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid #eef2f6}
        .sub-modal-title{font-size:.92rem;font-weight:800;color:#073766}
        .sub-modal-close{border:0;background:#f5f8fc;border-radius:9px;width:32px;height:32px;cursor:pointer;display:grid;place-items:center;color:#526983}
        .sub-modal-body{padding:20px 24px 24px;display:flex;flex-direction:column;gap:13px;overflow-y:auto}
        .sub-field label{display:block;font-size:.62rem;font-weight:700;color:#425c76;margin-bottom:5px}
        .sub-2col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .sub-summary{background:#f8fafc;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;border:1px solid #eef2f6}
        .sub-summary-row{display:flex;justify-content:space-between;font-size:.65rem}
        .sub-save{flex:1;height:40px;border:0;border-radius:10px;background:#073766;color:#fff;font:inherit;font-size:.73rem;font-weight:700;cursor:pointer}
        .sub-save:disabled{background:#e5eaf0;color:#aab5c3;cursor:not-allowed}
        .sub-cancel-btn{height:40px;padding:0 18px;border:1px solid #dfe7ef;border-radius:10px;background:#fff;color:#526983;font:inherit;font-size:.7rem;cursor:pointer}
        /* History */
        .sub-timeline{position:relative}
        .sub-timeline::before{content:"";position:absolute;top:16px;bottom:16px;right:15px;width:2px;background:#eef2f6}
        .sub-tl-item{display:flex;gap:14px;padding-bottom:14px}
        .sub-tl-dot{position:relative;z-index:1;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid;flex-shrink:0}
        .sub-tl-dot-inner{width:8px;height:8px;border-radius:50%}
        .sub-tl-card{flex:1;background:#f8fafc;border-radius:11px;padding:11px 14px;border:1px solid #eef2f6}
        /* Notice toast */
        .sub-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:10px;font-size:.72rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:1000;animation:slideUp .2s}
        @keyframes slideUp{from{transform:translateX(-50%) translateY(10px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Header ── */}
      <div className="sub-head">
        <div className="sub-head-main">
          <div>
            <p className="sub-eyebrow">إدارة النظام</p>
            <h1>الاشتراكات</h1>
            <p>إدارة اشتراكات المنشآت في الباقات · {subs.length} اشتراك</p>
          </div>
          <div className="sub-head-actions">
            <button className="sub-btn" onClick={() => { setLoading(true); load(); }}><RefreshCw size={14} /> تحديث</button>
            <button className="sub-btn primary" onClick={() => {
              setEditTarget(null);
              setForm({ client_id: "", package_id: "", employee_count: 0, status: "active", start_date: "", end_date: "", extension_price: "", extension_notes: "" });
              setShowModal(true); setMsg("");
            }}><Plus size={15} /> اشتراك جديد</button>
          </div>
        </div>
        <div className="sub-kpis">
          {[
            { icon: CircleDollarSign, label: "إجمالي الاشتراكات", value: stats.total,   color: "#0875dc", bg: "#dbeafe",   val: String(stats.total) },
            { icon: CheckCircle,      label: "اشتراكات نشطة",     value: stats.active,  color: "#15803d", bg: "#bbf7d0",   val: String(stats.active) },
            { icon: BadgeDollarSign,  label: "إيراد شهري (MRR)",  value: stats.mrr,     color: "#0f766e", bg: "#99f6e4",   val: Math.round(stats.mrr).toLocaleString("ar-SA") + " ر.س" },
            { icon: CalendarDays,     label: "تنتهي خلال 30 يوم", value: stats.expiring,color: "#b45309", bg: "#fde68a",   val: String(stats.expiring) },
          ].map(k => (
            <div key={k.label} className="sub-kpi">
              <i style={{ background: k.bg }}><k.icon size={16} color={k.color} /></i>
              <div><small>{k.label}</small><strong style={{ color: k.color }}>{k.val}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="sub-body">

        {/* Toolbar */}
        <div className="sub-toolbar">
          <div className="sub-tabs">
            {FILTER_TABS.map(f => (
              <button key={f.id} className={`sub-tab${tab === f.id ? " active" : ""}`} onClick={() => setTab(f.id)}>
                {f.label} <span style={{ opacity: .7 }}>{tabCount(f.id)}</span>
              </button>
            ))}
          </div>
          <label className="sub-search">
            <Search size={13} color="#a0adb8" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالعميل أو الباقة..." />
          </label>
          {(search || tab !== "الكل") && (
            <button className="sub-act" onClick={() => { setSearch(""); setTab("الكل"); }}>
              <X size={12} /> مسح
            </button>
          )}
          <span className="sub-count">{visible.length} نتيجة</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="sub-empty" style={{ borderRadius: "0 0 14px 14px", border: "1px solid #dfe8f1", borderTop: "none" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite", opacity: .4, marginBottom: 10 }} />
            <p style={{ fontSize: ".72rem" }}>جاري التحميل...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="sub-empty" style={{ borderRadius: "0 0 14px 14px", border: "1px solid #dfe8f1", borderTop: "none" }}>
            <CircleDollarSign size={40} style={{ opacity: .2, marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: ".78rem", fontWeight: 600 }}>{search || tab !== "الكل" ? "لا توجد نتائج مطابقة" : "لا توجد اشتراكات بعد"}</p>
            {!search && tab === "الكل" && <p style={{ margin: "6px 0 0", fontSize: ".65rem" }}>اضغط «اشتراك جديد» لإنشاء أول اشتراك</p>}
          </div>
        ) : (
          <div className="sub-table-wrap">
            <table className="sub-table">
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الباقة</th>
                  <th className="ctr">الحالة</th>
                  <th className="ctr">الدورة</th>
                  <th className="ctr">المبلغ</th>
                  <th className="ctr">الفترة</th>
                  <th className="ctr">آخر تعديل</th>
                  <th className="ctr">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(sub => {
                  const cl  = sub.clients?.name || clientMap[sub.client_id]?.name || "—";
                  const pkg = sub.packages?.title_ar || pkgMap[sub.package_id]?.title_ar || "—";
                  const sc  = sCfg(sub.status);
                  const expiringSoon = sub.end_date && (() => { const d = (new Date(sub.end_date!).getTime() - Date.now()) / 86400000; return d >= 0 && d <= 14; })();
                  const avColors = [
                    { bg: "#dbeafe", c: "#1d4ed8" }, { bg: "#dcfce7", c: "#15803d" },
                    { bg: "#fef9c3", c: "#a16207" }, { bg: "#f0fdfa", c: "#0f766e" },
                  ];
                  const avc = avColors[cl.charCodeAt(0) % avColors.length];

                  return (
                    <tr key={sub.id}>
                      {/* العميل */}
                      <td>
                        <div className="sub-client">
                          <div className="sub-av" style={{ background: avc.bg, color: avc.c }}>{cl.charAt(0)}</div>
                          <div>
                            <div className="sub-client-name">{cl}</div>
                            <div className="sub-client-type">{sub.employee_count > 0 ? `${sub.employee_count} موظف` : "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* الباقة */}
                      <td>
                        <div className="sub-pkg-name">{pkg}</div>
                        {sub.packages?.category && <div className="sub-pkg-cat">{sub.packages.category}</div>}
                      </td>

                      {/* الحالة */}
                      <td className="ctr">
                        <span className="sub-pill" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>{sc.label}</span>
                      </td>

                      {/* الدورة */}
                      <td className="ctr" style={{ color: "#526983", fontSize: ".63rem" }}>
                        {CYCLE_LABELS[sub.billing_cycle] || sub.billing_cycle}
                      </td>

                      {/* المبلغ */}
                      <td className="ctr">
                        <div className="sub-price">{sub.total_price?.toLocaleString("ar-SA")}</div>
                        <div className="sub-price-unit">ر.س</div>
                      </td>

                      {/* الفترة */}
                      <td className="ctr">
                        <div className="sub-period">{sub.start_date}</div>
                        {sub.end_date
                          ? <div className={`sub-period${expiringSoon ? " warn" : ""}`}>{expiringSoon ? "⚠ " : ""}{sub.end_date}</div>
                          : <div className="sub-period" style={{ color: "#a0adb8" }}>بلا انتهاء</div>}
                      </td>

                      {/* آخر تعديل */}
                      <td className="ctr">
                        {sub.updated_at !== sub.created_at ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                            <RefreshCw size={10} color="#d97706" />
                            <span style={{ fontSize: ".58rem", color: "#d97706", fontWeight: 600 }}>{formatAppDate(sub.updated_at)}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: ".58rem", color: "#a0adb8" }}>{formatAppDate(sub.created_at)}</span>
                        )}
                      </td>

                      {/* الإجراءات */}
                      <td className="ctr">
                        <div className="sub-actions">
                          <button className="sub-icon-btn" title="تعديل" onClick={() => {
                            setEditTarget(sub);
                            setForm({ client_id: sub.client_id, package_id: sub.package_id, employee_count: sub.employee_count, status: sub.status, start_date: sub.start_date, end_date: sub.end_date || "", extension_price: "", extension_notes: "" });
                            setShowModal(true); setMsg("");
                          }}><Pencil size={13} /></button>
                          <button className="sub-icon-btn hist" title="السجل" onClick={() => openHistory(sub)}><Clock size={13} /></button>
                          <div className="sub-menu-wrap">
                            <button className={`sub-menu-btn${openMenu === sub.id ? " open" : ""}`} title="المزيد"
                              onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === sub.id ? null : sub.id); }}>
                              <MoreHorizontal size={14} />
                            </button>
                            {openMenu === sub.id && (
                              <div className="sub-menu" onClick={e => e.stopPropagation()}>
                                {sub.status === "active" && (
                                  <button className="sub-menu-item danger" onClick={() => { setOpenMenu(null); handleCancel(sub.id); }}>
                                    <XCircle size={13} /> إلغاء الاشتراك
                                  </button>
                                )}
                                {sub.status === "active" && <div className="sub-menu-sep" />}
                                <button className="sub-menu-item danger" onClick={() => { setOpenMenu(null); handleDelete(sub.id); }}>
                                  <Trash2 size={13} /> حذف نهائي
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {msg && (
        <div className="sub-toast" style={{
          background: msg.startsWith("success") ? "#f0fdf4" : "#fef2f2",
          color: msg.startsWith("success") ? "#15803d" : "#dc2626",
          border: `1px solid ${msg.startsWith("success") ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {msg.startsWith("success") ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.replace(/^(success|error):/, "")}
        </div>
      )}

      {/* ── History Modal ── */}
      {showHistory && historySub && (
        <div className="sub-modal-bg" onClick={() => setShowHistory(false)}>
          <div className="sub-modal" style={{ width: "min(560px,100%)", maxHeight: "82vh", display: "flex", flexDirection: "column", direction: "rtl" }} onClick={e => e.stopPropagation()}>
            <div className="sub-modal-head">
              <div>
                <div className="sub-modal-title">سجل الاشتراك</div>
                <div style={{ fontSize: ".63rem", color: "#64748b", marginTop: 4 }}>
                  {clientMap[historySub.client_id]?.name || "—"}
                  <span style={{ color: "#cbd5e1", margin: "0 6px" }}>·</span>
                  {pkgMap[historySub.package_id]?.title_ar || "—"}
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                  {[
                    STATUSES.find(s => s.value === historySub.status)?.label || historySub.status,
                    `${historySub.employee_count} موظف`,
                    `${historySub.total_price?.toLocaleString()} ر.س`,
                  ].map((chip, i) => (
                    <span key={i} style={{ fontSize: ".58rem", background: "#f4f7fb", border: "1px solid #e4ebf2", padding: "2px 10px", borderRadius: 20, color: "#425c76", fontWeight: 600 }}>{chip}</span>
                  ))}
                </div>
              </div>
              <button className="sub-modal-close" onClick={() => setShowHistory(false)}><X size={16} /></button>
            </div>
            <div style={{ padding: "18px 24px 24px", overflowY: "auto" }}>
              {histLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#8b9dad" }} /></div>
              ) : histHint === "run_migration" ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "#64748b" }}>
                  <Clock size={36} color="#d97706" style={{ opacity: .5, marginBottom: 10 }} />
                  <p style={{ fontSize: ".72rem", margin: "0 0 4px" }}>جدول الأحداث لم يتم تفعيله بعد</p>
                  <p style={{ fontSize: ".62rem", color: "#aab5c3", margin: 0 }}>شغّل ملف الميجريشن في SQL Editor</p>
                </div>
              ) : historyEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#a0adb8", fontSize: ".7rem" }}>لا توجد أحداث مسجّلة</div>
              ) : (
                <div className="sub-timeline">
                  {historyEvents.map((ev, idx) => {
                    const el = EVENT_LABELS[ev.event_type] || { label: ev.event_type, color: "#64748b", bg: "#f8fafc" };
                    return (
                      <div key={ev.id} className="sub-tl-item" style={{ paddingBottom: idx < historyEvents.length - 1 ? 14 : 0 }}>
                        <div className="sub-tl-dot" style={{ background: el.bg, borderColor: el.color }}>
                          <div className="sub-tl-dot-inner" style={{ background: el.color }} />
                        </div>
                        <div className="sub-tl-card">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ev.notes ? 5 : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: ".62rem", fontWeight: 700, color: el.color, background: el.bg, padding: "2px 9px", borderRadius: 6 }}>{el.label}</span>
                              {ev.price > 0 && <span style={{ fontSize: ".68rem", fontWeight: 800, color: "#073766" }}>{ev.price.toLocaleString()} ر.س</span>}
                            </div>
                            <span style={{ fontSize: ".55rem", color: "#94a3b8" }}>{formatAppDate(ev.created_at)}</span>
                          </div>
                          {ev.notes && <div style={{ fontSize: ".62rem", color: "#64748b" }}>{ev.notes}</div>}
                          {ev.profiles?.full_name && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#dbeafe", display: "grid", placeItems: "center", fontSize: ".5rem", fontWeight: 700, color: "#1d4ed8" }}>
                                {ev.profiles.full_name.charAt(0)}
                              </div>
                              <span style={{ fontSize: ".55rem", color: "#94a3b8" }}>{ev.profiles.full_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="sub-modal-bg" onClick={() => setShowModal(false)}>
          <div className="sub-modal" style={{ width: "min(480px,100%)", maxHeight: "90vh", direction: "rtl" }} onClick={e => e.stopPropagation()}>
            <div className="sub-modal-head">
              <div className="sub-modal-title">{editTarget ? "تعديل الاشتراك" : "اشتراك جديد"}</div>
              <button className="sub-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: "contents" }}>
              <div className="sub-modal-body">
                {editTarget ? (
                  <>
                    <div className="sub-summary">
                      {[
                        ["المنشأة",       clientMap[editTarget.client_id]?.name || "—"],
                        ["الباقة",        pkgMap[editTarget.package_id]?.title_ar || "—"],
                        ["تاريخ البداية", editTarget.start_date],
                      ].map(([k, v]) => (
                        <div key={k} className="sub-summary-row">
                          <span style={{ color: "#8b9dad" }}>{k}</span>
                          <span style={{ color: "#1a2d40", fontWeight: 700 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="sub-2col">
                      <div className="sub-field"><label>عدد الموظفين</label><input type="number" min={0} value={form.employee_count} onChange={e => setForm({ ...form, employee_count: Number(e.target.value) })} style={FIELD} /></div>
                      <div className="sub-field"><label>الحالة</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...FIELD, ...SEL, width: "100%", height: 38 }}>
                          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="sub-field"><label>تاريخ النهاية</label><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={FIELD} /></div>
                    {form.end_date && form.end_date !== (editTarget.end_date || "") && (() => {
                      const pkg = pkgMap[editTarget.package_id];
                      const oldEnd = new Date(editTarget.end_date || editTarget.start_date);
                      const newEnd = new Date(form.end_date);
                      const days = Math.max(0, Math.round((newEnd.getTime() - oldEnd.getTime()) / 86400000));
                      const cycleDays = pkg?.billing_cycle === "yearly" ? 365 : pkg?.billing_cycle === "quarterly" ? 90 : 30;
                      const calc = pkg && days > 0 ? Math.round((pkg.price / cycleDays) * days) : 0;
                      return (
                        <>
                          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #bbf7d0" }}>
                            <span style={{ fontSize: ".62rem", color: "#15803d", fontWeight: 700 }}>قيمة التمديد المحتسبة</span>
                            <span style={{ fontSize: ".82rem", color: "#15803d", fontWeight: 800 }}>{calc.toLocaleString()} ر.س</span>
                          </div>
                          <div className="sub-2col">
                            <div className="sub-field"><label>مبلغ إضافي</label><input type="number" min={0} value={form.extension_price} onChange={e => setForm({ ...form, extension_price: e.target.value })} placeholder="0" style={FIELD} /></div>
                            <div className="sub-field"><label>الإجمالي</label>
                              <div style={{ ...FIELD, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 700, color: "#073766" }}>
                                {(calc + (Number(form.extension_price) || 0)).toLocaleString()} ر.س
                              </div>
                            </div>
                          </div>
                          <div className="sub-field"><label>ملاحظات</label><input value={form.extension_notes} onChange={e => setForm({ ...form, extension_notes: e.target.value })} placeholder="سبب التمديد..." style={FIELD} /></div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <div className="sub-field"><label>المنشأة *</label>
                      <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required style={{ ...FIELD, ...SEL, width: "100%", height: 38 }}>
                        <option value="">اختر المنشأة</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}
                      </select>
                    </div>
                    <div className="sub-field"><label>الباقة *</label>
                      <select value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} required style={{ ...FIELD, ...SEL, width: "100%", height: 38 }}>
                        <option value="">اختر الباقة</option>
                        {packages.map(p => <option key={p.id} value={p.id}>{p.title_ar} — {p.price?.toLocaleString()} ر.س / {CYCLE_LABELS[p.billing_cycle] || p.billing_cycle}</option>)}
                      </select>
                    </div>
                    <div className="sub-2col">
                      <div className="sub-field"><label>عدد الموظفين</label><input type="number" min={0} value={form.employee_count} onChange={e => setForm({ ...form, employee_count: Number(e.target.value) })} style={FIELD} /></div>
                      <div className="sub-field"><label>الحالة</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...FIELD, ...SEL, width: "100%", height: 38 }}>
                          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="sub-2col">
                      <div className="sub-field"><label>تاريخ البداية</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={FIELD} /></div>
                      <div className="sub-field"><label>تاريخ النهاية</label><input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={FIELD} /></div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, padding: "0 24px 22px" }}>
                <button type="submit" className="sub-save" disabled={saving}>{saving ? "جاري الحفظ..." : editTarget ? "حفظ التغييرات" : "إنشاء الاشتراك"}</button>
                <button type="button" className="sub-cancel-btn" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
