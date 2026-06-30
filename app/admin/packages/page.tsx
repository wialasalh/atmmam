"use client";
import PageLoader from "@/components/page-loader";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  Plus, Search, CheckCircle, X, Package, Users, Tag, Star,
  Trash2, Power, Save, AlertCircle, Edit3, RefreshCw, Layers,
  ChevronDown, Palette,
} from "lucide-react";

type Pkg = {
  id: string; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  category: string; tier_ar: string; tier_en: string | null;
  price: number; original_price: number | null; billing_cycle: string;
  features: string[]; max_employees: number; extra_employee_price: number;
  tax_percent: number; is_active: boolean; is_popular: boolean; sort_order: number;
};
type PkgCat = { id: string; name_ar: string; name_en: string | null; slug: string; color: string; icon: string; sort_order: number; is_active: boolean };

const CYCLE: Record<string, string> = {
  monthly: "شهري", yearly: "سنوي", quarterly: "ربع سنوي", "one-time": "مرة واحدة",
};

export default function AdminPackagesPage() {
  const { loading: authLoading } = useRoleGuard("manager");
  const [packages,  setPackages]  = useState<Pkg[]>([]);
  const [categories, setCategories] = useState<PkgCat[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [query, setQuery]           = useState("");
  const [filterCat, setFilterCat]   = useState("الكل");
  const [showForm,  setShowForm]    = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editing,   setEditing]     = useState<Pkg | null>(null);
  const [features,  setFeatures]    = useState<string[]>([]);
  const [featInput, setFeatInput]   = useState("");
  const [toast, setToast]           = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [saving, setSaving]         = useState(false);
  const [catForm, setCatForm]       = useState({ name_ar: "", slug: "", color: "#0875dc" });

  async function load() {
    setLoadingData(true);
    try {
      const [pr, cr] = await Promise.all([
        fetch("/api/admin/packages").then(r => r.json()),
        fetch("/api/admin/package-categories").then(r => r.json()),
      ]);
      if (pr.data) setPackages(pr.data);
      if (cr.data) setCategories(cr.data);
    } finally { setLoadingData(false); }
  }

  useEffect(() => { void load(); }, []);

  function notify(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2800);
  }

  function cat(slug: string) { return categories.find(c => c.slug === slug); }
  function catColor(slug: string) { return cat(slug)?.color || "#526983"; }
  function catLabel(slug: string) { return cat(slug)?.name_ar || slug; }

  const catTabs = useMemo(() => ["الكل", ...categories.map(c => c.slug)], [categories]);

  const visible = useMemo(() => packages.filter(p => {
    const mq = !query || p.title_ar.includes(query) || p.tier_ar.includes(query) || catLabel(p.category).includes(query);
    const mc = filterCat === "الكل" || p.category === filterCat;
    return mq && mc;
  }), [packages, query, filterCat, categories]);

  function openNew() { setEditing(null); setFeatures([]); setFeatInput(""); setShowForm(true); }
  function openEdit(pkg: Pkg) { setEditing(pkg); setFeatures([...pkg.features]); setFeatInput(""); setShowForm(true); }

  function addFeat() {
    const f = featInput.trim(); if (!f) return;
    setFeatures(p => [...p, f]); setFeatInput("");
  }

  async function savePkg(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    try {
      const d = new FormData(e.currentTarget);
      const body: Record<string, unknown> = {
        title_ar: d.get("title_ar"), title_en: d.get("title_en") || "",
        description_ar: d.get("description_ar") || "",
        category: d.get("category"), tier_ar: d.get("tier_ar"), tier_en: d.get("tier_en") || "",
        price: Number(d.get("price")),
        original_price: d.get("original_price") ? Number(d.get("original_price")) : null,
        billing_cycle: d.get("billing_cycle"), features,
        max_employees: Number(d.get("max_employees") || 0),
        extra_employee_price: Number(d.get("extra_employee_price") || 0),
        tax_percent: Number(d.get("tax_percent") || 15),
        is_popular: d.get("is_popular") === "on",
        sort_order: Number(d.get("sort_order") || 0),
      };
      if (editing) body.packageId = editing.id;
      const res = await fetch("/api/admin/packages", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await load(); setShowForm(false); setEditing(null);
      notify(editing ? "تم تحديث الباقة ✓" : "تمت إضافة الباقة ✓");
    } catch { notify("تعذر حفظ الباقة", "err"); }
    finally { setSaving(false); }
  }

  async function togglePkg(pkg: Pkg) {
    const res = await fetch("/api/admin/packages", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id, is_active: !pkg.is_active }),
    });
    if (res.ok) { await load(); notify(pkg.is_active ? "تم إيقاف الباقة" : "تم تفعيل الباقة"); }
    else notify("فشل التغيير", "err");
  }

  async function deletePkg(pkg: Pkg) {
    if (!confirm(`حذف "${pkg.title_ar}" نهائياً؟`)) return;
    const res = await fetch("/api/admin/packages", {
      method: "DELETE", headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id }),
    });
    if (res.ok) { await load(); notify("تم حذف الباقة"); }
    else notify("فشل الحذف", "err");
  }

  if (authLoading) return <PageLoader text="جاري تحميل الباقات..." />;

  return (
    <div className="pk-shell" dir="rtl">
      <style>{`
        .pk-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;color:#173d65;overflow:hidden}
        /* Header */
        .pk-head{padding:18px 24px 14px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff)}
        .pk-head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
        .pk-eyebrow{margin:0 0 4px;color:#0f766e;font-size:.65rem;font-weight:900;letter-spacing:.04em}
        .pk-head h1{margin:0 0 4px;font-size:1.5rem;color:#073766;line-height:1}
        .pk-head p{margin:0;color:#7f8e9f;font-size:.7rem}
        .pk-head-btns{display:flex;gap:8px}
        .pk-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer;transition:all .14s;white-space:nowrap}
        .pk-btn:hover{background:#f4f7fb}
        .pk-btn.primary{background:#073766;color:#fff;border-color:#073766}
        .pk-btn.primary:hover{background:#0a4a8a;border-color:#0a4a8a}
        .pk-btn.sm{height:30px;font-size:.6rem;padding:0 10px}
        /* KPIs */
        .pk-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .pk-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:12px;padding:11px 14px;display:flex;align-items:center;gap:10px}
        .pk-kpi i{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
        .pk-kpi small{display:block;font-size:.55rem;color:#8190a1;font-weight:800}
        .pk-kpi strong{display:block;font-size:1.05rem;line-height:1;margin-top:3px}
        /* Body */
        .pk-body{min-height:0;overflow:auto;padding:16px 20px 24px;display:flex;flex-direction:column;gap:12px}
        /* Toolbar */
        .pk-toolbar{background:#fff;border:1px solid #dfe8f1;border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .pk-search{height:34px;border:1px solid #dfe8f1;border-radius:8px;background:#f8fafc;display:flex;align-items:center;gap:7px;padding:0 10px;min-width:220px;flex:1}
        .pk-search input{border:0;outline:0;background:transparent;font:inherit;font-size:.67rem;width:100%;color:#173d65}
        .pk-cats{display:flex;gap:5px;flex-wrap:wrap}
        .pk-cat{height:28px;border:1px solid #dfe8f1;border-radius:20px;background:#f8fafc;color:#65788c;padding:0 11px;font:inherit;font-size:.58rem;font-weight:800;display:inline-flex;align-items:center;gap:5px;cursor:pointer;transition:all .12s;white-space:nowrap}
        .pk-cat.active{background:#073766;border-color:#073766;color:#fff}
        /* Grid */
        .pk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}
        /* Card */
        .pk-card{background:#fff;border:1.5px solid #e5eaf0;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .18s,transform .18s,border-color .18s;position:relative}
        .pk-card:hover{box-shadow:0 8px 28px rgba(7,55,102,.1);transform:translateY(-2px);border-color:#c7d8f0}
        .pk-card.popular{border-color:#d97706;border-width:2px}
        .pk-card-stripe{height:4px;width:100%}
        .pk-card-head{padding:14px 16px 10px;position:relative}
        .pk-popular-badge{position:absolute;top:0;left:16px;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;font-size:.52rem;font-weight:800;padding:3px 11px;border-radius:0 0 10px 10px;display:inline-flex;align-items:center;gap:4px}
        .pk-card-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
        .pk-cat-pill{font-size:.54rem;font-weight:800;padding:3px 9px;border-radius:20px;display:inline-flex;align-items:center;gap:4px}
        .pk-status{font-size:.52rem;font-weight:800;padding:3px 8px;border-radius:20px}
        .pk-status.on{background:#f0fdf4;color:#15803d}
        .pk-status.off{background:#fef2f2;color:#dc2626}
        .pk-card-title{font-size:.9rem;font-weight:800;color:#0b1e36;margin:0 0 2px;line-height:1.3}
        .pk-card-tier{font-size:.58rem;color:#8b9dad;font-weight:600;margin-bottom:6px}
        .pk-card-desc{font-size:.63rem;color:#64748b;line-height:1.5;margin:0}
        /* Price block */
        .pk-price-block{margin:10px 16px;padding:10px 14px;background:#f4f8fd;border-radius:10px;border:1px solid #e8eef6;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
        .pk-price-num{font-size:1.45rem;font-weight:900;color:#073766;line-height:1}
        .pk-price-cur{font-size:.68rem;color:#73879b;margin-right:1px}
        .pk-price-cyc{font-size:.62rem;color:#8b9dad}
        .pk-price-old{font-size:.62rem;color:#ef4444;text-decoration:line-through;margin-right:auto}
        .pk-discount{font-size:.54rem;font-weight:800;padding:2px 7px;border-radius:20px;background:#fef3c7;color:#b45309;margin-right:auto}
        /* Features */
        .pk-features{padding:0 16px;flex:1;display:flex;flex-direction:column;gap:5px;margin-bottom:4px}
        .pk-feature{display:flex;align-items:center;gap:7px;font-size:.62rem;color:#475569}
        .pk-more{font-size:.6rem;color:#0875dc;font-weight:700;margin-top:2px;padding-right:20px}
        /* Employees */
        .pk-emp{padding:8px 16px 0;display:flex;align-items:center;gap:6px;font-size:.61rem;color:#7a8fa4}
        /* Footer */
        .pk-card-foot{padding:10px 14px;border-top:1px solid #f0f3f8;display:flex;gap:6px;margin-top:12px}
        .pk-act{flex:1;height:30px;border:1px solid #e5eaf0;border-radius:7px;background:#fff;color:#526983;font:inherit;font-size:.58rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;transition:all .12s}
        .pk-act:hover{background:#f0f4f8}
        .pk-act.edit{background:#073766;color:#fff;border-color:#073766}
        .pk-act.edit:hover{background:#0a4a8a}
        .pk-act.tog:hover{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
        .pk-act.tog.on:hover{background:#fff7ed;border-color:#fed7aa;color:#b45309}
        .pk-act.del:hover{background:#fef2f2;border-color:#fecaca;color:#dc2626}
        /* Empty */
        .pk-empty{text-align:center;padding:60px 24px;color:#8b9dad;background:#fff;border:1px solid #dfe8f1;border-radius:12px}
        /* Modal */
        .pk-backdrop{position:fixed;inset:0;background:rgba(7,55,102,.42);z-index:900;display:grid;place-items:center;padding:20px;backdrop-filter:blur(3px)}
        .pk-modal{background:#fff;border-radius:20px;width:min(620px,100%);max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.2);direction:rtl}
        .pk-modal-head{padding:22px 24px 0;display:flex;align-items:flex-start;justify-content:space-between}
        .pk-modal-head h2{font-size:.95rem;margin:0 0 3px;color:#073766;font-weight:800}
        .pk-modal-head p{font-size:.62rem;color:#8b9dad;margin:0}
        .pk-modal-close{width:32px;height:32px;border:1px solid #e4ebf2;border-radius:9px;background:#f8fafc;cursor:pointer;display:grid;place-items:center;color:#526983;flex-shrink:0}
        .pk-form{padding:16px 24px 0}
        .pk-form-sec{border-top:1px solid #eef2f7;padding-top:12px;margin-top:4px}
        .pk-form-sec h3{font-size:.68rem;font-weight:800;color:#073766;margin:0 0 10px;display:flex;align-items:center;gap:6px}
        .pk-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .pk-form-row.w3{grid-template-columns:1fr 1fr 1fr}
        .pk-form-row.full{grid-template-columns:1fr}
        .pk-field{display:flex;flex-direction:column;gap:4px}
        .pk-field label{font-size:.6rem;font-weight:700;color:#425c76}
        .pk-field input:not([type=checkbox]),.pk-field select,.pk-field textarea{width:100%;height:38px;border:1.5px solid #e5eaf0;border-radius:9px;padding:0 11px;font:inherit;font-size:.72rem;color:#1a2d40;background:#fff;outline:none;transition:border-color .15s;box-sizing:border-box}
        .pk-field select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 10px center;padding-left:28px;-webkit-appearance:none;appearance:none}
        .pk-field input:focus,.pk-field select:focus,.pk-field textarea:focus{border-color:#073766}
        .pk-field textarea{height:auto;padding:9px 11px;resize:vertical;line-height:1.5}
        .pk-feat-row{display:flex;gap:6px;align-items:center}
        .pk-feat-row input{flex:1;height:34px;border:1.5px solid #e5eaf0;border-radius:8px;padding:0 10px;font:inherit;font-size:.68rem;color:#344d69;background:#f8fafc;outline:none;transition:border-color .15s}
        .pk-feat-row input:focus{border-color:#073766;background:#fff}
        .pk-feat-add{height:34px;padding:0 13px;border:0;border-radius:8px;background:#073766;color:#fff;font:inherit;font-size:.6rem;font-weight:700;cursor:pointer;white-space:nowrap}
        .pk-feat-list{display:flex;flex-direction:column;gap:4px;margin-top:8px}
        .pk-feat-item{display:flex;align-items:center;gap:7px;padding:6px 10px;background:#f8fafc;border:1px solid #e5eaf0;border-radius:8px;font-size:.63rem;color:#344d69}
        .pk-feat-item span{flex:1}
        .pk-feat-del{width:22px;height:22px;border:0;background:transparent;color:#c4cdd6;cursor:pointer;display:grid;place-items:center;border-radius:5px;transition:all .12s;flex-shrink:0}
        .pk-feat-del:hover{background:#fef2f2;color:#dc2626}
        .pk-check-row{display:flex;align-items:center;gap:8px;height:38px}
        .pk-check-row input{width:15px;height:15px;cursor:pointer;accent-color:#073766}
        .pk-check-row label{font-size:.68rem;font-weight:600;color:#344d69;cursor:pointer}
        .pk-modal-foot{display:flex;gap:8px;padding:16px 24px 22px}
        .pk-save{flex:1;height:40px;border:0;border-radius:10px;background:#073766;color:#fff;font:inherit;font-size:.73rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px}
        .pk-save:disabled{background:#e5eaf0;color:#aab5c3;cursor:not-allowed}
        .pk-cancel{height:40px;padding:0 18px;border:1px solid #dfe7ef;border-radius:10px;background:#fff;color:#526983;font:inherit;font-size:.7rem;cursor:pointer}
        /* Toast */
        .pk-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:12px;font-size:.7rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:1000;animation:pkUp .2s;white-space:nowrap}
        .pk-toast.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
        .pk-toast.err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        @keyframes pkUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:640px){.pk-form-row,.pk-form-row.w3{grid-template-columns:1fr}}
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="pk-head">
        <div className="pk-head-row">
          <div>
            <p className="pk-eyebrow">إعدادات التشغيل</p>
            <h1>الباقات</h1>
            <p>كتالوج الباقات والتسعير المعروض للعملاء</p>
          </div>
          <div className="pk-head-btns">
            <button className="pk-btn" onClick={() => { setLoadingData(true); void load(); }}><RefreshCw size={13} /> تحديث</button>
            <button className="pk-btn" onClick={() => { setCatForm({ name_ar: "", slug: "", color: "#0875dc" }); setShowCatForm(true); }}><Plus size={13} /> تصنيف جديد</button>
            <button className="pk-btn primary" onClick={openNew}><Plus size={14} /> باقة جديدة</button>
          </div>
        </div>

        <div className="pk-kpis">
          {[
            { Icon: Layers,      label: "إجمالي الباقات", val: packages.length,                            color: "#0875dc", bg: "#dbeafe" },
            { Icon: CheckCircle, label: "باقات نشطة",     val: packages.filter(p => p.is_active).length,  color: "#15803d", bg: "#bbf7d0" },
            { Icon: Star,        label: "الأكثر طلباً",   val: packages.filter(p => p.is_popular).length, color: "#d97706", bg: "#fde68a" },
            { Icon: Tag,         label: "التصنيفات",      val: categories.length,                          color: "#0f766e", bg: "#ccfbf1" },
          ].map(k => (
            <div key={k.label} className="pk-kpi">
              <i style={{ background: k.bg }}><k.Icon size={15} color={k.color} /></i>
              <div><small>{k.label}</small><strong style={{ color: k.color }}>{k.val}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="pk-body">

        {/* Toolbar */}
        <div className="pk-toolbar">
          <label className="pk-search">
            <Search size={13} color="#a0adb8" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث عن باقة أو مستوى..." />
          </label>
          {(query) && (
            <button className="pk-btn sm" onClick={() => setQuery("")}><X size={11} /> مسح</button>
          )}
        </div>

        {/* Category tabs */}
        <div className="pk-cats">
          {catTabs.map(slug => {
            const count = slug === "الكل" ? packages.length : packages.filter(p => p.category === slug).length;
            const color = slug === "الكل" ? "#073766" : catColor(slug);
            const label = slug === "الكل" ? "الكل" : catLabel(slug);
            return (
              <button key={slug} className={`pk-cat${filterCat === slug ? " active" : ""}`}
                onClick={() => setFilterCat(slug)}
                style={filterCat === slug && slug !== "الكل" ? { background: color + "18", borderColor: color + "55", color } : {}}>
                {label} <span style={{ opacity: .7 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Cards */}
        {loadingData ? (
          <div className="pk-empty"><div style={{ fontSize: ".72rem", color: "#a0adb8" }}>جاري التحميل...</div></div>
        ) : visible.length === 0 ? (
          <div className="pk-empty">
            <Package size={38} style={{ opacity: .2, marginBottom: 10 }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#526983", fontSize: ".8rem" }}>لا توجد باقات مطابقة</p>
            <p style={{ margin: 0, fontSize: ".7rem" }}>جرب تغيير التصنيف أو مسح البحث</p>
          </div>
        ) : (
          <div className="pk-grid">
            {visible.sort((a, b) => a.sort_order - b.sort_order).map(pkg => {
              const cc = catColor(pkg.category);
              const discount = pkg.original_price && pkg.original_price > pkg.price
                ? Math.round((1 - pkg.price / pkg.original_price) * 100) : null;
              return (
                <article key={pkg.id} className={`pk-card${pkg.is_popular ? " popular" : ""}`}>
                  <div className="pk-card-stripe" style={{ background: cc }} />
                  <div className="pk-card-head">
                    {pkg.is_popular && <div className="pk-popular-badge"><Star size={9} /> الأكثر طلباً</div>}
                    <div className="pk-card-row1">
                      <span className="pk-cat-pill" style={{ background: cc + "18", color: cc }}>
                        {catLabel(pkg.category)}
                      </span>
                      <span className={`pk-status ${pkg.is_active ? "on" : "off"}`}>
                        {pkg.is_active ? "● نشطة" : "● موقوفة"}
                      </span>
                    </div>
                    <h3 className="pk-card-title">{pkg.title_ar}</h3>
                    <div className="pk-card-tier">{pkg.tier_ar}{pkg.tier_en ? ` · ${pkg.tier_en}` : ""}</div>
                    {pkg.description_ar && <p className="pk-card-desc">{pkg.description_ar}</p>}
                  </div>

                  <div className="pk-price-block">
                    <span className="pk-price-num">{pkg.price.toLocaleString("ar-SA")}</span>
                    <span className="pk-price-cur">ر.س</span>
                    <span className="pk-price-cyc">/ {CYCLE[pkg.billing_cycle] || pkg.billing_cycle}</span>
                    {pkg.original_price && pkg.original_price > pkg.price && (
                      <span className="pk-price-old">{pkg.original_price.toLocaleString("ar-SA")}</span>
                    )}
                    {discount && <span className="pk-discount">وفّر {discount}%</span>}
                  </div>

                  {pkg.features.length > 0 && (
                    <div className="pk-features">
                      {pkg.features.slice(0, 5).map((f, i) => (
                        <div key={i} className="pk-feature">
                          <CheckCircle size={12} color="#15803d" style={{ flexShrink: 0 }} />
                          <span>{f}</span>
                        </div>
                      ))}
                      {pkg.features.length > 5 && (
                        <div className="pk-more">+{pkg.features.length - 5} ميزة أخرى</div>
                      )}
                    </div>
                  )}

                  {(pkg.max_employees > 0 || pkg.extra_employee_price > 0) && (
                    <div className="pk-emp">
                      <Users size={12} style={{ flexShrink: 0 }} />
                      <span>
                        {pkg.max_employees > 0 ? `أول ${pkg.max_employees} موظف` : ""}
                        {pkg.extra_employee_price > 0 ? (pkg.max_employees > 0 ? " · " : "") + `${pkg.extra_employee_price} ر.س/موظف إضافي` : ""}
                      </span>
                    </div>
                  )}

                  <div className="pk-card-foot">
                    <button className="pk-act edit" onClick={() => openEdit(pkg)}><Edit3 size={11} /> تعديل</button>
                    <button className={`pk-act tog${pkg.is_active ? " on" : ""}`} onClick={() => void togglePkg(pkg)}>
                      <Power size={11} /> {pkg.is_active ? "إيقاف" : "تفعيل"}
                    </button>
                    <button className="pk-act del" onClick={() => void deletePkg(pkg)} style={{ flex: "none", padding: "0 9px" }}><Trash2 size={11} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ PACKAGE MODAL ══ */}
      {showForm && (
        <div className="pk-backdrop" onMouseDown={() => { setShowForm(false); setEditing(null); }}>
          <div className="pk-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="pk-modal-head">
              <div>
                <h2>{editing ? "تعديل الباقة" : "إضافة باقة جديدة"}</h2>
                <p>بيانات الباقة والتسعير والمزايا المعروضة للعميل</p>
              </div>
              <button className="pk-modal-close" onClick={() => { setShowForm(false); setEditing(null); }}><X size={14} /></button>
            </div>

            <form onSubmit={savePkg}>
              <div className="pk-form">
                {/* الأسماء */}
                <div className="pk-form-row full" style={{ marginBottom: 10 }}>
                  <div className="pk-field">
                    <label>اسم الباقة (عربي) *</label>
                    <input name="title_ar" defaultValue={editing?.title_ar} required placeholder="مثال: باقة التأسيس الشاملة" />
                  </div>
                </div>
                <div className="pk-form-row" style={{ marginBottom: 10 }}>
                  <div className="pk-field">
                    <label>المستوى (عربي) *</label>
                    <input name="tier_ar" defaultValue={editing?.tier_ar} required placeholder="مسار الانطلاق" />
                  </div>
                  <div className="pk-field">
                    <label>المستوى (إنجليزي)</label>
                    <input name="tier_en" defaultValue={editing?.tier_en || ""} placeholder="Starter" dir="ltr" />
                  </div>
                </div>
                <div className="pk-form-row" style={{ marginBottom: 10 }}>
                  <div className="pk-field">
                    <label>التصنيف *</label>
                    <select name="category" defaultValue={editing?.category || (categories[0]?.slug || "")}>
                      {categories.map(c => <option key={c.slug} value={c.slug}>{c.name_ar}</option>)}
                    </select>
                  </div>
                  <div className="pk-field">
                    <label>دورة الفوترة *</label>
                    <select name="billing_cycle" defaultValue={editing?.billing_cycle || "yearly"}>
                      {Object.entries(CYCLE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pk-form-row full" style={{ marginBottom: 10 }}>
                  <div className="pk-field">
                    <label>الوصف</label>
                    <textarea name="description_ar" defaultValue={editing?.description_ar || ""} rows={2} placeholder="وصف مختصر يظهر للعميل..." />
                  </div>
                </div>

                {/* التسعير */}
                <div className="pk-form-sec">
                  <h3><Tag size={13} /> التسعير</h3>
                  <div className="pk-form-row w3" style={{ marginBottom: 10 }}>
                    <div className="pk-field">
                      <label>السعر (ر.س) *</label>
                      <input name="price" type="number" min="0" step="0.01" defaultValue={editing?.price ?? 0} required />
                    </div>
                    <div className="pk-field">
                      <label>السعر قبل الخصم</label>
                      <input name="original_price" type="number" min="0" step="0.01" defaultValue={editing?.original_price ?? ""} placeholder="اختياري" />
                    </div>
                    <div className="pk-field">
                      <label>نسبة الضريبة (%)</label>
                      <input name="tax_percent" type="number" min="0" max="100" step="0.01" defaultValue={editing?.tax_percent ?? 15} />
                    </div>
                  </div>
                </div>

                {/* الموظفون */}
                <div className="pk-form-sec">
                  <h3><Users size={13} /> الموظفون</h3>
                  <div className="pk-form-row" style={{ marginBottom: 10 }}>
                    <div className="pk-field">
                      <label>عدد الموظفين الأساسي</label>
                      <input name="max_employees" type="number" min="0" defaultValue={editing?.max_employees ?? 0} />
                    </div>
                    <div className="pk-field">
                      <label>سعر الموظف الإضافي (ر.س)</label>
                      <input name="extra_employee_price" type="number" min="0" step="0.01" defaultValue={editing?.extra_employee_price ?? 0} />
                    </div>
                  </div>
                </div>

                {/* الإعدادات */}
                <div className="pk-form-sec">
                  <h3><ChevronDown size={13} /> إعدادات إضافية</h3>
                  <div className="pk-form-row" style={{ marginBottom: 10 }}>
                    <div className="pk-field">
                      <label>ترتيب العرض</label>
                      <input name="sort_order" type="number" min="0" defaultValue={editing?.sort_order ?? 0} />
                    </div>
                    <div className="pk-field">
                      <div className="pk-check-row">
                        <input name="is_popular" type="checkbox" id="pk_popular" defaultChecked={editing?.is_popular} />
                        <label htmlFor="pk_popular">تمييز كـ &quot;الأكثر طلباً&quot;</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* المزايا */}
                <div className="pk-form-sec" style={{ marginBottom: 4 }}>
                  <h3><CheckCircle size={13} /> المزايا</h3>
                  <div className="pk-feat-row">
                    <input value={featInput} onChange={e => setFeatInput(e.target.value)}
                      placeholder="اكتب ميزة واضغط إضافة أو Enter..."
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeat(); } }} />
                    <button type="button" className="pk-feat-add" onClick={addFeat}>+ إضافة</button>
                  </div>
                  {features.length > 0 ? (
                    <div className="pk-feat-list">
                      {features.map((f, i) => (
                        <div key={i} className="pk-feat-item">
                          <CheckCircle size={12} color="#15803d" style={{ flexShrink: 0 }} />
                          <span>{f}</span>
                          <button type="button" className="pk-feat-del" onClick={() => setFeatures(p => p.filter((_, j) => j !== i))}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: ".62rem", color: "#c4cdd6", padding: "8px 0" }}>لم تُضف أي مزايا بعد</div>
                  )}
                </div>
              </div>

              <div className="pk-modal-foot">
                <button type="submit" className="pk-save" disabled={saving}>
                  {saving
                    ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} /> جاري الحفظ...</>
                    : <><Save size={14} /> {editing ? "حفظ التعديلات" : "إضافة الباقة"}</>}
                </button>
                <button type="button" className="pk-cancel" onClick={() => { setShowForm(false); setEditing(null); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ CATEGORY MODAL ══ */}
      {showCatForm && (
        <div className="pk-backdrop" onMouseDown={() => setShowCatForm(false)}>
          <div className="pk-modal" style={{ width: "min(420px,100%)" }} onMouseDown={e => e.stopPropagation()}>
            <div className="pk-modal-head">
              <div>
                <h2>تصنيف جديد</h2>
                <p>أضف تصنيفاً جديداً لتنظيم الباقات</p>
              </div>
              <button className="pk-modal-close" onClick={() => setShowCatForm(false)}><X size={14} /></button>
            </div>
            <div className="pk-form" style={{ paddingBottom: 0 }}>
              <div className="pk-form-row full" style={{ marginBottom: 10 }}>
                <div className="pk-field">
                  <label>اسم التصنيف *</label>
                  <input value={catForm.name_ar} onChange={e => setCatForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="مثال: باقات الشركات الناشئة" />
                </div>
              </div>
              <div className="pk-form-row" style={{ marginBottom: 10 }}>
                <div className="pk-field">
                  <label>المعرف (slug) *</label>
                  <input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value.replace(/\s+/g, "_").toLowerCase() }))} placeholder="startups" dir="ltr" />
                </div>
                <div className="pk-field">
                  <label>لون التصنيف</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                      style={{ width: 48, height: 38, padding: 2, border: "1.5px solid #e5eaf0", borderRadius: 9, cursor: "pointer" }} />
                    <span style={{ fontSize: ".62rem", color: "#8b9dad", fontFamily: "monospace" }}>{catForm.color}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pk-modal-foot">
              <button type="button" className="pk-save" onClick={async () => {
                if (!catForm.name_ar.trim() || !catForm.slug.trim()) { notify("الاسم والمعرف مطلوبان", "err"); return; }
                try {
                  const res = await fetch("/api/admin/package-categories", {
                    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(catForm),
                  });
                  if (!res.ok) throw new Error();
                  const r = await fetch("/api/admin/package-categories").then(x => x.json());
                  if (r.data) setCategories(r.data);
                  setShowCatForm(false); notify("تمت إضافة التصنيف ✓");
                } catch { notify("فشل إضافة التصنيف", "err"); }
              }}>
                <Palette size={14} /> إضافة التصنيف
              </button>
              <button type="button" className="pk-cancel" onClick={() => setShowCatForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`pk-toast ${toast.type}`}>
          {toast.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
