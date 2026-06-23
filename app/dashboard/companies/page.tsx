"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2, Plus, Check, ChevronDown, Save, Upload,
  MapPin, Hash, Briefcase, FileText, Users, Globe, 
  Clock, Calendar, X, Pencil, AlertCircle, Search
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

type Company = {
  id: string;
  name: string;
  client_type: string;
  phone?: string;
  email?: string;
  commercial_number?: string | null;
  national_id?: string | null;
  unified_register_number?: string | null;
  company_address?: string | null;
  company_activity?: string | null;
  notes?: string | null;
  city?: string | null;
  tax_number?: string | null;
  commercial_register_date?: string | null;
  commercial_register_expiry?: string | null;
  entity_size?: string | null;
  employee_count?: number | null;
  company_scope?: string | null;
  company_status?: string | null;
  commercial_register_doc?: string | null;
  company_license_doc?: string | null;
  national_id_doc?: string | null;
  zakat_tax_doc?: string | null;
  national_address_doc?: string | null;
  extra_docs?: { name: string; path: string }[];
  created_at: string;
};

type FormData = {
  name: string;
  city: string;
  tax_number: string;
  commercial_number: string;
  commercial_register_date: string;
  commercial_register_expiry: string;
  company_activity: string;
  company_address: string;
  entity_size: string;
  employee_count: string;
  company_scope: string;
  company_status: string;
  national_id: string;
  unified_register_number: string;
  notes: string;
};

const emptyForm: FormData = {
  name: "", city: "", tax_number: "", commercial_number: "",
  commercial_register_date: "", commercial_register_expiry: "",
  company_activity: "", company_address: "",
  entity_size: "", employee_count: "", company_scope: "", company_status: "active",
  national_id: "", unified_register_number: "", notes: "",
};

const entitySizes = [
  { value: "", label: "اختر" },
  { value: "micro", label: "متناهي الصغر" },
  { value: "small", label: "صغير" },
  { value: "medium", label: "متوسط" },
  { value: "large", label: "كبير" },
];

const scopes = [
  { value: "", label: "اختر" },
  { value: "platinum", label: "البلاتيني" },
  { value: "high_green", label: "الأخضر العالي" },
  { value: "medium_green", label: "الأخضر المتوسط" },
  { value: "low_green", label: "الأخضر المنخفض" },
  { value: "red", label: "الأحمر" },
];

const statuses = [
  { value: "active", label: "نشطة" },
  { value: "suspended", label: "معلقة" },
  { value: "struck_off", label: "مشطوبة" },
];

