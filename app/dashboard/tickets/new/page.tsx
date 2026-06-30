"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send, ChevronRight, AlertCircle, Building2, Globe, FileCheck,
  Award, Scale, Users, Calculator, MessageSquare, Lightbulb,
  ThumbsUp, Upload, X, File, CheckCircle2, Paperclip, CheckCircle, CalendarDays, Search,
  Phone, Video, MapPin, PenLine, Info, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAppDate, formatAppTime, fromDateAndTimeValues } from "@/lib/date-format";

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
  { value: "إدارة المنصات الحكومية", label: "المنصات الحكومية", icon: Globe, color: "#0f766e", desc: "قوى، مزايا، مدد، أبشر وغيرها" },
  { value: "التراخيص والتصاريح", label: "التراخيص والتصاريح", icon: FileCheck, color: "#15803d", desc: "رخص بلدية، مهنية، تشغيلية" },
  { value: "التأهيل والاعتمادات", label: "التأهيل والاعتمادات", icon: Award, color: "#b45309", desc: "اعتماد منشأة، شهادات ومتطلبات" },
  { value: "الخدمات القانونية والتوثيق", label: "القانونية والتوثيق", icon: Scale, color: "#dc2626", desc: "عقود، توثيق، وثائق رسمية" },
  { value: "الموارد البشرية وحماية الأجور", label: "الموارد البشرية", icon: Users, color: "#0891b2", desc: "قوى، حماية الأجور، نطاقات" },
  { value: "الزكاة والضريبة والاستشارات", label: "الزكاة والضريبة", icon: Calculator, color: "#0f766e", desc: "الزكاة، ضريبة القيمة المضافة" },
  { value: "أخرى", label: "استفسار آخر", icon: MessageSquare, color: "#6b7280", desc: "موضوع غير مذكور" },
];

