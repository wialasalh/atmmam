"use client";

import { useEffect, useState } from "react";
import { Package, CalendarDays, CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, Loader, Search, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { formatAppDate } from "@/lib/date-format";

type SubscriptionItem = {
  id: string;
  status: string;
  employee_count: number;
  base_price: number;
  extra_price: number;
  tax_amount: number;
  total_price: number;
  billing_cycle: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  packages: {
    id: string;
    title_ar: string;
    tier_ar: string;
    category: string;
    billing_cycle: string;
    price: number;
  } | null;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  active:    { label: "نشط",              color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={10} /> },
  pending:   { label: "بانتظار الدفع",    color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <Clock size={10} /> },
  cancelled: { label: "ملغي",             color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle size={10} /> },
  expired:   { label: "منتهي",            color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <AlertCircle size={10} /> },
};

const CYCLE_AR: Record<string, string> = {
  monthly: "شهري", yearly: "سنوي", quarterly: "ربع سنوي", "one-time": "مرة واحدة",
};

const PAGE_SIZE = 8;

const fmtDate = formatAppDate;

function getDaysRemaining(endDate: string | null) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { days: Math.abs(diff), state: "expired" as const };
  if (diff <= 30) return { days: diff, state: "soon" as const };
  return { days: diff, state: "ok" as const };
}

