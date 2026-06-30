import PageLoader from "@/components/page-loader";
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  Search, Plus, Pencil, Power, Trash2, CheckCircle, Clock, FileText,
  Building2, LayoutGrid, List, Store, Landmark, BarChart3, Lightbulb,
  Users, ShieldCheck, TrendingUp, MessageSquare, Pin, SlidersHorizontal,
  ChevronDown, X as XIcon,
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

const CAT_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  "السجل التجاري":   { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  "تأسيس الشركات":  { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "الزكاة والضريبة": { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "الملكية الفكرية": { bg: "#f0f7ff", color: "#073766", dot: "#0875dc" },
  "الموارد البشرية":  { bg: "#fff1f2", color: "#be123c", dot: "#f43f5e" },
  "التراخيص":        { bg: "#f0fdfa", color: "#0f766e", dot: "#14b8a6" },
  "الاستثمار":       { bg: "#fefce8", color: "#a16207", dot: "#eab308" },
  "الاستشارات":      { bg: "#f8fafc", color: "#334155", dot: "#64748b" },
};
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const CAT_ICONS: Record<string, LucideIcon> = {
  "السجل التجاري":    Store,
  "تأسيس الشركات":   Landmark,
  "الزكاة والضريبة":  BarChart3,
  "الملكية الفكرية":  Lightbulb,
  "الموارد البشرية":   Users,
  "التراخيص":         ShieldCheck,
  "الاستثمار":        TrendingUp,
  "الاستشارات":       MessageSquare,
};
function CatIcon({ cat, size = 16, color }: { cat: string; size?: number; color?: string }) {
  const Icon = CAT_ICONS[cat] ?? Pin;
  return <Icon size={size} color={color} strokeWidth={1.8} />;
}
function CustomSelect({
  options, value, onChange, placeholder, allowCustom = false, icon,
}: {
  options: { value: string; label: string; sub?: string }[];
  value: string; onChange: (v: string) => void;
  placeholder?: string; allowCustom?: boolean;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter(o => !q || o.label.includes(q) || o.value.includes(q));
  const selected = options.find(o => o.value === value);
  const label = selected?.label || (allowCustom && value ? value : "");
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => { setOpen(v => !v); setQ(""); }}
        style={{ width:"100%", minHeight:42, border:"1.5px solid", borderColor: open?"#073766":"#e5eaf0", borderRadius:10, padding:"0 14px", display:"flex", alignItems:"center", gap:8, background:"#fff", cursor:"pointer", font:"inherit", fontSize:".75rem", color: label?"#1a2d40":"#aab5c3", textAlign:"right", transition:"border-color .15s" }}>
        {icon && <span style={{ color:"#8b9dad", flexShrink:0 }}>{icon}</span>}
        <span style={{ flex:1 }}>{label || placeholder}</span>
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(""); setQ(""); }}
          style={{ border:0, background:"none", padding:2, cursor:"pointer", color:"#aab5c3", display:"flex", flexShrink:0 }}><XIcon size={12} /></button>}
        <ChevronDown size={14} color="#8b9dad" style={{ flexShrink:0, transition:"transform .15s", transform: open?"rotate(180deg)":"none" }} />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, left:0, background:"#fff", border:"1.5px solid #e5eaf0", borderRadius:12, boxShadow:"0 8px 32px rgba(7,55,102,.12)", zIndex:999, overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:"1px solid #f0f4f8" }}>
            <div style={{ position:"relative" }}>
              <Search size={13} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", color:"#8b9dad" }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                style={{ width:"100%", border:"1px solid #e5eaf0", borderRadius:8, padding:"6px 30px 6px 10px", font:"inherit", fontSize:".72rem", outline:"none", boxSizing:"border-box", background:"#f8fafc" }} />
            </div>
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            {allowCustom && q && !options.find(o => o.label === q) && (
              <button type="button" onClick={() => { onChange(q); setOpen(false); setQ(""); }}
                style={{ width:"100%", padding:"9px 14px", border:0, background:"#f0f7ff", cursor:"pointer", font:"inherit", fontSize:".72rem", color:"#073766", fontWeight:700, textAlign:"right", display:"flex", alignItems:"center", gap:8 }}>
                <Plus size={12} /> إضافة "{q}"
              </button>
            )}
            {filtered.length === 0 && !allowCustom && (
              <div style={{ padding:"14px", textAlign:"center", fontSize:".7rem", color:"#aab5c3" }}>لا توجد نتائج</div>
            )}
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                style={{ width:"100%", padding:"9px 14px", border:0, background: o.value===value?"#eff6ff":"transparent", cursor:"pointer", font:"inherit", fontSize:".72rem", color: o.value===value?"#073766":"#344d69", fontWeight: o.value===value?700:400, textAlign:"right", display:"flex", alignItems:"center", gap:8, transition:"background .1s" }}
                onMouseOver={e => { if(o.value!==value) e.currentTarget.style.background="#f8fafc"; }}
                onMouseOut={e => { if(o.value!==value) e.currentTarget.style.background="transparent"; }}>
                {o.value===value && <CheckCircle size={12} color="#073766" style={{ flexShrink:0 }} />}
                <div style={{ flex:1 }}>
                  <div>{o.label}</div>
                  {o.sub && <div style={{ fontSize:".6rem", color:"#8b9dad", marginTop:1 }}>{o.sub}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getCat(category: string) {
  return CAT_COLORS[category] || { bg: "#f8fafc", color: "#526983", dot: "#94a3b8" };
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [databaseMode, setDatabaseMode] = useState(false);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState("");
  const [formAgencyId, setFormAgencyId] = useState("");
  const [notice, setNotice] = useState("");
  const { loading } = useRoleGuard("manager");

  async function load() {
    const [svcRes, catRes] = await Promise.all([
      fetch("/api/admin/services"), fetch("/api/admin/catalog"),
    ]);
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
    setDatabaseMode(true);
  }

  useEffect(() => { void load(); }, []);

  function toast(msg: string) { setNotice(msg); setTimeout(() => setNotice(""), 2500); }

  const categories = ["الكل", ...Array.from(new Set(services.map(s => s.category)))];
  const visible = services.filter(s => {
    const mc = catFilter === "الكل" || s.category === catFilter;
    const mq = !query || s.name.includes(query) || s.agency.includes(query) || s.category.includes(query);
    return mc && mq;
  });
  const grouped = visible.reduce<Record<string, ServiceItem[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []; acc[s.category].push(s); return acc;
  }, {});

  async function saveService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const docsRaw = String(data.get("documentsText") || "").split("\n").map(s => s.trim()).filter(Boolean);
    if (!formCategory) return;
    const payload = {
      serviceId: editing?.id, name: String(data.get("name")),
      category: formCategory,
      agencyId: formAgencyId || undefined,
      defaultDurationDays: Number(data.get("durationDays")) || null,
      price: data.get("price") ? Number(data.get("price")) : null,
      requiredDocuments: docsRaw, active: editing?.active ?? true,
    };
    const res = await fetch("/api/admin/services", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) { toast("تعذر حفظ الخدمة"); return; }
    await load(); setShowForm(false); setEditing(null);
    toast(editing ? "تم تحديث الخدمة ✓" : "تمت إضافة الخدمة ✓");
  }

  async function toggleActive(service: ServiceItem) {
    if (!service.id) return;
    const res = await fetch("/api/admin/services", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ serviceId: service.id, active: !service.active }),
    });
    if (res.ok) { await load(); toast(service.active ? "تم إيقاف الخدمة" : "تم تفعيل الخدمة"); }
  }

  async function deleteService(service: ServiceItem) {
    if (!service.id || !confirm(`حذف "${service.name}" نهائياً؟`)) return;
    const res = await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
    if (res.ok) { await load(); toast("تم حذف الخدمة"); }
    else toast("تعذر الحذف");
  }

  if (loading) return <PageLoader text="جاري تحميل الخدمات..." />;

  return (
    <>
      <style>{`
        .svc-page{width:100%;padding:32px 24px 60px;direction:rtl}
        .svc-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:14px}
        .svc-head-left p{margin:0 0 3px;color:#168d80;font-size:.67rem;font-weight:900}
        .svc-head-left h1{font-size:1.6rem;margin:0 0 5px;color:#073766}
        .svc-head-left span{font-size:.72rem;color:#7f8e9f}
        .svc-head-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .svc-add-btn{height:42px;border:0;border-radius:10px;background:#073766;color:#fff;padding:0 20px;display:flex;align-items:center;font:inherit;font-size:.72rem;font-weight:800;cursor:pointer;gap:7px;transition:background .15s}
        .svc-add-btn:hover{background:#0a4a8a}
        .svc-link-btn{height:42px;border:1px solid #e5eaf0;border-radius:10px;background:#fff;color:#526983;padding:0 16px;display:flex;align-items:center;font:inherit;font-size:.72rem;font-weight:700;cursor:pointer;gap:6px;text-decoration:none;transition:all .15s}
        .svc-link-btn:hover{background:#f8fafc;color:#073766}
        .svc-stats{display:flex;gap:10px;margin-bottom:22px;flex-wrap:wrap}
        .svc-stat{background:#fff;border:1.5px solid #e5eaf0;border-radius:12px;padding:12px 18px;flex:1;min-width:110px;display:flex;flex-direction:column;gap:2px}
        .svc-stat-num{font-size:1.4rem;font-weight:900;line-height:1;color:#073766}
        .svc-stat-lbl{font-size:.58rem;color:#8b9dad;font-weight:600}
        .svc-toolbar{display:flex;gap:10px;margin-bottom:20px;align-items:center;flex-wrap:wrap}
        .svc-search{position:relative;flex:1;min-width:200px}
        .svc-search svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#8b9dad;pointer-events:none}
        .svc-search input{width:100%;height:40px;border:1.5px solid #e5eaf0;border-radius:10px;padding:0 38px 0 14px;font:inherit;font-size:.72rem;color:#344d69;background:#fff;box-sizing:border-box;outline:none}
        .svc-search input:focus{border-color:#073766}
        .svc-cats{display:flex;gap:6px;flex-wrap:wrap}
        .svc-cat-btn{padding:5px 13px;border-radius:18px;border:1.5px solid #e5eaf0;font:inherit;font-size:.63rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s;background:#fff;color:#526983}
        .svc-cat-btn.active{border-color:#073766;background:#073766;color:#fff}
        .svc-view-toggle{display:flex;border:1.5px solid #e5eaf0;border-radius:10px;overflow:hidden}
        .svc-view-btn{width:38px;height:38px;border:0;background:#fff;color:#8b9dad;cursor:pointer;display:grid;place-items:center;transition:all .15s}
        .svc-view-btn.active{background:#073766;color:#fff}
        /* GRID VIEW */
        .svc-group{margin-bottom:28px}
        .svc-group-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:1.5px solid #f0f4f8}
        .svc-group-icon{font-size:1.2rem}
        .svc-group-name{font-size:.88rem;font-weight:800;color:#0b1e36}
        .svc-group-count{font-size:.58rem;font-weight:800;padding:3px 10px;border-radius:20px;background:#f0f4f8;color:#6b829b}
        .svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(max(220px,calc((100% - 50px) / 6)),1fr));gap:10px}
        .svc-card{background:#fff;border:1.5px solid #e5eaf0;border-radius:10px;overflow:hidden;transition:all .2s;position:relative;display:flex;flex-direction:column}
        .svc-card:hover{box-shadow:0 4px 16px rgba(7,55,102,.08);transform:translateY(-1px);border-color:#c7d8f0}
        .svc-card.inactive{opacity:.6}
        .svc-card-accent{height:3px}
        .svc-card-body{padding:10px 12px 8px;flex:1}
        .svc-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:7px}
        .svc-card-name{font-size:.73rem;font-weight:800;color:#0b1e36;line-height:1.35;flex:1}
        .svc-card-price{font-size:.62rem;font-weight:900;color:#073766;background:#eff6ff;padding:2px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0}
        .svc-card-price.free{background:#f0fdf4;color:#15803d}
        .svc-card-meta{display:flex;flex-direction:column;gap:3px}
        .svc-card-meta-row{display:flex;align-items:center;gap:5px;font-size:.58rem;color:#6b829b}
        .svc-card-meta-row svg{flex-shrink:0;opacity:.7}
        .svc-card-status{font-size:.48rem;font-weight:800;padding:2px 7px;border-radius:20px;flex-shrink:0}
        .svc-card-status.on{background:#f0fdf4;color:#15803d}
        .svc-card-status.off{background:#fef2f2;color:#dc2626}
        .svc-card-footer{padding:7px 10px;background:#fafbfd;border-top:1px solid #f0f4f8;display:flex;gap:5px}
        .svc-act-btn{flex:1;height:28px;border:1px solid #e5eaf0;border-radius:7px;background:#fff;font:inherit;font-size:.58rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:all .15s;color:#526983}
        .svc-act-btn:hover{background:#f0f4f8}
        .svc-act-btn.edit:hover{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
        .svc-act-btn.toggle:hover{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
        .svc-act-btn.toggle.on:hover{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
        .svc-act-btn.del:hover{background:#fef2f2;border-color:#fecaca;color:#dc2626}
        /* TABLE VIEW */
        .svc-table-wrap{background:#fff;border:1.5px solid #e5eaf0;border-radius:14px;overflow:hidden;margin-bottom:20px}
        .svc-table-head{padding:12px 20px;background:#f8fafc;border-bottom:1px solid #e5eaf0;display:flex;align-items:center;gap:10px}
        .svc-table-head-icon{font-size:1rem}
        .svc-table-head-name{font-size:.78rem;font-weight:800;color:#0b1e36}
        .svc-table-head-count{font-size:.58rem;font-weight:800;padding:2px 8px;border-radius:20px;background:#e5ecf3;color:#526983}
        .svc-table{width:100%;border-collapse:collapse;font-size:.7rem}
        .svc-table th{padding:8px 16px;text-align:right;color:#8b9dad;font-size:.6rem;font-weight:700;border-bottom:1px solid #f0f4f8;background:#fafbfc}
        .svc-table td{padding:11px 16px;border-bottom:1px solid #f8fafc;vertical-align:middle}
        .svc-table tr:last-child td{border-bottom:0}
        .svc-table tr:hover td{background:#fafbfd}
        /* MODAL */
        .svc-backdrop{position:fixed;inset:0;background:rgba(7,55,102,.4);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)}
        .svc-modal{background:#fff;border-radius:20px;width:min(580px,100%);max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.18)}
        .svc-modal-head{padding:22px 24px 0;display:flex;align-items:flex-start;justify-content:space-between}
        .svc-modal-head h2{font-size:1rem;margin:0 0 4px;color:#073766}
        .svc-modal-head p{font-size:.65rem;color:#8b9dad;margin:0}
        .svc-modal-close{width:32px;height:32px;border:0;background:#f5f8fc;border-radius:8px;cursor:pointer;display:grid;place-items:center;color:#526983;flex-shrink:0}
        .svc-modal-close:hover{background:#e5eaf0}
        .svc-form{padding:16px 24px 24px}
        .svc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .svc-form-grid .wide{grid-column:1/-1}
        .svc-field{display:flex;flex-direction:column;gap:4px}
        .svc-field label{font-size:.63rem;font-weight:700;color:#425c76}
        .svc-field input,.svc-field select,.svc-field textarea{border:1.5px solid #e5eaf0;border-radius:9px;padding:9px 12px;font:inherit;font-size:.75rem;color:#1a2d40;background:#fff;outline:none;transition:border-color .15s;width:100%;box-sizing:border-box}
        .svc-field input:focus,.svc-field select:focus,.svc-field textarea:focus{border-color:#073766}
        .svc-field textarea{resize:vertical;min-height:90px;line-height:1.5}
        .svc-form-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid #e5ecf3}
        .svc-form-footer button{height:40px;padding:0 22px;border-radius:10px;font:inherit;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .15s}
        .svc-btn-cancel{border:1.5px solid #e5eaf0;background:#fff;color:#526983}
        .svc-btn-cancel:hover{background:#f8fafc}
        .svc-btn-save{border:0;background:#073766;color:#fff;display:flex;align-items:center;gap:6px}
        .svc-btn-save:hover{background:#0a4a8a}
        .svc-toast{position:fixed;bottom:24px;right:24px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;padding:12px 20px;border-radius:12px;font-size:.72rem;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:9999;display:flex;align-items:center;gap:8px;animation:slideUp .25s ease}
        @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:640px){.svc-form-grid{grid-template-columns:1fr}.svc-form-grid .wide{grid-column:1}}
      `}</style>

      <div className="svc-page">
        {/* Header */}
        <div className="svc-head">
          <div className="svc-head-left">
            <p>إعدادات التشغيل</p>
            <h1>الخدمات</h1>
            <span>إدارة شاملة لجميع خدمات المنصة — الأسعار والمتطلبات والتصنيفات.</span>
          </div>
          <div className="svc-head-right">
            <button className="svc-add-btn" onClick={() => { setEditing(null); setFormCategory(""); setFormAgencyId(""); setShowForm(true); }}>
              <Plus size={15} /> خدمة جديدة
            </button>
            <a href="/admin/packages" className="svc-link-btn"><LayoutGrid size={14} /> إدارة الباقات</a>
          </div>
        </div>

        {/* Stats */}
        <div className="svc-stats">
          {[
            { label: "إجمالي الخدمات", val: services.length, color: "#073766" },
            { label: "نشطة", val: services.filter(s => s.active).length, color: "#15803d" },
            { label: "متوقفة", val: services.filter(s => !s.active).length, color: "#dc2626" },
            { label: "التصنيفات", val: categories.length - 1, color: "#d97706" },
          ].map(s => (
            <div className="svc-stat" key={s.label}>
              <div className="svc-stat-num" style={{ color: s.color }}>{s.val}</div>
              <div className="svc-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="svc-toolbar">
          <div className="svc-search">
            <Search size={14} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن خدمة أو جهة..." />
          </div>
          <div className="svc-view-toggle">
            <button className={`svc-view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")} title="عرض بطاقات"><LayoutGrid size={15} /></button>
            <button className={`svc-view-btn ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode("table")} title="عرض جدول"><List size={15} /></button>
          </div>
        </div>
        <div className="svc-cats" style={{ marginBottom: 22 }}>
          {categories.map(cat => (
            <button key={cat} className={`svc-cat-btn ${catFilter === cat ? "active" : ""}`} onClick={() => setCatFilter(cat)}>
              {cat}
            </button>
          ))}
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          Object.entries(grouped).map(([cat, items]) => {
            const cs = getCat(cat);
            return (
              <div key={cat} className="svc-group">
                <div className="svc-group-header">
                  <span className="svc-group-icon"><CatIcon cat={cat} size={17} color={cs.dot} /></span>
                  <span className="svc-group-name">{cat}</span>
                  <span className="svc-group-count">{items.length} خدمة</span>
                </div>
                <div className="svc-grid">
                  {items.map(svc => (
                    <div key={svc.id ?? svc.name} className={`svc-card ${svc.active ? "" : "inactive"}`}>
                      <div className="svc-card-accent" style={{ background: cs.dot }} />
                      <div className="svc-card-body">
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6, marginBottom:6 }}>
                          <span className={`svc-card-status ${svc.active ? "on" : "off"}`}>{svc.active ? "● نشطة" : "● متوقفة"}</span>
                          {svc.price
                            ? <span className="svc-card-price">{svc.price.toLocaleString("ar-SA")} ر.س</span>
                            : <span className="svc-card-price free">استشر مجاناً</span>
                          }
                        </div>
                        <div className="svc-card-top" style={{ marginBottom:10 }}>
                          <span className="svc-card-name">{svc.name}</span>
                        </div>
                        <div className="svc-card-meta">
                          {svc.agency && <div className="svc-card-meta-row"><Building2 size={11} />{svc.agency}</div>}
                          {svc.durationDays && <div className="svc-card-meta-row"><Clock size={11} />{svc.duration}</div>}
                          {svc.documents > 0 && <div className="svc-card-meta-row"><FileText size={11} />{svc.documents} مستندات مطلوبة</div>}
                        </div>
                      </div>
                      <div className="svc-card-footer">
                        <button className="svc-act-btn edit" onClick={() => { setEditing(svc); setFormCategory(svc.category); setFormAgencyId(svc.agencyId ?? ""); setShowForm(true); }}><Pencil size={11} /> تعديل</button>
                        <button className={`svc-act-btn toggle ${svc.active ? "on" : ""}`} onClick={() => void toggleActive(svc)}>
                          <Power size={11} /> {svc.active ? "إيقاف" : "تفعيل"}
                        </button>
                        <button className="svc-act-btn del" onClick={() => void deleteService(svc)}><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="svc-table-wrap">
              <div className="svc-table-head">
                <span className="svc-table-head-icon" style={{ display:"flex", alignItems:"center" }}><CatIcon cat={cat} size={16} color="#073766" /></span>
                <span className="svc-table-head-name">{cat}</span>
                <span className="svc-table-head-count">{items.length}</span>
              </div>
              <table className="svc-table">
                <thead>
                  <tr>
                    {["الخدمة","الجهة","السعر","المدة","المستندات","الحالة",""].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(svc => (
                    <tr key={svc.id ?? svc.name}>
                      <td style={{ fontWeight: 700, color: "#0b1e36", maxWidth: 220 }}>{svc.name}</td>
                      <td style={{ color: "#6b829b", fontSize: ".65rem" }}>{svc.agency || "—"}</td>
                      <td>
                        {svc.price
                          ? <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 20, fontSize: ".6rem", fontWeight: 800 }}>{svc.price.toLocaleString("ar-SA")} ر.س</span>
                          : <span style={{ color: "#aab5c3", fontSize: ".65rem" }}>—</span>}
                      </td>
                      <td style={{ color: "#6b829b", fontSize: ".65rem" }}>{svc.duration}</td>
                      <td style={{ textAlign: "center", color: "#6b829b", fontSize: ".65rem" }}>{svc.documents}</td>
                      <td>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: ".58rem", fontWeight: 800,
                          background: svc.active ? "#f0fdf4" : "#fef2f2", color: svc.active ? "#15803d" : "#dc2626" }}>
                          {svc.active ? "نشطة" : "متوقفة"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button className="svc-act-btn edit" onClick={() => { setEditing(svc); setFormCategory(svc.category); setFormAgencyId(svc.agencyId ?? ""); setShowForm(true); }} style={{ flex: "none", padding: "0 10px" }}><Pencil size={11} /></button>
                          <button className={`svc-act-btn toggle ${svc.active ? "on" : ""}`} onClick={() => void toggleActive(svc)} style={{ flex: "none", padding: "0 10px" }}><Power size={11} /></button>
                          <button className="svc-act-btn del" onClick={() => void deleteService(svc)} style={{ flex: "none", padding: "0 10px" }}><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        {visible.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#8b9dad" }}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><SlidersHorizontal size={40} strokeWidth={1.2} color="#c7d8f0" /></div>
            <p style={{ fontWeight: 700, marginBottom: 4, color: "#526983" }}>لا توجد خدمات مطابقة</p>
            <p style={{ fontSize: ".72rem" }}>جرب تغيير التصنيف أو كلمة البحث</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="svc-backdrop" onMouseDown={() => setShowForm(false)}>
          <div className="svc-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="svc-modal-head">
              <div>
                <h2>{editing ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h2>
                <p>تُستخدم هذه البيانات عند عرض الخدمة للعميل وإنشاء الطلبات.</p>
              </div>
              <button className="svc-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="svc-form" onSubmit={saveService}>
              <input type="hidden" name="category" value={formCategory} />
              <input type="hidden" name="agencyId" value={formAgencyId} />
              <div className="svc-form-grid">
                <div className="svc-field wide">
                  <label>اسم الخدمة *</label>
                  <input name="name" defaultValue={editing?.name} required placeholder="مثال: تأسيس شركة ذات مسؤولية محدودة" />
                </div>
                <div className="svc-field">
                  <label>التصنيف *</label>
                  <CustomSelect
                    allowCustom
                    placeholder="اختر أو اكتب تصنيفاً..."
                    value={formCategory}
                    onChange={setFormCategory}
                    icon={<LayoutGrid size={13} />}
                    options={Array.from(new Set(services.map(s => s.category))).map(c => ({ value: c, label: c }))}
                  />
                  {!formCategory && <span style={{ fontSize:".6rem", color:"#ef4444" }}>التصنيف مطلوب</span>}
                </div>
                <div className="svc-field">
                  <label>الجهة الحكومية</label>
                  <CustomSelect
                    placeholder="بدون جهة"
                    value={formAgencyId}
                    onChange={setFormAgencyId}
                    icon={<Building2 size={13} />}
                    options={agencies.map(a => ({ value: a.id, label: a.name }))}
                  />
                </div>
                <div className="svc-field">
                  <label>السعر (ر.س)</label>
                  <input name="price" type="number" min="0" step="0.01" defaultValue={editing?.price ?? ""} placeholder="0" />
                </div>
                <div className="svc-field">
                  <label>المدة التقديرية (أيام)</label>
                  <input name="durationDays" type="number" min="1" max="365" defaultValue={editing?.durationDays ?? 7} />
                </div>
                <div className="svc-field wide">
                  <label>المستندات المطلوبة (سطر لكل مستند)</label>
                  <textarea name="documentsText" defaultValue={editing?.requiredDocuments?.join("\n") ?? ""}
                    placeholder={"هوية وطنية\nسجل تجاري\nعقد الإيجار"} />
                </div>
              </div>
              <div className="svc-form-footer">
                <button type="button" className="svc-btn-cancel" onClick={() => setShowForm(false)}>إلغاء</button>
                <button type="submit" className="svc-btn-save"><CheckCircle size={13} /> حفظ الخدمة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notice && <div className="svc-toast"><CheckCircle size={14} /> {notice}</div>}
    </>
  );
}