const saudiCities = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة",
  "الدمام", "الخبر", "الظهران", "الأحساء", "القطيف",
  "بريدة", "عنيزة", "الرس", "حائل", "تبوك",
  "أبها", "خميس مشيط", "نجران", "جازان", "الباحة",
  "سكاكا", "عرعر", "الخفجي", "ينبع", "رابغ",
  "القنفذة", "المخواة", "بيشة", "وادي الدواسر",
  "الدوادمي", "المجمعة", "الزلفي", "الخرج",
  "حفر الباطن", "الطائف", "الليث", "تربة",
  "رأس تنورة", "بقيق", "النعيرية", "قرية العليا",
  "طريف", "الكويت", "رفحاء", "ضباء", "أملج",
  "الوجه", "الحناكية", "المهد", "العلا", "خيبر",
  "بدر", "الجموم", "الكامل", "الخرمة", "رنية",
  "تثليث", "ظهران الجنوب", "سراة عبيدة", "أحد رفيدة",
  "الحرجة", "الربوعة", "شرورة", "الخرخير",
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState<{ name: string; client_type: "company" | "person" }>({ name: "", client_type: "company" });

  const selected = companies.find(c => c.id === selectedId) || null;

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selected) populateForm(selected);
  }, [selected]);

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
      name: c.name || "",
      city: c.city || "",
      tax_number: c.tax_number || "",
      commercial_number: c.commercial_number || "",
      commercial_register_date: c.commercial_register_date || "",
      commercial_register_expiry: c.commercial_register_expiry || "",
      company_activity: c.company_activity || "",
      company_address: c.company_address || "",
      entity_size: c.entity_size || "",
      employee_count: c.employee_count?.toString() || "",
      company_scope: c.company_scope || "",
      company_status: c.company_status || "active",
      national_id: c.national_id || "",
      unified_register_number: c.unified_register_number || "",
      notes: c.notes || "",
    });
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("clients").update({
      name: form.name,
      city: form.city || null,
      tax_number: form.tax_number || null,
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
    if (error) { setMessage("فشل الحفظ"); } else { setMessage("تم الحفظ"); }
    setSaving(false);
  }

  async function handleAddCompany() {
    if (!newCompany.name.trim()) return;
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data, error } = await supabase.from("clients").insert({
      name: newCompany.name.trim(),
      client_type: newCompany.client_type,
      user_id: user.id,
      company_status: "active",
      notes: "منشأة مضافة من العميل",
    }).select().single();
    if (error) { setMessage(error.message); setSaving(false); return; }
    setCompanies(prev => [...prev, data as Company]);
    setSelectedId(data.id);
    setShowAddForm(false);
    setNewCompany({ name: "", client_type: "company" as const });
    setSaving(false);
  }

  async function handleUpload(field: string, file: File) {
    if (!selected) return;
    setUploading(field);
    const supabase = createSupabaseBrowserClient();
    const path = `companies/${selected.id}/${field}-${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("client-documents").upload(path, file);
    if (uploadErr) { setMessage("فشل رفع الملف"); setUploading(null); return; }
    await supabase.from("clients").update({ [field]: path }).eq("id", selected.id);
    setMessage("تم رفع الملف");
    setUploading(null);
  }

  function getProgress(): number {
    let done = 0; const total = 3;
    if (form.name && (form.commercial_number || form.city || form.tax_number)) done++;
    if (form.company_activity && form.company_address) done++;
    if (selected && (selected.commercial_register_doc || selected.national_id_doc)) done++;
    return Math.round((done / total) * 100);
  }

  const progress = getProgress();

  if (loading) return (
    <div className="client-dash-page">
      <div className="client-dash-empty"><p>جاري التحميل...</p></div>
    </div>
  );

  return (
    <div className="client-dash-page">
      {/* Header with company selector */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 8
      }}>
        <h2 className="client-dash-page-title" style={{ margin: 0 }}>بيانات المنشآت</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <select
              value={selectedId || ""}
              onChange={e => setSelectedId(e.target.value)}
              className="client-dash-select"
              style={{ minWidth: 200 }}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Building2 size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#8b9dad", pointerEvents: "none" }} />
          </div>
          <button className="client-dash-secondary-btn" onClick={() => setShowAddForm(true)}>
            <Plus size={14} /> إضافة منشأة
          </button>
        </div>
      </div>
      <p className="client-dash-page-desc">اطلع على جميع بيانات منشآتك النظامية.</p>

      {/* Add company modal */}
      {showAddForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }} onClick={() => setShowAddForm(false)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: "min(420px, 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,.12)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: ".9rem", color: "#073766" }}>إضافة منشأة جديدة</h3>
              <button onClick={() => setShowAddForm(false)} style={{ border: 0, background: "none", cursor: "pointer", color: "#8b9dad" }}><X size={18} /></button>
            </div>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>اسم المنشأة *</span>
              <input
                value={newCompany.name}
                onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="مثال: مؤسسة النهضة للتجارة"
                style={{ width: "100%", height: 44, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 20 }}>
              <span style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>نوع المنشأة</span>
              <select
                value={newCompany.client_type}
                onChange={e => setNewCompany({ ...newCompany, client_type: e.target.value as "company" | "person" })}
                style={{ width: "100%", height: 44, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", background: "#fff", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }}
              >
                <option value="company">مؤسسة / شركة</option>
                <option value="person">فرد</option>
              </select>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="client-dash-primary-btn" onClick={handleAddCompany} disabled={saving || !newCompany.name.trim()}>
                {saving ? "جاري..." : "إضافة"}
              </button>
              <button className="client-dash-secondary-btn" onClick={() => setShowAddForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {!selected && companies.length === 0 && (
        <div className="client-dash-empty" style={{ marginTop: 32 }}>
          <Building2 size={48} />
          <p>لا توجد منشآت مسجلة. أضف منشأتك الأولى.</p>
        </div>
      )}

      {selected && (
        <>
          {/* Progress bar */}
          <div style={{
            background: "#fff", border: "1px solid #e5ecf3", borderRadius: 14, padding: "20px 24px",
            marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: ".78rem", color: "#073766" }}>أكمل ملف منشأتك في 3 خطوات</strong>
              <span style={{ fontSize: ".65rem", color: "#7b8da0" }}>
                <Check size={12} style={{ display: "inline", verticalAlign: "middle", marginLeft: 4, color: "#16a34a" }} />
                {Math.round(progress / 33)}/3 مكتمل
              </span>
            </div>
            <div style={{ height: 6, background: "#e9eef3", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #0875dc, #0ea5e9)", borderRadius: 3, transition: "width .4s ease" }} />
            </div>
          </div>

          {/* Sections */}
          <CompanySection
            title="بيانات التعريف الاستراتيجية"
            icon={Hash}
            defaultOpen={true}
          >
            <FormRow label="اسم المنشأة" icon={Building2}>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم المنشأة" className="form-input" />
            </FormRow>
            <FormRow label="المدينة" icon={MapPin}>
              <CitySelect value={form.city} onChange={v => setForm({ ...form, city: v })} />
            </FormRow>
            <FormRow label="الرقم الضريبي" icon={Hash}>
              <input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} placeholder="الرقم الضريبي" className="form-input" />
            </FormRow>
            <FormRow label="الرقم التجاري" icon={FileText}>
              <input value={form.commercial_number} onChange={e => setForm({ ...form, commercial_number: e.target.value })} placeholder="رقم السجل التجاري" className="form-input" />
            </FormRow>
            <div className="client-auth-row">
              <FormRow label="تاريخ إنشاء السجل" icon={Calendar}>
                <input type="date" value={form.commercial_register_date} onChange={e => setForm({ ...form, commercial_register_date: e.target.value })} className="form-input" />
              </FormRow>
              <FormRow label="تاريخ انتهاء السجل" icon={Clock}>
                <input type="date" value={form.commercial_register_expiry} onChange={e => setForm({ ...form, commercial_register_expiry: e.target.value })} className="form-input" />
              </FormRow>
            </div>
          </CompanySection>

          <CompanySection
            title="التشغيل والموارد البشرية"
            icon={Briefcase}
            defaultOpen={false}
          >
            <FormRow label="نشاط المنشأة" icon={Briefcase}>
              <input value={form.company_activity} onChange={e => setForm({ ...form, company_activity: e.target.value })} placeholder="مثال: تجارة الجملة والتجزئة" className="form-input" />
            </FormRow>
            <FormRow label="عنوان المنشأة" icon={MapPin}>
              <input value={form.company_address} onChange={e => setForm({ ...form, company_address: e.target.value })} placeholder="المدينة - الشارع - المبنى" className="form-input" />
            </FormRow>
            <FormRow label="حجم الكيان" icon={Building2}>
              <select value={form.entity_size} onChange={e => setForm({ ...form, entity_size: e.target.value })} className="form-input">
                {entitySizes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormRow>
            <FormRow label="عدد الموظفين" icon={Users}>
              <input type="number" min="0" value={form.employee_count} onChange={e => setForm({ ...form, employee_count: e.target.value })} placeholder="0" className="form-input" />
            </FormRow>
            <FormRow label="نطاق المنشأة" icon={Globe}>
              <select value={form.company_scope} onChange={e => setForm({ ...form, company_scope: e.target.value })} className="form-input">
                {scopes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormRow>
            <FormRow label="حالة المنشأة" icon={AlertCircle}>
              <select value={form.company_status} onChange={e => setForm({ ...form, company_status: e.target.value })} className="form-input">
                {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormRow>
          </CompanySection>

          <CompanySection
            title="أهم مرفقات المنشأة"
            icon={FileText}
            defaultOpen={false}
          >
            <DocField label="وثيقة الزكاة والضريبة" field="zakat_tax_doc" current={selected.zakat_tax_doc} onUpload={f => handleUpload("zakat_tax_doc", f)} uploading={uploading === "zakat_tax_doc"} />
            <DocField label="وثيقة العنوان الوطني" field="national_address_doc" current={selected.national_address_doc} onUpload={f => handleUpload("national_address_doc", f)} uploading={uploading === "national_address_doc"} />
            <DocField label="بطاقة الهوية" field="national_id_doc" current={selected.national_id_doc} onUpload={f => handleUpload("national_id_doc", f)} uploading={uploading === "national_id_doc"} />
            <DocField label="السجل التجاري" field="commercial_register_doc" current={selected.commercial_register_doc} onUpload={f => handleUpload("commercial_register_doc", f)} uploading={uploading === "commercial_register_doc"} />
            <DocField label="رخصة المنشأة" field="company_license_doc" current={selected.company_license_doc} onUpload={f => handleUpload("company_license_doc", f)} uploading={uploading === "company_license_doc"} />
          </CompanySection>

          {/* Save button */}
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button className="client-dash-primary-btn" onClick={handleSave} disabled={saving}>
              <Save size={15} /> {saving ? "جاري..." : "حفظ التغييرات"}
            </button>
            {message && (
              <span style={{
                fontSize: ".68rem", padding: "8px 14px", borderRadius: 8,
                color: message.includes("فشل") ? "#dc2626" : "#16a34a",
                background: message.includes("فشل") ? "#fef0f0" : "#e8faf0"
              }}>{message}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CitySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query
    ? saudiCities.filter(c => c.includes(query))
    : saudiCities;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        className="form-input"
        style={{ display: "flex", alignItems: "center", cursor: "pointer", justifyContent: "space-between" }}
      >
        <span style={{ color: value ? "#2a4a6a" : "#b0bcc9", fontSize: ".72rem" }}>
          {value || "اختر المدينة"}
        </span>
        <ChevronDown size={13} style={{ color: "#8b9dad", flexShrink: 0 }} />
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1px solid #dfe7ef", borderRadius: 10,
          marginTop: 4, boxShadow: "0 8px 25px rgba(0,0,0,.1)", overflow: "hidden"
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #eef2f7" }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن مدينة..."
              style={{
                width: "100%", border: 0, outline: 0, font: "inherit",
                fontSize: ".7rem", color: "#2a4a6a", background: "transparent"
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <div
              onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              style={{
                padding: "8px 14px", fontSize: ".7rem", cursor: "pointer",
                background: !value ? "#f5f8fc" : "transparent",
                color: "#8b9dad", borderBottom: "1px solid #f0f3f7"
              }}
            >الكل</div>
            {filtered.map(c => (
              <div
                key={c}
                onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                style={{
                  padding: "8px 14px", fontSize: ".7rem", cursor: "pointer",
                  background: value === c ? "#e8f2fc" : "transparent",
                  color: value === c ? "#0875dc" : "#2a4a6a",
                  fontWeight: value === c ? 700 : 400,
                  transition: "background .1s"
                }}
                onMouseEnter={e => { if (value !== c) (e.target as HTMLElement).style.background = "#f5f8fc"; }}
                onMouseLeave={e => { if (value !== c) (e.target as HTMLElement).style.background = "transparent"; }}
              >{c}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompanySection({ title, icon: Icon, defaultOpen, children }: {
  title: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5ecf3", borderRadius: 14,
      marginBottom: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.04)"
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "14px 20px", border: 0, background: open ? "#f8fafc" : "#fff",
        cursor: "pointer", fontSize: ".78rem", fontWeight: 700, color: "#073766",
        borderBottom: open ? "1px solid #e5ecf3" : "none", transition: "all .15s"
      }}>
        <Icon size={16} />
        <span style={{ flex: 1, textAlign: "right" }}>{title}</span>
        <ChevronDown size={15} style={{ color: "#8b9dad", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && <div style={{ padding: "16px 20px" }}>{children}</div>}
    </div>
  );
}

function FormRow({ label, icon: Icon, children }: {
  label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon size={13} style={{ color: "#8b9dad" }} />
        <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#425c76" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function DocField({ label, field, current, onUpload, uploading }: {
  label: string; field: string; current: string | null | undefined; onUpload: (file: File) => void; uploading: boolean;
}) {
  const [url, setUrl] = useState("");
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (current) {
      supabase.storage.from("client-documents").createSignedUrl(current, 3600).then(({ data }) => {
        if (data) setUrl(data.signedUrl);
      });
    }
  }, [current]);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", background: "#f8fafc", borderRadius: 10,
      border: "1px dashed #dfe7ef", marginBottom: 8
    }}>
      <div>
        <span style={{ fontSize: ".7rem", fontWeight: 600, color: "#425c76", display: "block", marginBottom: 2 }}>{label}</span>
        {current ? (
          <a href={url} target="_blank" rel="noopener" style={{ fontSize: ".6rem", color: "#16a34a", textDecoration: "none" }}>
            ✓ تم الرفع
          </a>
        ) : (
          <span style={{ fontSize: ".6rem", color: "#b0bcc9" }}>لم يتم ارفاقه بعد</span>
        )}
      </div>
      <label style={{
        display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer",
        fontSize: ".6rem", color: "#0875dc", fontWeight: 600, padding: "6px 10px",
        borderRadius: 8, border: "1px solid #dfe7ef", background: "#fff"
      }}>
        <Plus size={12} /> {uploading ? "..." : "إضافة"}
        <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} disabled={uploading} />
      </label>
    </div>
  );
}
