"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Search, Plus, X, Loader2, XCircle, Pencil, RefreshCw, Clock, Trash2 } from "lucide-react";

type ClientRecord = { id: string; name: string; email: string | null; phone: string | null };
type PackageRecord = { id: string; title_ar: string; tier_ar: string; category: string; billing_cycle: string; price: number; features: any; max_employees: number; extra_employee_price: number };
type SubRecord = {
  id: string; client_id: string; package_id: string; status: string; employee_count: number;
  base_price: number; extra_price: number; tax_amount: number; total_price: number;
  billing_cycle: string; start_date: string; end_date: string | null; created_at: string; updated_at: string;
  updated_by: string | null;
  packages: PackageRecord | null; clients: { id: string; name: string } | null;
};

type EventRecord = {
  id: string;
  subscription_id: string;
  event_type: string;
  previous_data: any;
  new_data: any;
  price: number;
  notes: string;
  created_at: string;
  profiles: { id: string; full_name: string } | null;
};

const EVENT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  created: { label: "إنشاء", color: "#15803d", bg: "#f0fdf4" },
  extension: { label: "تمديد", color: "#b45309", bg: "#fff7ed" },
  renewal: { label: "تجديد", color: "#1d4ed8", bg: "#eff6ff" },
  cancellation: { label: "إلغاء", color: "#dc2626", bg: "#fef2f2" },
  reactivation: { label: "إعادة تفعيل", color: "#15803d", bg: "#f0fdf4" },
  modification: { label: "تعديل", color: "#64748b", bg: "#f8fafc" },
};

function eventLabel(type: string) {
  return EVENT_LABELS[type] || { label: type, color: "#64748b", bg: "#f8fafc" };
}

const STATUSES = [
  { value: "active", label: "نشط", color: "#15803d", bg: "#f0fdf4" },
  { value: "pending", label: "قيد الانتظار", color: "#b45309", bg: "#fff7ed" },
  { value: "cancelled", label: "ملغي", color: "#dc2626", bg: "#fef2f2" },
  { value: "expired", label: "منتهي", color: "#64748b", bg: "#f8fafc" },
];

