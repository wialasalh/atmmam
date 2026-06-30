"use client";
import PageLoader from "@/components/page-loader";

import { FormEvent, useEffect, useRef, useState, useMemo } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  Search, Plus, Pencil, Power, Trash2, CheckCircle, Clock, FileText,
  Building2, LayoutGrid, List, Store, Landmark, BarChart3, Lightbulb,
  Users, ShieldCheck, TrendingUp, MessageSquare, Pin, X, ChevronDown,
  RefreshCw, Layers, Tag, Save, AlertCircle,
} from "lucide-react";

type ServiceItem = {
  id?: string; agencyId?: string; name: string; category: string;
  agency: string; duration: string; durationDays?: number | null;
  active: boolean; documents: number; price?: number | null;
  requiredDocuments?: string[];
};
type DatabaseService = {
  id: string; name: string; category: string; agency_id: string;
  default_duration_days: number; active: boolean;
  required_documents?: string[]; price?: number | null;
  agencies?: { name?: string } | null;
};
type Agency = { id: string; name: string };

const CAT: Record<string, { color: string; bg: string; border: string; dot: string; Icon: React.ComponentType<{size?:number;color?:string;strokeWidth?:number}> }> = {
  "السجل التجاري":    { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", Icon: Store },
  "تأسيس الشركات":   { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", Icon: Landmark },
  "الزكاة والضريبة": { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", dot: "#f97316", Icon: BarChart3 },
  "الملكية الفكرية": { color: "#073766", bg: "#eff6ff", border: "#bfdbfe", dot: "#0875dc", Icon: Lightbulb },
  "الموارد البشرية":  { color: "#be123c", bg: "#fff1f2", border: "#fecdd3", dot: "#f43f5e", Icon: Users },
  "التراخيص":        { color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", dot: "#14b8a6", Icon: ShieldCheck },
  "الاستثمار":       { color: "#a16207", bg: "#fefce8", border: "#fde68a", dot: "#eab308", Icon: TrendingUp },
  "الاستشارات":      { color: "#334155", bg: "#f8fafc", border: "#e2e8f0", dot: "#64748b", Icon: MessageSquare },
};
function getCat(cat: string) { return CAT[cat] ?? { color: "#526983", bg: "#f4f7fb", border: "#dfe8f1", dot: "#94a3b8", Icon: Pin }; }

function SSelect({ options, value, onChange, placeholder, allowCustom, icon }: {
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
  placeholder?: string; allowCustom?: boolean; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter(o => !q || o.label.includes(q));
  const label = options.find(o => o.value === value)?.label || (allowCustom ? value : "");
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => { setOpen(v => !v); setQ(""); }}
        style={{ width: "100%", height: 40, border: `1.5px solid ${open ? "#073766" : "#dfe8f1"}`, borderRadius: 9, padding: "0 12px", display: "flex", alignItems: "center", gap: 8, background: "#fff", cursor: "pointer", font: "inherit", fontSize: ".74rem", color: label ? "#1a2d40" : "#aab5c3", textAlign: "right", transition: "border-color .15s", boxSizing: "border-box" }}>
        {icon && <span style={{ color: "#8b9dad", flexShrink: 0 }}>{icon}</span>}
        <span style={{ flex: 1 }}>{label || placeholder}</span>
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(""); }} style={{ border: 0, background: "none", padding: 2, cursor: "pointer", color: "#aab5c3", display: "flex" }}><X size={11} /></button>}
        <ChevronDown size={13} color="#8b9dad" style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: "#fff", border: "1.5px solid #dfe8f1", borderRadius: 12, boxShadow: "0 8px 32px rgba(7,55,102,.12)", zIndex: 999, overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f4f8" }}>
            <div style={{ position: "relative" }}>
              <Search size={12} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#8b9dad" }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 7, padding: "6px 28px 6px 9px", font: "inherit", fontSize: ".7rem", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
            </div>
          </div>
          <div style={{ maxHeight: 190, overflowY: "auto" }}>
            {allowCustom && q && !options.find(o => o.label === q) && (
              <button type="button" onClick={() => { onChange(q); setOpen(false); setQ(""); }}
                style={{ width: "100%", padding: "9px 12px", border: 0, background: "#f0f7ff", cursor: "pointer", font: "inherit", fontSize: ".72rem", color: "#073766", fontWeight: 700, textAlign: "right", display: "flex", alignItems: "center", gap: 7 }}>
                <Plus size={11} /> إضافة &ldquo;{q}&rdquo;
              </button>
            )}
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                style={{ width: "100%", padding: "9px 12px", border: 0, background: o.value === value ? "#eff6ff" : "transparent", cursor: "pointer", font: "inherit", fontSize: ".72rem", color: o.value === value ? "#073766" : "#344d69", fontWeight: o.value === value ? 700 : 400, textAlign: "right", display: "flex", alignItems: "center", gap: 7, transition: "background .1s" }}
                onMouseOver={e => { if (o.value !== value) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseOut={e => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}>
                {o.value === value && <CheckCircle size={11} color="#073766" style={{ flexShrink: 0 }} />}
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && !allowCustom && (
              <div style={{ padding: 14, textAlign: "center", fontSize: ".68rem", color: "#aab5c3" }}>لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminServicesPage() {
  const { loading: authLoading } = useRoleGuard("manager");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [query, setQuery]       = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [editing, setEditing]   = useState<ServiceItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState("");
  const [formAgencyId, setFormAgencyId] = useState("");
  const [toast, setToast]       = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [saving, setSaving]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  async function load() {
    setLoadingData(true);
    try {
      const [svcRes, catRes] = await Promise.all([fetch("/api/admin/services"), fetch("/api/admin/catalog")]);
      if (!svcRes.ok || !catRes.ok) return;
      const svcData = (await svcRes.json()) as { data: DatabaseService[] };
      const catData = (await catRes.json()) as { data: { agencies: Agency[] } };
      setAgencies(catData.data.agencies);
      setServices(svcData.data.map((item): ServiceItem => ({
        id: item.id, agencyId: item.agency_id,
        name: item.name, category: item.category,
        agency: item.agencies?.name ?? "",
        duration: item.default_duration_days ? `${item.default_duration_days} يوم` : "—",
        durationDays: item.default_duration_days,
        active: item.active, documents: item.required_documents?.length ?? 0,
        price: item.price, requiredDocuments: item.required_documents ?? [],
      })));
    } finally { setLoadingData(false); }
  }

  useEffect(() => { void load(); }, []);

  function notify(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2800);
  }

  const categories = useMemo(() => ["الكل", ...Array.from(new Set(services.map(s => s.category)))], [services]);

  const visible = useMemo(() => services.filter(s => {
    const mc = catFilter === "الكل" || s.category === catFilter;
    const mq = !query || s.name.includes(query) || s.agency.includes(query) || s.category.includes(query);
    return mc && mq;
  }), [services, catFilter, query]);

  const grouped = useMemo(() => visible.reduce<Record<string, ServiceItem[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []; acc[s.category].push(s); return acc;
  }, {}), [visible]);

  async function saveService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (!formCategory) return;
    setSaving(true);
    try {
      const data = new FormData(e.currentTarget);
      const docsRaw = String(data.get("documentsText") || "").split("\n").map(s => s.trim()).filter(Boolean);
      const payload = {
        serviceId: editing?.id, name: String(data.get("name")),
        category: formCategory, agencyId: formAgencyId || undefined,
        defaultDurationDays: Number(data.get("durationDays")) || null,
        price: data.get("price") ? Number(data.get("price")) : null,
        requiredDocuments: docsRaw, active: editing?.active ?? true,
      };
      const res = await fetch("/api/admin/services", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { notify("تعذر حفظ الخدمة", "err"); return; }
      await load(); setShowForm(false); setEditing(null);
      notify(editing ? "تم تحديث الخدمة ✓" : "تمت إضافة الخدمة ✓");
    } finally { setSaving(false); }
  }

  async function toggleActive(svc: ServiceItem) {
    if (!svc.id) return;
    const res = await fetch("/api/admin/services", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ serviceId: svc.id, active: !svc.active }),
    });
    if (res.ok) { await load(); notify(svc.active ? "تم إيقاف الخدمة" : "تم تفعيل الخدمة"); }
  }

  async function deleteService(svc: ServiceItem) {
    if (!svc.id || !confirm(`حذف "${svc.name}" نهائياً؟`)) return;
    const res = await fetch(`/api/admin/services/${svc.id}`, { method: "DELETE" });
    if (res.ok) { await load(); notify("تم حذف الخدمة"); }
    else notify("تعذر الحذف", "err");
  }

  function openEdit(svc: ServiceItem) {
    setEditing(svc); setFormCategory(svc.category); setFormAgencyId(svc.agencyId ?? ""); setSubmitted(false); setShowForm(true);
  }
  function openNew() {
    setEditing(null); setFormCategory(""); setFormAgencyId(""); setSubmitted(false); setShowForm(true);
  }

  if (authLoading) return <PageLoader text="جاري تحميل الخدمات..." />;

  return (
    <div className="sv-shell" dir="rtl">
      <style>{`
        .sv-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;color:#173d65;overflow:hidden}
        .sv-head{padding:18px 24px 14px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff)}
        .sv-head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
        .sv-eyebrow{margin:0 0 4px;color:#0f766e;font-size:.65rem;font-weight:900;letter-spacing:.04em}
        .sv-head h1{margin:0 0 4px;font-size:1.5rem;color:#073766;line-height:1}
        .sv-head p{margin:0;color:#7f8e9f;font-size:.7rem}
        .sv-head-btns{display:flex;gap:8px;align-items:center}
        .sv-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer;transition:all .14s}
        .sv-btn:hover{background:#f4f7fb}
        .sv-btn.primary{background:#073766;color:#fff;border-color:#073766}
        .sv-btn.primary:hover{background:#0a4a8a;border-color:#0a4a8a}
        .sv-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .sv-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:12px;padding:11px 14px;display:flex;align-items:center;gap:10px}
        .sv-kpi i{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
        .sv-kpi small{display:block;font-size:.55rem;color:#8190a1;font-weight:800}
        .sv-kpi strong{display:block;font-size:1.05rem;line-height:1;margin-top:3px}
        .sv-body{min-height:0;overflow:auto;padding:16px 20px 24px;display:flex;flex-direction:column;gap:12px}
        .sv-toolbar{background:#fff;border:1px solid #dfe8f1;border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .sv-search{height:34px;border:1px solid #dfe8f1;border-radius:8px;background:#f8fafc;display:flex;align-items:center;gap:7px;padding:0 10px;min-width:220px;flex:1}
        .sv-search input{border:0;outline:0;background:transparent;font:inherit;font-size:.67rem;width:100%;color:#173d65}
        .sv-cats{display:flex;gap:5px;flex-wrap:wrap}
        .sv-cat{height:28px;border:1px solid #dfe8f1;border-radius:20px;background:#f8fafc;color:#65788c;padding:0 11px;font:inherit;font-size:.58rem;font-weight:800;display:inline-flex;align-items:center;gap:5px;cursor:pointer;transition:all .12s;white-space:nowrap}
        .sv-cat.active{background:#073766;border-color:#073766;color:#fff}
        .sv-toggle{display:flex;border:1px solid #dfe8f1;border-radius:8px;overflow:hidden;flex-shrink:0}
        .sv-toggle button{width:34px;height:34px;border:0;background:#fff;color:#8b9dad;cursor:pointer;display:grid;place-items:center;transition:all .12s}
        .sv-toggle button.active{background:#073766;color:#fff}
        .sv-section{display:flex;flex-direction:column;gap:10px}
        .sv-section-head{display:flex;align-items:center;gap:9px;padding-bottom:8px;border-bottom:1.5px solid #edf2f7}
        .sv-section-icon{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;flex-shrink:0}
        .sv-section-name{font-size:.8rem;font-weight:800;color:#0b1e36}
        .sv-section-count{font-size:.56rem;font-weight:800;padding:2px 9px;border-radius:20px;background:#edf2f7;color:#6b829b}
        .sv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
        .sv-card{background:#fff;border:1.5px solid #e5eaf0;border-radius:12px;overflow:hidden;transition:box-shadow .18s,transform .18s,border-color .18s;display:flex;flex-direction:column;position:relative}
        .sv-card:hover{box-shadow:0 6px 22px rgba(7,55,102,.1);transform:translateY(-2px);border-color:#c7d8f0}
        .sv-card.off{opacity:.55}
        .sv-card-top{height:4px;width:100%}
        .sv-card-body{padding:11px 12px 9px;flex:1}
        .sv-card-row1{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px}
        .sv-card-ico{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex-shrink:0}
        .sv-status{font-size:.5rem;font-weight:900;padding:2px 7px;border-radius:20px;letter-spacing:.02em}
        .sv-status.on{background:#f0fdf4;color:#15803d}
        .sv-status.off2{background:#fef2f2;color:#dc2626}
        .sv-card-name{font-size:.72rem;font-weight:800;color:#0b1e36;line-height:1.35;margin-bottom:7px}
        .sv-card-metas{display:flex;flex-direction:column;gap:3px}
        .sv-card-meta{display:flex;align-items:center;gap:5px;font-size:.58rem;color:#7a8fa4}
        .sv-price{font-size:.63rem;font-weight:900;padding:3px 9px;border-radius:20px;margin-top:8px;display:inline-block}
        .sv-card-foot{padding:7px 10px;background:#fafbfd;border-top:1px solid #f0f4f8;display:flex;gap:5px}
        .sv-act{flex:1;height:28px;border:1px solid #e5eaf0;border-radius:7px;background:#fff;color:#526983;font:inherit;font-size:.57rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all .12s}
        .sv-act:hover{background:#f0f4f8}
        .sv-act.edit:hover{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
        .sv-act.tog:hover{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
        .sv-act.tog.on:hover{background:#fff7ed;border-color:#fed7aa;color:#b45309}
        .sv-act.del:hover{background:#fef2f2;border-color:#fecaca;color:#dc2626}
        .sv-tbl-wrap{background:#fff;border:1px solid #dfe8f1;border-radius:12px;overflow:hidden}
        .sv-tbl-head{padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e5eaf0;display:flex;align-items:center;gap:9px}
        .sv-tbl{width:100%;border-collapse:collapse;font-size:.67rem}
        .sv-tbl thead tr{background:#f4f7fb;border-bottom:1px solid #e4ebf2}
        .sv-tbl th{padding:9px 14px;text-align:right;font-weight:800;color:#425c76;font-size:.58rem;white-space:nowrap}
        .sv-tbl th.ctr{text-align:center}
        .sv-tbl tbody tr{border-bottom:1px solid #f0f4f8;transition:background .1s}
        .sv-tbl tbody tr:last-child{border-bottom:none}
        .sv-tbl tbody tr:hover{background:#fafbfd}
        .sv-tbl td{padding:11px 14px;vertical-align:middle}
        .sv-tbl td.ctr{text-align:center}
        .sv-backdrop{position:fixed;inset:0;background:rgba(7,55,102,.4);z-index:900;display:grid;place-items:center;padding:20px;backdrop-filter:blur(3px)}
        .sv-modal{background:#fff;border-radius:20px;width:min(580px,100%);max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.2);direction:rtl}
        .sv-modal-head{padding:22px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px}
        .sv-modal-head h2{font-size:.95rem;margin:0 0 4px;color:#073766;font-weight:800}
        .sv-modal-head p{font-size:.63rem;color:#8b9dad;margin:0}
        .sv-modal-close{width:32px;height:32px;border:1px solid #e4ebf2;border-radius:9px;background:#f8fafc;cursor:pointer;display:grid;place-items:center;color:#526983;flex-shrink:0}
        .sv-form{padding:16px 24px 20px;display:flex;flex-direction:column;gap:13px}
        .sv-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .sv-form-row.wide{grid-template-columns:1fr}
        .sv-field{display:flex;flex-direction:column;gap:5px}
        .sv-field label{font-size:.61rem;font-weight:700;color:#425c76}
        .sv-field input,.sv-field textarea{border:1.5px solid #e5eaf0;border-radius:9px;padding:9px 12px;font:inherit;font-size:.74rem;color:#1a2d40;background:#fff;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box}
        .sv-field input:focus,.sv-field textarea:focus{border-color:#073766}
        .sv-field textarea{resize:vertical;min-height:88px;line-height:1.6}
        .sv-modal-foot{display:flex;gap:8px;padding:0 24px 22px}
        .sv-save{flex:1;height:40px;border:0;border-radius:10px;background:#073766;color:#fff;font:inherit;font-size:.73rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px}
        .sv-save:disabled{background:#e5eaf0;color:#aab5c3;cursor:not-allowed}
        .sv-discard{height:40px;padding:0 18px;border:1px solid #dfe7ef;border-radius:10px;background:#fff;color:#526983;font:inherit;font-size:.7rem;cursor:pointer}
        .sv-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:12px;font-size:.7rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:1000;animation:svUp .2s;white-space:nowrap}
        .sv-toast.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
        .sv-toast.err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        .sv-empty{padding:60px 24px;text-align:center;color:#8b9dad;background:#fff;border:1px solid #dfe8f1;border-radius:12px}
        @keyframes svUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:640px){.sv-form-row{grid-template-columns:1fr}}
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="sv-head">
        <div className="sv-head-row">
          <div>
            <p className="sv-eyebrow">إعدادات التشغيل</p>
            <h1>الخدمات</h1>
            <p>الكتالوج الكامل لخدمات المنصة · الأسعار والمتطلبات والتصنيفات</p>
          </div>
          <div className="sv-head-btns">
            <button className="sv-btn" onClick={() => { setLoadingData(true); void load(); }}><RefreshCw size={13} /> تحديث</button>
            <button className="sv-btn primary" onClick={openNew}><Plus size={14} /> خدمة جديدة</button>
          </div>
        </div>

        <div className="sv-kpis">
          {[
            { Icon: Layers,      label: "إجمالي الخدمات", val: services.length,                           color: "#0875dc", bg: "#dbeafe" },
            { Icon: CheckCircle, label: "خدمات نشطة",     val: services.filter(s => s.active).length,    color: "#15803d", bg: "#bbf7d0" },
            { Icon: Power,       label: "موقوفة",          val: services.filter(s => !s.active).length,   color: "#dc2626", bg: "#fecaca" },
            { Icon: Tag,         label: "التصنيفات",       val: categories.length - 1,                    color: "#b45309", bg: "#fde68a" },
          ].map(k => (
            <div key={k.label} className="sv-kpi">
              <i style={{ background: k.bg }}><k.Icon size={15} color={k.color} /></i>
              <div><small>{k.label}</small><strong style={{ color: k.color }}>{k.val}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="sv-body">

        {/* Toolbar */}
        <div className="sv-toolbar">
          <label className="sv-search">
            <Search size={13} color="#a0adb8" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="بحث عن خدمة أو جهة أو تصنيف..." />
          </label>
          <div className="sv-toggle">
            <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} title="بطاقات"><LayoutGrid size={14} /></button>
            <button className={viewMode === "table" ? "active" : ""} onClick={() => setViewMode("table")} title="جدول"><List size={14} /></button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="sv-cats">
          {categories.map(cat => {
            const count = cat === "الكل" ? services.length : services.filter(s => s.category === cat).length;
            return (
              <button key={cat} className={`sv-cat${catFilter === cat ? " active" : ""}`} onClick={() => setCatFilter(cat)}>
                {cat} <span style={{ opacity: .75 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loadingData ? (
          <div className="sv-empty"><div style={{ fontSize: ".72rem", color: "#a0adb8" }}>جاري التحميل...</div></div>
        ) : visible.length === 0 ? (
          <div className="sv-empty">
            <Layers size={36} style={{ opacity: .2, marginBottom: 10 }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#526983", fontSize: ".8rem" }}>لا توجد خدمات مطابقة</p>
            <p style={{ margin: 0, fontSize: ".7rem" }}>جرب تغيير التصنيف أو مسح البحث</p>
          </div>
        ) : viewMode === "grid" ? (

          Object.entries(grouped).map(([cat, items]) => {
            const cs = getCat(cat);
            const CatIco = cs.Icon;
            return (
              <div key={cat} className="sv-section">
                <div className="sv-section-head">
                  <span className="sv-section-icon" style={{ background: cs.bg }}>
                    <CatIco size={14} color={cs.dot} strokeWidth={2} />
                  </span>
                  <span className="sv-section-name">{cat}</span>
                  <span className="sv-section-count">{items.length} خدمة</span>
                </div>
                <div className="sv-grid">
                  {items.map(svc => {
                    const sc = getCat(svc.category);
                    const SIco = sc.Icon;
                    return (
                      <div key={svc.id ?? svc.name} className={`sv-card${svc.active ? "" : " off"}`}>
                        <div className="sv-card-top" style={{ background: sc.dot }} />
                        <div className="sv-card-body">
                          <div className="sv-card-row1">
                            <span className="sv-card-ico" style={{ background: sc.bg }}>
                              <SIco size={14} color={sc.dot} strokeWidth={2} />
                            </span>
                            <span className={`sv-status ${svc.active ? "on" : "off2"}`}>{svc.active ? "● نشطة" : "● موقوفة"}</span>
                          </div>
                          <div className="sv-card-name">{svc.name}</div>
                          <div className="sv-card-metas">
                            {svc.agency && <div className="sv-card-meta"><Building2 size={10} />{svc.agency}</div>}
                            {svc.durationDays && <div className="sv-card-meta"><Clock size={10} />{svc.duration}</div>}
                            {svc.documents > 0 && <div className="sv-card-meta"><FileText size={10} />{svc.documents} مستندات</div>}
                          </div>
                          {svc.price != null ? (
                            <span className="sv-price" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                              {svc.price.toLocaleString("ar-SA")} ر.س
                            </span>
                          ) : (
                            <span className="sv-price" style={{ background: "#f8fafc", color: "#c4cdd6" }}>غير محدد</span>
                          )}
                        </div>
                        <div className="sv-card-foot">
                          <button className="sv-act edit" onClick={() => openEdit(svc)}><Pencil size={10} /> تعديل</button>
                          <button className={`sv-act tog${svc.active ? " on" : ""}`} onClick={() => void toggleActive(svc)}>
                            <Power size={10} /> {svc.active ? "إيقاف" : "تفعيل"}
                          </button>
                          <button className="sv-act del" onClick={() => void deleteService(svc)} style={{ flex: "none", padding: "0 9px" }}><Trash2 size={10} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })

        ) : (

          Object.entries(grouped).map(([cat, items]) => {
            const cs = getCat(cat);
            const CatIco = cs.Icon;
            return (
              <div key={cat} className="sv-tbl-wrap">
                <div className="sv-tbl-head" style={{ borderRight: `3px solid ${cs.dot}` }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: cs.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <CatIco size={12} color={cs.dot} strokeWidth={2} />
                    </span>
                    <span style={{ fontSize: ".76rem", fontWeight: 800, color: "#0b1e36" }}>{cat}</span>
                  </span>
                  <span style={{ fontSize: ".56rem", fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "#edf2f7", color: "#6b829b" }}>{items.length} خدمة</span>
                </div>
                <table className="sv-tbl">
                  <thead>
                    <tr>
                      <th>الخدمة</th>
                      <th>الجهة</th>
                      <th className="ctr">السعر</th>
                      <th className="ctr">المدة</th>
                      <th className="ctr">المستندات</th>
                      <th className="ctr">الحالة</th>
                      <th className="ctr"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(svc => (
                      <tr key={svc.id ?? svc.name} style={{ opacity: svc.active ? 1 : .6 }}>
                        <td style={{ fontWeight: 700, color: "#0b1e36", fontSize: ".7rem" }}>{svc.name}</td>
                        <td style={{ color: "#7a8fa4", fontSize: ".63rem" }}>{svc.agency || <span style={{ color: "#d1d9e2" }}>—</span>}</td>
                        <td className="ctr">
                          {svc.price != null
                            ? <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 20, fontSize: ".58rem", fontWeight: 800 }}>{svc.price.toLocaleString("ar-SA")} ر.س</span>
                            : <span style={{ color: "#d1d9e2" }}>—</span>}
                        </td>
                        <td className="ctr" style={{ color: "#7a8fa4", fontSize: ".63rem" }}>{svc.duration}</td>
                        <td className="ctr" style={{ color: "#7a8fa4", fontSize: ".63rem" }}>{svc.documents || <span style={{ color: "#d1d9e2" }}>—</span>}</td>
                        <td className="ctr">
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: ".56rem", fontWeight: 800,
                            background: svc.active ? "#f0fdf4" : "#fef2f2", color: svc.active ? "#15803d" : "#dc2626" }}>
                            {svc.active ? "نشطة" : "موقوفة"}
                          </span>
                        </td>
                        <td className="ctr">
                          <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                            <button className="sv-act edit" style={{ flex: "none", padding: "0 9px", height: 28 }} onClick={() => openEdit(svc)}><Pencil size={10} /></button>
                            <button className={`sv-act tog${svc.active ? " on" : ""}`} style={{ flex: "none", padding: "0 9px", height: 28 }} onClick={() => void toggleActive(svc)}><Power size={10} /></button>
                            <button className="sv-act del" style={{ flex: "none", padding: "0 9px", height: 28 }} onClick={() => void deleteService(svc)}><Trash2 size={10} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>

      {/* ══ MODAL ══ */}
      {showForm && (
        <div className="sv-backdrop" onMouseDown={() => { setShowForm(false); setEditing(null); }}>
          <div className="sv-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="sv-modal-head">
              <div>
                <h2>{editing ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h2>
                <p>البيانات تُستخدم عند عرض الخدمة للعميل وإنشاء الطلبات</p>
              </div>
              <button className="sv-modal-close" onClick={() => { setShowForm(false); setEditing(null); }}><X size={14} /></button>
            </div>

            <form onSubmit={saveService}>
              <div className="sv-form">
                <div className="sv-form-row wide">
                  <div className="sv-field">
                    <label>اسم الخدمة *</label>
                    <input name="name" defaultValue={editing?.name} required placeholder="مثال: تأسيس شركة ذات مسؤولية محدودة" />
                  </div>
                </div>
                <div className="sv-form-row">
                  <div className="sv-field">
                    <label>التصنيف *</label>
                    <SSelect allowCustom placeholder="اختر أو اكتب تصنيفاً..."
                      value={formCategory} onChange={setFormCategory}
                      icon={<Tag size={12} />}
                      options={Array.from(new Set(services.map(s => s.category))).map(c => ({ value: c, label: c }))} />
                    {submitted && !formCategory && <span style={{ fontSize: ".58rem", color: "#ef4444" }}>التصنيف مطلوب</span>}
                  </div>
                  <div className="sv-field">
                    <label>الجهة الحكومية</label>
                    <SSelect placeholder="بدون جهة" value={formAgencyId} onChange={setFormAgencyId}
                      icon={<Building2 size={12} />}
                      options={agencies.map(a => ({ value: a.id, label: a.name }))} />
                  </div>
                </div>
                <div className="sv-form-row">
                  <div className="sv-field">
                    <label>السعر (ر.س)</label>
                    <input name="price" type="number" min="0" step="0.01" defaultValue={editing?.price ?? ""} placeholder="0.00" />
                  </div>
                  <div className="sv-field">
                    <label>المدة التقديرية (أيام)</label>
                    <input name="durationDays" type="number" min="1" max="365" defaultValue={editing?.durationDays ?? 7} />
                  </div>
                </div>
                <div className="sv-form-row wide">
                  <div className="sv-field">
                    <label>المستندات المطلوبة <span style={{ fontWeight: 400, color: "#a0adb8" }}>(سطر لكل مستند)</span></label>
                    <textarea name="documentsText" defaultValue={editing?.requiredDocuments?.join("\n") ?? ""}
                      placeholder={"هوية وطنية\nسجل تجاري\nعقد الإيجار"} />
                  </div>
                </div>
              </div>

              <div className="sv-modal-foot">
                <button type="submit" className="sv-save" disabled={saving}>
                  {saving
                    ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite", display: "inline-block" }} /> جاري الحفظ...</>
                    : <><Save size={14} /> {editing ? "حفظ التعديلات" : "إضافة الخدمة"}</>
                  }
                </button>
                <button type="button" className="sv-discard" onClick={() => { setShowForm(false); setEditing(null); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`sv-toast ${toast.type}`}>
          {toast.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
