import PageLoader from "@/components/page-loader";
"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, CreditCard, Users, X, ArrowLeftRight, CheckCircle } from "lucide-react";
import Link from "next/link";

type PackageItem = {
  id: string;
  title_ar: string;
  description_ar: string | null;
  category: string;
  tier_ar: string;
  price: number;
  original_price: number | null;
  billing_cycle: string;
  features: string[];
  max_employees: number;
  extra_employee_price: number;
  tax_percent: number;
  is_popular: boolean;
  sort_order: number;
};

const cycleLabels: Record<string, string> = {
  monthly:   "شهري",
  yearly:    "سنوي",
  quarterly: "ربع سنوي",
  "one-time":"مرة واحدة",
};

const CATEGORY_COLORS: Record<string, { accent: string; light: string; border: string }> = {
  founding: { accent: "#073766", light: "#f0f7ff", border: "#d1e4f5" },
  services:  { accent: "#073766", light: "#f0f7ff", border: "#d1e4f5" },
  legal:     { accent: "#073766", light: "#f0f7ff", border: "#d1e4f5" },
};

export default function ClientPackagesPage() {
  const [packages, setPackages]           = useState<PackageItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [subscribing, setSubscribing]     = useState<string | null>(null);
  const [successId, setSuccessId]         = useState<string | null>(null);
  const [activeTab, setActiveTab]         = useState("all");
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [compareIds, setCompareIds]       = useState<string[]>([]);
  const [showCompare, setShowCompare]     = useState(false);

  useEffect(() => {
    fetch("/api/client/packages")
      .then(r => r.json())
      .then(res => { if (res.data) setPackages(res.data); else setError(res.error || "فشل تحميل الباقات"); })
      .catch(() => setError("تعذر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "all",      label: "الكل" },
    { id: "founding", label: "تأسيس الشركات" },
    { id: "services", label: "باقات الخدمات" },
    { id: "legal",    label: "الباقات القانونية" },
  ];

  const visible = activeTab === "all" ? packages : packages.filter(p => p.category === activeTab);

  function getPricing(pkg: PackageItem) {
    const emp      = employeeCounts[pkg.id] || 0;
    const extra    = Math.max(0, emp - (pkg.max_employees || 0));
    const extraAmt = extra * (pkg.extra_employee_price || 0);
    const subtotal = pkg.price + extraAmt;
    const taxAmt   = Math.round(subtotal * (pkg.tax_percent || 15) / 100 * 100) / 100;
    return { subtotal, taxAmt, total: subtotal + taxAmt, extraAmt };
  }

  async function subscribe(pkg: PackageItem) {
    setSubscribing(pkg.id);
    setError("");
    try {
      const res  = await fetch("/api/client/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ package_id: pkg.id, employee_count: employeeCounts[pkg.id] || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessId(pkg.id);
    } catch (err: any) {
      setError(err.message || "فشل الاشتراك");
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) return <PageLoader text="جاري تحميل الباقات..." />;

  return (
    <div className="client-dash-page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: ".7rem", color: "#8b9dad", margin: "0 0 4px" }}>لوحة التحكم</p>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0b1e36", margin: "0 0 4px" }}>الباقات</h1>
        <p style={{ fontSize: ".75rem", color: "#8b9dad", margin: 0 }}>اختر الباقة المناسبة لمنشأتك وابدأ فوراً</p>
      </div>

      {/* Success banner */}
      {successId && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, color: "#15803d", marginBottom: 20 }}>
          <CheckCircle size={18} />
          <span style={{ fontSize: ".78rem", fontWeight: 600 }}>تم الاشتراك بنجاح!</span>
          <Link href="/dashboard/subscriptions" style={{ marginRight: "auto", padding: "6px 14px", background: "#15803d", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: ".72rem", fontWeight: 700 }}>
            عرض اشتراكاتي
          </Link>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", marginBottom: 20, fontSize: ".75rem" }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 24, overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} type="button"
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? "#073766" : "#64748b", background: activeTab === tab.id ? "#fff" : "transparent", boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,.08)" : "none", cursor: "pointer", font: "inherit", whiteSpace: "nowrap", transition: "all .2s" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty */}
      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <p style={{ fontWeight: 700, color: "#526983" }}>لا توجد باقات في هذا التصنيف</p>
        </div>
      )}

      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {visible.map(pkg => {
          const pricing = getPricing(pkg);
          const clr     = CATEGORY_COLORS[pkg.category] ?? { accent: "#073766", light: "#eaf4ff", border: "#bfdbfe" };
          const isDone  = successId === pkg.id;

          return (
            <article key={pkg.id} style={{
              background: "#fff",
              border: `2px solid ${pkg.is_popular ? "#b45309" : "#e8edf5"}`,
              borderRadius: 18,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              transition: "box-shadow .2s, border-color .2s",
              boxShadow: pkg.is_popular ? "0 4px 24px rgba(180,83,9,.12)" : "none",
            }}
              onMouseEnter={e => { if (!pkg.is_popular) { e.currentTarget.style.borderColor = "#c8d8eb"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(7,55,102,.07)"; } }}
              onMouseLeave={e => { if (!pkg.is_popular) { e.currentTarget.style.borderColor = "#e8edf5"; e.currentTarget.style.boxShadow = "none"; } }}>

              {/* Popular ribbon */}
              {pkg.is_popular && (
                <div style={{ background: "linear-gradient(90deg, #92400e, #b45309)", color: "#fef3c7", fontSize: 11, fontWeight: 700, textAlign: "center", padding: "5px 0", letterSpacing: .5 }}>
                  ★ الأكثر طلباً
                </div>
              )}

              {/* Card top */}
              <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #f0f4f8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#073766", background: "#eaf1fb", border: "1px solid #c8daf0", borderRadius: 20, padding: "2px 9px" }}>
                    {pkg.tier_ar}
                  </span>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, color: compareIds.includes(pkg.id) ? "#073766" : "#94a3b8", fontWeight: 600, userSelect: "none" }}>
                    <input type="checkbox" checked={compareIds.includes(pkg.id)}
                      onChange={() => setCompareIds(prev => prev.includes(pkg.id) ? prev.filter(x => x !== pkg.id) : [...prev, pkg.id])}
                      style={{ width: 13, height: 13, cursor: "pointer", accentColor: "#073766" }} />
                    مقارنة
                  </label>
                </div>

                <h3 style={{ fontSize: ".88rem", fontWeight: 800, color: "#0b1e36", margin: "0 0 4px", lineHeight: 1.3 }}>{pkg.title_ar}</h3>
                {pkg.description_ar && (
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>{pkg.description_ar}</p>
                )}

                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#073766", lineHeight: 1 }}>
                    {pricing.total.toLocaleString("ar-SA")}
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>ر.س / {cycleLabels[pkg.billing_cycle] || pkg.billing_cycle}</span>
                  {pkg.original_price && (
                    <del style={{ fontSize: 12, color: "#ef4444" }}>{pkg.original_price.toLocaleString("ar-SA")} ر.س</del>
                  )}
                </div>
              </div>

              {/* Features */}
              <div style={{ padding: "14px 18px", flex: 1 }}>
                {pkg.max_employees > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>
                    <Users size={13} color="#64748b" />
                    <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <span>أول {pkg.max_employees} موظف مشمولون</span>
                      <input type="number" min={0} value={employeeCounts[pkg.id] || 0}
                        onChange={e => setEmployeeCounts(prev => ({ ...prev, [pkg.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        style={{ width: 52, padding: "3px 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, textAlign: "center", marginRight: "auto" }} />
                    </label>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {pkg.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Check size={12} color="#073766" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown + CTA */}
              <div style={{ padding: "12px 18px 16px", borderTop: "1px solid #f0f4f8" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                    <span>السعر الأساسي</span><span>{pkg.price.toLocaleString("ar-SA")} ر.س</span>
                  </div>
                  {pricing.extraAmt > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                      <span>موظفون إضافيون</span><span>+ {pricing.extraAmt.toLocaleString("ar-SA")} ر.س</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                    <span>ضريبة ({pkg.tax_percent || 15}%)</span><span>{pricing.taxAmt.toLocaleString("ar-SA")} ر.س</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#073766", borderTop: "1px dashed #e5eaf0", paddingTop: 5, marginTop: 2 }}>
                    <span>المجموع</span><span>{pricing.total.toLocaleString("ar-SA")} ر.س</span>
                  </div>
                </div>

                {isDone ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 9, color: "#15803d", fontSize: 13, fontWeight: 700 }}>
                    <CheckCircle size={15} /> تم الاشتراك
                  </div>
                ) : (
                  <button onClick={() => subscribe(pkg)} disabled={!!subscribing} type="button"
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", background: subscribing === pkg.id ? "#8b9dad" : "#073766", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: subscribing ? "not-allowed" : "pointer", font: "inherit", transition: "background .2s" }}>
                    {subscribing === pkg.id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CreditCard size={14} />}
                    {subscribing === pkg.id ? "جاري الاشتراك..." : "اشترك الآن"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Compare bar */}
      {compareIds.length >= 2 && (
        <div style={{ position: "fixed", bottom: 0, right: 0, left: 0, background: "#073766", color: "#fff", display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", zIndex: 500, direction: "rtl" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{compareIds.length} باقات محددة</span>
          <button onClick={() => setShowCompare(true)}
            style={{ border: 0, borderRadius: 8, padding: "8px 16px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: "#0875dc", color: "#fff" }}>
            <ArrowLeftRight size={14} /> مقارنة
          </button>
          <button onClick={() => setCompareIds([])}
            style={{ border: 0, background: "transparent", color: "rgba(255,255,255,.7)", font: "inherit", fontSize: 13, cursor: "pointer", padding: "8px 12px" }}>
            إلغاء
          </button>
        </div>
      )}

      {/* Compare modal */}
      {showCompare && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, direction: "rtl" }}
          onClick={() => setShowCompare(false)}>
          <div style={{ background: "#fff", borderRadius: 18, width: "min(900px,100%)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,.15)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #e5ecf3" }}>
              <h3 style={{ margin: 0, fontSize: ".9rem", color: "#073766" }}>مقارنة الباقات</h3>
              <button onClick={() => setShowCompare(false)} style={{ border: 0, background: "#f5f8fc", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center", color: "#526983" }}><X size={18} /></button>
            </div>
            <div style={{ overflow: "auto", padding: "0 4px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#425c76", background: "#fafbfc", borderBottom: "2px solid #e5ecf3", minWidth: 120 }}>الميزة</th>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return <th key={id} style={{ padding: "12px 14px", textAlign: "center", fontWeight: 800, color: "#073766", background: "#f8fafc", borderBottom: "2px solid #e5ecf3", whiteSpace: "nowrap" }}>{p?.title_ar}</th>; })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "السعر", render: (p: PackageItem) => `${p.price.toLocaleString("ar-SA")} ر.س / ${cycleLabels[p.billing_cycle] || ""}` },
                    { label: "الموظفون الأساسيون", render: (p: PackageItem) => p.max_employees || 0 },
                    { label: "سعر الموظف الإضافي", render: (p: PackageItem) => p.extra_employee_price ? `${p.extra_employee_price} ر.س` : "—" },
                    { label: "دورة الفوترة", render: (p: PackageItem) => cycleLabels[p.billing_cycle] || "—" },
                  ].map(row => (
                    <tr key={row.label}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#425c76", background: "#fafbfc", borderBottom: "1px solid #eef2f6" }}>{row.label}</td>
                      {compareIds.map(id => { const p = packages.find(x => x.id === id); return <td key={id} style={{ padding: "10px 14px", textAlign: "center", borderBottom: "1px solid #eef2f6", color: "#1a2d40" }}>{p ? row.render(p) : "—"}</td>; })}
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#425c76", background: "#fafbfc", verticalAlign: "top" }}>المميزات</td>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return (
                      <td key={id} style={{ padding: "10px 14px", verticalAlign: "top" }}>
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, textAlign: "right" }}>
                          {(p?.features || []).map((f, i) => (
                            <li key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12, color: "#1a2d40" }}>
                              <Check size={11} color="#15803d" /> {f}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ); })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
