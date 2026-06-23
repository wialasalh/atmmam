"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ChevronRight, AlertCircle, Building2, Globe, FileCheck, Award, Scale, Users, Calculator } from "lucide-react";
import Link from "next/link";

const SERVICES = [
  { value: "تأسيس الشركات والمنشآت", label: "تأسيس الشركات والمنشآت", icon: Building2, color: "#0875dc", desc: "مؤسسة أو شركة ذات مسؤولية محدودة" },
  { value: "إدارة المنصات الحكومية", label: "المنصات الحكومية", icon: Globe, color: "#7c3aed", desc: "قوى، مزايا، مدد، أبشر وغيرها" },
  { value: "التراخيص والتصاريح", label: "التراخيص والتصاريح", icon: FileCheck, color: "#15803d", desc: "رخص بلدية، مهنية، تشغيلية" },
  { value: "التأهيل والاعتمادات", label: "التأهيل والاعتمادات", icon: Award, color: "#b45309", desc: "اعتماد منشأة، شهادات ومتطلبات" },
  { value: "الخدمات القانونية والتوثيق", label: "القانونية والتوثيق", icon: Scale, color: "#dc2626", desc: "عقود، توثيق، وثائق رسمية" },
  { value: "الموارد البشرية وحماية الأجور", label: "الموارد البشرية", icon: Users, color: "#0891b2", desc: "قوى، حماية الأجور، نطاقات" },
  { value: "الزكاة والضريبة والاستشارات", label: "الزكاة والضريبة", icon: Calculator, color: "#7c3aed", desc: "الزكاة، ضريبة القيمة المضافة" },
  { value: "أخرى", label: "استفسار آخر", icon: ChevronRight, color: "#6b7280", desc: "موضوع غير مذكور" },
];

const PRIORITIES = [
  { value: "عادية", label: "عادية", color: "#6b7280", bg: "#f9fafb", desc: "يمكن الانتظار" },
  { value: "مرتفعة", label: "مرتفعة", color: "#ea580c", bg: "#fff7ed", desc: "مهم نسبياً" },
  { value: "عاجلة", label: "عاجلة", color: "#dc2626", bg: "#fef2f2", desc: "يحتاج اهتماماً فورياً" },
];