export default function ClientSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState<"active" | "all">("active");
  const [page, setPage]         = useState(1);

  useEffect(() => {
    fetch("/api/client/subscriptions")
      .then(r => r.json())
      .then(res => { if (res.data) setSubscriptions(res.data); else setError(res.error || "فشل التحميل"); })
      .catch(() => setError("تعذر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const totalSpend  = subscriptions.filter(s => s.status === "active").reduce((a, s) => a + s.total_price, 0);

  const filtered = subscriptions
    .filter(s => tab === "active" ? ["active","pending"].includes(s.status) : true)
    .filter(s => !search || (s.packages?.title_ar || "").includes(search) || (s.packages?.tier_ar || "").includes(search));

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeTab = (t: typeof tab) => { setTab(t); setPage(1); };

  return (
    <div style={{ direction: "rtl", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: ".63rem", fontWeight: 700, color: "#0875dc", textTransform: "uppercase", letterSpacing: ".04em" }}>اشتراكاتي</p>
          <h1 style={{ margin: "0 0 3px", fontSize: "1.15rem", fontWeight: 800, color: "#073766" }}>باقاتي واشتراكاتي</h1>
          <p style={{ margin: 0, fontSize: ".68rem", color: "#8b9dad" }}>جميع الباقات التي اشتركت فيها، النشطة والمنتهية</p>
        </div>
        <Link href="/dashboard/packages"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".65rem", fontWeight: 700, color: "#fff", background: "#073766", padding: "8px 16px", borderRadius: 10, textDecoration: "none", boxShadow: "0 2px 8px rgba(7,55,102,.2)" }}>
          <Package size={13} /> اشتراك جديد
        </Link>
      </div>

      {/* Stats */}
      {subscriptions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "اشتراكات نشطة",   value: activeCount,                          color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", icon: <CheckCircle2 size={16} color="#15803d" /> },
            { label: "إجمالي الباقات",   value: subscriptions.length,                color: "#0875dc", bg: "linear-gradient(135deg,#eaf4ff,#dbeafe)",  icon: <Package size={16} color="#0875dc" /> },
            { label: "إجمالي الإنفاق",  value: totalSpend.toLocaleString("ar-SA") + " ر.س", color: "#0f766e", bg: "linear-gradient(135deg,#f0fdfa,#e0f7f4)", icon: <CreditCard size={16} color="#0f766e" /> },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e8edf5", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: typeof s.value === "number" ? "1.35rem" : "1rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: ".58rem", color: "#8b9dad", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: ".65rem", marginBottom: 16 }}>{error}</div>
      )}

      {/* Pending payment notice */}
      {subscriptions.some(s => s.status === "pending") && (
        <div style={{ background: "#fef9ee", border: "1.5px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Clock size={15} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: ".7rem", fontWeight: 800, color: "#b45309", marginBottom: 2 }}>اشتراك بانتظار تأكيد الدفع</div>
            <div style={{ fontSize: ".63rem", color: "#92400e", lineHeight: 1.6 }}>
              لديك اشتراك معلق — سيتم تفعيله تلقائياً بمجرد تأكيد الفريق لاستلام الدفع. يمكنك مراجعة الفاتورة في قسم <strong>فواتيري</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Main panel */}
      <div style={{ background: "#fff", border: "1.5px solid #e0e7ef", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(8,55,102,.04)" }}>

        {/* Tab + search bar */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1.5px solid #e8edf5", padding: "0 16px", background: "#fafbfc", gap: 4 }}>
          {[
            { id: "active" as const, label: "النشطة",    count: subscriptions.filter(s => ["active","pending"].includes(s.status)).length },
            { id: "all"    as const, label: "جميع الباقات", count: subscriptions.length },
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
          {/* Search */}
          <div style={{ position: "relative", marginLeft: 4 }}>
            <Search size={12} color="#a0adb8" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث في الباقات..."
              style={{ paddingRight: 30, paddingLeft: 10, paddingTop: 6, paddingBottom: 6, fontSize: ".62rem", border: "1.5px solid #e0e7ef", borderRadius: 8, outline: "none", color: "#073766", width: 160, background: "#fff" }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
            <Loader size={22} color="#0875dc" style={{ animation: "spin .6s linear infinite" }} />
          </div>
        ) : pageRows.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", padding: "56px 24px", textAlign: "center" }}>
            <Package size={36} color="#d1dae3" strokeWidth={1.5} />
            <p style={{ margin: "12px 0 4px", fontSize: ".75rem", fontWeight: 700, color: "#8b9dad" }}>
              {search ? "لا توجد نتائج للبحث" : "لا توجد اشتراكات بعد"}
            </p>
            {!search && (
              <Link href="/dashboard/packages"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".65rem", fontWeight: 700, color: "#fff", background: "#073766", padding: "8px 18px", borderRadius: 10, textDecoration: "none", marginTop: 8 }}>
                تصفح الباقات
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 120px 90px 40px", background: "#f4f7fb", borderBottom: "1.5px solid #e0e7ef" }}>
              {["الباقة / الخدمة", "الحالة", "دورة الفوترة", "المبلغ", "تاريخ البداية", ""].map((h, i, a) => (
                <div key={i} style={{ padding: "9px 14px", fontSize: ".58rem", fontWeight: 800, color: "#4a6075", letterSpacing: ".04em", textTransform: "uppercase", borderLeft: i < a.length-1 ? "1px solid #e0e7ef" : "none" }}>{h}</div>
              ))}
            </div>

            {pageRows.map((sub, i, arr) => {
              const cfg = STATUS_CFG[sub.status] || STATUS_CFG.expired;
              const remaining = getDaysRemaining(sub.end_date);
              const isLast = i === arr.length - 1;
              const accentColor = sub.status === "active" ? "#15803d" : sub.status === "pending" ? "#b45309" : "#9ca3af";

              return (
                <div key={sub.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 120px 90px 40px", borderBottom: isLast ? "none" : "1px solid #f0f4f8", borderRight: `3px solid ${accentColor}`, transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f7faff"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                  {/* الباقة */}
                  <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".72rem", fontWeight: 800, color: "#073766", lineHeight: 1.3 }}>{sub.packages?.title_ar || "باقة غير معروفة"}</span>
                    {sub.packages?.tier_ar && (
                      <span style={{ fontSize: ".58rem", color: "#0875dc", fontWeight: 600 }}>{sub.packages.tier_ar}</span>
                    )}
                    {remaining && (
                      <span style={{
                        fontSize: ".55rem", fontWeight: 700,
                        color: remaining.state === "expired" ? "#dc2626" : remaining.state === "soon" ? "#b45309" : "#15803d",
                        display: "flex", alignItems: "center", gap: 3
                      }}>
                        <Clock size={9} />
                        {remaining.state === "expired" ? `انتهى منذ ${remaining.days} يوم` : `متبقي ${remaining.days} يوم`}
                      </span>
                    )}
                  </div>

                  {/* الحالة */}
                  <div style={{ padding: "14px 14px", display: "flex", alignItems: "center", borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".58rem", fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {/* دورة الفوترة */}
                  <div style={{ padding: "14px 14px", display: "flex", alignItems: "center", borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".65rem", color: "#526983", fontWeight: 600 }}>
                      {CYCLE_AR[sub.billing_cycle] || sub.billing_cycle}
                    </span>
                  </div>

                  {/* المبلغ */}
                  <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".72rem", fontWeight: 800, color: "#073766" }}>
                      {sub.total_price.toLocaleString("ar-SA")} <span style={{ fontSize: ".58rem", fontWeight: 600, color: "#8b9dad" }}>ر.س</span>
                    </span>
                    {sub.tax_amount > 0 && (
                      <span style={{ fontSize: ".55rem", color: "#a0adb8" }}>شامل ض.ق.م</span>
                    )}
                  </div>

                  {/* تاريخ البداية */}
                  <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, borderLeft: "1px solid #f0f4f8" }}>
                    <span style={{ fontSize: ".62rem", color: "#526983", fontWeight: 600 }}>{fmtDate(sub.start_date)}</span>
                    {sub.end_date && (
                      <span style={{ fontSize: ".55rem", color: "#a0adb8" }}>← {fmtDate(sub.end_date)}</span>
                    )}
                  </div>

                  {/* Arrow */}
                  <div style={{ padding: "14px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronLeft size={14} color="#c0cbd8" />
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
                    style={{ border:"1px solid #e0e7ef", borderRadius:8, padding:"5px 12px", fontSize:".6rem", fontWeight:700, color:page===1?"#c0cbd8":"#526983", background:page===1?"#f8fafc":"#fff", cursor:page===1?"not-allowed":"pointer" }}>
                    السابق
                  </button>
                  {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                    <button key={p} onClick={()=>setPage(p)}
                      style={{ border:"1px solid "+(p===page?"#0875dc":"#e0e7ef"), borderRadius:8, padding:"5px 11px", fontSize:".6rem", fontWeight:700, color:p===page?"#fff":"#526983", background:p===page?"#0875dc":"#fff", cursor:"pointer", minWidth:32 }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                    style={{ border:"1px solid #e0e7ef", borderRadius:8, padding:"5px 12px", fontSize:".6rem", fontWeight:700, color:page===totalPages?"#c0cbd8":"#526983", background:page===totalPages?"#f8fafc":"#fff", cursor:page===totalPages?"not-allowed":"pointer" }}>
                    التالي
                  </button>
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
