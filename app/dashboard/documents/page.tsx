"use client";

import { useEffect, useState } from "react";
import { FileText, Upload, Download, AlertTriangle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
];

const ALLOWED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png";

export default function DocumentsPage() {
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email_confirmed_at) setEmailConfirmed(true);
    });
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("نوع الملف غير مدعوم. الملفات المسموحة: " + ALLOWED_EXTENSIONS);
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("حجم الملف يتجاوز 10 ميجابايت");
      e.target.value = "";
      return;
    }
    // Upload logic goes here later
    alert("تم اختيار الملف: " + file.name);
  }

  return (
    <div className="client-dash-page">
      <div className="client-dash-page-header">
        <h2 className="client-dash-page-title">مستنداتي</h2>
        {emailConfirmed ? (
          <label className="client-dash-primary-btn" style={{ cursor: "pointer" }}>
            <Upload size={15} /> رفع مستند
            <input type="file" accept={ALLOWED_EXTENSIONS} style={{ display: "none" }} onChange={handleFileChange} />
          </label>
        ) : (
          <span className="client-dash-secondary-btn" style={{ opacity: .5, cursor: "not-allowed" }}>
            <Upload size={15} /> رفع مستند
          </span>
        )}
      </div>
      <p className="client-dash-page-desc">المستندات المرفوعة مع طلباتك. الصيغ المسموحة: PDF, Word, Excel, PowerPoint, نص, صور.</p>

      {!emailConfirmed && (
        <div className="client-dash-section" style={{ background: "#fef9e7", borderColor: "#fde68a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} color="#b8860b" />
            <p style={{ margin: 0, fontSize: ".68rem", color: "#92400e" }}>
              يجب تأكيد البريد الإلكتروني أولاً لرفع المستندات. تحقق من بريدك الوارد.
            </p>
          </div>
        </div>
      )}

      <div className="client-dash-empty">
        <FileText size={40} />
        <p>لا توجد مستندات مرفوعة بعد.</p>
      </div>
    </div>
  );
}
