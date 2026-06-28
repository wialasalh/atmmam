"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, CreditCard, Users, CalendarDays, ChevronLeft, Building2, X, ArrowLeftRight, Star } from "lucide-react";
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

const categoryLabels: Record<string, string> = {
  services: "باقات الخدمات",
  legal: "الباقات القانونية",
  founding: "تأسيس الشركات",
};

const cycleLabels: Record<string, string> = {
  monthly: "شهري",
  yearly: "سنوي",
  quarterly: "ربع سنوي",
  "one-time": "مرة واحدة",
};

export default function ClientPackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  function toggleCompare(id: string) {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  useEffect(() => {
    fetch("/api/client/packages")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setPackages(res.data);
        else setError(res.error || "فشل تحميل الباقات");
      })
      .catch(() => setError("تعذر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "all", label: "الكل" },
    { id: "founding", label: "تأسيس الشركات" },
    { id: "services", label: "باقات الخدمات" },
    { id: "legal", label: "الباقات القانونية" },
  ];

  const visiblePackages =
    activeTab === "all"
      ? packages
      : packages.filter((p) => p.category === activeTab);

  async function subscribe(pkg: PackageItem) {
    setSubscribing(pkg.id);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/client/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          package_id: pkg.id,
          employee_count: employeeCounts[pkg.id] || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(`تم الاشتراك في "${pkg.title_ar}" بنجاح!`);
    } catch (err: any) {
      setError(err.message || "فشل الاشتراك في الباقة");
    } finally {
      setSubscribing(null);
    }
  }

  function getPriceWithExtras(pkg: PackageItem): {
    baseLabel: string;
    extraLabel: string;
    total: number;
  } {
    const empCount = employeeCounts[pkg.id] || 0;
    const extra = Math.max(0, empCount - (pkg.max_employees || 0));
    const extraPrice = extra * (pkg.extra_employee_price || 0);
    const base = pkg.price;
    const subtotal = base + extraPrice;
    const tax = Math.round(subtotal * (pkg.tax_percent || 15) / 100 * 100) / 100;
    const total = subtotal + tax;
    return {
      baseLabel: `${base.toLocaleString("ar-SA")} ر.س`,
      extraLabel: extraPrice > 0 ? `+ ${extraPrice.toLocaleString("ar-SA")} ر.س` : "",
      total,
    };
  }

  if (loading) {
    return (
      <div className="dashboard-empty">
        <Loader2 size={32} className="spin" />
        <p>جاري تحميل الباقات...</p>
      </div>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">الباقات</p>
          <h1>اختر الباقة المناسبة لمنشأتك</h1>
          <span>اشترك في إحدى الباقات الجاهزة وابدأ فوراً</span>
        </div>
      </div>

      {successMsg ? (
        <div className="dashboard-success">
          <Check size={18} />
          <span>{successMsg}</span>
          <Link href="/dashboard/subscriptions" className="dashboard-btn">
            عرض اشتراكاتي
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="dashboard-error">
          <span>{error}</span>
        </div>
      ) : null}

      <div className="packages-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`package-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visiblePackages.length === 0 ? (
        <div className="dashboard-empty">
          <Building2 size={48} />
          <p>لا توجد باقات متاحة حالياً</p>
        </div>
      ) : (
        <div className="client-packages-grid">
          {visiblePackages.map((pkg) => {
            const pricing = getPriceWithExtras(pkg);
            return (
              <article
                className={`client-package-card ${pkg.is_popular ? "popular" : ""}`}
                key={pkg.id}
              >
                {pkg.is_popular ? (
                  <div className="popular-badge">الأكثر طلباً</div>
                ) : null}
                <label className="pkg-compare-toggle">
                  <input type="checkbox" checked={compareIds.includes(pkg.id)} onChange={() => toggleCompare(pkg.id)} />
                  <span>مقارنة</span>
                </label>
                <div className="package-header">
                  <span className="package-tier">{pkg.tier_ar}</span>
                  <h3>{pkg.title_ar}</h3>
                  {pkg.description_ar ? <p>{pkg.description_ar}</p> : null}
                </div>

                <div className="package-pricing">
                  <strong>{pricing.total.toLocaleString("ar-SA")}</strong>
                  <small>ر.س / {cycleLabels[pkg.billing_cycle] || pkg.billing_cycle}</small>
                  {pkg.original_price ? (
                    <del>{pkg.original_price.toLocaleString("ar-SA")} ر.س</del>
                  ) : null}
                </div>

                {pkg.max_employees > 0 || pkg.extra_employee_price > 0 ? (
                  <div className="package-employees">
                    <Users size={16} />
                    <label>
                      عدد الموظفين
                      {pkg.max_employees > 0
                        ? ` (أول ${pkg.max_employees} موظف مشمولون)`
                        : ""}
                      <input
                        type="number"
                        min={0}
                        value={employeeCounts[pkg.id] || 0}
                        onChange={(e) =>
                          setEmployeeCounts((prev) => ({
                            ...prev,
                            [pkg.id]: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                      />
                    </label>
                  </div>
                ) : null}

                <div className="package-features">
                  {pkg.features.map((feature, i) => (
                    <div className="feature-item" key={i}>
                      <Check size={16} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="package-summary">
                  <div>
                    <span>السعر الأساسي</span>
                    <strong>{pricing.baseLabel}</strong>
                  </div>
                  {pricing.extraLabel ? (
                    <div>
                      <span>موظفين إضافيين</span>
                      <strong>{pricing.extraLabel}</strong>
                    </div>
                  ) : null}
                  <div>
                    <span>ضريبة ({(pkg.tax_percent || 15)}%)</span>
                    <strong>
                      {(
                        Math.round(
                          ((pkg.price +
                            Math.max(0, (employeeCounts[pkg.id] || 0) - (pkg.max_employees || 0)) *
                              (pkg.extra_employee_price || 0)) *
                            (pkg.tax_percent || 15)) /
                            100 *
                            100
                        ) / 100
                      ).toLocaleString("ar-SA")}{" "}
                      ر.س
                    </strong>
                  </div>
                  <div className="total-row">
                    <span>المجموع</span>
                    <strong>{pricing.total.toLocaleString("ar-SA")} ر.س</strong>
                  </div>
                </div>

                <button
                  className="client-subscribe-btn"
                  onClick={() => subscribe(pkg)}
                  disabled={subscribing === pkg.id}
                  type="button"
                >
                  {subscribing === pkg.id ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  {subscribing === pkg.id ? "جاري الاشتراك..." : "اشترك الآن"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Compare bar */}
      {compareIds.length >= 2 && (
        <div className="pkg-compare-bar">
          <span>{compareIds.length} باقة محددة</span>
          <button onClick={() => setShowCompare(true)}>
            <ArrowLeftRight size={14} /> مقارنة
          </button>
          <button className="clear" onClick={() => setCompareIds([])}>إلغاء</button>
        </div>
      )}

      {/* Compare modal */}
      {showCompare && (
        <div className="pkg-compare-overlay" onClick={() => setShowCompare(false)}>
          <div className="pkg-compare-modal" onClick={e => e.stopPropagation()}>
            <div className="pkg-compare-header">
              <h3>مقارنة الباقات</h3>
              <button onClick={() => setShowCompare(false)}><X size={18} /></button>
            </div>
            <div className="pkg-compare-table-wrap">
              <table className="pkg-compare-table">
                <thead>
                  <tr>
                    <th>الميزة</th>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return <th key={id}>{p?.title_ar || ""}</th>; })}
                  </tr>
                </thead>
                <tbody>
                  <tr><td>السعر</td>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return <td key={id}>{p?.price?.toLocaleString("ar-SA")} ر.س/{cycleLabels[p?.billing_cycle || ""] || ""}</td>; })}
                  </tr>
                  <tr><td>عدد الموظفين الأساسي</td>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return <td key={id}>{p?.max_employees || 0}</td>; })}
                  </tr>
                  <tr><td>سعر الموظف الإضافي</td>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return <td key={id}>{p?.extra_employee_price ? `${p.extra_employee_price} ر.س` : "—"}</td>; })}
                  </tr>
                  <tr><td>دورة الفوترة</td>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return <td key={id}>{cycleLabels[p?.billing_cycle || ""] || "—"}</td>; })}
                  </tr>
                  <tr><td>المميزات</td>
                    {compareIds.map(id => { const p = packages.find(x => x.id === id); return (
                      <td key={id}><ul className="pkg-compare-features">
                        {(p?.features || []).map((f, i) => <li key={i}><Check size={12} /> {f}</li>)}
                      </ul></td>
                    ); })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .client-packages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }
        .client-package-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5ecf3;
          padding: 24px;
          position: relative;
          transition: box-shadow .2s;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .client-package-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
        .client-package-card.popular {
          border-color: #0875dc;
          border-width: 2px;
        }
        .popular-badge {
          position: absolute;
          top: -12px;
          left: 24px;
          background: #0875dc;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 14px;
          border-radius: 20px;
        }
        .package-header .package-tier {
          font-size: 12px;
          color: #0875dc;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .package-header h3 {
          font-size: 18px;
          margin: 4px 0;
          color: #073766;
        }
        .package-header p {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
        }
        .package-pricing {
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
        }
        .package-pricing strong {
          font-size: 24px;
          color: #073766;
        }
        .package-pricing small {
          font-size: 13px;
          color: #64748b;
        }
        .package-pricing del {
          font-size: 13px;
          color: #ef4444;
          margin-right: auto;
        }
        .package-employees {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .package-employees label {
          font-size: 13px;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .package-employees input {
          width: 80px;
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
        }
        .package-features {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #334155;
        }
        .feature-item svg { color: #15803d; flex-shrink: 0; }
        .package-summary {
          border-top: 1px solid #e5ecf3;
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .package-summary > div {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .package-summary > div span { color: #64748b; }
        .package-summary > div strong { color: #334155; }
        .package-summary .total-row {
          border-top: 1px dashed #e5ecf3;
          padding-top: 6px;
          margin-top: 4px;
        }
        .package-summary .total-row span { font-weight: 600; color: #073766; }
        .package-summary .total-row strong { font-size: 16px; color: #073766; }
        .client-subscribe-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #073766;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background .2s;
          margin-top: auto;
        }
        .client-subscribe-btn:hover { background: #0a4a8a; }
        .client-subscribe-btn:disabled { opacity: .6; cursor: not-allowed; }
        .packages-tabs {
          display: flex;
          gap: 4px;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 4px;
          margin-top: 16px;
        }
        .package-tab {
          padding: 8px 18px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all .2s;
        }
        .package-tab.active {
          background: #fff;
          color: #073766;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .dashboard-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        .dashboard-heading {
          margin-bottom: 8px;
        }
        .dashboard-heading .eyebrow {
          font-size: 12px;
          color: #0875dc;
          font-weight: 600;
          margin: 0;
        }
        .dashboard-heading h1 {
          font-size: 22px;
          color: #073766;
          margin: 4px 0;
        }
        .dashboard-heading span {
          font-size: 14px;
          color: #64748b;
        }
        .dashboard-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
          gap: 12px;
        }
        .dashboard-success {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          color: #15803d;
          margin-top: 16px;
        }
        .dashboard-success .dashboard-btn {
          margin-right: auto;
          padding: 6px 14px;
          background: #15803d;
          color: #fff;
          border-radius: 6px;
          text-decoration: none;
          font-size: 13px;
        }
        .dashboard-error {
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          margin-top: 16px;
          font-size: 13px;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .pkg-compare-toggle { display: flex; align-items: center; gap: 4px; padding: 4px 10px; margin: 0 16px 0 0; cursor: pointer; font-size: .6rem; color: #8b9dad; font-weight: 600; border-radius: 6px; transition: all .15s; user-select: none; }
        .pkg-compare-toggle:hover { background: #f0f4f8; }
        .pkg-compare-toggle input { width: 14px; height: 14px; cursor: pointer; accent-color: #0875dc; }
        .pkg-compare-toggle:has(input:checked) { color: #0875dc; background: #eaf4ff; }

        .pkg-compare-bar { position: fixed; bottom: 0; right: 0; left: 0; background: #073766; color: #fff; display: flex; align-items: center; gap: 10px; padding: 12px 24px; z-index: 500; font-size: .72rem; direction: rtl; }
        .pkg-compare-bar span { font-weight: 700; }
        .pkg-compare-bar button { border: 0; border-radius: 8px; padding: 8px 16px; font: inherit; font-size: .68rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; background: #0875dc; color: #fff; }
        .pkg-compare-bar button.clear { background: transparent; color: rgba(255,255,255,.7); padding: 8px 12px; }

        .pkg-compare-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; direction: rtl; }
        .pkg-compare-modal { background: #fff; border-radius: 18px; width: min(900px,100%); max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0,0,0,.15); }
        .pkg-compare-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #e5ecf3; }
        .pkg-compare-header h3 { margin: 0; font-size: .9rem; color: #073766; }
        .pkg-compare-header button { border: 0; background: #f5f8fc; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: grid; place-items: center; color: #526983; }
        .pkg-compare-table-wrap { overflow: auto; padding: 0 4px; }
        .pkg-compare-table { width: 100%; border-collapse: collapse; font-size: .7rem; }
        .pkg-compare-table th { padding: 12px 14px; text-align: center; font-weight: 800; color: #073766; background: #f8fafc; border-bottom: 2px solid #e5ecf3; white-space: nowrap; }
        .pkg-compare-table th:first-child { text-align: right; background: transparent; min-width: 120px; }
        .pkg-compare-table td { padding: 10px 14px; text-align: center; color: #1a2d40; border-bottom: 1px solid #eef2f6; }
        .pkg-compare-table td:first-child { text-align: right; font-weight: 700; color: #425c76; background: #fafbfc; }
        .pkg-compare-features { list-style: none; margin: 0; padding: 0; text-align: right; }
        .pkg-compare-features li { display: flex; align-items: center; gap: 6px; padding: 4px 0; font-size: .65rem; color: #1a2d40; }
        .pkg-compare-features li svg { color: #15803d; flex-shrink: 0; }
      `}</style>
    </section>
  );
}