const CONSULTATION_METHODS = [
  { value: "phone",     label: "مكالمة هاتفية", icon: Phone,    desc: "نتصل بك في الموعد المحدد" },
  { value: "zoom",      label: "اتصال مرئي",    icon: Video,    desc: "عبر Zoom أو Google Meet" },
  { value: "in_person", label: "حضوري",         icon: MapPin,   desc: "في أحد مكاتبنا" },
  { value: "written",   label: "كتابياً",        icon: PenLine,  desc: "رد مفصّل عبر المحادثة" },
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

function ClientSelector({ clients, selectedClientId, onChange }: { clients: ClientRecord[]; selectedClientId: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState("");
  if (clients.length === 0) return null;
  const selected = clients.find(c => c.id === selectedClientId);

  if (clients.length < 5) {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>
          <Building2 size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 5 }} /> المنشأة المعنية بهذه التذكرة
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {clients.map(c => (
            <button key={c.id} type="button" onClick={() => onChange(c.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", border: `1.5px solid ${selectedClientId === c.id ? "#0875dc" : "#e5eaf0"}`, borderRadius: 10, background: selectedClientId === c.id ? "#eaf4ff" : "#fff", cursor: "pointer", font: "inherit", fontSize: ".7rem", color: selectedClientId === c.id ? "#0875dc" : "#526983", fontWeight: 700, transition: "all .15s" }}>
              <Building2 size={13} /> {c.name}
              {selectedClientId === c.id && <CheckCircle2 size={13} color="#0875dc" />}
            </button>
          ))}
        </div>
        {selected && <p style={{ fontSize: ".6rem", color: "#8b9dad", marginTop: 6 }}>سيتم ربط التذكرة بـ <strong style={{ color: "#0875dc" }}>{selected.name}</strong></p>}
      </div>
    );
  }

  const filtered = search ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : clients;
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>
        <Building2 size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 5 }} /> المنشأة المعنية بهذه التذكرة
      </label>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f5f8fc", border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 12px", height: 40, marginBottom: 6 }}>
          <Search size={13} color="#8b9dad" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم المنشأة..."
            style={{ border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: ".72rem", color: "#344d69", flex: 1 }} />
        </div>
        {search && filtered.length > 0 && (
          <div style={{ position: "absolute", top: "100%", right: 0, left: 0, background: "#fff", border: "1px solid #e5eaf0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.1)", zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
            {filtered.map(c => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); setSearch(""); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: 0, background: selectedClientId === c.id ? "#eaf4ff" : "#fff", cursor: "pointer", font: "inherit", fontSize: ".72rem", color: selectedClientId === c.id ? "#0875dc" : "#344d69", fontWeight: selectedClientId === c.id ? 700 : 400, textAlign: "right" }}>
                <Building2 size={13} /> {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && !search && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#eaf4ff", border: "1px solid #bddcff", borderRadius: 9 }}>
          <Building2 size={14} color="#0875dc" />
          <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#0875dc" }}>{selected.name}</span>
          <CheckCircle2 size={13} color="#0875dc" style={{ marginRight: "auto" }} />
        </div>
      )}
    </div>
  );
}

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConsultation = searchParams.get("type") === "consultation";
  const _paramCategory = searchParams.get("category") || "";
  const _paramSubject  = searchParams.get("subject") || "";

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState(_paramSubject);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(_paramCategory);
  const [priority, setPriority] = useState("عادية");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(2);
  const [kbSuggestions, setKbSuggestions] = useState<KbArticle[]>([]);
  const [loadingKb, setLoadingKb] = useState(false);
  const [showKb, setShowKb] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [consPhone, setConsPhone] = useState("");
  const [consMethod, setConsMethod] = useState("phone");
  const [consDate, setConsDate] = useState("");
  const [consTime, setConsTime] = useState("");
  const [consStep, setConsStep] = useState<1 | 2>(1);

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
    const missing: string[] = [];
    if (!title.trim()) missing.push("عنوان الطلب");
    if (!description.trim()) missing.push("تفاصيل الطلب");
    if (missing.length > 0) {
      setError(`${missing.join(" و")} ${missing.length === 1 ? "مطلوب" : "مطلوبان"}`);
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

    const consultationScheduledAt = isConsultation ? fromDateAndTimeValues(consDate, consTime) : null;
    const consPreferredTime = isConsultation && (consDate || consTime)
      ? `\n\nالوقت المفضل للاستشارة: ${consultationScheduledAt ? `${formatAppDate(consultationScheduledAt)} · ${formatAppTime(consultationScheduledAt)}` : `${consDate || ""}${consDate && consTime ? " · " : ""}${consTime || ""}`}`.trim()
      : "";

    const fullDescription = extraNote
      ? `${description.trim()}${consPreferredTime}\n\n---\nمعلومات إضافية:\n${extraNote}`
      : `${description.trim()}${consPreferredTime}`;

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
          consultation_method: isConsultation ? consMethod : undefined,
          consultation_phone: isConsultation ? (consPhone || undefined) : undefined,
          consultation_scheduled_at: consultationScheduledAt || undefined,
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

      if (isConsultation) {
        router.push(`/dashboard/tickets/${ticketId}?consultation=1`);
      } else {
        router.push(`/dashboard/tickets/${ticketId}`);
      }
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
          <ChevronRight size={14} /> العودة لمركز الدعم
        </Link>
        {isConsultation ? (
          <>
            <h2 className="client-dash-page-title" style={{ marginBottom: 4 }}>جدولة استشارة</h2>
            <p className="client-dash-page-desc">احجز موعد استشارة مع فريق أتمم — سنتواصل معك في أقرب وقت.</p>
          </>
        ) : (
          <>
            <h2 className="client-dash-page-title" style={{ marginBottom: 4 }}>محادثة جديدة</h2>
            <p className="client-dash-page-desc">راسل فريق أتمم وسنرد عليك في أقرب وقت.</p>
          </>
        )}
      </div>

      {isConsultation ? (
        <>
          {/* Mini progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            {[1, 2].map(n => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, flex: n === 1 ? 1 : "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", background: consStep > n ? "#15803d" : consStep === n ? "#0875dc" : "#e5eaf0", color: consStep >= n ? "#fff" : "#8b9dad", fontSize: ".6rem", fontWeight: 800, flexShrink: 0 }}>
                  {consStep > n ? <CheckCircle size={12} /> : n}
                </div>
                <span style={{ fontSize: ".62rem", fontWeight: consStep === n ? 700 : 400, color: consStep === n ? "#0875dc" : "#8b9dad" }}>
                  {n === 1 ? "تفاصيل الاستشارة" : "التأكيد"}
                </span>
                {n === 1 && <div style={{ flex: 1, height: 1, background: consStep > 1 ? "#15803d" : "#e5eaf0" }} />}
              </div>
            ))}
          </div>

          {consStep === 1 && (
            <div>
              <ClientSelector clients={clients} selectedClientId={selectedClientId} onChange={setSelectedClientId} />

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>طريقة الاستشارة المفضلة</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {CONSULTATION_METHODS.map(m => {
                    const Icon = m.icon;
                    const active = consMethod === m.value;
                    return (
                      <button key={m.value} type="button" onClick={() => setConsMethod(m.value)}
                        style={{ border: `1.5px solid ${active ? "#0875dc" : "#e5eaf0"}`, background: active ? "#eaf4ff" : "#fff", borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center", font: "inherit", transition: "all .15s" }}>
                        <Icon size={18} color={active ? "#0875dc" : "#8b9dad"} style={{ marginBottom: 5 }} />
                        <div style={{ fontSize: ".62rem", fontWeight: 700, color: active ? "#0875dc" : "#344d69" }}>{m.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

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
                <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>
                  <CalendarDays size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 5 }} />
                  الوقت المفضل للاستشارة (اختياري)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: ".58rem", color: "#8b9dad", marginBottom: 4 }}>التاريخ</div>
                    <input type="date" value={consDate} onChange={e => setConsDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      style={{ width: "100%", height: 42, border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 12px", font: "inherit", fontSize: ".73rem", color: "#344d69", boxSizing: "border-box", outline: "none", background: "#fff" }}
                      onFocus={e => e.target.style.borderColor = "#0875dc"}
                      onBlur={e => e.target.style.borderColor = "#e5eaf0"} />
                  </div>
                  <div>
                    <div style={{ fontSize: ".58rem", color: "#8b9dad", marginBottom: 4 }}>الوقت</div>
                    <input type="time" value={consTime} onChange={e => setConsTime(e.target.value)}
                      style={{ width: "100%", height: 42, border: "1px solid #e5eaf0", borderRadius: 10, padding: "0 12px", font: "inherit", fontSize: ".73rem", color: "#344d69", boxSizing: "border-box", outline: "none", background: "#fff" }}
                      onFocus={e => e.target.style.borderColor = "#0875dc"}
                      onBlur={e => e.target.style.borderColor = "#e5eaf0"} />
                  </div>
                </div>
                <p style={{ fontSize: ".58rem", color: "#a0aec0", margin: "5px 0 0" }}>سيقوم فريقنا بتأكيد الموعد أو اقتراح بديل مناسب.</p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 }}>تفاصيل الاستشارة *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="اشرح ما تحتاج استشارة بخصوصه..." rows={5}
                  style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 14px", font: "inherit", fontSize: ".75rem", color: "#344d69", resize: "vertical", background: "#fff", boxSizing: "border-box", outline: "none" }} />
              </div>

              {/* ── File Uploader ───────────────────────────────────── */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 8 }}>
                  <Paperclip size={13} style={{ display: "inline", verticalAlign: "middle", marginLeft: 5 }} />
                  المرفقات (اختياري)
                  <span style={{ fontWeight: 400, color: "#8b9dad", marginRight: 6 }}>PDF, Word, Excel, PowerPoint, صور, نص — بحد أقصى {MAX_SIZE_MB} MB</span>
                </label>

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

              <button type="button" disabled={!title.trim() || !description.trim() || errorFiles.length > 0} onClick={() => setConsStep(2)}
                style={{ width: "100%", height: 44, border: 0, borderRadius: 10, background: !title.trim() || !description.trim() || errorFiles.length > 0 ? "#e5eaf0" : "#0875dc", color: !title.trim() || !description.trim() || errorFiles.length > 0 ? "#aab5c3" : "#fff", font: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: !title.trim() || !description.trim() || errorFiles.length > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                مراجعة الطلب <ArrowRight size={15} />
              </button>
            </div>
          )}

          {consStep === 2 && (
            <form onSubmit={handleSubmit}>
              <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: ".78rem", fontWeight: 800, color: "#073766" }}>ملخص طلب الاستشارة</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 3 }}>الموضوع</div>
                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56" }}>{title}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 3 }}>طريقة الاستشارة</div>
                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56", display: "flex", alignItems: "center", gap: 5 }}>
                      {(() => { const m = CONSULTATION_METHODS.find(x => x.value === consMethod); const Icon = m?.icon || Phone; return <><Icon size={13} color="#0875dc" />{m?.label}</>; })()}
                    </div>
                  </div>
                  {selectedClientId && clients.length > 0 && (
                    <div>
                      <div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 3 }}>المنشأة</div>
                      <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56" }}>{clients.find(c => c.id === selectedClientId)?.name}</div>
                    </div>
                  )}
                  {consPhone && (
                    <div>
                      <div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 3 }}>رقم الجوال</div>
                      <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56" }}>{consPhone}</div>
                    </div>
                  )}
                  {(consDate || consTime) && (
                    <div>
                      <div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 3 }}>الوقت المفضل</div>
                      <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56" }}>
                        {fromDateAndTimeValues(consDate, consTime) ? (
                          <>
                            {formatAppDate(fromDateAndTimeValues(consDate, consTime))}
                            {consTime && <> · {formatAppTime(fromDateAndTimeValues(consDate, consTime))}</>}
                          </>
                        ) : (
                          <>
                            {consDate && formatAppDate(consDate)}
                            {consDate && consTime && " · "}
                            {consTime}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 3 }}>التفاصيل</div>
                    <div style={{ fontSize: ".68rem", color: "#526983", lineHeight: 1.6 }}>{description}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#fef9ee", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Info size={16} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#92400e", marginBottom: 3 }}>رسوم الاستشارة تُحدد لاحقاً</div>
                  <p style={{ margin: 0, fontSize: ".62rem", color: "#92400e", lineHeight: 1.6 }}>
                    الاستشارات المتخصصة لدى أتمم ليست مجانية. سيتواصل معك فريقنا لتحديد السعر المناسب بحسب طبيعة الاستشارة قبل تأكيد الموعد.
                  </p>
                </div>
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} color="#dc2626" />
                  <span style={{ fontSize: ".68rem", color: "#dc2626" }}>{error}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setConsStep(1)} style={{ height: 44, padding: "0 18px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", font: "inherit", fontSize: ".72rem", cursor: "pointer" }}>
                  رجوع
                </button>
                <button type="submit" disabled={saving}
                  style={{ height: 44, padding: "0 24px", border: 0, borderRadius: 10, background: saving ? "#93c5fd" : "#15803d", color: "#fff", font: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays size={15} /> {saving ? "جاري الإرسال..." : "تأكيد طلب الاستشارة"}
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <>
      <form onSubmit={handleSubmit}>
          <ClientSelector clients={clients} selectedClientId={selectedClientId} onChange={setSelectedClientId} />

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
            <button type="submit" disabled={saving || errorFiles.length > 0}
              style={{ height: 42, padding: "0 24px", border: 0, borderRadius: 10, background: saving ? "#93c5fd" : errorFiles.length > 0 ? "#e5eaf0" : "#0875dc", color: saving || errorFiles.length > 0 ? "#aab5c3" : "#fff", font: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: saving || errorFiles.length > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Send size={15} /> {saving ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
          </form>
        </>
      )}
    </div>
  );
}
