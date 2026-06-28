"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send, ChevronRight, AlertCircle, Building2, Globe, FileCheck,
  Award, Scale, Users, Calculator, MessageSquare, Lightbulb,
  ThumbsUp, Upload, X, File, CheckCircle2, Paperclip, CheckCircle, CalendarDays
} from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ClientRecord = { id: string; name: string; client_type: string };
type KbArticle = { id: string; title: string; body: string; category: string };

type UploadedFile = {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  path?: string;
  error?: string;
};

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
];
const ALLOWED_EXT = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".pptx", ".ppt", ".txt"];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const SERVICES = [
  { value: "تأسيس الشركات والمنشآت", label: "تأسيس الشركات والمنشآت", icon: Building2, color: "#0875dc", desc: "مؤسسة أو شركة ذات مسؤولية محدودة" },
  { value: "إدارة المنصات الحكومية", label: "المنصات الحكومية", icon: Globe, color: "#7c3aed", desc: "قوى، مزايا، مدد، أبشر وغيرها" },
  { value: "التراخيص والتصاريح", label: "التراخيص والتصاريح", icon: FileCheck, color: "#15803d", desc: "رخص بلدية، مهنية، تشغيلية" },
  { value: "التأهيل والاعتمادات", label: "التأهيل والاعتمادات", icon: Award, color: "#b45309", desc: "اعتماد منشأة، شهادات ومتطلبات" },
  { value: "الخدمات القانونية والتوثيق", label: "القانونية والتوثيق", icon: Scale, color: "#dc2626", desc: "عقود، توثيق، وثائق رسمية" },
  { value: "الموارد البشرية وحماية الأجور", label: "الموارد البشرية", icon: Users, color: "#0891b2", desc: "قوى، حماية الأجور، نطاقات" },
  { value: "الزكاة والضريبة والاستشارات", label: "الزكاة والضريبة", icon: Calculator, color: "#7c3aed", desc: "الزكاة، ضريبة القيمة المضافة" },
  { value: "أخرى", label: "استفسار آخر", icon: MessageSquare, color: "#6b7280", desc: "موضوع غير مذكور" },
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
    { label: "الموضوع الضريبي", placeholder: "مثال: التسجيل في ضريبة القيمة المضافة...", key: "tax_topic" },
    { label: "الفترة الزمنية المعنية (إن وجدت)", placeholder: "مثال: الربع الأول 2024", key: "period" },
  ],
};

