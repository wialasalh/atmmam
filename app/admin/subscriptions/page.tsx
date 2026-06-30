"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CircleDollarSign, Search, Plus, X, Loader2, XCircle,
  Pencil, RefreshCw, Clock, Trash2, CheckCircle, AlertCircle,
  TrendingUp, Users, CalendarDays, BadgeDollarSign
} from "lucide-react";
import { formatAppDate } from "@/lib/date-format";

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
  created:      { label: "إنشاء",         color: "#15803d", bg: "#f0fdf4" },
  extension:    { label: "تمديد",          color: "#b45309", bg: "#fff7ed" },
  renewal:      { label: "تجديد",          color: "#1d4ed8", bg: "#eff6ff" },
  cancellation: { label: "إلغاء",          color: "#dc2626", bg: "#fef2f2" },
  reactivation: { label: "إعادة تفعيل",   color: "#15803d", bg: "#f0fdf4" },
  modification: { label: "تعديل",          color: "#64748b", bg: "#f8fafc" },
};

const STATUSES = [
  { value: "active",    label: "نشط",            color: "#15803d", bg: "#f0fdf4",  border: "#bbf7d0" },
  { value: "pending",   label: "قيد الانتظار",   color: "#b45309", bg: "#fff7ed",  border: "#fed7aa" },
  { value: "cancelled", label: "ملغي",            color: "#dc2626", bg: "#fef2f2",  border: "#fecaca" },
  { value: "expired",   label: "منتهي",           color: "#64748b", bg: "#f3f4f6",  border: "#e5e7eb" },
];

const CYCLE_LABELS: Record<string, string> = {
  monthly: "شهري", yearly: "سنوي", quarterly: "ربع سنوي", "one-time": "مرة واحدة",
};

function statusCfg(s: string) {
  return STATUSES.find(x => x.value === s) || STATUSES[3];
}

const SEL_STYLE = {
  height: 36, border: "1px solid #e5eaf0", borderRadius: 8,
  padding: "0 28px 0 10px", font: "inherit", fontSize: ".68rem",
  color: "#1a2d40", background: "#fff", outline: "none",
  WebkitAppearance: "none" as const, appearance: "none" as const,
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat" as const, backgroundPosition: "left 10px center",
};

const FIELD_STYLE = {
  width: "100%", height: 38, border: "1px solid #dfe7ef", borderRadius: 9,
  padding: "0 12px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box" as const, outline: "none",
};

