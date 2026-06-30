"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Hash, Clock, AlertCircle, CheckCircle, XCircle,
  RefreshCw, User, Phone, Mail, Calendar, FileText,
  Upload, MessageSquare, Paperclip, Download, File, ImageIcon,
  CheckCircle2, Loader2,
} from "lucide-react";
import { formatAppDate, formatAppDateTime } from "@/lib/date-format";

type OrderDetail = {
  id: string;
  reference_no: string;
  status: string;
  priority: string;
  due_at: string | null;
  next_action_text: string | null;
  next_action_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  client: { name: string; phone: string | null; email: string | null };
  service_name: string;
};

type OrderDoc = {
  id: string;
  name: string;
  status: "received" | "approved" | "rejected";
  rejection_reason: string | null;
  uploaded_at: string;
  created_at: string;
  download_url: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:               { label: "جديد",               color: "#0875dc", bg: "#eaf4ff", border: "#bddcff" },
  in_progress:       { label: "قيد التنفيذ",         color: "#b45309", bg: "#fef9ee", border: "#fde68a" },
  waiting_documents: { label: "بانتظار المستندات",   color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
  completed:         { label: "مكتمل",               color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  cancelled:         { label: "ملغي",                color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  blocked:           { label: "معلق",                color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "عادي",  color: "#6b7280", bg: "#f9fafb" },
  high:   { label: "مرتفع", color: "#ea580c", bg: "#fff7ed" },
  urgent: { label: "عاجل",  color: "#dc2626", bg: "#fef2f2" },
};

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  received: { label: "تم الاستلام", color: "#0875dc" },
  approved: { label: "مقبول",       color: "#15803d" },
  rejected: { label: "مرفوض",      color: "#dc2626" },
};

const STEPS = [
  { key: "new",               shortLabel: "استلام" },
  { key: "in_progress",       shortLabel: "تنفيذ" },
  { key: "waiting_documents", shortLabel: "مستندات" },
  { key: "completed",         shortLabel: "مكتمل" },
];

const STEP_ORDER: Record<string, number> = {
  new: 0, in_progress: 1, waiting_documents: 2, completed: 3,
  cancelled: -1, blocked: -1,
};

function ProgressStepper({ status }: { status: string }) {
  const currentIdx = STEP_ORDER[status] ?? -1;
  const isCancelled = status === "cancelled";
  const isBlocked   = status === "blocked";

  if (isCancelled || isBlocked) {
    const cfg = STATUS_CONFIG[status];
    return (
      <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {isCancelled ? <XCircle size={18} color={cfg.color} /> : <AlertCircle size={18} color={cfg.color} />}
        <div>
          <div style={{ fontSize: ".75rem", fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: ".62rem", color: cfg.color, opacity: .8, marginTop: 2 }}>
            {isCancelled ? "تم إلغاء هذا الطلب" : "الطلب موقف مؤقتاً — سيتم التواصل معك قريباً"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, padding: "20px 20px 16px", marginBottom: 16 }}>
      <div style={{ fontSize: ".62rem", fontWeight: 700, color: "#8b9dad", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        <RefreshCw size={12} /> سير الطلب
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
        {STEPS.map((step, i) => {
          const isDone   = i < currentIdx;
          const isActive = i === currentIdx;
          const isLast   = i === STEPS.length - 1;
          const dotColor   = isDone ? "#15803d" : isActive ? "#0875dc" : "#e5eaf0";
          const lineColor  = isDone ? "#15803d" : "#e5eaf0";
          const labelColor = isDone ? "#15803d" : isActive ? "#073766" : "#aab5c3";
          return (
            <div key={step.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {!isLast && (
                <div style={{ position: "absolute", top: 11, right: "50%", left: "-50%", height: 3, background: lineColor, zIndex: 0 }} />
              )}
              <div style={{ width: 24, height: 24, borderRadius: "50%", zIndex: 1, background: isDone ? "#15803d" : isActive ? "#0875dc" : "#fff", border: `3px solid ${dotColor}`, display: "grid", placeItems: "center", boxShadow: isActive ? "0 0 0 4px rgba(8,117,220,.15)" : "none", flexShrink: 0 }}>
                {isDone && <CheckCircle size={13} color="#fff" strokeWidth={3} />}
                {isActive && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
              </div>
              <div style={{ marginTop: 8, textAlign: "center", fontSize: ".58rem", fontWeight: isActive ? 800 : isDone ? 600 : 400, color: labelColor }}>
                {step.shortLabel}
              </div>
              {isActive && <div style={{ fontSize: ".52rem", color: "#0875dc", fontWeight: 600, marginTop: 1 }}>الآن</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentUploader({ orderId, onUploaded }: { orderId: string; onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setErr("نوع الملف غير مدعوم — PDF أو صورة فقط"); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("حجم الملف يتجاوز 10 ميجابايت"); return; }
    setErr("");
    setSelectedFile(file);
    if (!docName) setDocName(file.name.replace(/\.[^.]+$/, ""));
  };

  const upload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("name", docName || selectedFile.name);
      const r = await fetch(`/api/client/orders/${orderId}/documents`, { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "حدث خطأ"); return; }
      setSuccess(true);
      setSelectedFile(null);
      setDocName("");
      onUploaded();
      setTimeout(() => setSuccess(false), 3000);
    } catch { setErr("حدث خطأ في الرفع"); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "#0f766e" : selectedFile ? "#15803d" : "#bae6fd"}`, borderRadius: 12, padding: "20px 16px", background: dragging ? "#f0fdfa" : selectedFile ? "#f0fdf4" : "#faf9ff", textAlign: "center", cursor: "pointer", transition: "all .2s" }}
      >
        <input ref={inputRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {selectedFile ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {selectedFile.type.startsWith("image/") ? <ImageIcon size={20} color="#15803d" /> : <File size={20} color="#15803d" />}
            <span style={{ fontSize: ".7rem", color: "#15803d", fontWeight: 700 }}>{selectedFile.name}</span>
          </div>
        ) : (
          <>
            <Upload size={22} color="#0f766e" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: ".7rem", color: "#073766", fontWeight: 700 }}>اسحب الملف هنا أو اضغط للاختيار</div>
            <div style={{ fontSize: ".6rem", color: "#8b9dad", marginTop: 4 }}>PDF أو صورة — حتى 10 ميجابايت</div>
          </>
        )}
      </div>

      {selectedFile && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="اسم المستند" style={{ flex: 1, border: "1px solid #99f6e4", borderRadius: 8, padding: "7px 10px", fontSize: ".7rem", outline: "none" }} />
          <button onClick={upload} disabled={uploading} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: uploading ? "#bae6fd" : "#0f766e", color: "#fff", fontSize: ".7rem", fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {uploading ? <Loader2 size={13} style={{ animation: "spin .6s linear infinite" }} /> : <Upload size={13} />}
            {uploading ? "جاري الرفع..." : "رفع"}
          </button>
          <button onClick={() => { setSelectedFile(null); setDocName(""); setErr(""); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e5eaf0", background: "#fff", cursor: "pointer", fontSize: ".65rem", color: "#6b7280" }}>
            إلغاء
          </button>
        </div>
      )}

      {err && <div style={{ marginTop: 8, fontSize: ".65rem", color: "#dc2626", fontWeight: 600 }}>{err}</div>}
      {success && (
        <div style={{ marginTop: 8, fontSize: ".65rem", color: "#15803d", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
          <CheckCircle2 size={13} /> تم رفع المستند بنجاح
        </div>
      )}
    </div>
  );
}

function DocumentsList({ docs }: { docs: OrderDoc[] }) {
  if (docs.length === 0) return (
    <div style={{ textAlign: "center", padding: "16px 0", fontSize: ".65rem", color: "#aab5c3" }}>لم يتم رفع أي مستندات بعد</div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {docs.map(doc => {
        const ds = DOC_STATUS[doc.status] || DOC_STATUS.received;
        return (
          <div key={doc.id} style={{ background: "#f7f9fc", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <File size={16} color="#0f766e" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#073766", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
              {doc.rejection_reason && <div style={{ fontSize: ".6rem", color: "#dc2626", marginTop: 2 }}>سبب الرفض: {doc.rejection_reason}</div>}
            </div>
            <span style={{ fontSize: ".58rem", padding: "2px 7px", borderRadius: 20, background: "#fff", border: `1px solid ${ds.color}30`, color: ds.color, fontWeight: 600, flexShrink: 0 }}>
              {ds.label}
            </span>
            {doc.download_url && (
              <a href={doc.download_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, padding: "4px 8px", borderRadius: 7, background: "#eaf4ff", color: "#0875dc", display: "grid", placeItems: "center" }}>
                <Download size={12} />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [docs, setDocs] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDocs = useCallback(async () => {
    const r = await fetch(`/api/client/orders/${orderId}/documents`);
    if (r.ok) { const j = await r.json(); setDocs(j.data ?? []); }
  }, [orderId]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/client/orders/${orderId}`);
        const j = await r.json();
        if (!r.ok) { setError(j.error || "حدث خطأ"); return; }
        setOrder(j.data);
        await loadDocs();
      } catch { setError("حدث خطأ في تحميل الطلب"); }
      finally { setLoading(false); }
    })();
  }, [orderId, loadDocs]);

  function fmt(d: string) {
    return formatAppDate(d);
  }
  function fmtTime(d: string) {
    return formatAppDateTime(d);
  }

  if (loading) {
    return (
      <div className="client-dash-page">
        <div style={{ display: "grid", placeItems: "center", height: 200 }}>
          <div style={{ width: 22, height: 22, border: "2px solid #e5ecf3", borderTopColor: "#0875dc", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="client-dash-page">
        <Link href="/dashboard/orders" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".68rem", color: "#526983", textDecoration: "none", marginBottom: 12 }}>
          <ChevronRight size={13} /> العودة للطلبات
        </Link>
        <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, border: "1px solid #e5ecf3" }}>
          <FileText size={36} color="#d1d9e0" style={{ marginBottom: 12 }} />
          <p style={{ color: "#8b9dad", fontSize: ".75rem", margin: 0 }}>{error || "الطلب غير موجود"}</p>
        </div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
  const pc = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.normal;
  const needsDocuments = order.status === "waiting_documents";

  return (
    <div className="client-dash-page" style={{ paddingBottom: 24 }}>

      <Link href="/dashboard/orders" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".65rem", color: "#8b9dad", textDecoration: "none", marginBottom: 14 }}>
        <ChevronRight size={12} /> العودة للطلبات
      </Link>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #063461 0%, #0a5fba 100%)", borderRadius: 16, padding: "20px 20px 22px", marginBottom: 16, color: "#fff" }}>

        {/* Row 1: badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {/* ref number with label */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: ".5rem", color: "rgba(255,255,255,.5)", fontWeight: 600, letterSpacing: ".04em" }}>رقم الطلب</span>
            <span style={{ fontSize: ".68rem", fontFamily: "monospace", background: "rgba(255,255,255,.15)", padding: "3px 10px", borderRadius: 8, fontWeight: 800, direction: "ltr", display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid rgba(255,255,255,.12)" }}>
              <Hash size={11} /> {order.reference_no}
            </span>
          </div>
          <span style={{ marginRight: "auto" }} />
          <span style={{ fontSize: ".6rem", padding: "4px 11px", borderRadius: 20, border: `1.5px solid ${sc.border}`, color: sc.color, background: sc.bg, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {sc.label}
          </span>
          {order.priority !== "normal" && (
            <span style={{ fontSize: ".6rem", padding: "4px 11px", borderRadius: 20, color: pc.color, background: pc.bg, fontWeight: 700 }}>
              {pc.label}
            </span>
          )}
        </div>

        {/* Row 2: service name */}
        <h2 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 800, color: "#fff", lineHeight: 1.4 }}>{order.service_name}</h2>

        {/* Row 3: dates */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: ".6rem", color: "#fff", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Calendar size={11} style={{ opacity: .7 }} />
            <span style={{ opacity: .65 }}>الإنشاء:</span> {fmt(order.created_at)}
          </span>
          {order.due_at && (() => {
            const overdue = new Date(order.due_at) < new Date();
            return (
              <span style={{ fontSize: ".6rem", color: overdue ? "#fef2f2" : "#fff", background: overdue ? "rgba(220,38,38,.35)" : "rgba(255,255,255,.12)", border: `1px solid ${overdue ? "rgba(252,165,165,.4)" : "rgba(255,255,255,.15)"}`, borderRadius: 8, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: overdue ? 700 : 400 }}>
                <Clock size={11} style={{ opacity: overdue ? 1 : .7 }} />
                <span style={{ opacity: overdue ? .85 : .65 }}>التسليم:</span> {fmt(order.due_at)}
                {overdue && <span style={{ fontSize: ".52rem", background: "#dc2626", color: "#fff", borderRadius: 6, padding: "1px 5px", fontWeight: 800 }}>متأخر</span>}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Progress Stepper */}
      <ProgressStepper status={order.status} />

      {/* Waiting Documents Banner with uploader */}
      {needsDocuments && (
        <div style={{ background: "linear-gradient(135deg, #f0fdfa, #e0f7f4)", border: "1.5px solid #bae6fd", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#0f766e", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Upload size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: ".75rem", fontWeight: 800, color: "#073766", marginBottom: 4 }}>مطلوب منك إجراء</div>
              <div style={{ fontSize: ".67rem", color: "#073766", lineHeight: 1.6 }}>
                {order.next_action_text || "يرجى رفع المستندات المطلوبة لاستكمال طلبك."}
              </div>
            </div>
          </div>
          <DocumentUploader orderId={orderId} onUploaded={loadDocs} />
          <Link href="/dashboard/tickets" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(124,58,237,.1)", color: "#073766", borderRadius: 8, padding: "7px 14px", fontSize: ".65rem", fontWeight: 700, textDecoration: "none", border: "1px solid #bae6fd" }}>
            <MessageSquare size={13} /> تواصل مع الفريق
          </Link>
        </div>
      )}

      {/* Next Action banner (non-document states) */}
      {order.next_action_text && !needsDocuments && order.status !== "completed" && order.status !== "cancelled" && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Clock size={15} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: ".62rem", color: "#92400e", fontWeight: 700, marginBottom: 2 }}>الإجراء التالي</div>
            <div style={{ fontSize: ".67rem", color: "#78350f", lineHeight: 1.5 }}>{order.next_action_text}</div>
            {order.next_action_at && (
              <div style={{ fontSize: ".58rem", color: "#b45309", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={10} /> {fmt(order.next_action_at)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed banner */}
      {order.status === "completed" && (
        <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #86efac", borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#15803d", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <CheckCircle size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: ".75rem", fontWeight: 800, color: "#14532d", marginBottom: 2 }}>تم إنجاز طلبك بنجاح</div>
            <div style={{ fontSize: ".62rem", color: "#166534" }}>
              {order.completed_at ? `اكتمل بتاريخ ${fmt(order.completed_at)}` : "شكراً لثقتك بفريق أتمم"}
            </div>
          </div>
        </div>
      )}

      {/* Documents Section */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, padding: "16px 18px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: ".7rem", color: "#073766", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Paperclip size={13} /> المستندات ({docs.length})
        </h3>
        <DocumentsList docs={docs} />
        {!needsDocuments && (
          <div style={{ marginTop: docs.length ? 12 : 0, paddingTop: docs.length ? 12 : 0, borderTop: docs.length ? "1px solid #f0f2f5" : "none" }}>
            <div style={{ fontSize: ".62rem", color: "#8b9dad", marginBottom: 8, fontWeight: 600 }}>رفع مستند إضافي</div>
            <DocumentUploader orderId={orderId} onUploaded={loadDocs} />
          </div>
        )}
      </div>

      {/* Order Details */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, padding: "16px 18px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: ".7rem", color: "#073766", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={13} /> تفاصيل الطلب
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {[
            { label: "الخدمة",        value: order.service_name,         color: "#073766" },
            { label: "الأولوية",      value: pc.label,                    color: pc.color  },
            { label: "تاريخ الإنشاء", value: fmtTime(order.created_at),  color: "#344d69" },
            ...(order.due_at       ? [{ label: "تاريخ التسليم", value: fmt(order.due_at),       color: "#344d69" }] : []),
            ...(order.completed_at ? [{ label: "تاريخ الإكمال", value: fmt(order.completed_at), color: "#15803d" }] : []),
          ].map(item => (
            <div key={item.label} style={{ background: "#f7f9fc", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: ".54rem", color: "#8b9dad", fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: ".66rem", color: item.color, fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>
        {order.notes && (
          <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 8, padding: "10px 12px", borderRight: "3px solid #e5eaf0" }}>
            <div style={{ fontSize: ".54rem", color: "#8b9dad", fontWeight: 600, marginBottom: 4 }}>ملاحظات</div>
            <div style={{ fontSize: ".67rem", color: "#425c76", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{order.notes}</div>
          </div>
        )}
      </div>

      {/* Contact / Account */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, padding: "16px 18px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: ".7rem", color: "#073766", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <User size={13} /> بيانات الحساب
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".67rem", color: "#344d69" }}>
            <User size={13} color="#8b9dad" /> {order.client.name}
          </div>
          {order.client.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".67rem", color: "#344d69" }}>
              <Phone size={13} color="#8b9dad" /> {order.client.phone}
            </div>
          )}
          {order.client.email && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".67rem", color: "#344d69" }}>
              <Mail size={13} color="#8b9dad" /> {order.client.email}
            </div>
          )}
        </div>
        <div style={{ paddingTop: 14, borderTop: "1px solid #f0f2f5", display: "flex", gap: 8 }}>
          <Link href="/dashboard/tickets" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#eaf4ff", color: "#0875dc", borderRadius: 9, padding: "9px 14px", fontSize: ".68rem", fontWeight: 700, textDecoration: "none" }}>
            <MessageSquare size={13} /> فتح تذكرة دعم
          </Link>
          <Link href="/services" style={{ display: "flex", alignItems: "center", gap: 6, background: "#f7f9fc", color: "#526983", borderRadius: 9, padding: "9px 14px", fontSize: ".68rem", fontWeight: 700, textDecoration: "none" }}>
            <FileText size={13} /> طلب خدمة جديدة
          </Link>
        </div>
      </div>

    </div>
  );
}
