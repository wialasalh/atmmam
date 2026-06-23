"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ChevronRight, FileText, AlertCircle, Lightbulb, HelpCircle, MessageSquare, Wrench } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "استفسار", label: "استفسار عام", icon: HelpCircle, desc: "أسئلة عامة حول الخدمات", color: "#0875dc" },
  { value: "مشكلة تقنية", label: "مشكلة تقنية", icon: Wrench, desc: "أخطاء أو مشاكل في النظام", color: "#dc2626" },
  { value: "طلب توثيق", label: "طلب توثيق", icon: FileText, desc: "وثائق أو شهادات رسمية", color: "#7c3aed" },
  { value: "شكوى", label: "شكوى", icon: AlertCircle, desc: "تقديم شكوى رسمية", color: "#ea580c" },
  { value: "اقتراح", label: "اقتراح", icon: Lightbulb, desc: "اقتراحات لتحسين الخدمة", color: "#15803d" },
  { value: "أخرى", label: "أخرى", icon: MessageSquare, desc: "موضوع غير مذكور", color: "#6b7280" },
];

const PRIORITIES = [
  { value: "عادية", label: "عادية", color: "#6b7280", bg: "#f9fafb", desc: "يمكن الانتظار" },
  { value: "مرتفعة", label: "مرتفعة", color: "#ea580c", bg: "#fff7ed", desc: "مهم نسبياً" },
  { value: "عاجلة", label: "عاجلة", color: "#dc2626", bg: "#fef2f2", desc: "يحتاج اهتماماً فورياً" },
];

const EXTRA_FIELDS: Record<string, { label: string; placeholder: string; key: string }[]> = {
  "طلب توثيق": [
    { label: "رقم الطلب المرجعي", placeholder: "مثال: ORD-2024-001", key: "order_ref" },
    { label: "نوع الوثيقة المطلوبة", placeholder: "مثال: شهادة تسجيل، عقد تأسيس...", key: "doc_type" },
  ],
  "شكوى": [
    { label: "تاريخ وقوع المشكلة", placeholder: "متى حدثت المشكلة؟", key: "incident_date" },
    { label: "الجهة المعنية", placeholder: "من تقدم الشكوى ضده؟", key: "complaint_against" },
  ],
  "مشكلة تقنية": [
    { label: "الصفحة أو القسم المتأثر", placeholder: "مثال: صفحة تسجيل الدخول", key: "affected_area" },
    { label: "رسالة الخطأ (إن وجدت)", placeholder: "انسخ رسالة الخطأ هنا", key: "error_msg" },
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

  const selectedCat = CATEGORIES.find(c => c.value === category);
  const extraDefs = category ? EXTRA_FIELDS[category] || [] : [];

  function handleCategorySelect(val: string) {
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

    const fullDescription = extraNote ? `${description.trim()}\n\n---\n${extraNote}` : description.trim();

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
        <h2 className="client-dash-page-title" style={{ marginBottom: 4 }}>تذكرة جديدة</h2>
        <p className="client-dash-page-desc">أرسل استفسارك أو طلبك لفريق الدعم.</p>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 24 }}>
        {["اختر القسم", "تفاصيل الطلب", "الإرسال"].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center",
                background: step > i + 1 ? "#15803d" : step === i + 1 ? "#0875dc" : "#e5eaf0",
                color: step >= i + 1 ? "#fff" : "#8b9dad",
                fontSize: ".65rem", fontWeight: 800, flexShrink: 0,
              }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: ".65rem", color: step === i + 1 ? "#0875dc" : "#8b9dad", fontWeight: step === i + 1 ? 700 : 400, whiteSpace: "nowrap" }}>
                {s}
              </span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? "#15803d" : "#e5eaf0", margin: "0 8px" }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Category */}
      {step === 1 && (
        <div>
          <p style={{ fontSize: ".72rem", color: "#526983", marginBottom: 14 }}>اختر قسم الدعم المناسب لطلبك:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategorySelect(cat.value)}
                  style={{
                    border: `1px solid ${category === cat.value ? cat.color : "#e5eaf0"}`,
                    background: category === cat.value ? `${cat.color}10` : "#fff",
                    borderRadius: 12, padding: "16px 12px", cursor: "pointer",
                    textAlign: "right", transition: "all .15s", font: "inherit",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat.color}15`, display: "grid", placeItems: "center", marginBottom: 10 }}>
                    <Icon size={18} color={cat.color} />
                  </div>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56", marginBottom: 4 }}>{cat.label}</div>
                  <div style={{ fontSize: ".6rem", color: "#8b9dad", lineHeight: 1.4 }}>{cat.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 & 3: Form */}
      {step >= 2 && (
        <form onSubmit={handleSubmit}>

          {/* Selected category badge */}
          {selectedCat && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${selectedCat.color}10`, border: `1px solid ${selectedCat.color}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
              <selectedCat.icon size={16} color={selectedCat.color} />
              <span style={{ fontSize: ".7rem", color: selectedCat.color, fontWeight: 700 }}>{selectedCat.label}</span>
              <button type="button" onClick={() => { setCategory(""); setStep(1); }} style={{ marginRight: "auto", border: 0, background: "transparent", color: "#8b9dad", cursor: "pointer", fontSize: ".65rem" }}>
                تغيير ←
              </button>
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>عنوان التذكرة *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ملخص مختصر للطلب"
              maxLength={200}
              style={{ width: "100%", height: 42, border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", boxSizing: "border-box", background: "#fafbfc" }}
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>مستوى الأهمية</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    flex: 1, height: 40, border: `1px solid ${priority === p.value ? p.color : "#e5eaf0"}`,
                    background: priority === p.value ? p.bg : "#fff",
                    borderRadius: 8, cursor: "pointer", font: "inherit",
                    fontSize: ".65rem", fontWeight: 700, color: priority === p.value ? p.color : "#526983",
                    transition: "all .15s",
                  }}
                >
                  {p.label}
                  <div style={{ fontSize: ".55rem", fontWeight: 400, color: "#8b9dad", marginTop: 2 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Extra fields */}
          {extraDefs.length > 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e5eaf0", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: ".65rem", color: "#526983", fontWeight: 700, marginBottom: 10 }}>معلومات إضافية للقسم المختار:</p>
              {extraDefs.map(field => (
                <div key={field.key} style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: ".62rem", color: "#425c76", fontWeight: 700, marginBottom: 5 }}>{field.label}</label>
                  <input
                    value={extraFields[field.key] || ""}
                    onChange={e => setExtraFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: "100%", height: 38, border: "1px solid #e5eaf0", borderRadius: 8, padding: "0 12px", font: "inherit", fontSize: ".7rem", color: "#344d69", boxSizing: "border-box", background: "#fff" }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>وصف الطلب *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="اشرح تفاصيل طلبك هنا بوضوح..."
              rows={5}
              style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", resize: "vertical", background: "#fafbfc", boxSizing: "border-box", lineHeight: 1.6 }}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#dc2626" />
              <span style={{ fontSize: ".68rem", color: "#dc2626" }}>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ height: 42, padding: "0 16px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", font: "inherit", fontSize: ".72rem", cursor: "pointer" }}
            >
              رجوع
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ flex: 1, height: 42, border: 0, borderRadius: 10, background: saving ? "#93c5fd" : "#0875dc", color: "#fff", font: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Send size={15} /> {saving ? "جاري الإرسال..." : "إرسال التذكرة"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
