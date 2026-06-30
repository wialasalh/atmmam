"use client";
import PageLoader from "@/components/page-loader";

import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2, Clock, XCircle, AlertCircle,
  Search, Receipt, Eye, Edit2, X, Save, RefreshCw, Loader2,
} from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatAppDate } from "@/lib/date-format";

type Invoice = {
  id: string; invoice_number: string; description: string; service_name: string | null;
  amount: number; tax_rate: number; tax_amount: number; total_amount: number;
  currency: string; payment_method: string | null; status: string; notes: string | null;
  paid_at: string | null; due_date: string | null; created_at: string; client_id: string;
  orders: { id: string; reference_no: string } | null;
  clients: { id: string; name: string; phone: string; email: string | null; tax_number: string | null } | null;
};

const S: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  issued:    { label: "صادرة",  color: "#b45309", bg: "#fff7ed", border: "#fed7aa", icon: <Clock size={11} /> },
  paid:      { label: "مدفوعة", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={11} /> },
  cancelled: { label: "ملغاة",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle size={11} /> },
  refunded:  { label: "مستردة", color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb", icon: <AlertCircle size={11} /> },
};

const PAY: Record<string, string> = {
  bank_transfer: "تحويل بنكي", cash: "نقداً", credit_card: "بطاقة", stc_pay: "STC Pay",
};

type Tab = "الكل" | "issued" | "paid" | "cancelled" | "refunded";
const TABS: { id: Tab; label: string }[] = [
  { id: "الكل",      label: "الكل" },
  { id: "issued",    label: "صادرة" },
  { id: "paid",      label: "مدفوعة" },
  { id: "cancelled", label: "ملغاة" },
  { id: "refunded",  label: "مستردة" },
];

function money(n: number) { return new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(n); }

const FIELD: React.CSSProperties = {
  width: "100%", height: 38, border: "1px solid #dfe8f1", borderRadius: 9,
  padding: "0 12px", font: "inherit", fontSize: ".72rem", boxSizing: "border-box", outline: "none",
};

