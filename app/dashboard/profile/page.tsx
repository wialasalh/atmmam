"use client";

import { useEffect, useState } from "react";
import { User, Save, Building2, Hash, MapPin, Briefcase, FileText, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ClientData = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  client: {
    id: string;
    name: string;
    client_type: string;
    commercial_number: string | null;
    national_id: string | null;
    unified_register_number: string | null;
    company_address: string | null;
    company_activity: string | null;
    commercial_register_doc: string | null;
    company_license_doc: string | null;
    national_id_doc: string | null;
    notes: string | null;
  } | null;
};

export default function ProfilePage() {
  const [data, setData] = useState<ClientData | null>(null);
  const [form, setForm] = useState({
    fullName: "", phone: "",
    commercialNumber: "", nationalId: "", unifiedRegister: "",
    companyAddress: "", companyActivity: "", notes: "",
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const { data: d } = await res.json();
        setData(d);
        setEmail(d.email || "");
        setForm({
          fullName: d.full_name || "",
          phone: d.phone || "",
          commercialNumber: d.client?.commercial_number || "",
          nationalId: d.client?.national_id || "",
          unifiedRegister: d.client?.unified_register_number || "",
          companyAddress: d.client?.company_address || "",
          companyActivity: d.client?.company_activity || "",
          notes: d.client?.notes || "",
        });
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");

    const supabase = createSupabaseBrowserClient();
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: form.fullName, phone: form.phone })
      .eq("id", data!.id);

    if (profileErr) { setMsg("فشل حفظ البيانات الشخصية"); setSaving(false); return; }

    if (data?.client?.id) {
      const { error: clientErr } = await supabase
        .from("clients")
        .update({
          commercial_number: form.commercialNumber || null,
          national_id: form.nationalId || null,
          unified_register_number: form.unifiedRegister || null,
          company_address: form.companyAddress || null,
          company_activity: form.companyActivity || null,
          notes: form.notes || null,
        })
        .eq("id", data.client.id);

      if (clientErr) { setMsg("فشل حفظ بيانات العميل"); setSaving(false); return; }
    }

    setMsg("تم حفظ التغييرات بنجاح");
    setSaving(false);
  }

  async function handleUpload(field: string, file: File) {
    if (!data?.client?.id) return;
    setUploading(true);
    const supabase = createSupabaseBrowserClient();
    const path = `${data.id}/${field}-${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("client-documents")
      .upload(path, file);
    if (uploadErr) { setMsg("فشل رفع الملف"); setUploading(false); return; }

    await supabase.from("clients").update({ [field]: path }).eq("id", data.client.id);
    setMsg("تم رفع الملف بنجاح");
    setUploading(false);
  }

  if (loading) return <div className="client-dash-page"><p>جاري التحميل...</p></div>;

  return (
    <div className="client-dash-page">
      <h2 className="client-dash-page-title">الملف الشخصي</h2>
      <p className="client-dash-page-desc">أكمل بياناتك لنتمكن من خدمتك بشكل أفضل.</p>

      <div className="client-dash-card">
        <form onSubmit={handleSave}>
          <h3 style={{ fontSize: ".8rem", color: "#2a4a6a", margin: "0 0 16px" }}>المعلومات الأساسية</h3>
          <div className="client-auth-row">
            <label>
              <span>الاسم الكامل</span>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </label>
            <label>
              <span>البريد الإلكتروني</span>
              <input value={email} disabled style={{ background: "#f8fafc", cursor: "not-allowed" }} />
            </label>
          </div>
          <label>
            <span>رقم الجوال</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>

          <h3 style={{ fontSize: ".8rem", color: "#2a4a6a", margin: "24px 0 16px" }}>البيانات الرسمية</h3>
          <div className="client-auth-row">
            <label>
              <span>رقم الهوية</span>
              <input value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} placeholder="رقم الهوية الوطنية" />
            </label>
            <label>
              <span>الرقم الموحد للسجل التجاري</span>
              <input value={form.unifiedRegister} onChange={(e) => setForm({ ...form, unifiedRegister: e.target.value })} placeholder="الرقم الموحد" />
            </label>
          </div>
          <label>
            <span>رقم السجل التجاري</span>
            <input value={form.commercialNumber} onChange={(e) => setForm({ ...form, commercialNumber: e.target.value })} placeholder="رقم السجل التجاري" />
          </label>
          <label>
            <span>عنوان المنشأة</span>
            <input value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} placeholder="المدينة - الشارع - المبنى" />
          </label>
          <label>
            <span>نشاط المنشأة</span>
            <input value={form.companyActivity} onChange={(e) => setForm({ ...form, companyActivity: e.target.value })} placeholder="مثال: تجارة الجملة والتجزئة" />
          </label>
          <label>
            <span>ملاحظات</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ width: "100%", border: "1px solid #dfe7ef", borderRadius: 10, padding: 10, font: "inherit", fontSize: ".75rem", resize: "vertical" }} />
          </label>

          {data?.client?.id && (
            <>
              <h3 style={{ fontSize: ".8rem", color: "#2a4a6a", margin: "24px 0 16px" }}>المستندات الرسمية</h3>
              <div className="client-auth-row">
                <DocUpload label="السجل التجاري" field="commercial_register_doc" current={data.client.commercial_register_doc} onUpload={(f) => handleUpload("commercial_register_doc", f)} uploading={uploading} />
                <DocUpload label="رخصة المنشأة" field="company_license_doc" current={data.client.company_license_doc} onUpload={(f) => handleUpload("company_license_doc", f)} uploading={uploading} />
              </div>
              <div className="client-auth-row">
                <DocUpload label="صورة الهوية" field="national_id_doc" current={data.client.national_id_doc} onUpload={(f) => handleUpload("national_id_doc", f)} uploading={uploading} />
              </div>
            </>
          )}

          {msg && <output className="client-auth-msg" style={{ color: msg.includes("فشل") ? "#dc2626" : "#16a34a" }}>{msg}</output>}
          <button type="submit" className="client-dash-primary-btn" disabled={saving} style={{ marginTop: 16 }}>
            <Save size={15} /> {saving ? "جاري..." : "حفظ التغييرات"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DocUpload({ label, field, current, onUpload, uploading }: {
  label: string; field: string; current: string | null; onUpload: (file: File) => void; uploading: boolean;
}) {
  return (
    <div style={{ background: "#f8fafc", border: "1px dashed #dfe7ef", borderRadius: 10, padding: 14 }}>
      <strong style={{ display: "block", fontSize: ".65rem", color: "#425c76", marginBottom: 8 }}>{label}</strong>
      {current && <p style={{ fontSize: ".6rem", color: "#16a34a", margin: "0 0 8px" }}>✓ تم الرفع</p>}
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".65rem", color: "#0875dc", cursor: "pointer" }}>
        <Upload size={14} />
        <span>{uploading ? "جاري الرفع..." : "اختيار ملف"}</span>
        <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} disabled={uploading} />
      </label>
    </div>
  );
}
