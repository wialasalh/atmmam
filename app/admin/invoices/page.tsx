"use client";

import { useEffect, useState } from "react";
import { FileText, Download, CheckCircle2, Clock, XCircle, AlertCircle, Loader, Search, Receipt, CreditCard, Eye, Edit2, X, Save } from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatAppDate } from "@/lib/date-format";

type Invoice = {
  id: string;
  invoice_number: string;
  description: string;
  service_name: string | null;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_method: string | null;
  status: string;
  notes: string | null;
  paid_at: string | null;
  due_date: string | null;
  created_at: string;
  client_id: string;
  orders: { id: string; reference_no: string } | null;
  clients: { id: string; name: string; phone: string; email: string | null; tax_number: string | null } | null;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  issued:    { label: "صادرة",   color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <Clock size={10} /> },
  paid:      { label: "مدفوعة",  color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={10} /> },
  cancelled: { label: "ملغاة",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle size={10} /> },
  refunded:  { label: "مستردة",  color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <AlertCircle size={10} /> },
};

const PAYMENT_AR: Record<string, string> = {
  bank_transfer: "تحويل بنكي", cash: "نقداً", credit_card: "بطاقة", stc_pay: "STC Pay",
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(n);
}
const fmtDate = formatAppDate;

export default function AdminInvoicesPage() {
  useRoleGuard("operator");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [tabStatus, setTabStatus] = useState("الكل");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editData, setEditData] = useState({ status: "", payment_method: "", notes: "" });

  const load = () => {
    setLoading(true);
    fetch("/api/admin/invoices")
      .then(r => r.json())
      .then(res => setInvoices(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = invoices
    .filter(inv => tabStatus === "الكل" || inv.status === tabStatus)
    .filter(inv => !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.clients?.name || "").includes(search) ||
      (inv.service_name || "").includes(search)
    );

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.total_amount, 0);
  const totalPending = invoices.filter(i => i.status === "issued").reduce((a, i) => a + i.total_amount, 0);

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch("/api/admin/invoices", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId:      selected.id,
          status:         editData.status || selected.status,
          payment_method: editData.payment_method || selected.payment_method,
          notes:          editData.notes !== "" ? editData.notes : selected.notes,
        }),
      });
      load();
      setEditMode(false);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { id: "الكل",      count: invoices.length },
    { id: "issued",    count: invoices.filter(i => i.status === "issued").length,    label: "صادرة" },
    { id: "paid",      count: invoices.filter(i => i.status === "paid").length,      label: "مدفوعة" },
    { id: "cancelled", count: invoices.filter(i => i.status === "cancelled").length, label: "ملغاة" },
  ];

  return (
    <div style={{ direction: "rtl", padding: "28px 32px 48px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 3px", fontSize: "1.1rem", fontWeight: 800, color: "#073766" }}>إدارة الفواتير</h1>
          <p style={{ margin: 0, fontSize: ".68rem", color: "#8b9dad" }}>جميع الفواتير الضريبية — تنشأ تلقائياً عند اكتمال الطلب</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "إجمالي الفواتير",   value: invoices.length,                         color: "#0875dc", bg: "#eaf4ff", icon: <Receipt size={15} color="#0875dc" />,      isNum: true },
          { label: "إيرادات مدفوعة",    value: fmtMoney(totalRevenue) + " ر.س",         color: "#15803d", bg: "#f0fdf4", icon: <CheckCircle2 size={15} color="#15803d" />, isNum: false },
          { label: "في انتظار السداد",  value: fmtMoney(totalPending) + " ر.س",         color: "#b45309", bg: "#fef9ee", icon: <Clock size={15} color="#b45309" />,        isNum: false },
          { label: "ملغاة",             value: invoices.filter(i=>i.status==="cancelled").length, color: "#6b7280", bg: "#f3f4f6", icon: <XCircle size={15} color="#6b7280" />, isNum: true },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: s.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: s.isNum ? "1.2rem" : ".85rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: ".56rem", color: "#8b9dad", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div style={{ background: "#fff", border: "1.5px solid #e0e7ef", borderRadius: 14, overflow: "hidden" }}>

        {/* Tabs + search */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e8edf5", padding: "0 14px", background: "#fafbfc", gap: 2 }}>
          {TABS.map(t => {
            const active = tabStatus === t.id;
            const lbl = t.label || t.id;
            const cfg = t.id !== "الكل" ? STATUS_CFG[t.id] : null;
            return (
              <button key={t.id} onClick={() => setTabStatus(t.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "11px 12px", fontSize: ".65rem", fontWeight: active ? 800 : 600, color: active ? "#0875dc" : "#7c8b9b", background: "none", border: "none", cursor: "pointer", borderBottom: active ? "2.5px solid #0875dc" : "2.5px solid transparent", marginBottom: -1.5, whiteSpace: "nowrap" }}>
                {lbl}
                <span style={{ fontSize: ".53rem", fontWeight: 700, background: active ? "#eaf4ff" : "#f1f5f9", color: active ? "#0875dc" : "#8b9dad", padding: "1px 6px", borderRadius: 20 }}>{t.count}</span>
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative", margin: "5px 0" }}>
            <Search size={11} color="#a0adb8" style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالعميل أو رقم الفاتورة..."
              style={{ paddingRight: 28, paddingLeft: 10, paddingTop: 6, paddingBottom: 6, fontSize: ".6rem", border: "1.5px solid #e0e7ef", borderRadius: 8, outline: "none", color: "#073766", width: 210 }} />
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 50 }}>
            <Loader size={20} color="#0875dc" style={{ animation: "spin .6s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", padding: "48px 24px", textAlign: "center" }}>
            <Receipt size={32} color="#d1dae3" strokeWidth={1.5} />
            <p style={{ margin: "10px 0 0", fontSize: ".7rem", color: "#8b9dad" }}>لا توجد فواتير</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "120px 140px 1fr 110px 120px 100px 80px", background: "#f4f7fb", borderBottom: "1.5px solid #e0e7ef" }}>
              {["رقم الفاتورة", "العميل", "الخدمة", "الحالة", "الإجمالي", "التاريخ", ""].map((h, i, a) => (
                <div key={i} style={{ padding: "9px 12px", fontSize: ".56rem", fontWeight: 800, color: "#4a6075", letterSpacing: ".04em", textTransform: "uppercase", borderLeft: i < a.length-1 ? "1px solid #e0e7ef" : "none" }}>{h}</div>
              ))}
            </div>

            {filtered.map((inv, i, arr) => {
              const cfg = STATUS_CFG[inv.status] || STATUS_CFG.issued;
              const isLast = i === arr.length - 1;
              return (
                <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "120px 140px 1fr 110px 120px 100px 80px", borderBottom: isLast ? "none" : "1px solid #f0f4f8", borderRight: `3px solid ${cfg.color}`, transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f7faff"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".6rem", fontWeight: 800, color: "#0875dc", fontFamily: "monospace" }}>{inv.invoice_number}</span>
                    {inv.orders && <span style={{ fontSize: ".52rem", color: "#a0adb8" }}>{inv.orders.reference_no}</span>}
                  </div>

                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#073766" }}>{inv.clients?.name || "—"}</span>
                    {inv.clients?.phone && <span style={{ fontSize: ".56rem", color: "#a0adb8" }}>{inv.clients.phone}</span>}
                  </div>

                  <div style={{ padding: "12px", display: "flex", alignItems: "center", borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".65rem", color: "#334155" }}>{inv.service_name || inv.description}</span>
                  </div>

                  <div style={{ padding: "12px", display: "flex", alignItems: "center", borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".57rem", fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".68rem", fontWeight: 800, color: "#073766" }}>{fmtMoney(inv.total_amount)}</span>
                    <span style={{ fontSize: ".54rem", color: "#a0adb8" }}>ض.ق.م {fmtMoney(inv.tax_amount)}</span>
                  </div>

                  <div style={{ padding: "12px", display: "flex", alignItems: "center", borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".6rem", color: "#526983" }}>{fmtDate(inv.created_at)}</span>
                  </div>

                  <div style={{ padding: "12px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                      title="عرض الفاتورة"
                      style={{ display: "inline-flex", width: 28, height: 28, borderRadius: 7, background: "#eaf4ff", border: "1px solid #bddcff", alignItems: "center", justifyContent: "center", color: "#0875dc", textDecoration: "none" }}>
                      <Eye size={12} />
                    </a>
                    <button title="تعديل الحالة"
                      onClick={() => { setSelected(inv); setEditData({ status: inv.status, payment_method: inv.payment_method || "", notes: inv.notes || "" }); setEditMode(true); }}
                      style={{ display: "inline-flex", width: 28, height: 28, borderRadius: 7, background: "#f0f4f9", border: "1px solid #e0e7ef", alignItems: "center", justifyContent: "center", color: "#526983", cursor: "pointer" }}>
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Edit modal */}
      {editMode && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,55,102,.4)", zIndex: 200, display: "grid", placeItems: "center" }}
          onClick={e => { if (e.target === e.currentTarget) { setEditMode(false); setSelected(null); } }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: ".8rem", fontWeight: 800, color: "#073766" }}>تعديل الفاتورة</div>
                <div style={{ fontSize: ".62rem", color: "#8b9dad", marginTop: 2 }}>{selected.invoice_number} — {selected.clients?.name}</div>
              </div>
              <button onClick={() => { setEditMode(false); setSelected(null); }}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e0e7ef", background: "#f8fafc", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <X size={14} color="#526983" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: ".62rem", fontWeight: 700, color: "#526983", display: "block", marginBottom: 5 }}>الحالة</label>
                <select value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontSize: ".68rem", border: "1.5px solid #e0e7ef", borderRadius: 9, outline: "none", background: "#fff", color: "#073766" }}>
                  <option value="issued">صادرة</option>
                  <option value="paid">مدفوعة ✓</option>
                  <option value="cancelled">ملغاة</option>
                  <option value="refunded">مستردة</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: ".62rem", fontWeight: 700, color: "#526983", display: "block", marginBottom: 5 }}>طريقة الدفع</label>
                <select value={editData.payment_method} onChange={e => setEditData(d => ({ ...d, payment_method: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", fontSize: ".68rem", border: "1.5px solid #e0e7ef", borderRadius: 9, outline: "none", background: "#fff", color: "#073766" }}>
                  <option value="">— غير محدد —</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="cash">نقداً</option>
                  <option value="credit_card">بطاقة ائتمانية</option>
                  <option value="stc_pay">STC Pay</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: ".62rem", fontWeight: 700, color: "#526983", display: "block", marginBottom: 5 }}>ملاحظات</label>
                <textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                  rows={3} placeholder="أي ملاحظات إضافية..."
                  style={{ width: "100%", padding: "9px 12px", fontSize: ".65rem", border: "1.5px solid #e0e7ef", borderRadius: 9, outline: "none", resize: "vertical", fontFamily: "inherit", color: "#073766" }} />
              </div>

              {/* Amount info */}
              <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: ".62rem", color: "#8b9dad" }}>
                  المبلغ قبل الضريبة<br />
                  <strong style={{ color: "#073766" }}>{fmtMoney(selected.amount)} {selected.currency}</strong>
                </div>
                <div style={{ fontSize: ".62rem", color: "#8b9dad", textAlign: "center" }}>
                  ض.ق.م ({selected.tax_rate}%)<br />
                  <strong style={{ color: "#073766" }}>{fmtMoney(selected.tax_amount)} {selected.currency}</strong>
                </div>
                <div style={{ fontSize: ".62rem", color: "#8b9dad", textAlign: "left" }}>
                  الإجمالي<br />
                  <strong style={{ color: "#0875dc", fontSize: ".75rem" }}>{fmtMoney(selected.total_amount)} {selected.currency}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setEditMode(false); setSelected(null); }}
                  style={{ padding: "9px 18px", border: "1.5px solid #e0e7ef", borderRadius: 9, fontSize: ".65rem", fontWeight: 700, color: "#526983", background: "#fff", cursor: "pointer" }}>
                  إلغاء
                </button>
                <button onClick={saveEdit} disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "none", borderRadius: 9, fontSize: ".65rem", fontWeight: 700, color: "#fff", background: "#073766", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1 }}>
                  {saving ? <Loader size={12} style={{ animation: "spin .6s linear infinite" }} /> : <Save size={12} />}
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
