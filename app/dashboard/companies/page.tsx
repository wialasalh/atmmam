"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2, Plus, Save, Upload, MapPin, Hash, Briefcase,
  FileText, Users, Globe, Clock, Calendar, X, Check,
  AlertCircle, ChevronDown, ExternalLink, Trash2, CheckCircle2, Phone,
  User, CheckCircle, XCircle
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
  phone: string; saudization_percentage: string;
};

// تحويل الأرقام العربية/الهندية إلى إنجليزية
function toWesternNums(val: string): string {
  return val.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632));
}

// ── Validation helpers ──────────────────────────
function validatePhone(phone: string): string | null {
  if (!phone) return null;
  if (!/^05\d{8}$/.test(phone.trim())) return "رقم الجوال يجب أن يبدأ بـ 05 ويكون 10 أرقام";
  return null;
}

function validateTaxNumber(tax: string): string | null {
  if (!tax) return null;
  if (!/^3\d{14}$/.test(tax.trim())) return "الرقم الضريبي يجب أن يكون 15 رقماً ويبدأ بـ 3";
  return null;
}

function getExpiryStatus(dateStr: string): "expired" | "soon" | "ok" | null {
  if (!dateStr) return null;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "ok";
}

function countUploadedDocs(company: Company | null): number {
  if (!company) return 0;
  const fields = ["commercial_register_doc","company_license_doc","national_id_doc","zakat_tax_doc","national_address_doc"];
  return fields.filter(f => company[f as keyof Company]).length;
}
// ─────────────────────────────────────────────────

const emptyForm: FormData = {
  name: "", city: "", tax_number: "", commercial_number: "",
  commercial_register_date: "", commercial_register_expiry: "",
  company_activity: "", company_address: "", entity_size: "",
  employee_count: "", company_scope: "", company_status: "active",
  national_id: "", unified_register_number: "", notes: "",
  phone: "", saudization_percentage: "",
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
  { value: "platinum", label: "البلاتيني" },
  { value: "high_green", label: "الأخضر العالي" },
  { value: "medium_green", label: "الأخضر المتوسط" },
  { value: "low_green", label: "الأخضر المنخفض" },
  { value: "red", label: "الأحمر" },
];

