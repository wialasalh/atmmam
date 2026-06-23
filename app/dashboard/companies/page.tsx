"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2, Plus, Save, Upload, MapPin, Hash, Briefcase,
  FileText, Users, Globe, Clock, Calendar, X, Check,
  AlertCircle, ChevronDown, ExternalLink, Trash2, CheckCircle2
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Company = {
  id: string; name: string; client_type: string; phone?: string; email?: string;
  commercial_number?: string | null; national_id?: string | null;
  unified_register_number?: string | null; company_address?: string | null;
  company_activity?: string | null; notes?: string | null; city?: string | null;
  tax_number?: string | null; commercial_register_date?: string | null;
  commercial_register_expiry?: string | null; entity_size?: string | null;
  employee_count?: number | null; company_scope?: string | null;
  company_status?: string | null; commercial_register_doc?: string | null;
  company_license_doc?: string | null; national_id_doc?: string | null;
  zakat_tax_doc?: string | null; national_address_doc?: string | null;
  extra_docs?: { name: string; path: string }[]; created_at: string;
};

type FormData = {
  name: string; city: string; tax_number: string; commercial_number: string;
  commercial_register_date: string; commercial_register_expiry: string;
  company_activity: string; company_address: string; entity_size: string;
  employee_count: string; company_scope: string; company_status: string;
  national_id: string; unified_register_number: string; notes: string;
};

const emptyForm: FormData = {
  name: "", city: "", tax_number: "", commercial_number: "",
  commercial_register_date: "", commercial_register_expiry: "",
  company_activity: "", company_address: "", entity_size: "",
  employee_count: "", company_scope: "", company_status: "active",
  national_id: "", unified_register_number: "", notes: "",
};

const entitySizes = [
  { value: "", label: "اختر حجم الكيان" },
  { value: "micro", label: "متناهي الصغر (أقل من 5 موظفين)" },
  { value: "small", label: "صغير (5 - 49 موظف)" },
  { value: "medium", label: "متوسط (50 - 249 موظف)" },
  { value: "large", label: "كبير (250+ موظف)" },
];

const scopes = [
  { value: "", label: "اختر نطاق المنشأة" },
  { value: "platinum", label: "🏆 البلاتيني" },
  { value: "high_green", label: "🟢 الأخضر العالي" },
  { value: "medium_green", label: "🟢 الأخضر المتوسط" },
  { value: "low_green", label: "🟡 الأخضر المنخفض" },
  { value: "red", label: "🔴 الأحمر" },
];

const statuses = [
  { value: "active", label: "نشطة ✓", color: "#15803d", bg: "#f0fdf4" },
  { value: "suspended", label: "معلقة ⚠", color: "#b45309", bg: "#fef9ee" },
  { value: "struck_off", label: "مشطوبة ✗", color: "#dc2626", bg: "#fef2f2" },
];

const saudiCities = [
  "الرياض","جدة","مكة المكرمة","المدينة المنورة","الدمام","الخبر","الظهران",
  "الأحساء","القطيف","بريدة","عنيزة","حائل","تبوك","أبها","خميس مشيط",
  "نجران","جازان","الباحة","سكاكا","عرعر","ينبع","الطائف","الخرج","حفر الباطن",
];

const DOC_FIELDS = [
  { field: "commercial_register_doc", label: "السجل التجاري", desc: "صورة السجل التجاري السارية", required: true },
  { field: "company_license_doc", label: "رخصة المنشأة", desc: "رخصة المنشأة من الجهة المختصة", required: true },
  { field: "national_id_doc", label: "بطاقة الهوية", desc: "هوية صاحب المنشأة", required: true },
  { field: "zakat_tax_doc", label: "شهادة الزكاة والضريبة", desc: "شهادة التسجيل في الزكاة والضريبة", required: false },
  { field: "national_address_doc", label: "وثيقة العنوان الوطني", desc: "وثيقة العنوان الوطني المعتمدة", required: false },
];