export default function AdminInvoicesPage() {
  const { loading: authLoading } = useRoleGuard("operator");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [tab,      setTab]      = useState<Tab>("الكل");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [editData, setEditData] = useState({ status: "", payment_method: "", notes: "" });

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    fetch("/api/admin/invoices")
      .then(r => r.json())
      .then(d => setInvoices(d.data || []))
      .finally(() => setLoading(false));
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch("/api/admin/invoices", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId: selected.id, status: editData.status || selected.status, payment_method: editData.payment_method || selected.payment_method, notes: editData.notes !== "" ? editData.notes : selected.notes }),
      });
      load(); setSelected(null);
    } finally { setSaving(false); }
  }

  const stats = useMemo(() => ({
    total:     invoices.length,
    revenue:   invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.total_amount, 0),
    pending:   invoices.filter(i => i.status === "issued").reduce((a, i) => a + i.total_amount, 0),
    cancelled: invoices.filter(i => i.status === "cancelled").length,
  }), [invoices]);

  const tabCount = (t: Tab) => t === "الكل" ? invoices.length : invoices.filter(i => i.status === t).length;

  const visible = useMemo(() => invoices
    .filter(i => tab === "الكل" || i.status === tab)
    .filter(i => !search ||
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.clients?.name || "").includes(search) ||
      (i.service_name || "").includes(search)
    ), [invoices, tab, search]);

  if (authLoading) return <PageLoader text="جاري تحميل الفواتير..." />;

  return (
    <div className="inv-shell" dir="rtl">
      <style>{`
        .inv-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;color:#173d65;overflow:hidden}
        .inv-head{padding:18px 24px 14px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff)}
        .inv-head-main{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
        .inv-eyebrow{margin:0 0 4px;color:#0f766e;font-size:.66rem;font-weight:900}
        .inv-head h1{margin:0 0 5px;font-size:1.52rem;color:#073766}
        .inv-head p{margin:0;color:#7f8e9f;font-size:.72rem}
        .inv-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer}
        .inv-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .inv-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
        .inv-kpi i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
        .inv-kpi small,.inv-kpi strong{display:block}.inv-kpi small{font-size:.56rem;color:#8190a1;font-weight:800}.inv-kpi strong{font-size:1.05rem;color:#073766;line-height:1;margin-top:4px}
        .inv-body{min-height:0;overflow:auto;padding:16px 20px 20px}
        .inv-toolbar{background:#fff;border:1px solid #dfe8f1;border-radius:14px 14px 0 0;padding:11px 14px;border-bottom:1px solid #edf2f7;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .inv-tabs{display:flex;gap:4px;flex-wrap:wrap}
        .inv-tab{height:28px;border:1px solid #dfe8f1;border-radius:7px;background:#f8fafc;color:#65788c;padding:0 10px;font:inherit;font-size:.58rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;cursor:pointer;transition:background .12s,border-color .12s}
        .inv-tab.active{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .inv-search{height:34px;border:1px solid #dfe8f1;border-radius:8px;background:#f8fafc;display:flex;align-items:center;gap:7px;padding:0 10px;color:#8b9dad;min-width:220px}
        .inv-search input{border:0;outline:0;background:transparent;font:inherit;font-size:.67rem;width:100%;color:#173d65}
        .inv-count{font-size:.62rem;color:#8b9dad;margin-right:auto;white-space:nowrap}
        .inv-table-wrap{background:#fff;border:1px solid #dfe8f1;border-top:none;border-radius:0 0 14px 14px;overflow:hidden}
        .inv-table{width:100%;border-collapse:collapse;font-size:.67rem}
        .inv-table thead tr{background:#f4f7fb;border-bottom:1px solid #e4ebf2}
        .inv-table th{padding:10px 14px;text-align:right;font-weight:800;color:#425c76;font-size:.59rem;white-space:nowrap}
        .inv-table th.ctr{text-align:center}
        .inv-table tbody tr{border-bottom:1px solid #f0f4f8;transition:background .12s}
        .inv-table tbody tr:last-child{border-bottom:none}
        .inv-table tbody tr:hover{background:#fafbfd}
        .inv-table td{padding:11px 14px;vertical-align:middle}
        .inv-table td.ctr{text-align:center}
        .inv-num{font-size:.63rem;font-weight:800;color:#0875dc;font-family:ui-monospace,monospace}
        .inv-ref{font-size:.52rem;color:#a0adb8;margin-top:2px}
        .inv-client{font-weight:700;color:#173d65;font-size:.68rem}
        .inv-phone{font-size:.56rem;color:#8b9dad;margin-top:2px}
        .inv-pill{display:inline-flex;align-items:center;gap:4px;border:1px solid;border-radius:999px;padding:3px 9px;font-size:.57rem;font-weight:800;white-space:nowrap}
        .inv-acts{display:inline-flex;gap:4px;justify-content:center;align-items:center}
        .inv-icon-btn{width:30px;height:30px;border:1px solid #e5eaf0;border-radius:8px;background:#fff;color:#526983;cursor:pointer;display:grid;place-items:center;transition:all .12s;text-decoration:none;flex-shrink:0}
        .inv-icon-btn:hover{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .inv-icon-btn.edit:hover{background:#f0fdfa;border-color:#99f6e4;color:#0f766e}
        .inv-empty{padding:72px 20px;text-align:center;color:#8b9dad;background:#fff}
        .inv-modal-bg{position:fixed;inset:0;background:rgba(7,55,102,.38);z-index:900;display:grid;place-items:center;padding:20px}
        .inv-modal{background:#fff;border-radius:18px;width:min(460px,100%);box-shadow:0 24px 64px rgba(0,0,0,.18);direction:rtl}
        .inv-modal-head{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid #eef2f6}
        .inv-modal-title{font-size:.92rem;font-weight:800;color:#073766}
        .inv-modal-sub{font-size:.62rem;color:#8b9dad;margin-top:3px}
        .inv-modal-close{width:32px;height:32px;border:1px solid #e4ebf2;border-radius:9px;background:#f8fafc;cursor:pointer;display:grid;place-items:center;color:#526983;flex-shrink:0}
        .inv-modal-body{padding:18px 24px;display:flex;flex-direction:column;gap:12px}
        .inv-field label{display:block;font-size:.62rem;font-weight:700;color:#425c76;margin-bottom:5px}
        .inv-summary{background:#f4f7fb;border:1px solid #e4ebf2;border-radius:10px;padding:12px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .inv-summary-lbl{font-size:.54rem;color:#8b9dad;font-weight:600;display:block;margin-bottom:2px}
        .inv-summary-val{font-size:.72rem;font-weight:800;color:#073766}
        .inv-modal-foot{display:flex;gap:8px;padding:0 24px 22px}
        .inv-save{flex:1;height:40px;border:0;border-radius:10px;background:#073766;color:#fff;font:inherit;font-size:.73rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px}
        .inv-save:disabled{background:#e5eaf0;color:#aab5c3;cursor:not-allowed}
        .inv-cancel{height:40px;padding:0 18px;border:1px solid #dfe7ef;border-radius:10px;background:#fff;color:#526983;font:inherit;font-size:.7rem;cursor:pointer}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Header ── */}
      <div className="inv-head">
        <div className="inv-head-main">
          <div>
            <p className="inv-eyebrow">إدارة النظام</p>
            <h1>الفواتير</h1>
            <p>الفواتير الضريبية للمنشآت · {invoices.length} فاتورة</p>
          </div>
          <button className="inv-btn" onClick={() => { setLoading(true); load(); }}><RefreshCw size={14} /> تحديث</button>
        </div>
        <div className="inv-kpis">
          {[
            { icon: Receipt,      label: "إجمالي الفواتير",    val: String(stats.total),             color: "#0875dc", bg: "#dbeafe" },
            { icon: CheckCircle2, label: "إيرادات مدفوعة",     val: money(stats.revenue) + " ر.س",  color: "#15803d", bg: "#bbf7d0" },
            { icon: Clock,        label: "في انتظار السداد",   val: money(stats.pending) + " ر.س",  color: "#b45309", bg: "#fde68a" },
            { icon: XCircle,      label: "ملغاة",               val: String(stats.cancelled),         color: "#dc2626", bg: "#fecaca" },
          ].map(k => (
            <div key={k.label} className="inv-kpi">
              <i style={{ background: k.bg }}><k.icon size={16} color={k.color} /></i>
              <div><small>{k.label}</small><strong style={{ color: k.color }}>{k.val}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="inv-body">
        <div className="inv-toolbar">
          <div className="inv-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`inv-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                {t.label} <span style={{ opacity: .7 }}>{tabCount(t.id)}</span>
              </button>
            ))}
          </div>
          <label className="inv-search">
            <Search size={13} color="#a0adb8" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم الفاتورة أو العميل..." />
          </label>
          {(search || tab !== "الكل") && (
            <button className="inv-btn" style={{ height: 30, padding: "0 10px", fontSize: ".6rem" }} onClick={() => { setSearch(""); setTab("الكل"); }}>
              <X size={12} /> مسح
            </button>
          )}
          <span className="inv-count">{visible.length} فاتورة</span>
        </div>

        {loading ? (
          <div className="inv-empty" style={{ borderRadius: "0 0 14px 14px", border: "1px solid #dfe8f1", borderTop: "none" }}>
            <Loader2 size={26} style={{ animation: "spin 1s linear infinite", opacity: .4, marginBottom: 10 }} />
            <p style={{ fontSize: ".72rem" }}>جاري التحميل...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="inv-empty" style={{ borderRadius: "0 0 14px 14px", border: "1px solid #dfe8f1", borderTop: "none" }}>
            <Receipt size={38} style={{ opacity: .2, marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: ".78rem", fontWeight: 600 }}>{search || tab !== "الكل" ? "لا توجد نتائج" : "لا توجد فواتير بعد"}</p>
          </div>
        ) : (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>الخدمة</th>
                  <th className="ctr">الحالة</th>
                  <th className="ctr">الإجمالي</th>
                  <th className="ctr">طريقة الدفع</th>
                  <th className="ctr">التاريخ</th>
                  <th className="ctr"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(inv => {
                  const cfg = S[inv.status] || S.issued;
                  const overdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status === "issued";
                  return (
                    <tr key={inv.id} style={{ borderRight: `3px solid ${cfg.color}` }}>
                      <td>
                        <div className="inv-num">{inv.invoice_number}</div>
                        {inv.orders && <div className="inv-ref">{inv.orders.reference_no}</div>}
                      </td>
                      <td>
                        <div className="inv-client">{inv.clients?.name || "—"}</div>
                        {inv.clients?.phone && <div className="inv-phone">{inv.clients.phone}</div>}
                      </td>
                      <td style={{ fontSize: ".65rem", color: "#334155" }}>{inv.service_name || inv.description || "—"}</td>
                      <td className="ctr">
                        <span className="inv-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="ctr">
                        <div style={{ fontWeight: 800, color: "#073766", fontSize: ".76rem" }}>{money(inv.total_amount)} <span style={{ fontSize: ".54rem", color: "#8b9dad", fontWeight: 600 }}>{inv.currency}</span></div>
                        <div style={{ fontSize: ".54rem", color: "#a0adb8", marginTop: 2 }}>ض.ق.م {money(inv.tax_amount)}</div>
                      </td>
                      <td className="ctr" style={{ fontSize: ".58rem", color: "#526983" }}>
                        {inv.payment_method ? PAY[inv.payment_method] || inv.payment_method : <span style={{ color: "#d1d9e2" }}>—</span>}
                      </td>
                      <td className="ctr">
                        <div style={{ fontSize: ".6rem", color: "#526983" }}>{formatAppDate(inv.created_at)}</div>
                        {inv.due_date && (
                          <div style={{ fontSize: ".54rem", color: overdue ? "#dc2626" : "#a0adb8", marginTop: 2, fontWeight: overdue ? 700 : 400 }}>
                            {overdue ? "⚠ " : ""}استحقاق {formatAppDate(inv.due_date)}
                          </div>
                        )}
                      </td>
                      <td className="ctr">
                        <div className="inv-acts">
                          <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener" className="inv-icon-btn" title="عرض PDF">
                            <Eye size={13} />
                          </a>
                          <button className="inv-icon-btn edit" title="تعديل" onClick={() => {
                            setSelected(inv);
                            setEditData({ status: inv.status, payment_method: inv.payment_method || "", notes: inv.notes || "" });
                          }}>
                            <Edit2 size={13} />
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
      </div>

      {/* ── Edit Modal ── */}
      {selected && (
        <div className="inv-modal-bg" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="inv-modal">
            <div className="inv-modal-head">
              <div>
                <div className="inv-modal-title">تعديل الفاتورة</div>
                <div className="inv-modal-sub">{selected.invoice_number} · {selected.clients?.name}</div>
              </div>
              <button className="inv-modal-close" onClick={() => setSelected(null)}><X size={14} /></button>
            </div>

            <div className="inv-modal-body">
              <div className="inv-summary">
                <div>
                  <span className="inv-summary-lbl">قبل الضريبة</span>
                  <span className="inv-summary-val">{money(selected.amount)} {selected.currency}</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span className="inv-summary-lbl">ض.ق.م ({selected.tax_rate}%)</span>
                  <span className="inv-summary-val">{money(selected.tax_amount)}</span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <span className="inv-summary-lbl">الإجمالي</span>
                  <span className="inv-summary-val" style={{ color: "#0875dc", fontSize: ".8rem" }}>{money(selected.total_amount)}</span>
                </div>
              </div>

              <div className="inv-field">
                <label>الحالة</label>
                <select value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} style={FIELD}>
                  <option value="issued">صادرة</option>
                  <option value="paid">مدفوعة ✓</option>
                  <option value="cancelled">ملغاة</option>
                  <option value="refunded">مستردة</option>
                </select>
              </div>

              <div className="inv-field">
                <label>طريقة الدفع</label>
                <select value={editData.payment_method} onChange={e => setEditData(d => ({ ...d, payment_method: e.target.value }))} style={FIELD}>
                  <option value="">— غير محدد —</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="cash">نقداً</option>
                  <option value="credit_card">بطاقة ائتمانية</option>
                  <option value="stc_pay">STC Pay</option>
                </select>
              </div>

              <div className="inv-field">
                <label>ملاحظات</label>
                <textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                  rows={3} placeholder="أي ملاحظات إضافية..."
                  style={{ ...FIELD, height: "auto", padding: "9px 12px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>

            <div className="inv-modal-foot">
              <button className="inv-save" onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
              <button className="inv-cancel" onClick={() => setSelected(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