const statuses = [
  { value: "active", label: "نشطة", color: "#15803d", bg: "#f0fdf4" },
  { value: "suspended", label: "معلقة", color: "#b45309", bg: "#fef9ee" },
  { value: "struck_off", label: "مشطوبة", color: "#dc2626", bg: "#fef2f2" },
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
  const [openSection, setOpenSection] = useState<string>("basic");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selected = companies.find(c => c.id === selectedId) || null;
  const progress = calcProgress(form, selected);

  useEffect(() => { loadCompanies(); }, []);
  useEffect(() => { if (selected) { populateForm(selected); loadDocUrls(selected); } }, [selected]);


  async function loadCompanies() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { setMessage({ text: "تعذّر تحميل بيانات المنشآت، حاول مجدداً", type: "error" }); return; }
      const { data } = await res.json();
      const list: Company[] = data?.clients || [];
      setCompanies(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    } catch { setMessage({ text: "تعذّر الاتصال بالخادم", type: "error" }); }
    finally { setLoading(false); }
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
      phone: c.phone || "",
      saudization_percentage: (c as any).saudization_percentage || "",
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
    // Validate fields before save
    const errors: Record<string, string> = {};
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.phone = phoneErr;
    const taxErr = validateTaxNumber(form.tax_number);
    if (taxErr) errors.tax_number = taxErr;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage({ text: "يوجد أخطاء في البيانات — تحقق من الحقول المحددة", type: "error" });
      return;
    }
    setFieldErrors({});
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
      phone: form.phone || null,
    }).eq("id", selected.id);
    setMessage(error ? { text: "فشل الحفظ، حاول مرة أخرى", type: "error" } : { text: "تم حفظ البيانات بنجاح", type: "success" });
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
      phone: "0000000000",
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
    setMessage({ text: "تم رفع الملف بنجاح", type: "success" });
    setUploading(null);
    await loadCompanies();
    setTimeout(() => setMessage(null), 3000);
  }


  if (loading) return (
    <div className="client-dash-page">
      <div className="client-dash-empty"><p>جاري التحميل...</p></div>
    </div>
  );

  return (
    <div className="client-dash-page" dir="rtl">
      <style>{`
        .client-dash-page { font-feature-settings: "lnum" 1; }
        .client-dash-page * { font-variant-numeric: lining-nums !important; }
      `}</style>

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
          <button onClick={() => setShowAddModal(true)} className="client-dash-primary-btn" style={{ height:42, padding:"0 20px", gap:8, fontSize:".75rem", fontWeight:700, borderRadius:10, whiteSpace:"nowrap" }}>
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
              {[{ v:"company", l:"مؤسسة / شركة", icon:<Building2 size={14} /> }, { v:"person", l:"فرد", icon:<User size={14} /> }].map(t => (
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
                <input value={newCompany.tax_number} onChange={e => setNewCompany({...newCompany, tax_number:toWesternNums(e.target.value)})}
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
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <button onClick={() => setOpenSection(openSection === "basic" ? "" : "basic")}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"16px 20px", border:0, background: openSection === "basic" ? "#f8fafc" : "#fff", cursor:"pointer", borderBottom: openSection === "basic" ? "1px solid #f0f4f8" : "none", borderRadius: openSection === "basic" ? "16px 16px 0 0" : 16 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#eaf4ff", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Hash size={16} color="#0875dc" />
              </div>
              <div style={{ flex:1, textAlign:"right" }}>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>الهوية التجارية</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>السجل التجاري والبيانات الرسمية للمنشأة</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2" style={{ transform: openSection === "basic" ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === "basic" && <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={Building2} label="اسم المنشأة *" />
                  <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="الاسم التجاري الرسمي" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Hash} label="الرقم الضريبي" />
                  <input value={form.tax_number} onChange={e => { setForm({...form,tax_number:toWesternNums(e.target.value)}); setFieldErrors(prev => ({...prev, tax_number: ""})); }}
                    placeholder="15 رقماً يبدأ بـ 3" className="form-input"
                    style={{ borderColor: fieldErrors.tax_number ? "#dc2626" : undefined }} />
                  {fieldErrors.tax_number && <p style={{ margin:"4px 0 0", fontSize:".6rem", color:"#dc2626" }}>{fieldErrors.tax_number}</p>}
                </div>
                <div>
                  <FieldLabel icon={FileText} label="رقم السجل التجاري" />
                  <input value={form.commercial_number} onChange={e => setForm({...form,commercial_number:toWesternNums(e.target.value)})} placeholder="10 أرقام" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Calendar} label="تاريخ إصدار السجل" />
                  <DatePickerField value={form.commercial_register_date} onChange={v => setForm({...form,commercial_register_date:v})} placeholder="اختر تاريخ الإصدار" />
                </div>
                <div>
                  <FieldLabel icon={Clock} label="تاريخ انتهاء السجل" />
                  <DatePickerField value={form.commercial_register_expiry} onChange={v => setForm({...form,commercial_register_expiry:v})} placeholder="اختر تاريخ الانتهاء" />
                </div>
                <div>
                  <FieldLabel icon={Hash} label="رقم الهوية الوطنية" />
                  <input value={form.national_id} onChange={e => setForm({...form,national_id:toWesternNums(e.target.value)})} placeholder="10 أرقام" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Hash} label="رقم السجل الموحد" />
                  <input value={form.unified_register_number} onChange={e => setForm({...form,unified_register_number:toWesternNums(e.target.value)})} placeholder="رقم السجل الموحد" className="form-input" />
                </div>
              </div>
            </div>}
          </div>

          {/* ── Card 2: النشاط والموقع ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <button onClick={() => setOpenSection(openSection === "activity" ? "" : "activity")}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"16px 20px", border:0, background: openSection === "activity" ? "#f8fafc" : "#fff", cursor:"pointer", borderBottom: openSection === "activity" ? "1px solid #f0f4f8" : "none", borderRadius: openSection === "activity" ? "16px 16px 0 0" : 16 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#f0fdf4", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Briefcase size={16} color="#15803d" />
              </div>
              <div style={{ flex:1, textAlign:"right" }}>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>النشاط والعنوان التجاري</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>نوع النشاط والموقع الجغرافي للمنشأة</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2" style={{ transform: openSection === "activity" ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === "activity" && <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={Briefcase} label="النشاط التجاري" />
                  <input value={form.company_activity} onChange={e => setForm({...form,company_activity:e.target.value})} placeholder="مثال: تجارة الجملة والتجزئة" className="form-input" />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={MapPin} label="عنوان المنشأة" />
                  <input value={form.company_address} onChange={e => setForm({...form,company_address:e.target.value})} placeholder="المدينة - الحي - الشارع - المبنى" className="form-input" />
                </div>
                <div style={{ position:"relative" }}>
                  <FieldLabel icon={MapPin} label="المدينة" />
                  <CityDropdown value={form.city} onChange={v => setForm({...form, city:v})} />
                </div>
                <div>
                  <FieldLabel icon={Phone} label="جوال المنشأة" />
                  <input value={form.phone} onChange={e => { setForm({...form, phone:toWesternNums(e.target.value)}); setFieldErrors(prev => ({...prev, phone: ""})); }}
                    placeholder="05XXXXXXXX" className="form-input" maxLength={10}
                    style={{ borderColor: fieldErrors.phone ? "#dc2626" : undefined }} />
                  {fieldErrors.phone && <p style={{ margin:"4px 0 0", fontSize:".6rem", color:"#dc2626" }}>{fieldErrors.phone}</p>}
                </div>
                <div>
                  <FieldLabel icon={Globe} label="حالة المنشأة" />
                  <CustomDropdown
                    value={form.company_status}
                    onChange={v => setForm({...form, company_status:v})}
                    options={statuses.map(s => ({ value: s.value, label: s.label }))}
                    placeholder="اختر حالة المنشأة"
                  />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={FileText} label="ملاحظات إضافية" />
                  <textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="أي معلومات إضافية تخص المنشأة..." rows={3}
                    style={{ width:"100%", border:"1px solid #e5eaf0", borderRadius:10, padding:"10px 14px", font:"inherit", fontSize:".72rem", color:"#344d69", resize:"vertical", background:"#fafbfc", boxSizing:"border-box", lineHeight:1.6, outline:"none" }}
                    onFocus={e => e.target.style.borderColor="#0875dc"} onBlur={e => e.target.style.borderColor="#e5eaf0"} />
                </div>
              </div>
            </div>}
          </div>

          {/* ── Card 3: الموارد البشرية ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <button onClick={() => setOpenSection(openSection === "hr" ? "" : "hr")}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"16px 20px", border:0, background: openSection === "hr" ? "#f8fafc" : "#fff", cursor:"pointer", borderBottom: openSection === "hr" ? "1px solid #f0f4f8" : "none", borderRadius: openSection === "hr" ? "16px 16px 0 0" : 16 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#fef9ee", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Users size={16} color="#b45309" />
              </div>
              <div style={{ flex:1, textAlign:"right" }}>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>التصنيف والقوى العاملة</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>حجم المنشأة ونطاقات وزارة الموارد البشرية</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2" style={{ transform: openSection === "hr" ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === "hr" && <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <FieldLabel icon={Users} label="عدد الموظفين" />
                  <input type="number" min="0" value={form.employee_count} onChange={e => setForm({...form,employee_count:e.target.value})} placeholder="0" className="form-input" />
                </div>
                <div>
                  <FieldLabel icon={Building2} label="حجم الكيان" />
                  <CustomDropdown
                    value={form.entity_size}
                    onChange={v => setForm({...form, entity_size:v})}
                    options={entitySizes.filter(s => s.value !== "").map(s => ({ value: s.value, label: s.label }))}
                    placeholder="اختر حجم الكيان"
                  />
                </div>
                <div>
                  <FieldLabel icon={Users} label="نسبة السعودة الحالية %" />
                  <input type="number" min="0" max="100" value={form.saudization_percentage} onChange={e => setForm({...form, saudization_percentage:e.target.value})} placeholder="مثال: 35" className="form-input" />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <FieldLabel icon={Globe} label="نطاق المنشأة (نطاقات)" />
                  <CustomDropdown
                    value={form.company_scope}
                    onChange={v => setForm({...form, company_scope:v})}
                    options={scopes.filter(s => s.value !== "").map(s => ({ value: s.value, label: s.label }))}
                    placeholder="اختر نطاق المنشأة"
                  />
                </div>
              </div>
            </div>}
          </div>

          {/* ── Card 4: المستندات ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <button onClick={() => setOpenSection(openSection === "docs" ? "" : "docs")}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"16px 20px", border:0, background: openSection === "docs" ? "#f8fafc" : "#fff", cursor:"pointer", borderBottom: openSection === "docs" ? "1px solid #f0f4f8" : "none", borderRadius: openSection === "docs" ? "16px 16px 0 0" : 16 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#f5f3ff", display:"grid", placeItems:"center", flexShrink:0 }}>
                <FileText size={16} color="#7c3aed" />
              </div>
              <div style={{ flex:1, textAlign:"right" }}>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>الوثائق والمستندات الرسمية</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>
                  ارفع مستندات منشأتك لتكتمل خدماتك
                  <span style={{ marginRight:8, background: countUploadedDocs(selected) === 5 ? "#f0fdf4" : "#fef9ee", color: countUploadedDocs(selected) === 5 ? "#15803d" : "#b45309", padding:"1px 8px", borderRadius:10, fontWeight:700 }}>
                    {countUploadedDocs(selected)}/5 مرفوعة
                  </span>
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2" style={{ transform: openSection === "docs" ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === "docs" && <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:10 }}>
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
                        {current && <span style={{ fontSize:".55rem", color:"#15803d", background:"#dcfce7", padding:"1px 6px", borderRadius:8, fontWeight:700, display:"inline-flex", alignItems:"center", gap:3 }}><CheckCircle size={11} /> مرفوع</span>}
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
                        <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.xls,.pptx,.ppt,.txt"
                          onChange={e => e.target.files?.[0] && handleUpload(field, e.target.files[0])}
                          disabled={isUploading} />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>}
          </div>

          {/* ── Card 5: الموظفون والممثلون ── */}
          <div style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:16, marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <button onClick={() => setOpenSection(openSection === "employees" ? "" : "employees")}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"16px 20px", border:0, background: openSection === "employees" ? "#f8fafc" : "#fff", cursor:"pointer", borderBottom: openSection === "employees" ? "1px solid #f0f4f8" : "none", borderRadius: openSection === "employees" ? "16px 16px 0 0" : 16 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"#eff6ff", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Users size={16} color="#2563eb" />
              </div>
              <div style={{ flex:1, textAlign:"right" }}>
                <h3 style={{ margin:0, fontSize:".8rem", color:"#073766", fontWeight:800 }}>الموظفون والممثلون</h3>
                <p style={{ margin:0, fontSize:".6rem", color:"#8b9dad" }}>إدارة ممثلي المنشأة وموظفيها المعتمدين</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2" style={{ transform: openSection === "employees" ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openSection === "employees" && <EmployeesSection clientId={selected.id} maxEmployees={selected.employee_count || 0} />}
          </div>

          {/* ── Invitations ── */}
          <div style={{ background:"#fff", border:"1px solid #e8edf3", borderRadius:16, overflow:"hidden" }}>
            <button onClick={() => setOpenSection(openSection === "invitations" ? "" : "invitations")}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"16px 20px", border:0, background: openSection === "invitations" ? "#f8fafc" : "#fff", cursor:"pointer", borderBottom: openSection === "invitations" ? "1px solid #f0f4f8" : "none", borderRadius: openSection === "invitations" ? "16px 16px 0 0" : 16 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"#f0f7ff", display:"grid", placeItems:"center", flexShrink:0 }}>
                <Users size={18} color="#0875dc" />
              </div>
              <div style={{ flex:1, textAlign:"right" }}>
                <div style={{ fontSize:".78rem", fontWeight:800, color:"#0b1e36" }}>دعوة موظف / ممثل</div>
                <div style={{ fontSize:".65rem", color:"#9aafbf", marginTop:2 }}>أرسل رابط دعوة لمنح وصول محدود</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2" style={{ transform: openSection === "invitations" ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {openSection === "invitations" && <InvitationsSection clientId={selected.id} />}
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