function calcProgress(form: FormData, company: Company | null): number {
  let score = 0;
  if (form.name) score += 15;
  if (form.commercial_number) score += 15;
  if (form.tax_number) score += 10;
  if (form.city) score += 5;
  if (form.company_activity) score += 10;
  if (form.company_address) score += 5;
  if (company?.commercial_register_doc) score += 15;
  if (company?.national_id_doc) score += 15;
  if (company?.company_license_doc) score += 10;
  return Math.min(score, 100);
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", tax_number: "", company_activity: "", client_type: "company" as "company" | "person" });
  const [addError, setAddError] = useState("");
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const cityRef = useRef<HTMLDivElement>(null);

  const selected = companies.find(c => c.id === selectedId) || null;
  const progress = calcProgress(form, selected);

  useEffect(() => { loadCompanies(); }, []);
  useEffect(() => { if (selected) { populateForm(selected); loadDocUrls(selected); } }, [selected]);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadCompanies() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const { data } = await res.json();
        const list: Company[] = data?.clients || [];
        setCompanies(list);
        if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      }
    } catch {} finally { setLoading(false); }
  }

  function populateForm(c: Company) {
    setForm({
      name: c.name || "", city: c.city || "", tax_number: c.tax_number || "",
      commercial_number: c.commercial_number || "",
      commercial_register_date: c.commercial_register_date || "",
      commercial_register_expiry: c.commercial_register_expiry || "",
      company_activity: c.company_activity || "", company_address: c.company_address || "",
      entity_size: c.entity_size || "", employee_count: c.employee_count?.toString() || "",
      company_scope: c.company_scope || "", company_status: c.company_status || "active",
      national_id: c.national_id || "", unified_register_number: c.unified_register_number || "",
      notes: c.notes || "",
    });
  }

  async function loadDocUrls(c: Company) {
    const supabase = createSupabaseBrowserClient();
    const urls: Record<string, string> = {};
    for (const { field } of DOC_FIELDS) {
      const path = c[field as keyof Company] as string | null;
      if (path) {
        const { data } = await supabase.storage.from("client-documents").createSignedUrl(path, 3600);
        if (data?.signedUrl) urls[field] = data.signedUrl;
      }
    }
    setDocUrls(urls);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true); setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("clients").update({
      name: form.name, city: form.city || null, tax_number: form.tax_number || null,
      commercial_number: form.commercial_number || null,
      commercial_register_date: form.commercial_register_date || null,
      commercial_register_expiry: form.commercial_register_expiry || null,
      company_activity: form.company_activity || null,
      company_address: form.company_address || null,
      entity_size: form.entity_size || null,
      employee_count: form.employee_count ? parseInt(form.employee_count) : null,
      company_scope: form.company_scope || null,
      company_status: form.company_status || "active",
      national_id: form.national_id || null,
      unified_register_number: form.unified_register_number || null,
      notes: form.notes || null,
    }).eq("id", selected.id);
    setMessage(error ? { text: "فشل الحفظ، حاول مرة أخرى", type: "error" } : { text: "✓ تم حفظ البيانات بنجاح", type: "success" });
    setSaving(false);
    if (!error) { await loadCompanies(); setTimeout(() => setMessage(null), 3000); }
  }

  async function handleAddCompany() {
    if (!newCompany.name.trim()) { setAddError("اسم المنشأة مطلوب"); return; }
    setSaving(true); setAddError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data, error } = await supabase.from("clients").insert({
      name: newCompany.name.trim(),
      tax_number: newCompany.tax_number.trim() || null,
      company_activity: newCompany.company_activity.trim() || null,
      client_type: newCompany.client_type,
      user_id: user.id,
      company_status: "active",
    }).select().single();
    if (error) { setAddError(error.message); setSaving(false); return; }
    setCompanies(prev => [...prev, data as Company]);
    setSelectedId(data.id);
    setShowAddModal(false);
    setNewCompany({ name: "", tax_number: "", company_activity: "", client_type: "company" });
    setSaving(false);
  }

  async function handleUpload(field: string, file: File) {
    if (!selected) return;
    if (file.size > 10 * 1024 * 1024) { setMessage({ text: "حجم الملف يتجاوز 10 MB", type: "error" }); return; }
    setUploading(field);
    const supabase = createSupabaseBrowserClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `companies/${selected.id}/${field}-${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage.from("client-documents").upload(path, file);
    if (uploadErr) { setMessage({ text: "فشل رفع الملف", type: "error" }); setUploading(null); return; }
    await supabase.from("clients").update({ [field]: path }).eq("id", selected.id);
    setMessage({ text: "✓ تم رفع الملف بنجاح", type: "success" });
    setUploading(null);
    await loadCompanies();
    setTimeout(() => setMessage(null), 3000);
  }

  const filteredCities = cityQuery ? saudiCities.filter(c => c.includes(cityQuery)) : saudiCities;

  if (loading) return (
    <div className="client-dash-page">
      <div className="client-dash-empty"><p>جاري التحميل...</p></div>
    </div>
  );

  return (
    <div className="client-dash-page" dir="rtl">

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:4 }}>
        <div>
          <h2 className="client-dash-page-title" style={{ margin:0 }}>بيانات المنشآت</h2>
          <p className="client-dash-page-desc" style={{ margin:"4px 0 0" }}>أدر بيانات منشآتك النظامية ومستنداتها</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* Company switcher */}
          {companies.length > 1 && (
            <select value={selectedId || ""} onChange={e => setSelectedId(e.target.value)}
              className="client-dash-select" style={{ minWidth:180, height:38 }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowAddModal(true)} className="client-dash-primary-btn" style={{ height:38, gap:6 }}>
            <Plus size={15} /> إضافة منشأة
          </button>
        </div>
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
          onClick={() => setShowAddModal(false)}>
          <div style={{ background:"#fff", borderRadius:18, padding:28, width:"min(460px,100%)", boxShadow:"0 12px 40px rgba(0,0,0,.15)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:"#eaf4ff", display:"grid", placeItems:"center" }}>
                  <Building2 size={18} color="#0875dc" />
                </div>
                <div>
                  <h3 style={{ margin:0, fontSize:".9rem", color:"#073766", fontWeight:800 }}>إضافة منشأة جديدة</h3>
                  <p style={{ margin:0, fontSize:".62rem", color:"#8b9dad" }}>أدخل البيانات الأساسية للمنشأة</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ border:0, background:"#f5f8fc", color:"#526983", cursor:"pointer", borderRadius:8, width:32, height:32, display:"grid", placeItems:"center" }}>
                <X size={16} />
              </button>
            </div>

            {/* نوع المنشأة */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {[{ v:"company", l:"مؤسسة / شركة", icon:"🏢" }, { v:"person", l:"فرد", icon:"👤" }].map(t => (
                <button key={t.v} type="button" onClick={() => setNewCompany({...newCompany, client_type: t.v as "company"|"person"})}
                  style={{ flex:1, padding:"10px 8px", border:`1.5px solid ${newCompany.client_type===t.v?"#0875dc":"#e5eaf0"}`, borderRadius:10, background:newCompany.client_type===t.v?"#eaf4ff":"#fff", cursor:"pointer", font:"inherit", fontSize:".72rem", fontWeight:700, color:newCompany.client_type===t.v?"#0875dc":"#526983" }}>
                  {t.icon} {t.l}
                </button>
              ))}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ display:"block", fontSize:".63rem", fontWeight:700, color:"#425c76", marginBottom:5 }}>اسم المنشأة *</label>
                <input value={newCompany.name} onChange={e => setNewCompany({...newCompany, name:e.target.value})}
                  placeholder="مثال: مؤسسة النهضة للتجارة"
                  style={{ width:"100%", height:42, border:"1px solid #dfe7ef", borderRadius:10, padding:"0 14px", font:"inherit", fontSize:".75rem", boxSizing:"border-box", outline:"none" }}
                  onFocus={e => e.target.style.borderColor="#0875dc"} onBlur={e => e.target.style.borderColor="#dfe7ef"} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:".63rem", fontWeight:700, color:"#425c76", marginBottom:5 }}>الرقم الضريبي</label>
                <input value={newCompany.tax_number} onChange={e => setNewCompany({...newCompany, tax_number:e.target.value})}
                  placeholder="15 رقماً"
                  style={{ width:"100%", height:42, border:"1px solid #dfe7ef", borderRadius:10, padding:"0 14px", font:"inherit", fontSize:".75rem", boxSizing:"border-box", outline:"none" }}
                  onFocus={e => e.target.style.borderColor="#0875dc"} onBlur={e => e.target.style.borderColor="#dfe7ef"} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:".63rem", fontWeight:700, color:"#425c76", marginBottom:5 }}>النشاط التجاري</label>
                <input value={newCompany.company_activity} onChange={e => setNewCompany({...newCompany, company_activity:e.target.value})}
                  placeholder="مثال: تجارة الجملة والتجزئة"
                  style={{ width:"100%", height:42, border:"1px solid #dfe7ef", borderRadius:10, padding:"0 14px", font:"inherit", fontSize:".75rem", boxSizing:"border-box", outline:"none" }}
                  onFocus={e => e.target.style.borderColor="#0875dc"} onBlur={e => e.target.style.borderColor="#dfe7ef"} />
              </div>
            </div>

            {addError && (
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"8px 12px", marginTop:12, display:"flex", alignItems:"center", gap:8 }}>
                <AlertCircle size={13} color="#dc2626" />
                <span style={{ fontSize:".65rem", color:"#dc2626" }}>{addError}</span>
              </div>
            )}

            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button onClick={handleAddCompany} disabled={saving || !newCompany.name.trim()} className="client-dash-primary-btn" style={{ flex:1, height:42 }}>
                {saving ? "جاري الإضافة..." : "إضافة المنشأة"}
              </button>
              <button onClick={() => setShowAddModal(false)} className="client-dash-secondary-btn" style={{ height:42, padding:"0 16px" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {companies.length === 0 && !loading && (
        <div className="client-dash-empty" style={{ marginTop:40 }}>
          <Building2 size={48} style={{ opacity:.3 }} />
          <p>لا توجد منشآت مسجلة</p>
          <button onClick={() => setShowAddModal(true)} className="client-dash-primary-btn"><Plus size={14} /> أضف منشأتك الأولى</button>
        </div>
      )}

      {selected && (
        <>
          {/* ── Progress Card ── */}
          <div style={{ background:"linear-gradient(135deg,#063461,#0875dc)", borderRadius:16, padding:"20px 24px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <p style={{ margin:0, fontSize:".62rem", color:"rgba(255,255,255,.7)", fontWeight:700 }}>اكتمال ملف المنشأة</p>
                <h3 style={{ margin:"2px 0 0", fontSize:"1rem", color:"#fff", fontWeight:800 }}>{selected.name}</h3>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"1.8rem", fontWeight:900, color:"#fff", lineHeight:1 }}>{progress}%</div>
                <div style={{ fontSize:".58rem", color:"rgba(255,255,255,.6)" }}>مكتمل</div>
              </div>
            </div>
            <div style={{ height:8, background:"rgba(255,255,255,.2)", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background: progress >= 80 ? "#4ade80" : progress >= 50 ? "#fbbf24" : "#f87171", borderRadius:4, transition:"width .5s ease" }} />
            </div>
            <div style={{ display:"flex", gap:16, marginTop:10 }}>
              {[
                { label:"البيانات الأساسية", done: !!(form.name && form.commercial_number) },
                { label:"بيانات النشاط", done: !!(form.company_activity && form.city) },
                { label:"المستندات الأساسية", done: !!(selected.commercial_register_doc && selected.national_id_doc) },
              ].map(item => (
                <div key={item.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:item.done?"#4ade80":"rgba(255,255,255,.3)", display:"grid", placeItems:"center" }}>
                    {item.done && <Check size={10} color="#15803d" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize:".58rem", color:item.done?"rgba(255,255,255,.9)":"rgba(255,255,255,.5)" }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Toast Message ── */}
          {message && (
            <div style={{ background:message.type==="success"?"#f0fdf4":"#fef2f2", border:`1px solid ${message.type==="success"?"#bbf7d0":"#fecaca"}`, borderRadius:10, padding:"10px 16px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
              {message.type==="success" ? <CheckCircle2 size={15} color="#15803d" /> : <AlertCircle size={15} color="#dc2626" />}
              <span style={{ fontSize:".7rem", color:message.type==="success"?"#15803d":"#dc2626", fontWeight:600 }}>{message.text}</span>
            </div>
          )}

          {/* ── Card 1: البيانات الأساسية ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f4f8", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#eaf4ff", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Hash size={16} color="#0875dc" />
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>البيانات التجارية الأساسية</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>المعلومات الرسمية للمنشأة</p>
              </div>
            </div>
            <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={Building2} label="اسم المنشأة *" />
                  <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="الاسم التجاري الرسمي" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Hash} label="الرقم الضريبي" />
                  <input value={form.tax_number} onChange={e => setForm({...form,tax_number:e.target.value})} placeholder="15 رقماً" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={FileText} label="رقم السجل التجاري" />
                  <input value={form.commercial_number} onChange={e => setForm({...form,commercial_number:e.target.value})} placeholder="10 أرقام" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Calendar} label="تاريخ إصدار السجل" />
                  <input type="date" value={form.commercial_register_date} onChange={e => setForm({...form,commercial_register_date:e.target.value})} className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Clock} label="تاريخ انتهاء السجل" />
                  <input type="date" value={form.commercial_register_expiry} onChange={e => setForm({...form,commercial_register_expiry:e.target.value})} className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Hash} label="رقم الهوية الوطنية" />
                  <input value={form.national_id} onChange={e => setForm({...form,national_id:e.target.value})} placeholder="10 أرقام" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Hash} label="رقم السجل الموحد" />
                  <input value={form.unified_register_number} onChange={e => setForm({...form,unified_register_number:e.target.value})} placeholder="رقم السجل الموحد" className="form-input" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 2: النشاط والموقع ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f4f8", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#f0fdf4", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Briefcase size={16} color="#15803d" />
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>النشاط والموقع</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>تفاصيل النشاط التجاري والعنوان</p>
              </div>
            </div>
            <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={Briefcase} label="النشاط التجاري" />
                  <input value={form.company_activity} onChange={e => setForm({...form,company_activity:e.target.value})} placeholder="مثال: تجارة الجملة والتجزئة" className="form-input" />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={MapPin} label="عنوان المنشأة" />
                  <input value={form.company_address} onChange={e => setForm({...form,company_address:e.target.value})} placeholder="المدينة - الحي - الشارع - المبنى" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={MapPin} label="المدينة" />
                  <div ref={cityRef} style={{ position:"relative" }}>
                    <div onClick={() => setCityOpen(!cityOpen)} className="form-input"
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                      <span style={{ color:form.city?"#2a4a6a":"#b0bcc9", fontSize:".72rem" }}>{form.city || "اختر المدينة"}</span>
                      <ChevronDown size={13} color="#8b9dad" />
                    </div>
                    {cityOpen && (
                      <div style={{ position:"absolute", top:"100%", right:0, left:0, zIndex:50, background:"#fff", border:"1px solid #dfe7ef", borderRadius:10, marginTop:4, boxShadow:"0 8px 24px rgba(0,0,0,.1)", overflow:"hidden" }}>
                        <div style={{ padding:"8px 10px", borderBottom:"1px solid #eef2f7" }}>
                          <input autoFocus value={cityQuery} onChange={e => setCityQuery(e.target.value)} placeholder="ابحث..."
                            style={{ width:"100%", border:0, outline:0, font:"inherit", fontSize:".7rem", color:"#2a4a6a" }} />
                        </div>
                        <div style={{ maxHeight:200, overflowY:"auto" }}>
                          {filteredCities.map(c => (
                            <div key={c} onClick={() => { setForm({...form,city:c}); setCityOpen(false); setCityQuery(""); }}
                              style={{ padding:"8px 14px", fontSize:".7rem", cursor:"pointer", background:form.city===c?"#eaf4ff":"transparent", color:form.city===c?"#0875dc":"#2a4a6a", fontWeight:form.city===c?700:400 }}>
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <FieldLabel icon={Globe} label="حالة المنشأة" />
                  <select value={form.company_status} onChange={e => setForm({...form,company_status:e.target.value})} className="form-input">
                    {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 3: الموارد البشرية ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f4f8", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#fef9ee", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Users size={16} color="#b45309" />
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>الموارد البشرية والتصنيف</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>حجم المنشأة ونطاق العمل</p>
              </div>
            </div>
            <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <FieldLabel icon={Users} label="عدد الموظفين" />
                  <input type="number" min="0" value={form.employee_count} onChange={e => setForm({...form,employee_count:e.target.value})} placeholder="0" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Building2} label="حجم الكيان" />
                  <select value={form.entity_size} onChange={e => setForm({...form,entity_size:e.target.value})} className="form-input">
                    {entitySizes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={Globe} label="نطاق المنشأة (نطاقات)" />
                  <select value={form.company_scope} onChange={e => setForm({...form,company_scope:e.target.value})} className="form-input">
                    {scopes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 4: المستندات ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:16, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f4f8", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#f5f3ff", display:"grid", placeItems:"center", flexShrink:0 }}>
                <FileText size={16} color="#7c3aed" />
              </div>
              <div>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>مستندات المنشأة</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>ارفع المستندات الرسمية لاستكمال ملف المنشأة</p>
              </div>
            </div>
            <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
              {DOC_FIELDS.map(({ field, label, desc, required }) => {
                const current = selected[field as keyof Company] as string | null;
                const url = docUrls[field];
                const isUploading = uploading === field;
                return (
                  <div key={field} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12, border:`1px solid ${current?"#bbf7d0":"#e5eaf0"}`, background:current?"#f0fdf4":"#fafbfc" }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:current?"#dcfce7":"#f0f4f8", display:"grid", placeItems:"center", flexShrink:0 }}>
                      {current ? <CheckCircle2 size={20} color="#15803d" /> : <FileText size={18} color="#8b9dad" />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:".72rem", fontWeight:700, color:current?"#15803d":"#344d69" }}>{label}</span>
                        {required && !current && <span style={{ fontSize:".55rem", color:"#dc2626", background:"#fef2f2", padding:"1px 6px", borderRadius:8, fontWeight:700 }}>مطلوب</span>}
                        {current && <span style={{ fontSize:".55rem", color:"#15803d", background:"#dcfce7", padding:"1px 6px", borderRadius:8, fontWeight:700 }}>✓ مرفوع</span>}
                      </div>
                      <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad", marginTop:2 }}>{desc}</p>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      {current && url && (
                        <a href={url} target="_blank" rel="noopener" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:".6rem", color:"#0875dc", background:"#eaf4ff", border:"1px solid #bddcff", padding:"5px 10px", borderRadius:7, textDecoration:"none", fontWeight:700 }}>
                          <ExternalLink size={11} /> عرض
                        </a>
                      )}
                      <label style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:".6rem", color:current?"#526983":"#0875dc", background:current?"#f0f4f8":"#eaf4ff", border:`1px solid ${current?"#e5eaf0":"#bddcff"}`, padding:"5px 10px", borderRadius:7, cursor:"pointer", fontWeight:700 }}>
                        <Upload size={11} /> {isUploading ? "..." : current ? "تحديث" : "رفع"}
                        <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.docx"
                          onChange={e => e.target.files?.[0] && handleUpload(field, e.target.files[0])}
                          disabled={isUploading} />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Save Button ── */}
          <button onClick={handleSave} disabled={saving} className="client-dash-primary-btn"
            style={{ width:"100%", height:48, fontSize:".8rem", gap:8 }}>
            <Save size={16} /> {saving ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
          </button>
        </>
      )}
    </div>
  );
}

function FieldLabel({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
      <Icon size={12} color="#8b9dad" />
      <span style={{ fontSize:".63rem", fontWeight:700, color:"#425c76" }}>{label}</span>
    </div>
  );
}
