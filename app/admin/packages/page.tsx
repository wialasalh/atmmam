"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { Plus, Search, CheckCircle, X, Package, CreditCard, Users, Tag, TrendingUp, Edit3, Eye, Sliders, Star, Trash2, Power, PowerOff, Save, AlertCircle, Palette } from "lucide-react";

type Pkg = {
  id: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  tier_ar: string;
  tier_en: string | null;
  price: number;
  original_price: number | null;
  billing_cycle: string;
  features: string[];
  max_employees: number;
  extra_employee_price: number;
  tax_percent: number;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
};

type PkgCategory = {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const cycleOptions = [
  { value: "monthly", label: "شهري" },
  { value: "yearly", label: "سنوي" },
  { value: "quarterly", label: "ربع سنوي" },
  { value: "one-time", label: "مرة واحدة" },
];

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [categories, setCategories] = useState<PkgCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name_ar: "", slug: "", color: "#0875dc" });
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [featureInput, setFeatureInput] = useState("");
  const [featuresList, setFeaturesList] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("");
  const { role, loading: authLoading } = useRoleGuard("manager");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/packages").then(r => r.json()),
      fetch("/api/admin/package-categories").then(r => r.json()),
    ]).then(([pkgRes, catRes]) => {
      if (pkgRes.data) setPackages(pkgRes.data);
      if (catRes.data) setCategories(catRes.data);
    }).finally(() => setLoading(false));
  }, []);

  function getCat(slug: string) {
    return categories.find((c) => c.slug === slug);
  }

  function getCatColor(slug: string) {
    return getCat(slug)?.color || "#526983";
  }

  function getCatLabel(slug: string) {
    return getCat(slug)?.name_ar || slug;
  }

  const visible = packages.filter((p) => {
    const matchQuery = !query || p.title_ar.includes(query) || p.tier_ar.includes(query) || getCatLabel(p.category).includes(query);
    const matchCategory = !filterCategory || p.category === filterCategory;
    return matchQuery && matchCategory;
  });

  function openNewForm() {
    setEditing(null);
    setFeaturesList([]);
    setFeatureInput("");
    setShowForm(true);
  }

  function openEditForm(pkg: Pkg) {
    setEditing(pkg);
    setFeaturesList([...pkg.features]);
    setFeatureInput("");
    setShowForm(true);
  }

  function addFeature() {
    const f = featureInput.trim();
    if (!f) return;
    setFeaturesList((prev) => [...prev, f]);
    setFeatureInput("");
  }

  function removeFeature(i: number) {
    setFeaturesList((prev) => prev.filter((_, idx) => idx !== i));
  }

  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 3000);
  }

  async function savePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const body: any = {
      title_ar: String(data.get("title_ar")),
      title_en: String(data.get("title_en") || ""),
      description_ar: String(data.get("description_ar") || ""),
      description_en: String(data.get("description_en") || ""),
      category: String(data.get("category")),
      tier_ar: String(data.get("tier_ar")),
      tier_en: String(data.get("tier_en") || ""),
      price: Number(data.get("price")),
      original_price: data.get("original_price") ? Number(data.get("original_price")) : undefined,
      billing_cycle: String(data.get("billing_cycle")),
      features: featuresList,
      max_employees: Number(data.get("max_employees") || 0),
      extra_employee_price: Number(data.get("extra_employee_price") || 0),
      tax_percent: Number(data.get("tax_percent") || 15),
      is_popular: data.get("is_popular") === "on",
      sort_order: Number(data.get("sort_order") || 0),
    };

    try {
      if (editing) {
        body.packageId = editing.id;
        const res = await fetch("/api/admin/packages", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("فشل التحديث");
        showNotice("✅ تم تحديث الباقة");
      } else {
        const res = await fetch("/api/admin/packages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("فشل الإضافة");
        showNotice("✅ تمت إضافة الباقة");
      }

      const res = await fetch("/api/admin/packages");
      const json = await res.json();
      if (json.data) setPackages(json.data);
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      showNotice(err.message || "حدث خطأ", "error");
    }
  }

  async function togglePackage(pkg: Pkg) {
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id, is_active: !pkg.is_active }),
      });
      if (!res.ok) throw new Error("فشل التغيير");
      const refreshed = await fetch("/api/admin/packages");
      const json = await refreshed.json();
      if (json.data) setPackages(json.data);
      showNotice(pkg.is_active ? "⏸️ تم إيقاف الباقة" : "✅ تم تفعيل الباقة");
    } catch {
      showNotice("فشل التغيير", "error");
    }
  }

  async function deletePackage(pkg: Pkg) {
    if (!confirm(`❌ حذف "${pkg.title_ar}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
      const res = await fetch("/api/admin/packages", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      if (!res.ok) throw new Error("فشل الحذف");
      const refreshed = await fetch("/api/admin/packages");
      const json = await refreshed.json();
      if (json.data) setPackages(json.data);
      showNotice("🗑️ تم حذف الباقة");
    } catch {
      showNotice("فشل الحذف", "error");
    }
  }

  function getCycleLabel(cycle: string) {
    return cycleOptions.find((c) => c.value === cycle)?.label || cycle;
  }

  if (loading || authLoading) return (
    <div className="loading-spinner" style={{ display: "grid", placeItems: "center", height: "calc(100vh - 76px)" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #e5ecf3", borderTopColor: "#073766", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
    </div>
  );

  return (
    <>
      <style>{`
        .apkg-page { width: min(1500px, calc(100% - 48px)); margin: auto; padding: 32px 0 50px; direction: rtl; }
        .apkg-heading { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
        .apkg-heading p { margin: 0 0 3px; color: #168d80; font-size: .67rem; font-weight: 900; }
        .apkg-heading h1 { font-size: 1.65rem; margin: 0 0 5px; color: #073766; }
        .apkg-heading span { font-size: .72rem; color: #7f8e9f; }
        .apkg-heading .apkg-add-btn { height: 42px; border: 0; border-radius: 8px; background: #073766; color: #fff; padding: 0 18px; display: flex; align-items: center; font: inherit; font-size: .7rem; font-weight: 800; cursor: pointer; gap: 7px; transition: background .15s; }
        .apkg-heading .apkg-add-btn:hover { background: #0a4a8a; }
        .apkg-tools { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
        .apkg-search-wrap { position: relative; flex: 1; min-width: 200px; }
        .apkg-search-wrap svg { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #8b9dad; pointer-events: none; }
        .apkg-search-wrap input { width: 100%; height: 40px; border: 1px solid #e5eaf0; border-radius: 10px; padding: 0 36px 0 12px; font: inherit; font-size: .7rem; color: #344d69; background: #fff; box-sizing: border-box; outline: none; }
        .apkg-search-wrap input:focus { border-color: #0875dc; }
        .apkg-filter-select { height: 40px; border: 1px solid #e5eaf0; border-radius: 10px; padding: 0 10px; font: inherit; font-size: .7rem; color: #1a2d40; background: #fff; outline: none; cursor: pointer; min-width: 130px; -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: left 10px center; padding-left: 28px; }
        .apkg-stats { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .apkg-stat { background: #fff; border: 1px solid #e5eaf0; border-radius: 10px; padding: 10px 16px; display: flex; align-items: center; gap: 10px; flex: 1; min-width: 120px; }
        .apkg-stat-num { font-size: 1.3rem; font-weight: 900; line-height: 1; }
        .apkg-stat-lbl { font-size: .6rem; color: #8b9dad; font-weight: 600; }
        .apkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
        .apkg-card { background: #fff; border: 1px solid #e5eaf0; border-radius: 14px; overflow: hidden; transition: box-shadow .2s, transform .2s; display: flex; flex-direction: column; }
        .apkg-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.06); transform: translateY(-2px); }
        .apkg-card.popular { border-color: #d97706; border-width: 2px; }
        .apkg-card-header { padding: 18px 20px 12px; position: relative; }
        .apkg-popular-badge { position: absolute; top: -1px; left: 20px; background: linear-gradient(135deg,#d97706,#f59e0b); color: #fff; font-size: .55rem; font-weight: 700; padding: 3px 12px; border-radius: 0 0 10px 10px; display: flex; align-items: center; gap: 4px; }
        .apkg-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .apkg-cat-badge { font-size: .55rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; }
        .apkg-status-badge { font-size: .55rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .apkg-card-title { font-size: 1.1rem; font-weight: 800; color: #1e3a56; margin: 0 0 4px; }
        .apkg-card-tier { font-size: .62rem; color: #8b9dad; font-weight: 600; }
        .apkg-card-desc { font-size: .68rem; color: #64748b; line-height: 1.5; margin: 8px 0 0; }
        .apkg-price-area { background: #f8fafc; margin: 12px 20px; padding: 12px 16px; border-radius: 10px; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
        .apkg-price { font-size: 1.5rem; font-weight: 900; color: #073766; }
        .apkg-price-cycle { font-size: .7rem; color: #64748b; }
        .apkg-price-old { font-size: .7rem; color: #ef4444; text-decoration: line-through; margin-right: auto; }
        .apkg-features { padding: 0 20px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .apkg-feature { display: flex; align-items: center; gap: 8px; font-size: .7rem; color: #475569; }
        .apkg-feature svg { flex-shrink: 0; }
        .apkg-feature-more { font-size: .65rem; color: #0875dc; font-weight: 600; margin-top: 4px; }
        .apkg-employees { padding: 12px 20px 0; display: flex; align-items: center; gap: 6px; font-size: .68rem; color: #64748b; }
        .apkg-employees svg { flex-shrink: 0; }
        .apkg-card-footer { padding: 14px 20px; border-top: 1px solid #f0f3f8; display: flex; gap: 6px; margin-top: 14px; }
        .apkg-btn { flex: 1; height: 34px; border: 1px solid #e5eaf0; border-radius: 8px; background: #fff; font: inherit; font-size: .62rem; font-weight: 700; color: #344d69; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 5px; transition: all .15s; }
        .apkg-btn:hover { background: #f8fafc; border-color: #bddcff; color: #0875dc; }
        .apkg-btn-primary { background: #0875dc; color: #fff; border-color: #0875dc; }
        .apkg-btn-primary:hover { background: #0659a8; }
        .apkg-btn-danger { color: #dc2626; }
        .apkg-btn-danger:hover { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
        .apkg-btn-success { color: #15803d; }
        .apkg-btn-success:hover { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
        .apkg-empty { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #8b9dad; }
        .apkg-empty svg { margin-bottom: 12px; opacity: .3; }
        .apkg-empty p { font-size: .8rem; }
        .apkg-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .apkg-modal { background: #fff; border-radius: 18px; width: min(800px, 100%); max-height: 90vh; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,.15); }
        .apkg-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
        .apkg-modal-header h2 { font-size: 1rem; margin: 0 0 4px; color: #073766; }
        .apkg-modal-header p { font-size: .65rem; color: #8b9dad; margin: 0; }
        .apkg-modal-close { width: 32px; height: 32px; border: 0; background: #f5f8fc; border-radius: 8px; cursor: pointer; display: grid; place-items: center; color: #526983; transition: background .15s; flex-shrink: 0; }
        .apkg-modal-close:hover { background: #e5eaf0; }
        .apkg-form { padding: 16px 24px 24px; }
        .apkg-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .apkg-form-grid .full { grid-column: 1 / -1; }
        .apkg-field { display: flex; flex-direction: column; gap: 4px; }
        .apkg-field label { font-size: .63rem; font-weight: 700; color: #425c76; display: flex; align-items: center; gap: 4px; }
        .apkg-field input:not([type="checkbox"]), .apkg-field select, .apkg-field textarea { width: 100%; height: 40px; border: 1px solid #e5eaf0; border-radius: 8px; padding: 0 12px; font: inherit; font-size: .7rem; color: #1a2d40; background: #fff; box-sizing: border-box; outline: none; transition: border-color .15s; }
        .apkg-field select { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9dad' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: left 12px center; padding-left: 28px; }
        .apkg-field input:not([type="checkbox"]):focus, .apkg-field select:focus, .apkg-field textarea:focus { border-color: #0875dc; }
        .apkg-field textarea { height: auto; padding: 10px 12px; resize: vertical; line-height: 1.5; }
        .apkg-field .checkbox-row { display: flex; align-items: center; gap: 8px; height: 40px; }
        .apkg-field .checkbox-row input[type="checkbox"] { width: 18px; height: 18px; }
        .apkg-form-section { padding: 16px 0; border-top: 1px solid #e5ecf3; margin-top: 8px; }
        .apkg-form-section h3 { font-size: .75rem; margin: 0 0 8px; color: #073766; display: flex; align-items: center; gap: 6px; }
        .apkg-feature-input-row { display: flex; gap: 6px; align-items: center; }
        .apkg-feature-input-row input { flex: 1; height: 36px; border: 1px solid #e5eaf0; border-radius: 8px; padding: 0 12px; font: inherit; font-size: .7rem; color: #344d69; background: #fafbfc; outline: none; }
        .apkg-feature-input-row input:focus { border-color: #0875dc; }
        .apkg-feature-input-row button { height: 36px; padding: 0 14px; border: 1px solid #0875dc; border-radius: 8px; background: #0875dc; color: #fff; font: inherit; font-size: .62rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .apkg-feature-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
        .apkg-feature-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e5eaf0; border-radius: 8px; font-size: .68rem; color: #344d69; }
        .apkg-feature-item span { flex: 1; }
        .apkg-feature-item button { width: 24px; height: 24px; border: 0; background: transparent; color: #aab5c3; cursor: pointer; display: grid; place-items: center; border-radius: 6px; transition: all .15s; flex-shrink: 0; }
        .apkg-feature-item button:hover { background: #fef2f2; color: #dc2626; }
        .apkg-form-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5ecf3; }
        .apkg-form-footer button { height: 40px; padding: 0 20px; border-radius: 8px; font: inherit; font-size: .7rem; font-weight: 700; cursor: pointer; transition: all .15s; }
        .apkg-form-footer .apkg-btn-cancel { border: 1px solid #e5eaf0; background: #fff; color: #526983; }
        .apkg-form-footer .apkg-btn-cancel:hover { background: #f8fafc; }
        .apkg-form-footer .apkg-btn-save { border: 0; background: #073766; color: #fff; display: flex; align-items: center; gap: 6px; }
        .apkg-form-footer .apkg-btn-save:hover { background: #0a4a8a; }
        .apkg-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 12px; font-size: .72rem; font-weight: 700; box-shadow: 0 4px 16px rgba(0,0,0,.12); z-index: 9999; display: flex; align-items: center; gap: 8px; animation: slideUp .3s ease; }
        .apkg-toast.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
        .apkg-toast.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .apkg-form-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="apkg-page">
        <div className="apkg-heading">
          <div>
            <p>إعدادات التشغيل</p>
            <h1>إدارة الباقات</h1>
            <span>إنشاء وتعديل وإدارة الباقات المتاحة للعملاء مع التسعير والمزايا.</span>
          </div>
          <button className="apkg-add-btn" onClick={openNewForm}>
            <Plus size={15} /> باقة جديدة
          </button>
        </div>

        <div className="apkg-tools">
          <div className="apkg-search-wrap">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن باقة..." />
          </div>
          <select className="apkg-filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">كل التصنيفات</option>
            {categories.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.name_ar}</option>)}
          </select>
          <button className="apkg-btn" style={{ height: 40, padding: "0 12px", fontSize: ".62rem", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => { setCatForm({ name_ar: "", slug: "", color: "#0875dc" }); setShowCatForm(true); }}>
            <Plus size={13} /> تصنيف جديد
          </button>
        </div>

        <div className="apkg-stats">
          <div className="apkg-stat">
            <Package size={20} color="#0875dc" />
            <div>
              <div className="apkg-stat-num" style={{ color: "#0875dc" }}>{packages.length}</div>
              <div className="apkg-stat-lbl">إجمالي الباقات</div>
            </div>
          </div>
          <div className="apkg-stat">
            <CheckCircle size={20} color="#15803d" />
            <div>
              <div className="apkg-stat-num" style={{ color: "#15803d" }}>{packages.filter((p) => p.is_active).length}</div>
              <div className="apkg-stat-lbl">نشطة</div>
            </div>
          </div>
          <div className="apkg-stat">
            <Star size={20} color="#d97706" />
            <div>
              <div className="apkg-stat-num" style={{ color: "#d97706" }}>{packages.filter((p) => p.is_popular).length}</div>
              <div className="apkg-stat-lbl">الأكثر طلباً</div>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="apkg-empty">
            <Package size={56} />
            <p>لا توجد باقات تطابق البحث</p>
          </div>
        ) : (
          <div className="apkg-grid">
            {visible.map((pkg) => {
              const catColor = getCatColor(pkg.category);
              return (
                <article key={pkg.id} className={`apkg-card ${pkg.is_popular ? "popular" : ""}`}>
                  <div className="apkg-card-header">
                    {pkg.is_popular && (
                      <div className="apkg-popular-badge">
                        <Star size={10} /> الأكثر طلباً
                      </div>
                    )}
                    <div className="apkg-card-top">
                      <span className="apkg-cat-badge" style={{ background: `${catColor}15`, color: catColor }}>
                        {getCatLabel(pkg.category)}
                      </span>
                      <span className="apkg-status-badge" style={{ background: pkg.is_active ? "#f0fdf4" : "#fef2f2", color: pkg.is_active ? "#15803d" : "#dc2626" }}>
                        {pkg.is_active ? "نشطة" : "متوقفة"}
                      </span>
                    </div>
                    <h3 className="apkg-card-title">{pkg.title_ar}</h3>
                    <div className="apkg-card-tier">{pkg.tier_ar}</div>
                    {pkg.description_ar && <p className="apkg-card-desc">{pkg.description_ar}</p>}
                  </div>

                  <div className="apkg-price-area">
                    <span className="apkg-price">{pkg.price.toLocaleString("ar-SA")}</span>
                    <span className="apkg-price-cycle">ر.س / {getCycleLabel(pkg.billing_cycle)}</span>
                    {pkg.original_price && (
                      <span className="apkg-price-old">{pkg.original_price.toLocaleString("ar-SA")} ر.س</span>
                    )}
                  </div>

                  {pkg.features.length > 0 && (
                    <div className="apkg-features">
                      {pkg.features.slice(0, 5).map((f, i) => (
                        <div key={i} className="apkg-feature">
                          <CheckCircle size={13} color="#15803d" />
                          <span>{f}</span>
                        </div>
                      ))}
                      {pkg.features.length > 5 && (
                        <div className="apkg-feature-more">+{pkg.features.length - 5} ميزة أخرى</div>
                      )}
                    </div>
                  )}

                  {(pkg.max_employees > 0 || pkg.extra_employee_price > 0) && (
                    <div className="apkg-employees">
                      <Users size={13} />
                      <span>
                        {pkg.max_employees > 0 ? `أول ${pkg.max_employees} موظف` : ""}
                        {pkg.extra_employee_price > 0 ? (pkg.max_employees > 0 ? " · " : "") + `${pkg.extra_employee_price} ر.س للموظف الإضافي` : ""}
                      </span>
                    </div>
                  )}

                  <div className="apkg-card-footer">
                    <button className="apkg-btn apkg-btn-primary" onClick={() => openEditForm(pkg)}>
                      <Edit3 size={12} /> تعديل
                    </button>
                    <button className={`apkg-btn ${pkg.is_active ? "apkg-btn-success" : ""}`} onClick={() => togglePackage(pkg)}>
                      {pkg.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                      {pkg.is_active ? "إيقاف" : "تفعيل"}
                    </button>
                    <button className="apkg-btn apkg-btn-danger" onClick={() => deletePackage(pkg)}>
                      <Trash2 size={12} /> حذف
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Modal ─── */}
      {showForm && (
        <div className="apkg-modal-backdrop" onMouseDown={() => setShowForm(false)}>
          <div className="apkg-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="apkg-modal-header">
              <div>
                <h2>{editing ? "تعديل الباقة" : "باقة جديدة"}</h2>
                <p>بيانات الباقة والتسعير والمزايا.</p>
              </div>
              <button className="apkg-modal-close" onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>

            <form className="apkg-form" onSubmit={savePackage}>
              <div className="apkg-form-grid">
                <div className="apkg-field full">
                  <label>اسم الباقة (عربي) *</label>
                  <input name="title_ar" defaultValue={editing?.title_ar} required placeholder="مثال: تأسيس وتشغيل أولي" />
                </div>
                <div className="apkg-field">
                  <label>اسم الباقة (إنجليزي)</label>
                  <input name="title_en" defaultValue={editing?.title_en || ""} placeholder="Package name" />
                </div>
                <div className="apkg-field">
                  <label>المستوى (عربي) *</label>
                  <input name="tier_ar" defaultValue={editing?.tier_ar || ""} required placeholder="مسار الانطلاق" />
                </div>
                <div className="apkg-field">
                  <label>المستوى (إنجليزي)</label>
                  <input name="tier_en" defaultValue={editing?.tier_en || ""} placeholder="Starter" />
                </div>
                <div className="apkg-field full">
                  <label>الوصف (عربي)</label>
                  <textarea name="description_ar" defaultValue={editing?.description_ar || ""} rows={2} placeholder="وصف مختصر للباقة..." />
                </div>
                <div className="apkg-field">
                  <label>التصنيف *</label>
                  <select name="category" defaultValue={editing?.category || (categories[0]?.slug || "services")}>
                    {categories.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.name_ar}</option>)}
                  </select>
                </div>
                <div className="apkg-field">
                  <label>دورة الفوترة *</label>
                  <select name="billing_cycle" defaultValue={editing?.billing_cycle || "yearly"}>
                    {cycleOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="apkg-field">
                  <label>السعر (ر.س) *</label>
                  <input name="price" type="number" min="0" step="0.01" defaultValue={editing?.price || 0} required />
                </div>
                <div className="apkg-field">
                  <label>السعر قبل الخصم (ر.س)</label>
                  <input name="original_price" type="number" min="0" step="0.01" defaultValue={editing?.original_price || ""} />
                </div>
                <div className="apkg-field">
                  <label>عدد الموظفين الأساسي</label>
                  <input name="max_employees" type="number" min="0" defaultValue={editing?.max_employees || 0} />
                </div>
                <div className="apkg-field">
                  <label>سعر الموظف الإضافي (ر.س)</label>
                  <input name="extra_employee_price" type="number" min="0" step="0.01" defaultValue={editing?.extra_employee_price || 0} />
                </div>
                <div className="apkg-field">
                  <label>نسبة الضريبة (%)</label>
                  <input name="tax_percent" type="number" min="0" max="100" step="0.01" defaultValue={editing?.tax_percent || 15} />
                </div>
                <div className="apkg-field">
                  <label>ترتيب العرض</label>
                  <input name="sort_order" type="number" min="0" defaultValue={editing?.sort_order || 0} />
                </div>
                <div className="apkg-field">
                  <div className="checkbox-row">
                    <input name="is_popular" type="checkbox" defaultChecked={editing?.is_popular} id="is_popular" />
                    <label htmlFor="is_popular" style={{ cursor: "pointer" }}>باقة الأكثر طلباً</label>
                  </div>
                </div>
              </div>

              <div className="apkg-form-section">
                <h3><Tag size={14} /> المزايا</h3>
                <div className="apkg-feature-input-row">
                  <input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="اكتب ميزة ثم أضفها..."
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                  />
                  <button type="button" onClick={addFeature}>+ إضافة</button>
                </div>
                {featuresList.length > 0 ? (
                  <div className="apkg-feature-list">
                    {featuresList.map((f, i) => (
                      <div key={i} className="apkg-feature-item">
                        <CheckCircle size={13} color="#15803d" />
                        <span>{f}</span>
                        <button type="button" onClick={() => removeFeature(i)}><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: ".65rem", color: "#8b9dad", padding: "8px 0" }}>لم تضف أي ميزات بعد</div>
                )}
              </div>

              <div className="apkg-form-footer">
                <button type="button" className="apkg-btn-cancel" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" className="apkg-btn-save">
                  <Save size={14} /> {editing ? "حفظ التغييرات" : "إضافة الباقة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Category Modal ─── */}
      {showCatForm && (
        <div className="apkg-modal-backdrop" onMouseDown={() => setShowCatForm(false)}>
          <div className="apkg-modal" style={{ width: "min(440px,100%)" }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="apkg-modal-header">
              <div>
                <h2>تصنيف جديد</h2>
                <p>أضف تصنيفاً جديداً للباقات.</p>
              </div>
              <button className="apkg-modal-close" onClick={() => setShowCatForm(false)}><X size={16} /></button>
            </div>
            <div style={{ padding: "16px 24px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="apkg-field">
                  <label>اسم التصنيف (عربي) *</label>
                  <input value={catForm.name_ar} onChange={(e) => setCatForm({ ...catForm, name_ar: e.target.value })} placeholder="مثال: باقات التسويق" />
                </div>
                <div className="apkg-field">
                  <label>المعرف (slug) *</label>
                  <input value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value.replace(/\s+/g, "_").toLowerCase() })} placeholder="marketing" dir="ltr" />
                </div>
                <div className="apkg-field">
                  <label>اللون</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="color" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} style={{ width: 48, height: 40, padding: 0, border: "1px solid #e5eaf0", borderRadius: 8, cursor: "pointer" }} />
                    <span style={{ fontSize: ".65rem", color: "#8b9dad", fontFamily: "monospace" }}>{catForm.color}</span>
                  </div>
                </div>
              </div>
              <div className="apkg-form-footer" style={{ marginTop: 16, paddingTop: 16 }}>
                <button type="button" className="apkg-btn-cancel" onClick={() => setShowCatForm(false)}>إلغاء</button>
                <button type="button" className="apkg-btn-save" onClick={async () => {
                  if (!catForm.name_ar.trim() || !catForm.slug.trim()) { showNotice("الاسم والمعرف مطلوبان", "error"); return; }
                  try {
                    const res = await fetch("/api/admin/package-categories", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(catForm),
                    });
                    if (!res.ok) throw new Error();
                    const refreshed = await fetch("/api/admin/package-categories").then(r => r.json());
                    if (refreshed.data) setCategories(refreshed.data);
                    setShowCatForm(false);
                    showNotice("✅ تمت إضافة التصنيف");
                  } catch { showNotice("فشل إضافة التصنيف", "error"); }
                }}>إضافة التصنيف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className={`apkg-toast ${noticeType}`}>
          {noticeType === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {notice}
        </div>
      )}
    </>
  );
}