// ── Invitations Section ─────────────────────────────────────────────────
function InvitationsSection({ clientId }: { clientId: string }) {
  const [invitations, setInvitations] = useState<{id:string;email:string;full_name:string|null;status:string;token:string;expires_at:string}[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{type:"success"|"error";text:string}|null>(null);
  const [copiedToken, setCopiedToken] = useState<string|null>(null);

  async function load() {
    const res = await fetch(`/api/client/invitations?client_id=${clientId}`);
    if (res.ok) { const { data } = await res.json(); setInvitations(data || []); }
  }
  useEffect(() => { load(); }, [clientId]);

  async function sendInvite() {
    if (!email.trim()) return;
    setSending(true); setMsg(null);
    const res = await fetch("/api/client/invitations", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ client_id: clientId, email: email.trim(), full_name: fullName.trim()||null }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg({type:"error", text: json.error || "فشل الإرسال"}); }
    else {
      setMsg({type:"success", text:"تم إرسال الدعوة بنجاح"});
      setEmail(""); setFullName(""); load();
    }
    setSending(false);
  }

  async function cancelInvite(id: string) {
    await fetch("/api/client/invitations", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    load();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/register?invitation=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const statusLabel: Record<string,{label:string;color:string;bg:string}> = {
    pending:  { label:"بانتظار القبول", color:"#b45309", bg:"#fef9ec" },
    accepted: { label:"مقبولة",         color:"#15803d", bg:"#f0fdf4" },
    expired:  { label:"منتهية",         color:"#9aafbf", bg:"#f8fafc" },
  };

  return (
    <div style={{ padding:"20px" }}>
      {/* Form */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10, marginBottom:16 }}>
        <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="الاسم (اختياري)"
          style={{ height:40, border:"1px solid #dfe7ef", borderRadius:10, padding:"0 12px", font:"inherit", fontSize:".75rem", outline:"none" }} />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني"
          style={{ height:40, border:"1px solid #dfe7ef", borderRadius:10, padding:"0 12px", font:"inherit", fontSize:".75rem", outline:"none", direction:"ltr" }} />
        <button onClick={sendInvite} disabled={sending||!email.trim()}
          style={{ height:40, padding:"0 18px", background:"#0875dc", color:"#fff", border:0, borderRadius:10, fontSize:".75rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", opacity:sending||!email.trim()?0.6:1 }}>
          {sending ? "جاري الإرسال..." : "إرسال دعوة"}
        </button>
      </div>

      {msg && (
        <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:14, fontSize:".73rem", fontWeight:600,
          background: msg.type==="success"?"#f0fdf4":"#fef2f2", color: msg.type==="success"?"#15803d":"#dc2626", border:`1px solid ${msg.type==="success"?"#86efac":"#fca5a5"}` }}>
          {msg.text}
        </div>
      )}

      {/* List */}
      {invitations.length === 0 ? (
        <div style={{ textAlign:"center", color:"#9aafbf", fontSize:".73rem", padding:"20px 0" }}>لا توجد دعوات بعد</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {invitations.map(inv => {
            const s = statusLabel[inv.status] || statusLabel.expired;
            return (
              <div key={inv.id} style={{ background:"#f8fafc", borderRadius:10, border:"1px solid #e8edf3", overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:".75rem", fontWeight:700, color:"#0b1e36" }}>{inv.full_name || inv.email}</div>
                  <div style={{ fontSize:".65rem", color:"#9aafbf", direction:"ltr", textAlign:"right" }}>{inv.email}</div>
                </div>
                <span style={{ fontSize:".65rem", fontWeight:700, padding:"2px 8px", borderRadius:6, background:s.bg, color:s.color, border:`1px solid ${s.color}33`, whiteSpace:"nowrap" }}>
                  {s.label}
                </span>
                {inv.status === "pending" && (
                  <>
                    <button onClick={() => copyLink(inv.token)}
                      style={{ display:"flex", alignItems:"center", gap:5, height:28, padding:"0 10px", border:"1px solid #bfdbfe", borderRadius:7, background:"#eff6ff", color:"#1d4ed8", fontSize:".65rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      {copiedToken===inv.token ? <><Check size={12}/> تم النسخ</> : <><ExternalLink size={12}/> نسخ الرابط</>}
                    </button>
                    <button onClick={() => cancelInvite(inv.id)}
                      style={{ width:28, height:28, border:"1px solid #fca5a5", borderRadius:7, background:"#fef2f2", cursor:"pointer", display:"grid", placeItems:"center" }}>
                      <X size={12} color="#dc2626"/>
                    </button>
                  </>
                )}
                </div>
                {inv.status === "pending" && (
                  <div style={{ padding:"8px 14px", borderTop:"1px solid #e8edf3", background:"#fff", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:".6rem", color:"#9aafbf", flexShrink:0 }}>رمز الدعوة:</span>
                    <code style={{ flex:1, fontSize:".62rem", color:"#1d4ed8", fontFamily:"monospace", letterSpacing:".03em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {`${typeof window!=="undefined"?window.location.origin:""}/register?invitation=${inv.token}`}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Employees Section ───────────────────────────────────────────────────

type Employee = {
  id: string;
  client_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  national_id: string | null;
  is_active: boolean;
  created_at: string;
};

function EmployeesSection({ clientId, maxEmployees }: { clientId: string; maxEmployees: number }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", position: "", national_id: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { loadEmployees(); }, [clientId]);

  async function loadEmployees() {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/employees?client_id=${clientId}`);
      if (res.ok) { const d = await res.json(); setEmployees(d.data || []); }
    } catch { /* network error */ } finally { setLoading(false); }
  }

  function openNewForm() {
    setEditing(null);
    setForm({ full_name: "", phone: "", email: "", position: "", national_id: "" });
    setShowForm(true);
  }

  function openEditForm(emp: Employee) {
    setEditing(emp);
    setForm({
      full_name: emp.full_name,
      phone: emp.phone || "",
      email: emp.email || "",
      position: emp.position || "",
      national_id: emp.national_id || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { setMsg("الاسم مطلوب"); return; }
    setSaving(true);
    setMsg("");
    try {
      if (editing) {
        const res = await fetch("/api/client/employees", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ employeeId: editing.id, full_name: form.full_name, phone: form.phone, email: form.email, position: form.position, national_id: form.national_id }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "فشل التحديث"); }
        setMsg("success:تم التحديث بنجاح");
      } else {
        const res = await fetch("/api/client/employees", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ client_id: clientId, full_name: form.full_name, phone: form.phone, email: form.email, position: form.position, national_id: form.national_id }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "فشلت الإضافة"); }
        setMsg("success:تمت إضافة الموظف بنجاح");
      }
      setShowForm(false);
      await loadEmployees();
    } catch (err) { setMsg("error:" + (err instanceof Error ? err.message : "فشل العملية")); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف هذا الموظف؟")) return;
    try {
      const res = await fetch("/api/client/employees", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeId: id }),
      });
      if (!res.ok) return;
      await loadEmployees();
    } catch { /* network error */ }
  }

  const canAdd = maxEmployees <= 0 || employees.length < maxEmployees;

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: ".68rem", color: "#8b9dad" }}>
          {employees.length} {maxEmployees > 0 ? `/ ${maxEmployees}` : ""} موظف
        </span>
        {canAdd && (
          <button onClick={openNewForm} className="client-dash-primary-btn" style={{ height: 34, padding: "0 14px", fontSize: ".65rem", fontWeight: 700, gap: 5, borderRadius: 8 }}>
            <Plus size={13} /> إضافة موظف
          </button>
        )}
      </div>

      {msg && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:12,
          background: msg.startsWith("success") ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${msg.startsWith("success") ? "#86efac" : "#fca5a5"}`,
          color: msg.startsWith("success") ? "#15803d" : "#dc2626",
          fontSize:".72rem", fontWeight:600 }}>
          {msg.startsWith("success")
            ? <CheckCircle size={15} color="#16a34a"/>
            : <XCircle size={15} color="#dc2626"/>}
          <span>{msg.split(":")[1]}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
      ) : employees.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "#8b9dad", fontSize: ".68rem" }}>
          <Users size={28} style={{ opacity: .3, marginBottom: 8 }} />
          <p style={{ margin: 0 }}>لا يوجد موظفون مسجلون</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {employees.map((emp) => (
            <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, border: "1px solid #e5eaf0", background: emp.is_active ? "#fff" : "#f9fafb" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#eaf4ff", display: "grid", placeItems: "center", flexShrink: 0, fontWeight: 800, color: "#0875dc", fontSize: ".75rem" }}>
                {emp.full_name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56" }}>
                  {emp.full_name}
                  {!emp.is_active && <span style={{ fontSize: ".55rem", color: "#8b9dad", marginRight: 6 }}>(غير نشط)</span>}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                  {emp.position && <span style={{ fontSize: ".6rem", color: "#0875dc", background: "#eaf4ff", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>{emp.position}</span>}
                  {emp.phone && <span style={{ fontSize: ".6rem", color: "#64748b" }}>{emp.phone}</span>}
                  {emp.email && <span style={{ fontSize: ".6rem", color: "#64748b" }}>{emp.email}</span>}
                </div>
              </div>
              <button onClick={() => openEditForm(emp)} style={{ width: 28, height: 28, border: "1px solid #e5eaf0", borderRadius: 6, background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "#526983", transition: "all .15s", flexShrink: 0 }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = "#0875dc"; (e.currentTarget as HTMLElement).style.color = "#0875dc"; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5eaf0"; (e.currentTarget as HTMLElement).style.color = "#526983"; }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={() => handleDelete(emp.id)} style={{ width: 28, height: 28, border: "1px solid #e5eaf0", borderRadius: 6, background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", color: "#aab5c3", transition: "all .15s", flexShrink: 0 }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = "#fecaca"; (e.currentTarget as HTMLElement).style.background = "#fef2f2"; (e.currentTarget as HTMLElement).style.color = "#dc2626"; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5eaf0"; (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#aab5c3"; }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "min(420px,100%)", boxShadow: "0 12px 40px rgba(0,0,0,.15)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: ".9rem", color: "#073766", fontWeight: 800 }}>
                {editing ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ border: 0, background: "#f5f8fc", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center", color: "#526983" }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>الاسم الكامل *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required
                  style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", boxSizing: "border-box", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#0875dc"} onBlur={e => e.target.style.borderColor = "#dfe7ef"} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>المسمى الوظيفي</label>
                <input value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="مثال: مدير مالي"
                  style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", boxSizing: "border-box", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#0875dc"} onBlur={e => e.target.style.borderColor = "#dfe7ef"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>رقم الجوال</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: toWesternNums(e.target.value)})} placeholder="05XXXXXXXX"
                    style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", boxSizing: "border-box", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = "#0875dc"} onBlur={e => e.target.style.borderColor = "#dfe7ef"} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>البريد الإلكتروني</label>
                  <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com"
                    style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", boxSizing: "border-box", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = "#0875dc"} onBlur={e => e.target.style.borderColor = "#dfe7ef"} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: ".63rem", fontWeight: 700, color: "#425c76", marginBottom: 5 }}>رقم الهوية</label>
                <input value={form.national_id} onChange={e => setForm({...form, national_id: toWesternNums(e.target.value)})} placeholder="10 أرقام"
                  style={{ width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", boxSizing: "border-box", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#0875dc"} onBlur={e => e.target.style.borderColor = "#dfe7ef"} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={saving} className="client-dash-primary-btn" style={{ flex: 1, height: 42 }}>
                  {saving ? "جاري الحفظ..." : editing ? "حفظ التغييرات" : "إضافة الموظف"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="client-dash-secondary-btn" style={{ height: 42, padding: "0 16px" }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function DatePickerField({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.split("-")[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split("-")[1]) - 1 : today.getMonth());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const DAYS_AR = ["ح","ن","ث","ر","خ","ج","س"];

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }
  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function handleSelect(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  }

  function formatDisplay(val: string) {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length !== 3) return val;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const selectedDay = value ? parseInt(value.split("-")[2]) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1]) - 1 : null;
  const selectedYear = value ? parseInt(value.split("-")[0]) : null;

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div onClick={() => setOpen(!open)} className="form-input"
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", userSelect:"none" }}>
        <span style={{ color: value ? "#2a4a6a" : "#b0bcc9", fontSize:".72rem" }}>
          {value ? formatDisplay(value) : placeholder || "اختر التاريخ"}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:9999, background:"#fff", border:"1px solid #dfe7ef", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,.12)", padding:14, minWidth:260 }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <button type="button" onClick={() => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); }}
              style={{ border:0, background:"#f5f8fc", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:".8rem" }}>›</button>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <select value={viewMonth} onChange={e => setViewMonth(parseInt(e.target.value))}
                style={{ border:"1px solid #e5eaf0", borderRadius:6, padding:"2px 6px", font:"inherit", fontSize:".68rem", background:"#fff" }}>
                {MONTHS_AR.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <input type="number" value={viewYear} onChange={e => setViewYear(parseInt(e.target.value) || viewYear)}
                style={{ border:"1px solid #e5eaf0", borderRadius:6, padding:"2px 6px", width:60, font:"inherit", fontSize:".68rem", textAlign:"center" }} />
            </div>
            <button type="button" onClick={() => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); }}
              style={{ border:0, background:"#f5f8fc", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:".8rem" }}>‹</button>
          </div>
          {/* Days header */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {DAYS_AR.map(d => <div key={d} style={{ textAlign:"center", fontSize:".6rem", color:"#8b9dad", fontWeight:700, padding:"2px 0" }}>{d}</div>)}
          </div>
          {/* Days grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {Array.from({length: firstDay}).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({length: daysInMonth}).map((_,i) => {
              const day = i + 1;
              const isSelected = selectedDay === day && selectedMonth === viewMonth && selectedYear === viewYear;
              const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
              return (
                <button key={day} type="button" onClick={() => handleSelect(day)}
                  style={{ border:0, borderRadius:6, padding:"4px 0", fontSize:".68rem", cursor:"pointer", fontWeight: isSelected ? 700 : 400,
                    background: isSelected ? "#0875dc" : isToday ? "#eaf4ff" : "transparent",
                    color: isSelected ? "#fff" : isToday ? "#0875dc" : "#344d69" }}>
                  {day}
                </button>
              );
            })}
          </div>
          {/* Clear */}
          {value && (
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              style={{ width:"100%", marginTop:8, border:"1px solid #e5eaf0", borderRadius:8, padding:"5px 0", font:"inherit", fontSize:".65rem", color:"#8b9dad", cursor:"pointer", background:"#fafbfc" }}>
              مسح التاريخ
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function CustomDropdown({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div onClick={() => setOpen(!open)} className="form-input"
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", userSelect:"none" }}>
        <span style={{ color: value ? "#2a4a6a" : "#b0bcc9", fontSize:".72rem" }}>
          {selected?.label || placeholder}
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", right:0, left:0,
          zIndex:9999, background:"#fff", border:"1px solid #dfe7ef",
          borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,.12)", overflow:"hidden"
        }}>
          <div style={{ maxHeight:220, overflowY:"auto", background:"#fff" }}>
            <div onClick={() => { onChange(""); setOpen(false); }}
              style={{ padding:"8px 14px", fontSize:".7rem", cursor:"pointer", color:"#8b9dad", borderBottom:"1px solid #f5f5f5" }}>
              اختر...
            </div>
            {options.map(o => (
              <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  padding:"8px 14px", fontSize:".7rem", cursor:"pointer",
                  background: value === o.value ? "#eaf4ff" : "#fff",
                  color: value === o.value ? "#0875dc" : "#2a4a6a",
                  fontWeight: value === o.value ? 700 : 400,
                }}>
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function CityDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query ? saudiCities.filter(c => c.includes(query)) : saudiCities;

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <div onClick={() => setOpen(!open)} className="form-input"
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", userSelect:"none" }}>
        <span style={{ color: value ? "#2a4a6a" : "#b0bcc9", fontSize:".72rem" }}>{value || "اختر المدينة"}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b9dad" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", right:0, left:0,
          zIndex:9999, background:"#fff", border:"1px solid #dfe7ef",
          borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,.12)", overflow:"hidden"
        }}>
          <div style={{ padding:"8px 10px", borderBottom:"1px solid #eef2f7", background:"#fff" }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن مدينة..."
              style={{ width:"100%", border:0, outline:0, font:"inherit", fontSize:".7rem", color:"#2a4a6a", background:"transparent" }} />
          </div>
          <div style={{ maxHeight:220, overflowY:"auto", background:"#fff" }}>
            <div onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              style={{ padding:"8px 14px", fontSize:".7rem", cursor:"pointer", color:"#8b9dad", borderBottom:"1px solid #f5f5f5" }}>
              الكل
            </div>
            {filtered.map(c => (
              <div key={c} onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                style={{
                  padding:"8px 14px", fontSize:".7rem", cursor:"pointer",
                  background: value === c ? "#eaf4ff" : "#fff",
                  color: value === c ? "#0875dc" : "#2a4a6a",
                  fontWeight: value === c ? 700 : 400,
                }}>
                {c}
              </div>
            ))}
          </div>
        </div>
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