const EXTRA_FIELDS: Record<string, { label: string; placeholder: string; key: string }[]> = {
  "تأسيس الشركات والمنشآت": [
    { label: "نوع الكيان المطلوب", placeholder: "مؤسسة / شركة ذات مسؤولية محدودة / فرع...", key: "entity_type" },
    { label: "عدد الشركاء (إن وجد)", placeholder: "مثال: شريك واحد، شريكان...", key: "partners" },
  ],
  "إدارة المنصات الحكومية": [
    { label: "المنصة أو الجهة المعنية", placeholder: "مثال: قوى، مزايا، أبشر للأعمال...", key: "platform" },
    { label: "المشكلة أو الطلب المحدد", placeholder: "ما الذي تحتاج مساعدة فيه؟", key: "issue" },
  ],
  "التراخيص والتصاريح": [
    { label: "نوع الترخيص المطلوب", placeholder: "مثال: رخصة بلدية، ترخيص صحي...", key: "license_type" },
    { label: "النشاط التجاري", placeholder: "وصف نشاط المنشأة", key: "activity" },
  ],
  "الخدمات القانونية والتوثيق": [
    { label: "نوع الوثيقة أو الخدمة", placeholder: "مثال: عقد شراكة، توثيق عقد...", key: "doc_type" },
    { label: "رقم الطلب المرجعي (إن وجد)", placeholder: "مثال: ORD-2024-001", key: "order_ref" },
  ],
  "الموارد البشرية وحماية الأجور": [
    { label: "الموضوع المحدد", placeholder: "مثال: تسجيل موظف، خلاف عمالي...", key: "hr_topic" },
    { label: "عدد الموظفين المعنيين", placeholder: "مثال: موظف واحد، 5 موظفين...", key: "employees" },
  ],
  "الزكاة والضريبة والاستشارات": [
    { label: "الموضوع الضريبي", placeholder: "مثال: التسجيل في ضريبة القيمة المضافة، إقرار زكوي...", key: "tax_topic" },
    { label: "الفترة الزمنية المعنية (إن وجدت)", placeholder: "مثال: الربع الأول 2024", key: "period" },
  ],
};

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("عادية");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const selectedSvc = SERVICES.find(s => s.value === category);
  const extraDefs = category ? EXTRA_FIELDS[category] || [] : [];

  function handleServiceSelect(val: string) {
    setCategory(val);
    setExtraFields({});
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      setError("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    setError("");

    const extraNote = Object.entries(extraFields)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => {
        const def = extraDefs.find(f => f.key === k);
        return def ? `${def.label}: ${v}` : v;
      }).join("\n");

    const fullDescription = extraNote
      ? `${description.trim()}\n\n---\nمعلومات إضافية:\n${extraNote}`
      : description.trim();

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: fullDescription, category, priority }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "حدث خطأ"); setSaving(false); return; }
      router.push(`/dashboard/tickets/${json.data.id}`);
    } catch {
      setError("حدث خطأ في الاتصال");
      setSaving(false);
    }
  }

  return (
    <div className="client-dash-page">
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard/tickets" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".7rem", color: "#526983", textDecoration: "none", marginBottom: 10 }}>
          <ChevronRight size={14} /> العودة للتذاكر
        </Link>
        <h2 className="client-dash-page-title" style={{ marginBottom: 4 }}>تذكرة دعم جديدة</h2>
        <p className="client-dash-page-desc">اختر الخدمة وأرسل طلبك لفريق أتمم.</p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        {["اختر الخدمة", "تفاصيل الطلب", "الإرسال"].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center",
                background: step > i + 1 ? "#15803d" : step === i + 1 ? "#0875dc" : "#e5eaf0",
                color: step >= i + 1 ? "#fff" : "#8b9dad",
                fontSize: ".62rem", fontWeight: 800, flexShrink: 0,
              }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: ".62rem", color: step === i + 1 ? "#0875dc" : "#8b9dad", fontWeight: step === i + 1 ? 700 : 400, whiteSpace: "nowrap" }}>
                {s}
              </span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? "#15803d" : "#e5eaf0", margin: "0 8px" }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Service selection */}
      {step === 1 && (
        <div>
          <p style={{ fontSize: ".72rem", color: "#526983", marginBottom: 14, fontWeight: 600 }}>اختر الخدمة التي تحتاج دعماً فيها:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {SERVICES.map(svc => {
              const Icon = svc.icon;
              return (
                <button
                  key={svc.value}
                  onClick={() => handleServiceSelect(svc.value)}
                  style={{
                    border: `1px solid ${category === svc.value ? svc.color : "#e5eaf0"}`,
                    background: category === svc.value ? `${svc.color}10` : "#fff",
                    borderRadius: 12, padding: "14px 12px", cursor: "pointer",
                    textAlign: "right", transition: "all .15s", font: "inherit",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = svc.color; (e.currentTarget as HTMLElement).style.background = `${svc.color}08`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = category === svc.value ? svc.color : "#e5eaf0"; (e.currentTarget as HTMLElement).style.background = category === svc.value ? `${svc.color}10` : "#fff"; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${svc.color}15`, display: "grid", placeItems: "center", marginBottom: 9 }}>
                    <Icon size={17} color={svc.color} />
                  </div>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56", marginBottom: 3, lineHeight: 1.3 }}>{svc.label}</div>
                  <div style={{ fontSize: ".58rem", color: "#8b9dad", lineHeight: 1.4 }}>{svc.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2+: Form */}
      {step >= 2 && (
        <form onSubmit={handleSubmit}>

          {/* Selected service badge */}
          {selectedSvc && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${selectedSvc.color}10`, border: `1px solid ${selectedSvc.color}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
              <selectedSvc.icon size={16} color={selectedSvc.color} />
              <span style={{ fontSize: ".7rem", color: selectedSvc.color, fontWeight: 700, flex: 1 }}>{selectedSvc.label}</span>
              <button type="button" onClick={() => { setCategory(""); setStep(1); }} style={{ border: 0, background: "transparent", color: "#8b9dad", cursor: "pointer", fontSize: ".62rem", textDecoration: "underline" }}>
                تغيير
              </button>
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>عنوان الطلب *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ملخص مختصر لطلبك"
              maxLength={200}
              style={{ width: "100%", height: 42, border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", boxSizing: "border-box", background: "#fafbfc", outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#0875dc"}
              onBlur={e => e.target.style.borderColor = "#e5eaf0"}
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>مستوى الأهمية</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)} style={{
                  flex: 1, height: 44, border: `1px solid ${priority === p.value ? p.color : "#e5eaf0"}`,
                  background: priority === p.value ? p.bg : "#fff",
                  borderRadius: 8, cursor: "pointer", font: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: ".65rem", fontWeight: 700, color: priority === p.value ? p.color : "#526983", transition: "all .15s", gap: 2,
                }}>
                  <span>{p.label}</span>
                  <span style={{ fontSize: ".55rem", fontWeight: 400, color: "#8b9dad" }}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Extra fields */}
          {extraDefs.length > 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e5eaf0", borderRadius: 10, padding: "14px 14px 8px", marginBottom: 14 }}>
              <p style={{ fontSize: ".63rem", color: "#526983", fontWeight: 700, marginBottom: 10 }}>معلومات إضافية تساعدنا على معالجة طلبك أسرع:</p>
              {extraDefs.map(field => (
                <div key={field.key} style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: ".62rem", color: "#425c76", fontWeight: 700, marginBottom: 5 }}>{field.label}</label>
                  <input
                    value={extraFields[field.key] || ""}
                    onChange={e => setExtraFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: "100%", height: 38, border: "1px solid #e5eaf0", borderRadius: 8, padding: "0 12px", font: "inherit", fontSize: ".7rem", color: "#344d69", boxSizing: "border-box", background: "#fff", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = "#0875dc"}
                    onBlur={e => e.target.style.borderColor = "#e5eaf0"}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>تفاصيل الطلب *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="اشرح طلبك أو مشكلتك بوضوح حتى يتمكن فريقنا من المساعدة بسرعة..."
              rows={5}
              style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", resize: "vertical", background: "#fafbfc", boxSizing: "border-box", lineHeight: 1.6, outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#0875dc"}
              onBlur={e => e.target.style.borderColor = "#e5eaf0"}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#dc2626" />
              <span style={{ fontSize: ".68rem", color: "#dc2626" }}>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setStep(1)} style={{ height: 42, padding: "0 16px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", font: "inherit", fontSize: ".72rem", cursor: "pointer" }}>
              رجوع
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, height: 42, border: 0, borderRadius: 10, background: saving ? "#93c5fd" : "#0875dc", color: "#fff", font: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Send size={15} /> {saving ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