function validateFile(file: File): string | null {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return `نوع الملف غير مسموح. الصيغ المقبولة: PDF, Word, Excel, PowerPoint, صور, نص`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `حجم الملف (${(file.size / 1024 / 1024).toFixed(1)} MB) يتجاوز الحد المسموح (${MAX_SIZE_MB} MB)`;
  }
  return null;
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="client-dash-page" style={{textAlign:"center",padding:60,color:"#8b9dad"}}>جاري التحميل...</div>}>
      <NewTicketForm />
    </Suspense>
  );
}

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConsultation = searchParams.get("type") === "consultation";
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("عادية");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [kbSuggestions, setKbSuggestions] = useState<KbArticle[]>([]);
  const [loadingKb, setLoadingKb] = useState(false);
  const [showKb, setShowKb] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [consPhone, setConsPhone] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(({ data }) => {
      if (data?.clients?.length) {
        setClients(data.clients);
        setSelectedClientId(data.clients[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!title.trim() || title.length < 5) { setKbSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setLoadingKb(true);
      try {
        const res = await fetch(`/api/kb?q=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`);
        if (res.ok) {
          const { data } = await res.json();
          if (data?.length) { setKbSuggestions(data.slice(0, 3)); setShowKb(true); }
          else { setKbSuggestions([]); setShowKb(false); }
        }
      } catch {} finally { setLoadingKb(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [title, category]);

  const selectedSvc = SERVICES.find(s => s.value === category);
  const extraDefs = category ? EXTRA_FIELDS[category] || [] : [];

  function handleServiceSelect(val: string) {
    setCategory(val);
    setExtraFields({});
    setStep(2);
  }

  // ── File handling ──────────────────────────────────────────
  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const newEntries: UploadedFile[] = [];
    for (const file of arr) {
      const validationError = validateFile(file);
      newEntries.push({
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: validationError ? "error" : "pending",
        error: validationError || undefined,
      });
    }
    setUploadedFiles(prev => [...prev, ...newEntries]);
  }

  function removeFile(id: string) {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  async function uploadFilesToSupabase(ticketId: string): Promise<string[]> {
    const supabase = createSupabaseBrowserClient();
    const paths: string[] = [];

    for (const entry of uploadedFiles) {
      if (entry.status === "error") continue;
      setUploadedFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "uploading" } : f));
      const safeName = entry.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `tickets/${ticketId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("ticket-attachments")
        .upload(path, entry.file, { upsert: false });

      if (uploadErr) {
        setUploadedFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "error", error: "فشل رفع الملف" } : f));
      } else {
        setUploadedFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "done", path } : f));
        paths.push(path);
      }
    }
    return paths;
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      setError("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    // Block if any file has a validation error
    const hasFileErrors = uploadedFiles.some(f => f.status === "error" && !f.path);
    if (hasFileErrors) {
      setError("يوجد ملفات غير صالحة. احذفها أو استبدلها قبل الإرسال.");
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

    const fullDescription = isConsultation
      ? `${description.trim()}\n\n---\nنوع: استشارة\nرقم الجوال: ${consPhone || "غير مذكور"}`
      : extraNote
        ? `${description.trim()}\n\n---\nمعلومات إضافية:\n${extraNote}`
        : description.trim();

    try {
      // 1. Create ticket
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: fullDescription,
          category: isConsultation ? "الزكاة والضريبة والاستشارات" : category,
          priority,
          client_id: selectedClientId || undefined,
          type: isConsultation ? "consultation" : "ticket",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "حدث خطأ"); setSaving(false); return; }

      const ticketId = json.data.id;

      // 2. Upload files and attach paths to ticket
      const validFiles = uploadedFiles.filter(f => f.status !== "error");
      if (validFiles.length > 0) {
        const paths = await uploadFilesToSupabase(ticketId);
        if (paths.length > 0) {
          // Store attachment paths on the ticket record
          await fetch(`/api/tickets/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attachments: paths }),
          });
        }
      }

      router.push(`/dashboard/tickets/${ticketId}`);
    } catch {
      setError("حدث خطأ في الاتصال");
      setSaving(false);
    }
  }

  const pendingFiles = uploadedFiles.filter(f => f.status === "pending" || f.status === "uploading" || f.status === "done");
  const errorFiles = uploadedFiles.filter(f => f.status === "error");

  return (
    <div className="client-dash-page">
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard/tickets" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".7rem", color: "#526983", textDecoration: "none", marginBottom: 10 }}>
          <ChevronRight size={14} /> العودة للتذاكر
        </Link>
        {isConsultation ? (
          <>
            <h2 className="client-dash-page-title" style={{ marginBottom: 4 }}>جدولة استشارة</h2>
            <p className="client-dash-page-desc">احجز موعد استشارة مع فريق أتمم — سنتواصل معك في أقرب وقت.</p>
          </>
        ) : (
          <>
            <h2 className="client-dash-page-title" style={{ marginBottom: 4 }}>تذكرة دعم جديدة</h2>
            <p className="client-dash-page-desc">اختر الخدمة وأرسل طلبك لفريق أتمم.</p>
          </>
        )}
      </div>

      {isConsultation ? (
        /* Consultation form — simplified, no steps */
        <form onSubmit={handleSubmit}>
          {/* Company selector */}
          {clients.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>
                <Building2 size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 5 }} />
                المنشأة المعنية
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {clients.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedClientId(c.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: `1.5px solid ${selectedClientId === c.id ? "#0875dc" : "#e5eaf0"}`, borderRadius: 10, background: selectedClientId === c.id ? "#eaf4ff" : "#fff", cursor: "pointer", font: "inherit", fontSize: ".7rem", color: selectedClientId === c.id ? "#0875dc" : "#526983", fontWeight: 700 }}>
                    <Building2 size={14} />
                    {c.name}
                    {selectedClientId === c.id && <CheckCircle2 size={14} color="#0875dc" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>موضوع الاستشارة *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: استشارة زكوية, تأسيس شركة"
              style={{ width: "100%", height: 42, border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", boxSizing: "border-box", outline: "none" }} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>رقم الجوال (اختياري)</label>
            <input value={consPhone} onChange={e => setConsPhone(e.target.value)} placeholder="05XXXXXXXX"
              style={{ width: "100%", height: 42, border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", boxSizing: "border-box", outline: "none" }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>تفاصيل الاستشارة *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="اشرح ما تحتاج استشارة بخصوصه..." rows={5}
              style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", resize: "vertical", background: "#fff", boxSizing: "border-box", outline: "none" }} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".62rem", color: "#8b9dad", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px" }}>
              <CalendarDays size={16} color="#15803d" />
              سيتم التواصل معك لحجز موعد الاستشارة خلال ٢٤ ساعة عمل.
            </label>
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#dc2626" />
              <span style={{ fontSize: ".68rem", color: "#dc2626" }}>{error}</span>
            </div>
          )}

          <button type="submit" disabled={saving || !title.trim() || !description.trim()}
            style={{ width: "100%", height: 44, border: 0, borderRadius: 10, background: saving || !title.trim() || !description.trim() ? "#e5eaf0" : "#15803d", color: saving || !title.trim() || !description.trim() ? "#aab5c3" : "#fff", font: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: saving || !title.trim() || !description.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <CalendarDays size={15} /> {saving ? "جاري الإرسال..." : "طلب استشارة"}
          </button>
        </form>
      ) : (
        <>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        {["اختر الخدمة", "تفاصيل الطلب", "الإرسال"].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", background: step > i + 1 ? "#15803d" : step === i + 1 ? "#0875dc" : "#e5eaf0", color: step >= i + 1 ? "#fff" : "#8b9dad", fontSize: ".62rem", fontWeight: 800, flexShrink: 0 }}>
                {step > i + 1 ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span style={{ fontSize: ".62rem", color: step === i + 1 ? "#0875dc" : "#8b9dad", fontWeight: step === i + 1 ? 700 : 400, whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? "#15803d" : "#e5eaf0", margin: "0 8px" }} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          {/* Company selector — always shown if user has clients */}
          {clients.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>
                <Building2 size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 5 }} />
                المنشأة المعنية بهذه التذكرة
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {clients.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedClientId(c.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: `1.5px solid ${selectedClientId === c.id ? "#0875dc" : "#e5eaf0"}`, borderRadius: 10, background: selectedClientId === c.id ? "#eaf4ff" : "#fff", cursor: "pointer", font: "inherit", fontSize: ".7rem", color: selectedClientId === c.id ? "#0875dc" : "#526983", fontWeight: 700, transition: "all .15s" }}>
                    <Building2 size={14} />
                    {c.name}
                    {selectedClientId === c.id && <CheckCircle2 size={14} color="#0875dc" />}
                  </button>
                ))}
              </div>
              {selectedClientId && (
                <p style={{ fontSize: ".6rem", color: "#8b9dad", marginTop: 6, margin: "6px 0 0" }}>
                  سيتم ربط التذكرة بـ <strong style={{ color: "#0875dc" }}>{clients.find(c => c.id === selectedClientId)?.name}</strong>
                </p>
              )}
            </div>
          )}

          <p style={{ fontSize: ".72rem", color: "#526983", marginBottom: 12, fontWeight: 600 }}>اختر الخدمة التي تحتاج دعماً فيها:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {SERVICES.map(svc => {
              const Icon = svc.icon;
              return (
                <button key={svc.value} onClick={() => handleServiceSelect(svc.value)}
                  style={{ border: `1px solid ${category === svc.value ? svc.color : "#e5eaf0"}`, background: category === svc.value ? `${svc.color}10` : "#fff", borderRadius: 12, padding: "14px 12px", cursor: "pointer", textAlign: "right", transition: "all .15s", font: "inherit" }}>
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

      {/* Step 2+ */}
      {step >= 2 && (
        <form onSubmit={handleSubmit}>
          {/* Selected service + company badge */}
          {selectedSvc && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${selectedSvc.color}10`, border: `1px solid ${selectedSvc.color}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <selectedSvc.icon size={16} color={selectedSvc.color} />
              <span style={{ fontSize: ".7rem", color: selectedSvc.color, fontWeight: 700, flex: 1 }}>{selectedSvc.label}</span>
              {selectedClientId && clients.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", color: "#0875dc", background: "#eaf4ff", border: "1px solid #bddcff", padding: "3px 10px", borderRadius: 8, fontWeight: 700 }}>
                  <Building2 size={11} />
                  {clients.find(c => c.id === selectedClientId)?.name || ""}
                </span>
              )}
              <button type="button" onClick={() => { setCategory(""); setStep(1); }} style={{ border: 0, background: "transparent", color: "#8b9dad", cursor: "pointer", fontSize: ".62rem", textDecoration: "underline" }}>
                تغيير
              </button>
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>عنوان الطلب *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ملخص مختصر لطلبك" maxLength={200}
              style={{ width: "100%", height: 42, border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", boxSizing: "border-box", background: "#fafbfc", outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#0875dc"}
              onBlur={e => e.target.style.borderColor = "#e5eaf0"} />
          </div>

          {/* KB Suggestions */}
          {showKb && kbSuggestions.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Lightbulb size={14} color="#15803d" />
                <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#15803d" }}>وجدنا مقالات قد تساعدك:</span>
              </div>
              {kbSuggestions.map(art => (
                <div key={art.id} style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
                  <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#15803d", marginBottom: 4 }}>{art.title}</div>
                  <div style={{ fontSize: ".62rem", color: "#526983", lineHeight: 1.5, marginBottom: 6 }}>{art.body.substring(0, 120)}...</div>
                  <button type="button" onClick={() => setShowKb(false)} style={{ fontSize: ".6rem", color: "#15803d", background: "none", border: "none", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <ThumbsUp size={11} /> هذا يحل مشكلتي
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setShowKb(false)} style={{ fontSize: ".6rem", color: "#8b9dad", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
                لم تحل مشكلتي، سأكمل إرسال التذكرة
              </button>
            </div>
          )}

          {/* Priority */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>مستوى الأهمية</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)} style={{ flex: 1, height: 44, border: `1px solid ${priority === p.value ? p.color : "#e5eaf0"}`, background: priority === p.value ? p.bg : "#fff", borderRadius: 8, cursor: "pointer", font: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 700, color: priority === p.value ? p.color : "#526983", transition: "all .15s", gap: 2 }}>
                  <span>{p.label}</span>
                  <span style={{ fontSize: ".55rem", fontWeight: 400, color: "#8b9dad" }}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Extra fields */}
          {extraDefs.length > 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e5eaf0", borderRadius: 10, padding: "12px 14px 8px", marginBottom: 12 }}>
              <p style={{ fontSize: ".63rem", color: "#526983", fontWeight: 700, marginBottom: 10 }}>معلومات إضافية تساعدنا على معالجة طلبك أسرع:</p>
              {extraDefs.map(field => (
                <div key={field.key} style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: ".62rem", color: "#425c76", fontWeight: 700, marginBottom: 5 }}>{field.label}</label>
                  <input value={extraFields[field.key] || ""} onChange={e => setExtraFields(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder}
                    style={{ width: "100%", height: 38, border: "1px solid #e5eaf0", borderRadius: 8, padding: "0 12px", font: "inherit", fontSize: ".7rem", color: "#344d69", boxSizing: "border-box", background: "#fff", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = "#0875dc"}
                    onBlur={e => e.target.style.borderColor = "#e5eaf0"} />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>تفاصيل الطلب *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="اشرح طلبك أو مشكلتك بوضوح..." rows={5}
              style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", resize: "vertical", background: "#fafbfc", boxSizing: "border-box", lineHeight: 1.6, outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#0875dc"}
              onBlur={e => e.target.style.borderColor = "#e5eaf0"} />
          </div>

          {/* ── File Uploader ───────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>
              <Paperclip size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 5 }} />
              المرفقات (اختياري)
              <span style={{ fontWeight: 400, color: "#8b9dad", marginRight: 6 }}>PDF, Word, Excel, PowerPoint, صور, نص — بحد أقصى {MAX_SIZE_MB} MB</span>
            </label>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#0875dc" : "#d1dde8"}`,
                borderRadius: 12,
                padding: "24px 16px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "#eaf4ff" : "#fafbfc",
                transition: "all .2s",
              }}
            >
              <Upload size={24} color={dragOver ? "#0875dc" : "#aab5c3"} style={{ marginBottom: 8 }} />
              <p style={{ margin: "0 0 4px", fontSize: ".72rem", color: "#526983", fontWeight: 600 }}>
                اسحب الملفات هنا أو <span style={{ color: "#0875dc", textDecoration: "underline" }}>اختر من جهازك</span>
              </p>
              <p style={{ margin: 0, fontSize: ".6rem", color: "#aab5c3" }}>
                الصيغ المقبولة: .pdf .docx .xlsx .jpg .png .pptx .txt
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.pptx,.ppt,.txt"
                style={{ display: "none" }}
                onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
              />
            </div>

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {uploadedFiles.map(uf => (
                  <div key={uf.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8,
                    border: `1px solid ${uf.status === "error" ? "#fecaca" : uf.status === "done" ? "#bbf7d0" : "#e5eaf0"}`,
                    background: uf.status === "error" ? "#fef2f2" : uf.status === "done" ? "#f0fdf4" : "#fff",
                  }}>
                    <File size={15} color={uf.status === "error" ? "#dc2626" : uf.status === "done" ? "#15803d" : "#526983"} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: ".68rem", fontWeight: 600, color: "#1e3a56", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {uf.file.name}
                      </div>
                      {uf.error ? (
                        <div style={{ fontSize: ".58rem", color: "#dc2626", marginTop: 2 }}>{uf.error}</div>
                      ) : (
                        <div style={{ fontSize: ".58rem", color: "#8b9dad", marginTop: 2 }}>
                          {(uf.file.size / 1024).toFixed(0)} KB
                          {uf.status === "uploading" && " — جاري الرفع..."}
                          {uf.status === "done" && <> — <CheckCircle size={11} /> تم الرفع</>}
                        </div>
                      )}
                    </div>
                    {uf.status !== "uploading" && (
                      <button type="button" onClick={() => removeFile(uf.id)}
                        style={{ border: 0, background: "none", cursor: "pointer", color: "#aab5c3", flexShrink: 0, display: "flex", alignItems: "center" }}>
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Error summary for invalid files */}
            {errorFiles.length > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={13} color="#dc2626" />
                <span style={{ fontSize: ".62rem", color: "#dc2626", fontWeight: 600 }}>
                  {errorFiles.length} ملف غير صالح — احذفها لإكمال الإرسال
                </span>
              </div>
            )}
          </div>
          {/* ─────────────────────────────────────────────────── */}

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
            <button type="submit" disabled={saving || errorFiles.length > 0}
              style={{ flex: 1, height: 42, border: 0, borderRadius: 10, background: saving ? "#93c5fd" : errorFiles.length > 0 ? "#e5eaf0" : "#0875dc", color: saving || errorFiles.length > 0 ? "#aab5c3" : "#fff", font: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: saving || errorFiles.length > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Send size={15} /> {saving ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
          </form>
        )}
        </>
      )}
    </div>
  );
}