function statusStyle(s: string) {
  const st = STATUSES.find(st => st.value === s);
  return { background: st?.bg || "#f8fafc", color: st?.color || "#64748b", fontSize: ".58rem", padding: "2px 10px", borderRadius: 20, fontWeight: 700, whiteSpace: "nowrap" as const };
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SubRecord | null>(null);
  const [form, setForm] = useState({ client_id: "", package_id: "", employee_count: 0, status: "active", start_date: "", end_date: "", extension_price: "", extension_notes: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historySub, setHistorySub] = useState<SubRecord | null>(null);
  const [historyEvents, setHistoryEvents] = useState<EventRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyHint, setHistoryHint] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [subsRes, clientsRes, pkgsRes] = await Promise.all([
        fetch("/api/admin/subscriptions"),
        fetch("/api/admin/clients"),
        fetch("/api/admin/packages"),
      ]);
      if (subsRes.ok) { const d = await subsRes.json(); setSubs(d.data || []); }
      if (clientsRes.ok) { const d = await clientsRes.json(); setClients(d.data || []); }
      if (pkgsRes.ok) { const d = await pkgsRes.json(); setPackages(d.data || []); }
    } catch { /* network error */ } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.package_id) { setMsg("اختر العميل والباقة"); return; }
    setSaving(true);
    setMsg("");
    try {
      if (editTarget) {
        const patchBody: Record<string, any> = {
          id: editTarget.id,
          status: form.status,
          employee_count: Number(form.employee_count),
          end_date: form.end_date,
        };
        if (form.extension_price) {
          patchBody.extension_price = Number(form.extension_price);
          patchBody.extension_notes = form.extension_notes;
        }
        const res = await fetch("/api/admin/subscriptions", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patchBody),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMsg("✅ تم التحديث");
      } else {
        const res = await fetch("/api/admin/subscriptions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...form, employee_count: Number(form.employee_count) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMsg("✅ تم إنشاء الاشتراك");
      }
      setShowModal(false);
      setEditTarget(null);
      setForm({ client_id: "", package_id: "", employee_count: 0, status: "active", start_date: "", end_date: "", extension_price: "", extension_notes: "" });
      load();
    } catch (err) { setMsg("❌ " + (err instanceof Error ? err.message : "فشل")); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا الاشتراك نهائياً؟ لا يمكن التراجع.")) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, { method: "DELETE" });
      if (res.ok) load();
    } catch { /* network error */ }
  }

  async function handleCancel(id: string) {
    if (!confirm("إلغاء هذا الاشتراك؟")) return;
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: "cancelled" }),
      });
      if (res.ok) load();
    } catch { /* network error */ }
  }

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const pkgMap = Object.fromEntries(packages.map(p => [p.id, p]));

  const visible = subs.filter(s => {
    const client = clientMap[s.client_id];
    const pkg = pkgMap[s.package_id];
    const matchesSearch = !search || client?.name?.toLowerCase().includes(search.toLowerCase()) || pkg?.title_ar?.includes(search);
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.1rem", color: "#073766" }}>الاشتراكات</h1>
          <p style={{ margin: "4px 0 0", fontSize: ".72rem", color: "#8b9dad" }}>{subs.length} اشتراك — إدارة اشتراكات المنشآت في الباقات.</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ client_id: "", package_id: "", employee_count: 0, status: "active", start_date: "", end_date: "", extension_price: "", extension_notes: "" }); setShowModal(true); setMsg(""); }}
          style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 16px", border: 0, borderRadius: 8, background: "#073766", color: "#fff", font: "inherit", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>
          <Plus size={15} /> اشتراك جديد
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 300 }}>
          <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aab5c3", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالعميل أو الباقة..."
            style={{ width: "100%", height: 36, border: "1px solid #e5eaf0", borderRadius: 8, padding: "0 32px", font: "inherit", fontSize: ".68rem", boxSizing: "border-box", outline: "none" }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ height: 36, border: "1px solid #e5eaf0", borderRadius: 8, padding: "0 28px 0 10px", font: "inherit", fontSize: ".68rem", color: "#1a2d40", background: "#fff", outline: "none", WebkitAppearance: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "left 10px center" }}>
          <option value="">كل الحالات</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {msg && <div style={{ padding: "10px 14px", borderRadius: 8, background: msg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✅") ? "#15803d" : "#dc2626", fontSize: ".7rem", fontWeight: 600, marginBottom: 12 }}>{msg}</div>}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8b9dad" }}><Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} /></div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8b9dad" }}>
          <CircleDollarSign size={40} style={{ opacity: .3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: ".75rem" }}>{search || statusFilter ? "لا توجد نتائج" : "لا توجد اشتراكات بعد — أنشئ أول اشتراك."}</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5ebf3", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".68rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5ebf3" }}>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#425c76" }}>العميل</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#425c76" }}>الباقة</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#425c76" }}>الحالة</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#425c76" }}>المدة</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#425c76" }}>المبلغ</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#425c76" }}>الفترة</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#425c76" }}>آخر تعديل</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#425c76" }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(sub => {
                const client = clientMap[sub.client_id];
                const pkg = pkgMap[sub.package_id];
                return (
                  <tr key={sub.id} style={{ borderBottom: "1px solid #eef2f6" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1a2d40" }}>{client?.name || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#425c76" }}>{pkg?.title_ar || "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}><span style={statusStyle(sub.status)}>{STATUSES.find(s => s.value === sub.status)?.label || sub.status}</span></td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#425c76" }}>
                      {sub.billing_cycle === "yearly" ? "سنوي" : sub.billing_cycle === "monthly" ? "شهري" : sub.billing_cycle === "quarterly" ? "ربع سنوي" : sub.billing_cycle}
                      {sub.updated_at !== sub.created_at && <span style={{ fontSize: ".5rem", color: "#d97706", background: "#fff7ed", padding: "1px 6px", borderRadius: 8, fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>مُعدّل</span>}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#073766" }}>{sub.total_price?.toLocaleString()} ر.س</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#64748b", fontSize: ".62rem" }}>
                      {sub.start_date} {sub.end_date ? `→ ${sub.end_date}` : ""}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#64748b", fontSize: ".6rem" }}>
                      {sub.updated_at !== sub.created_at ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                          <RefreshCw size={10} color="#d97706" />
                          <span>{new Date(sub.updated_at).toLocaleDateString("ar-SA", {calendar:"gregory",  day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      ) : (
                        <span style={{ color: "#aab5c3" }}>{new Date(sub.created_at).toLocaleDateString("ar-SA", {calendar:"gregory",  day: "numeric", month: "short", year: "numeric" })}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <button onClick={() => { setEditTarget(sub); setForm({ client_id: sub.client_id, package_id: sub.package_id, employee_count: sub.employee_count, status: sub.status, start_date: sub.start_date, end_date: sub.end_date || "", extension_price: "", extension_notes: "" }); setShowModal(true); setMsg(""); }}
                        style={{ border: "1px solid #e5eaf0", borderRadius: 6, background: "#fff", color: "#526983", cursor: "pointer", padding: "4px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
                        <Pencil size={11} /> تعديل
                      </button>
                      <button onClick={() => { setHistorySub(sub); setHistoryLoading(true); setShowHistory(true); setHistoryHint(null); fetch(`/api/admin/subscriptions/events?subscription_id=${sub.id}`).then(r => r.json()).then(d => { setHistoryEvents(d.data || []); setHistoryHint(d.hint || null); setHistoryLoading(false); }).catch(() => setHistoryLoading(false)); }}
                        style={{ border: "1px solid #e5eaf0", borderRadius: 6, background: "#fff", color: "#526983", cursor: "pointer", padding: "4px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
                        <Clock size={11} /> التاريخ
                      </button>
                      {sub.status === "active" && (
                        <button onClick={() => handleCancel(sub.id)}
                          style={{ border: "1px solid #fecaca", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer", padding: "4px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
                          <XCircle size={11} /> إلغاء
                        </button>
                      )}
                      <button onClick={() => handleDelete(sub.id)}
                        style={{ border: "1px solid #fecaca", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer", padding: "4px 10px", fontSize: ".6rem", fontWeight: 700, font: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Trash2 size={11} /> حذف
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* History Modal */}
      {showHistory && historySub && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowHistory(false)}>
          <div style={{ background: "#fff", borderRadius: 18, width: "min(560px,100%)", maxHeight: "80vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #eef2f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#073766", fontWeight: 800 }}>سجل الاشتراك</h3>
                  <p style={{ margin: "6px 0 0", fontSize: ".68rem", color: "#64748b" }}>
                    {clientMap[historySub.client_id]?.name || "—"} 
                    <span style={{ color: "#cbd5e1", margin: "0 6px" }}>|</span>
                    {pkgMap[historySub.package_id]?.title_ar || "—"}
                  </p>
                </div>
                <button onClick={() => setShowHistory(false)} style={{ border: 0, background: "#f5f8fc", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "grid", placeItems: "center", color: "#526983" }}>
                  <X size={17} />
                </button>
              </div>
              {/* Summary chips */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <div style={{ fontSize: ".6rem", background: "#f8fafc", padding: "4px 10px", borderRadius: 8, color: "#425c76" }}>
                  {STATUSES.find(s => s.value === historySub.status)?.label || historySub.status}
                </div>
                <div style={{ fontSize: ".6rem", background: "#f8fafc", padding: "4px 10px", borderRadius: 8, color: "#425c76" }}>
                  {historySub.employee_count} موظف
                </div>
                <div style={{ fontSize: ".6rem", background: "#f8fafc", padding: "4px 10px", borderRadius: 8, color: "#425c76" }}>
                  {historySub.total_price?.toLocaleString()} ر.س
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 28px", overflow: "auto", minHeight: 120 }}>
              {historyLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#8b9dad" }}>
                  <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : historyHint === "run_migration" ? (
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Clock size={22} color="#d97706" />
                  </div>
                  <p style={{ fontSize: ".72rem", color: "#64748b", margin: "0 0 4px" }}>جدول الأحداث لم يتم تفعيله بعد</p>
                  <p style={{ fontSize: ".62rem", color: "#aab5c3", margin: 0 }}>شغّل ملف الميجريشن في SQL Editor عشان تبدأ تتسجل الأحداث المالية</p>
                </div>
              ) : historyEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#aab5c3", fontSize: ".7rem" }}>
                  لا توجد أحداث بعد — أي تعديل على الاشتراك راح يسجل هنا.
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  {/* Timeline line */}
                  <div style={{ position: "absolute", top: 8, bottom: 8, right: 15, width: 2, background: "#eef2f6" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {historyEvents.map((ev, idx) => {
                      const el = eventLabel(ev.event_type);
                      const isLast = idx === historyEvents.length - 1;
                      return (
                        <div key={ev.id} style={{ display: "flex", gap: 14, paddingBottom: isLast ? 0 : 16 }}>
                          {/* Dot */}
                          <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: el.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${el.color}` }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: el.color }} />
                            </div>
                          </div>
                          {/* Card */}
                          <div style={{ flex: 1, background: "#f8fafc", borderRadius: 12, padding: "12px 16px", border: "1px solid #eef2f6" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: ".65rem", fontWeight: 700, color: el.color, background: el.bg, padding: "2px 10px", borderRadius: 6 }}>{el.label}</span>
                                {ev.price > 0 && (
                                  <span style={{ fontSize: ".7rem", fontWeight: 800, color: "#073766" }}>{ev.price.toLocaleString()} ر.س</span>
                                )}
                              </div>
                              <span style={{ fontSize: ".55rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                {new Date(ev.created_at).toLocaleDateString("ar-SA", {calendar:"gregory",  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {ev.notes && <div style={{ fontSize: ".6rem", color: "#64748b", marginTop: 4 }}>{ev.notes}</div>}
                            {ev.profiles?.full_name && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".5rem", fontWeight: 700, color: "#1d4ed8" }}>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "min(480px,100%)", boxShadow: "0 12px 40px rgba(0,0,0,.12)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: ".9rem", color: "#073766", fontWeight: 800 }}>{editTarget ? "تعديل الاشتراك" : "اشتراك جديد"}</h3>
              <button onClick={() => setShowModal(false)} style={{ border: 0, background: "#f5f8fc", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center", color: "#526983" }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Edit mode — readonly info + limited fields */}
              {editTarget ? (
                <>
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".65rem" }}>
                      <span style={{ color: "#8b9dad" }}>المنشأة</span>
                      <span style={{ color: "#1a2d40", fontWeight: 700 }}>{clientMap[editTarget.client_id]?.name || "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".65rem" }}>
                      <span style={{ color: "#8b9dad" }}>الباقة</span>
                      <span style={{ color: "#1a2d40", fontWeight: 700 }}>{pkgMap[editTarget.package_id]?.title_ar || "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".65rem" }}>
                      <span style={{ color: "#8b9dad" }}>تاريخ البداية</span>
                      <span style={{ color: "#1a2d40" }}>{editTarget.start_date}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>عدد الموظفين</label>
                      <input type="number" min={0} value={form.employee_count} onChange={e => setForm({...form, employee_count: Number(e.target.value)})}
                        style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الحالة</label>
                      <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                        style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 28px 0 14px", font: "inherit", fontSize: ".72rem", color: "#1a2d40", boxSizing: "border-box", outline: "none", background: "#fff", WebkitAppearance: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "left 14px center" }}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>تاريخ النهاية</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}
                      style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none" }} />
                  </div>
                  {form.end_date && form.end_date !== (editTarget.end_date || "") && (() => {
                    const pkg = pkgMap[editTarget.package_id];
                    const oldEnd = new Date(editTarget.end_date || editTarget.start_date);
                    const newEnd = new Date(form.end_date);
                    const daysDiff = Math.max(0, Math.round((newEnd.getTime() - oldEnd.getTime()) / 86400000));
                    let calcPrice = 0;
                    if (pkg && daysDiff > 0) {
                      const cycleDays = pkg.billing_cycle === "yearly" ? 365 : pkg.billing_cycle === "quarterly" ? 90 : 30;
                      calcPrice = Math.round((pkg.price / cycleDays) * daysDiff);
                    }
                    return (
                      <>
                        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: ".63rem", color: "#15803d", fontWeight: 700 }}>قيمة التمديد المحتسبة</span>
                          <span style={{ fontSize: ".85rem", color: "#15803d", fontWeight: 800 }}>{calcPrice.toLocaleString()} ر.س</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>مبلغ إضافي (اختياري)</label>
                            <input type="number" min={0} value={form.extension_price} onChange={e => setForm({...form, extension_price: e.target.value})} placeholder="0"
                              style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الإجمالي</label>
                            <div style={{ height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", fontSize: ".72rem", fontWeight: 700, color: "#073766", background: "#f8fafc" }}>
                              {(calcPrice + (Number(form.extension_price) || 0)).toLocaleString()} ر.س
                            </div>
                          </div>
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>ملاحظات</label>
                          <input value={form.extension_notes} onChange={e => setForm({...form, extension_notes: e.target.value})} placeholder="سبب التمديد..."
                            style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none" }} />
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                /* Create mode — full form */
                <>
                  <div>
                    <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>المنشأة *</label>
                    <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} required
                      style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 28px 0 14px", font: "inherit", fontSize: ".72rem", color: "#1a2d40", boxSizing: "border-box", outline: "none", background: "#fff", WebkitAppearance: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "left 14px center" }}>
                      <option value="">اختر المنشأة</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الباقة *</label>
                    <select value={form.package_id} onChange={e => setForm({...form, package_id: e.target.value})} required
                      style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 28px 0 14px", font: "inherit", fontSize: ".72rem", color: "#1a2d40", boxSizing: "border-box", outline: "none", background: "#fff", WebkitAppearance: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "left 14px center" }}>
                      <option value="">اختر الباقة</option>
                      {packages.map(p => <option key={p.id} value={p.id}>{p.title_ar} — {p.price?.toLocaleString()} ر.س/{p.billing_cycle === "yearly" ? "سنوياً" : "شهرياً"}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>عدد الموظفين</label>
                      <input type="number" min={0} value={form.employee_count} onChange={e => setForm({...form, employee_count: Number(e.target.value)})}
                        style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الحالة</label>
                      <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                        style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 28px 0 14px", font: "inherit", fontSize: ".72rem", color: "#1a2d40", boxSizing: "border-box", outline: "none", background: "#fff", WebkitAppearance: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "left 14px center" }}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>تاريخ البداية</label>
                      <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}
                        style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>تاريخ النهاية (اختياري)</label>
                      <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}
                        style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none" }} />
                    </div>
                  </div>
                </>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, height: 42, border: 0, borderRadius: 10, background: saving ? "#e5eaf0" : "#073766", color: saving ? "#aab5c3" : "#fff", font: "inherit", fontSize: ".72rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "جاري الحفظ..." : editTarget ? "حفظ التغييرات" : "إنشاء الاشتراك"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ height: 42, padding: "0 16px", border: "1px solid #dfe7ef", borderRadius: 10, background: "#fff", color: "#526983", font: "inherit", fontSize: ".7rem", cursor: "pointer" }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