export default function AdminSubscriptionsPage() {
  const [subs,          setSubs]          = useState<SubRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [clients,       setClients]       = useState<ClientRecord[]>([]);
  const [packages,      setPackages]      = useState<PackageRecord[]>([]);
  const [showModal,     setShowModal]     = useState(false);
  const [editTarget,    setEditTarget]    = useState<SubRecord | null>(null);
  const [form, setForm] = useState({
    client_id: "", package_id: "", employee_count: 0,
    status: "active", start_date: "", end_date: "",
    extension_price: "", extension_notes: "",
  });
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState("");
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [showHistory,   setShowHistory]   = useState(false);
  const [historySub,    setHistorySub]    = useState<SubRecord | null>(null);
  const [historyEvents, setHistoryEvents] = useState<EventRecord[]>([]);
  const [historyLoading,setHistoryLoading]= useState(false);
  const [historyHint,   setHistoryHint]   = useState<string | null>(null);

  useEffect(() => { load(); }, []);

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
    } catch { /* network error */ } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.package_id) { setMsg("error:اختر العميل والباقة"); return; }
    setSaving(true); setMsg("");
    try {
      if (editTarget) {
        const body: Record<string, any> = {
          id: editTarget.id, status: form.status,
          employee_count: Number(form.employee_count), end_date: form.end_date,
        };
        if (form.extension_price) {
          body.extension_price = Number(form.extension_price);
          body.extension_notes = form.extension_notes;
        }
        const res = await fetch("/api/admin/subscriptions", {
          method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setMsg("success:تم تحديث الاشتراك بنجاح");
      } else {
        const res = await fetch("/api/admin/subscriptions", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...form, employee_count: Number(form.employee_count) }),
        });
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
    if (!confirm("حذف هذا الاشتراك نهائياً؟ لا يمكن التراجع.")) return;
    try { const r = await fetch(`/api/admin/subscriptions/${id}`, { method: "DELETE" }); if (r.ok) load(); } catch { /**/ }
  }

  async function handleCancel(id: string) {
    if (!confirm("إلغاء هذا الاشتراك؟")) return;
    try {
      const r = await fetch("/api/admin/subscriptions", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" }),
      });
      if (r.ok) load();
    } catch { /**/ }
  }

  function openHistory(sub: SubRecord) {
    setHistorySub(sub); setHistoryLoading(true); setShowHistory(true); setHistoryHint(null);
    fetch(`/api/admin/subscriptions/events?subscription_id=${sub.id}`)
      .then(r => r.json())
      .then(d => { setHistoryEvents(d.data || []); setHistoryHint(d.hint || null); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const pkgMap    = useMemo(() => Object.fromEntries(packages.map(p => [p.id, p])), [packages]);

  const visible = useMemo(() => subs.filter(s => {
    const cl = s.clients?.name || clientMap[s.client_id]?.name || "";
    const pk = s.packages?.title_ar || pkgMap[s.package_id]?.title_ar || "";
    const q = search.toLowerCase();
    return (!search || cl.toLowerCase().includes(q) || pk.includes(search))
        && (!statusFilter || s.status === statusFilter);
  }), [subs, search, statusFilter, clientMap, pkgMap]);

  // Stats
  const stats = useMemo(() => ({
    total:     subs.length,
    active:    subs.filter(s => s.status === "active").length,
    mrr: subs.filter(s => s.status === "active").reduce((a, s) => {
      if (s.billing_cycle === "one-time") return a;
      if (s.billing_cycle === "yearly")   return a + (s.total_price || 0) / 12;
      if (s.billing_cycle === "quarterly")return a + (s.total_price || 0) / 3;
      return a + (s.total_price || 0); // monthly
    }, 0),
    expiringSoon: subs.filter(s => {
      if (!s.end_date) return false;
      const days = (new Date(s.end_date).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 30;
    }).length,
  }), [subs]);

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#073766" }}>الاشتراكات</h1>
          <p style={{ margin: "4px 0 0", fontSize: ".72rem", color: "#8b9dad" }}>إدارة اشتراكات المنشآت في الباقات</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setForm({ client_id: "", package_id: "", employee_count: 0, status: "active", start_date: "", end_date: "", extension_price: "", extension_notes: "" }); setShowModal(true); setMsg(""); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 20px", border: 0, borderRadius: 10, background: "#073766", color: "#fff", font: "inherit", fontSize: ".72rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
          <Plus size={15} /> اشتراك جديد
        </button>
      </div>

      {/* ── Stats Bar ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { icon: <CircleDollarSign size={18} color="#0875dc" />, bg: "#eaf4ff", label: "إجمالي الاشتراكات", value: stats.total, unit: "" },
            { icon: <CheckCircle size={18} color="#15803d" />, bg: "#f0fdf4", label: "اشتراكات نشطة", value: stats.active, unit: "" },
            { icon: <BadgeDollarSign size={18} color="#0f766e" />, bg: "#f0fdfa", label: "إيرادات شهرية (MRR)", value: Math.round(stats.mrr).toLocaleString("ar-SA"), unit: " ر.س" },
            { icon: <CalendarDays size={18} color="#b45309" />, bg: "#fff7ed", label: "تنتهي خلال 30 يوم", value: stats.expiringSoon, unit: "" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8edf4", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: ".6rem", color: "#8b9dad", fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#073766", lineHeight: 1.2 }}>{s.value}{s.unit}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "#aab5c3", pointerEvents: "none" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالعميل أو اسم الباقة..."
            style={{ ...FIELD_STYLE, paddingRight: 34 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{...SEL_STYLE, paddingRight: 12, paddingLeft: 32}}>
          <option value="">كل الحالات</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); }}
            style={{ height: 36, padding: "0 12px", border: "1px solid #e5eaf0", borderRadius: 8, background: "#fff", color: "#64748b", font: "inherit", fontSize: ".65rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <X size={13} /> مسح
          </button>
        )}
        <span style={{ fontSize: ".65rem", color: "#8b9dad", marginRight: "auto" }}>{visible.length} نتيجة</span>
      </div>

      {/* ── Message ── */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, marginBottom: 14,
          background: msg.startsWith("success") ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${msg.startsWith("success") ? "#bbf7d0" : "#fecaca"}` }}>
          {msg.startsWith("success")
            ? <CheckCircle size={15} color="#15803d" style={{ flexShrink: 0 }} />
            : <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: ".7rem", fontWeight: 600, color: msg.startsWith("success") ? "#15803d" : "#dc2626" }}>
            {msg.replace(/^(success|error):/, "")}
          </span>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#8b9dad" }}>
          <Loader2 size={30} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "#8b9dad", background: "#fff", borderRadius: 16, border: "1px solid #e8edf4" }}>
          <CircleDollarSign size={44} style={{ opacity: .25, marginBottom: 14 }} />
          <p style={{ margin: 0, fontSize: ".78rem", fontWeight: 600 }}>
            {search || statusFilter ? "لا توجد نتائج مطابقة" : "لا توجد اشتراكات بعد"}
          </p>
          {!search && !statusFilter && (
            <p style={{ margin: "6px 0 0", fontSize: ".65rem" }}>اضغط «اشتراك جديد» لإنشاء أول اشتراك</p>
          )}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e8edf4", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".68rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e8edf4" }}>
                {["العميل", "الباقة", "الحالة", "الدورة", "المبلغ", "الفترة", "التعديل", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: i === 0 || i === 1 ? "right" : "center", fontWeight: 700, color: "#425c76", fontSize: ".65rem", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((sub, idx) => {
                const cl  = sub.clients?.name || clientMap[sub.client_id]?.name || "—";
                const pkg = sub.packages?.title_ar || pkgMap[sub.package_id]?.title_ar || "—";
                const sc  = statusCfg(sub.status);
                const isExpiringSoon = sub.end_date && (() => {
                  const days = (new Date(sub.end_date!).getTime() - Date.now()) / 86400000;
                  return days >= 0 && days <= 14;
                })();
                return (
                  <tr key={sub.id} style={{ borderBottom: idx < visible.length - 1 ? "1px solid #f0f4f8" : "none", transition: "background .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafbfd")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>

                    {/* العميل */}
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#1a2d40", fontSize: ".7rem" }}>{cl}</div>
                    </td>

                    {/* الباقة */}
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ color: "#073766", fontWeight: 600 }}>{pkg}</div>
                      {sub.packages?.category && (
                        <div style={{ fontSize: ".58rem", color: "#8b9dad", marginTop: 2 }}>{sub.packages.category}</div>
                      )}
                    </td>

                    {/* الحالة */}
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      <span style={{ fontSize: ".62rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
                        {sc.label}
                      </span>
                    </td>

                    {/* الدورة */}
                    <td style={{ padding: "13px 16px", textAlign: "center", color: "#64748b" }}>
                      {CYCLE_LABELS[sub.billing_cycle] || sub.billing_cycle}
                    </td>

                    {/* المبلغ */}
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      <div style={{ fontWeight: 800, color: "#073766", fontSize: ".78rem" }}>
                        {sub.total_price?.toLocaleString("ar-SA")}
                      </div>
                      <div style={{ fontSize: ".57rem", color: "#8b9dad" }}>ر.س</div>
                    </td>

                    {/* الفترة */}
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: ".6rem", color: "#64748b" }}>{sub.start_date}</div>
                      {sub.end_date ? (
                        <div style={{ fontSize: ".6rem", color: isExpiringSoon ? "#b45309" : "#64748b", fontWeight: isExpiringSoon ? 700 : 400, marginTop: 2 }}>
                          {isExpiringSoon && "⚠ "}{sub.end_date}
                        </div>
                      ) : (
                        <div style={{ fontSize: ".58rem", color: "#aab5c3", marginTop: 2 }}>بلا انتهاء</div>
                      )}
                    </td>

                    {/* التعديل */}
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      {sub.updated_at !== sub.created_at ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                          <RefreshCw size={10} color="#d97706" />
                          <span style={{ fontSize: ".58rem", color: "#d97706", fontWeight: 600 }}>
                            {formatAppDate(sub.updated_at)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: ".58rem", color: "#aab5c3" }}>
                          {formatAppDate(sub.created_at)}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "13px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => { setEditTarget(sub); setForm({ client_id: sub.client_id, package_id: sub.package_id, employee_count: sub.employee_count, status: sub.status, start_date: sub.start_date, end_date: sub.end_date || "", extension_price: "", extension_notes: "" }); setShowModal(true); setMsg(""); }}
                          style={{ border: "1px solid #e5eaf0", borderRadius: 7, background: "#fff", color: "#526983", cursor: "pointer", padding: "5px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Pencil size={11} /> تعديل
                        </button>
                        <button onClick={() => openHistory(sub)}
                          style={{ border: "1px solid #e5eaf0", borderRadius: 7, background: "#fff", color: "#526983", cursor: "pointer", padding: "5px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} /> السجل
                        </button>
                        {sub.status === "active" && (
                          <button onClick={() => handleCancel(sub.id)}
                            style={{ border: "1px solid #fecaca", borderRadius: 7, background: "#fff", color: "#dc2626", cursor: "pointer", padding: "5px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <XCircle size={11} /> إلغاء
                          </button>
                        )}
                        <button onClick={() => handleDelete(sub.id)}
                          style={{ border: "1px solid #fecaca", borderRadius: 7, background: "#fff", color: "#dc2626", cursor: "pointer", padding: "5px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── History Modal ── */}
      {showHistory && historySub && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowHistory(false)}>
          <div style={{ background: "#fff", borderRadius: 18, width: "min(560px,100%)", maxHeight: "82vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "22px 26px 16px", borderBottom: "1px solid #eef2f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: ".95rem", color: "#073766", fontWeight: 800 }}>سجل الاشتراك</h3>
                  <p style={{ margin: "5px 0 0", fontSize: ".65rem", color: "#64748b" }}>
                    {clientMap[historySub.client_id]?.name || "—"}
                    <span style={{ color: "#cbd5e1", margin: "0 6px" }}>·</span>
                    {pkgMap[historySub.package_id]?.title_ar || "—"}
                  </p>
                </div>
                <button onClick={() => setShowHistory(false)} style={{ border: 0, background: "#f5f8fc", borderRadius: 9, width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center", color: "#526983" }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {[
                  STATUSES.find(s => s.value === historySub.status)?.label || historySub.status,
                  `${historySub.employee_count} موظف`,
                  `${historySub.total_price?.toLocaleString()} ر.س`,
                ].map((chip, i) => (
                  <span key={i} style={{ fontSize: ".6rem", background: "#f8fafc", border: "1px solid #e8edf4", padding: "3px 10px", borderRadius: 20, color: "#425c76", fontWeight: 600 }}>{chip}</span>
                ))}
              </div>
            </div>
            <div style={{ padding: "20px 26px", overflow: "auto", minHeight: 120 }}>
              {historyLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#8b9dad" }} /></div>
              ) : historyHint === "run_migration" ? (
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  <Clock size={36} color="#d97706" style={{ opacity: .5, marginBottom: 10 }} />
                  <p style={{ fontSize: ".72rem", color: "#64748b", margin: "0 0 4px" }}>جدول الأحداث لم يتم تفعيله بعد</p>
                  <p style={{ fontSize: ".62rem", color: "#aab5c3", margin: 0 }}>شغّل ملف الميجريشن في SQL Editor</p>
                </div>
              ) : historyEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#aab5c3", fontSize: ".7rem" }}>لا توجد أحداث بعد</div>
              ) : (
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", top: 16, bottom: 16, right: 15, width: 2, background: "#eef2f6" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {historyEvents.map((ev, idx) => {
                      const el = EVENT_LABELS[ev.event_type] || { label: ev.event_type, color: "#64748b", bg: "#f8fafc" };
                      return (
                        <div key={ev.id} style={{ display: "flex", gap: 14, paddingBottom: idx < historyEvents.length - 1 ? 16 : 0 }}>
                          <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: el.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${el.color}` }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: el.color }} />
                            </div>
                          </div>
                          <div style={{ flex: 1, background: "#f8fafc", borderRadius: 11, padding: "11px 14px", border: "1px solid #eef2f6" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ev.notes ? 4 : 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: ".62rem", fontWeight: 700, color: el.color, background: el.bg, padding: "2px 9px", borderRadius: 6 }}>{el.label}</span>
                                {ev.price > 0 && <span style={{ fontSize: ".68rem", fontWeight: 800, color: "#073766" }}>{ev.price.toLocaleString()} ر.س</span>}
                              </div>
                              <span style={{ fontSize: ".55rem", color: "#94a3b8" }}>
                                {formatAppDate(ev.created_at)}
                              </span>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 18, padding: "26px 28px", width: "min(480px,100%)", boxShadow: "0 16px 48px rgba(0,0,0,.14)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: ".9rem", color: "#073766", fontWeight: 800 }}>
                {editTarget ? "تعديل الاشتراك" : "اشتراك جديد"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ border: 0, background: "#f5f8fc", borderRadius: 9, width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center", color: "#526983" }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {editTarget ? (
                <>
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7, border: "1px solid #eef2f6" }}>
                    {[
                      ["المنشأة", clientMap[editTarget.client_id]?.name || "—"],
                      ["الباقة",  pkgMap[editTarget.package_id]?.title_ar || "—"],
                      ["تاريخ البداية", editTarget.start_date],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: ".65rem" }}>
                        <span style={{ color: "#8b9dad" }}>{k}</span>
                        <span style={{ color: "#1a2d40", fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>عدد الموظفين</label>
                      <input type="number" min={0} value={form.employee_count} onChange={e => setForm({ ...form, employee_count: Number(e.target.value) })} style={FIELD_STYLE} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الحالة</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...FIELD_STYLE, backgroundImage: SEL_STYLE.backgroundImage, backgroundRepeat: "no-repeat", backgroundPosition: "left 12px center", WebkitAppearance: "none", appearance: "none", padding: "0 12px 0 28px" }}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>تاريخ النهاية</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={FIELD_STYLE} />
                  </div>
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
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>مبلغ إضافي</label>
                            <input type="number" min={0} value={form.extension_price} onChange={e => setForm({ ...form, extension_price: e.target.value })} placeholder="0" style={FIELD_STYLE} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الإجمالي</label>
                            <div style={{ ...FIELD_STYLE, display: "flex", alignItems: "center", background: "#f8fafc", fontWeight: 700, color: "#073766" }}>
                              {(calc + (Number(form.extension_price) || 0)).toLocaleString()} ر.س
                            </div>
                          </div>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>ملاحظات</label>
                          <input value={form.extension_notes} onChange={e => setForm({ ...form, extension_notes: e.target.value })} placeholder="سبب التمديد..." style={FIELD_STYLE} />
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>المنشأة *</label>
                    <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required style={{ ...FIELD_STYLE, backgroundImage: SEL_STYLE.backgroundImage, backgroundRepeat: "no-repeat", backgroundPosition: "left 12px center", WebkitAppearance: "none", appearance: "none", padding: "0 12px 0 28px" }}>
                      <option value="">اختر المنشأة</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الباقة *</label>
                    <select value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })} required style={{ ...FIELD_STYLE, backgroundImage: SEL_STYLE.backgroundImage, backgroundRepeat: "no-repeat", backgroundPosition: "left 12px center", WebkitAppearance: "none", appearance: "none", padding: "0 12px 0 28px" }}>
                      <option value="">اختر الباقة</option>
                      {packages.map(p => <option key={p.id} value={p.id}>{p.title_ar} — {p.price?.toLocaleString()} ر.س / {CYCLE_LABELS[p.billing_cycle] || p.billing_cycle}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>عدد الموظفين</label>
                      <input type="number" min={0} value={form.employee_count} onChange={e => setForm({ ...form, employee_count: Number(e.target.value) })} style={FIELD_STYLE} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الحالة</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...FIELD_STYLE, backgroundImage: SEL_STYLE.backgroundImage, backgroundRepeat: "no-repeat", backgroundPosition: "left 12px center", WebkitAppearance: "none", appearance: "none", padding: "0 12px 0 28px" }}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>تاريخ البداية</label>
                      <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={FIELD_STYLE} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>تاريخ النهاية</label>
                      <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={FIELD_STYLE} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, height: 40, border: 0, borderRadius: 10, background: saving ? "#e5eaf0" : "#073766", color: saving ? "#aab5c3" : "#fff", font: "inherit", fontSize: ".72rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "جاري الحفظ..." : editTarget ? "حفظ التغييرات" : "إنشاء الاشتراك"}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ height: 40, padding: "0 18px", border: "1px solid #dfe7ef", borderRadius: 10, background: "#fff", color: "#526983", font: "inherit", fontSize: ".7rem", cursor: "pointer" }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
