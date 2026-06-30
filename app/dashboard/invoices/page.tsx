"use client";

import { useEffect, useState } from "react";
import { FileText, Download, CheckCircle2, Clock, XCircle, AlertCircle, Loader, Search, Receipt, CreditCard, ChevronLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatAppDate, formatAppRelativeTime } from "@/lib/date-format";

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
  orders: { id: string; reference_no: string } | null;
};

type ClientInfo = {
  name: string;
  tax_number: string | null;
  commercial_number: string | null;
  company_address: string | null;
  city: string | null;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  issued:    { label: "صادرة",   color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <Clock size={10} /> },
  paid:      { label: "مدفوعة",  color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={10} /> },
  cancelled: { label: "ملغاة",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle size={10} /> },
  refunded:  { label: "مستردة",  color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <AlertCircle size={10} /> },
};

const PAYMENT_AR: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  cash:          "نقداً",
  credit_card:   "بطاقة ائتمانية",
  stc_pay:       "STC Pay",
};

const PAGE_SIZE = 10;

function fmtMoney(n: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(n) + " " + currency;
}

const fmtDate = formatAppDate;
const timeAgo = formatAppRelativeTime;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [client, setClient]     = useState<ClientInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState<"all" | "paid" | "issued">("all");
  const [page, setPage]         = useState(1);

  useEffect(() => {
    fetch("/api/client/invoices")
      .then(r => r.json())
      .then(res => {
        if (res.data) { setInvoices(res.data); setClient(res.client); }
        else setError(res.error || "فشل التحميل");
      })
      .catch(() => setError("تعذر الاتصال"))
      .finally(() => setLoading(false));
  }, []);

  const missingTaxInfo = client && !client.tax_number && !client.commercial_number;

  const filtered = invoices
    .filter(inv => tab === "all" || inv.status === tab)
    .filter(inv => !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.service_name || "").includes(search) ||
      inv.description.includes(search)
    );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalPaid    = invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.total_amount, 0);
  const totalIssued  = invoices.filter(i => i.status === "issued").reduce((a, i) => a + i.total_amount, 0);

  const changeTab = (t: typeof tab) => { setTab(t); setPage(1); };

  return (
    <div style={{ direction: "rtl", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: ".63rem", fontWeight: 700, color: "#0875dc", textTransform: "uppercase", letterSpacing: ".04em" }}>المالية</p>
          <h1 style={{ margin: "0 0 3px", fontSize: "1.15rem", fontWeight: 800, color: "#073766" }}>فواتيري</h1>
          <p style={{ margin: 0, fontSize: ".68rem", color: "#8b9dad" }}>سجل فواتيرك الضريبية وحالة السداد</p>
        </div>
      </div>

      {/* Tax info warning */}
      {missingTaxInfo && (
        <div style={{ background: "#fef9ee", border: "1.5px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={16} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: ".7rem", fontWeight: 800, color: "#b45309", marginBottom: 3 }}>البيانات الضريبية غير مكتملة</div>
            <div style={{ fontSize: ".63rem", color: "#92400e", lineHeight: 1.6 }}>
              لإصدار فواتير ضريبية رسمية يجب توفير الرقم الضريبي أو السجل التجاري والعنوان الوطني في ملف المنشأة.
            </div>
            <Link href="/dashboard/companies" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".62rem", fontWeight: 700, color: "#b45309", marginTop: 6, textDecoration: "none" }}>
              استكمال البيانات <ChevronLeft size={11} />
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      {invoices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "إجمالي الفواتير", value: invoices.length,            color: "#0875dc", bg: "linear-gradient(135deg,#eaf4ff,#dbeafe)", icon: <FileText size={16} color="#0875dc" />, isMoney: false },
            { label: "المدفوع",          value: totalPaid,                  color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", icon: <CheckCircle2 size={16} color="#15803d" />, isMoney: true },
            { label: "في انتظار السداد", value: totalIssued,                color: "#b45309", bg: "linear-gradient(135deg,#fef9ee,#fef3c7)", icon: <Clock size={16} color="#b45309" />, isMoney: true },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: s.isMoney ? ".95rem" : "1.35rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>
                  {s.isMoney ? fmtMoney(s.value as number) : s.value}
                </div>
                <div style={{ fontSize: ".58rem", color: "#8b9dad", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: ".65rem", marginBottom: 16 }}>{error}</div>
      )}

      {/* Main panel */}
      <div style={{ background: "#fff", border: "1.5px solid #e0e7ef", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(8,55,102,.04)" }}>

        {/* Tabs + search */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e8edf5", padding: "0 16px", background: "#fafbfc", gap: 2 }}>
          {[
            { id: "all"    as const, label: "جميع الفواتير", count: invoices.length },
            { id: "issued" as const, label: "غير مدفوعة",    count: invoices.filter(i => i.status === "issued").length },
            { id: "paid"   as const, label: "مدفوعة",         count: invoices.filter(i => i.status === "paid").length },
          ].map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => changeTab(t.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 14px", fontSize: ".67rem", fontWeight: active ? 800 : 600, color: active ? "#0875dc" : "#7c8b9b", background: "none", border: "none", cursor: "pointer", borderBottom: active ? "2.5px solid #0875dc" : "2.5px solid transparent", marginBottom: -1.5, transition: "color .15s", whiteSpace: "nowrap" }}>
                {t.label}
                <span style={{ fontSize: ".55rem", fontWeight: 700, background: active ? "#eaf4ff" : "#f1f5f9", color: active ? "#0875dc" : "#8b9dad", padding: "1px 7px", borderRadius: 20 }}>
                  {t.count}
                </span>
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative", margin: "6px 0" }}>
            <Search size={12} color="#a0adb8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث برقم الفاتورة أو الخدمة..."
              style={{ paddingRight: 30, paddingLeft: 10, paddingTop: 6, paddingBottom: 6, fontSize: ".62rem", border: "1.5px solid #e0e7ef", borderRadius: 8, outline: "none", color: "#073766", width: 200, background: "#fff" }}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
            <Loader size={22} color="#0875dc" style={{ animation: "spin .6s linear infinite" }} />
          </div>
        ) : pageRows.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", padding: "56px 24px", textAlign: "center" }}>
            <Receipt size={36} color="#d1dae3" strokeWidth={1.5} />
            <p style={{ margin: "12px 0 4px", fontSize: ".75rem", fontWeight: 700, color: "#8b9dad" }}>
              {search ? "لا توجد نتائج" : "لا توجد فواتير بعد"}
            </p>
            <p style={{ margin: 0, fontSize: ".64rem", color: "#b0bcc9" }}>
              تُنشأ الفاتورة تلقائياً عند اكتمال طلبك
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 110px 130px 90px 90px", background: "#f4f7fb", borderBottom: "1.5px solid #e0e7ef" }}>
              {["رقم الفاتورة", "الخدمة / الوصف", "الحالة", "الإجمالي", "تاريخ الإصدار", ""].map((h, i, a) => (
                <div key={i} style={{ padding: "9px 14px", fontSize: ".58rem", fontWeight: 800, color: "#4a6075", letterSpacing: ".04em", textTransform: "uppercase", borderLeft: i < a.length-1 ? "1px solid #e0e7ef" : "none" }}>{h}</div>
              ))}
            </div>

            {pageRows.map((inv, i, arr) => {
              const cfg = STATUS_CFG[inv.status] || STATUS_CFG.issued;
              const isLast = i === arr.length - 1;
              return (
                <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 110px 130px 90px 90px", borderBottom: isLast ? "none" : "1px solid #f0f4f8", borderRight: `3px solid ${cfg.color}`, transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f7faff"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                  {/* رقم الفاتورة */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".65rem", fontWeight: 800, color: "#0875dc", fontFamily: "monospace" }}>{inv.invoice_number}</span>
                    {inv.orders && (
                      <span style={{ fontSize: ".55rem", color: "#a0adb8" }}>{inv.orders.reference_no}</span>
                    )}
                  </div>

                  {/* الوصف */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#073766" }}>{inv.service_name || inv.description}</span>
                    {inv.payment_method && (
                      <span style={{ fontSize: ".58rem", color: "#8b9dad", display: "flex", alignItems: "center", gap: 3 }}>
                        <CreditCard size={9} /> {PAYMENT_AR[inv.payment_method] || inv.payment_method}
                      </span>
                    )}
                  </div>

                  {/* الحالة */}
                  <div style={{ padding: "14px", display: "flex", alignItems: "center", borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".58rem", fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {/* المبلغ */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".75rem", fontWeight: 800, color: "#073766" }}>
                      {fmtMoney(inv.total_amount, inv.currency)}
                    </span>
                    <span style={{ fontSize: ".55rem", color: "#a0adb8" }}>
                      شامل ض.ق.م {fmtMoney(inv.tax_amount, inv.currency)}
                    </span>
                  </div>

                  {/* التاريخ */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".62rem", color: "#526983", fontWeight: 600 }}>{timeAgo(inv.created_at)}</span>
                    {inv.paid_at && (
                      <span style={{ fontSize: ".55rem", color: "#15803d" }}>سُدِّد {fmtDate(inv.paid_at)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ padding: "14px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                      title="عرض / تحميل الفاتورة"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#eaf4ff", border: "1px solid #bddcff", color: "#0875dc", textDecoration: "none", transition: "all .15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#0875dc"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#eaf4ff"; (e.currentTarget as HTMLElement).style.color = "#0875dc"; }}>
                      <Download size={13} />
                    </a>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1.5px solid #e8edf5", background: "#fafbfc" }}>
                <span style={{ fontSize: ".6rem", color: "#8b9dad" }}>
                  {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} من {filtered.length}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                    style={{ border:"1px solid #e0e7ef", borderRadius:8, padding:"5px 12px", fontSize:".6rem", fontWeight:700, color:page===1?"#c0cbd8":"#526983", background:page===1?"#f8fafc":"#fff", cursor:page===1?"not-allowed":"pointer" }}>السابق</button>
                  {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                    <button key={p} onClick={()=>setPage(p)}
                      style={{ border:"1px solid "+(p===page?"#0875dc":"#e0e7ef"), borderRadius:8, padding:"5px 11px", fontSize:".6rem", fontWeight:700, color:p===page?"#fff":"#526983", background:p===page?"#0875dc":"#fff", cursor:"pointer", minWidth:32 }}>{p}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                    style={{ border:"1px solid #e0e7ef", borderRadius:8, padding:"5px 12px", fontSize:".6rem", fontWeight:700, color:page===totalPages?"#c0cbd8":"#526983", background:page===totalPages?"#f8fafc":"#fff", cursor:page===totalPages?"not-allowed":"pointer" }}>التالي</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
