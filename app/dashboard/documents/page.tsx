"use client";

import { useEffect, useState } from "react";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
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

const CATEGORIES = [
  { value: "general", label: "عام", color: "#526983" },
  { value: "contract", label: "عقود", color: "#0875dc" },
  { value: "report", label: "تقارير", color: "#7c3aed" },
  { value: "certificate", label: "شهادات", color: "#15803d" },
  { value: "legal", label: "قانوني", color: "#b45309" },
  { value: "financial", label: "مالي", color: "#d97706" },
];

type DocRecord = {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string | null;
  description: string | null;
  created_at: string;
  storage_path: string;
  signedUrl?: string;
};

export default function DocumentsPage() {
  const supabase = createSupabaseBrowserClient();
  const [clientId, setClientId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileDesc, setFileDesc] = useState("");
  const [fileCategory, setFileCategory] = useState("general");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle();
    if (!client) { setLoading(false); return; }
    setClientId(client.id);

    const { data: records } = await supabase
      .from("client_documents")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    if (records) {
      const withUrls = await Promise.all(records.map(async (r) => {
        const { data } = await supabase.storage.from("client-documents").createSignedUrl(r.storage_path, 3600);
        return { ...r, signedUrl: data?.signedUrl };
      }));
      setDocs(withUrls);
    }
    setLoading(false);
  }

  async function handleUpload() {
    if (!fileName.trim()) { alert("الرجاء إدخال اسم للملف"); return; }
    if (!file) { alert("الرجاء اختيار ملف"); return; }
    if (!clientId) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const ext = file.name.split(".").pop();
    const storagePath = `${user.id}/${crypto.randomUUID()}/${file.name}`;

    const { error: uploadError } = await supabase.storage.from("client-documents").upload(storagePath, file);
    if (uploadError) { alert("فشل الرفع: " + uploadError.message); setUploading(false); return; }

    const { error: insertError } = await supabase.from("client_documents").insert({
      client_id: clientId,
      filename: fileName.trim(),
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: storagePath,
      uploaded_by: user.id,
      category: fileCategory,
      description: fileDesc.trim() || null,
    });

    if (insertError) {
      await supabase.storage.from("client-documents").remove([storagePath]);
      alert("فشل الحفظ: " + insertError.message);
      setUploading(false);
      return;
    }

    setShowUpload(false);
    setFileName("");
    setFileDesc("");
    setFileCategory("general");
    setFile(null);
    setUploading(false);
    load();
  }

  async function handleDelete(doc: DocRecord) {
    if (!confirm(`حذف "${doc.filename}"؟`)) return;
    await supabase.storage.from("client-documents").remove([doc.storage_path]);
    await supabase.from("client_documents").delete().eq("id", doc.id);
    load();
  }

  function getCategoryLabel(cat: string | null) {
    return CATEGORIES.find(c => c.value === cat)?.label || cat || "عام";
  }

  function getCategoryColor(cat: string | null) {
    return CATEGORIES.find(c => c.value === cat)?.color || "#526983";
  }

  const visible = filterCat ? docs.filter(d => d.category === filterCat) : docs;

  return (
    <div className="client-dash-page">
      <div className="client-dash-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <h2 className="client-dash-page-title" style={{ margin: 0 }}>مستنداتي</h2>
          <p className="client-dash-page-desc" style={{ margin: "4px 0 0" }}>إدارة مستندات منشآتك — عقود، تقارير، شهادات، ومستندات رسمية.</p>
        </div>
        <button className="client-dash-primary-btn" onClick={() => setShowUpload(true)} style={{ cursor: "pointer", border: "none", height: 40, padding: "0 18px", fontSize: ".7rem", fontWeight: 700, gap: 6, borderRadius: 10 }}>
          <Upload size={14} /> رفع مستند
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => setFilterCat("")} style={{ padding: "6px 14px", border: `1px solid ${!filterCat ? "#0875dc" : "#e5eaf0"}`, borderRadius: 20, background: !filterCat ? "#eaf4ff" : "#fff", color: !filterCat ? "#0875dc" : "#526983", fontSize: ".62rem", fontWeight: 700, cursor: "pointer", font: "inherit" }}>
          الكل ({docs.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = docs.filter(d => d.category === cat.value).length;
          return count > 0 ? (
            <button key={cat.value} onClick={() => setFilterCat(cat.value)}
              style={{ padding: "6px 14px", border: `1px solid ${filterCat === cat.value ? cat.color : "#e5eaf0"}`, borderRadius: 20, background: filterCat === cat.value ? `${cat.color}15` : "#fff", color: filterCat === cat.value ? cat.color : "#526983", fontSize: ".62rem", fontWeight: 700, cursor: "pointer", font: "inherit" }}>
              {cat.label} ({count})
            </button>
          ) : null;
        })}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 999, display: "grid", placeItems: "center", padding: 20 }}
          onClick={() => { if (!uploading) setShowUpload(false); }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460, padding: 24, boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", fontSize: ".85rem", color: "#073766" }}>رفع مستند جديد</h3>
            <p style={{ margin: "0 0 16px", fontSize: ".62rem", color: "#8b9dad" }}>اختر الملف وحدد التصنيف.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: ".65rem", fontWeight: 700, color: "#425c76", display: "block", marginBottom: 4 }}>اسم المستند *</label>
                <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="مثال: عقد تأسيس, تقرير سنوي"
                  style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid #dce3eb", borderRadius: 8, fontSize: ".72rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: ".65rem", fontWeight: 700, color: "#425c76", display: "block", marginBottom: 4 }}>التصنيف</label>
                <select value={fileCategory} onChange={e => setFileCategory(e.target.value)}
                  style={{ width: "100%", height: 40, padding: "0 10px", border: "1px solid #dce3eb", borderRadius: 8, fontSize: ".72rem", outline: "none", background: "#fff", font: "inherit" }}>
                  {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: ".65rem", fontWeight: 700, color: "#425c76", display: "block", marginBottom: 4 }}>وصف (اختياري)</label>
                <input value={fileDesc} onChange={e => setFileDesc(e.target.value)} placeholder="ملاحظة مختصرة عن المستند"
                  style={{ width: "100%", height: 40, padding: "0 12px", border: "1px solid #dce3eb", borderRadius: 8, fontSize: ".72rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", border: "1px dashed #dce3eb", borderRadius: 8, cursor: "pointer", fontSize: ".7rem", color: "#8b9dad", background: file ? "#f0fdf4" : "#fafbfc", borderColor: file ? "#bbf7d0" : "#dce3eb" }}>
                  <Upload size={16} color={file ? "#15803d" : "#8b9dad"} />
                  {file ? file.name : "اختر ملف للرفع"}
                  <input type="file" accept={ALLOWED_EXTENSIONS} style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
                </label>
              </div>
            </div>

            {uploading && <div style={{ marginTop: 12, fontSize: ".7rem", color: "#8b9dad", textAlign: "center" }}>جاري الرفع...</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowUpload(false)} disabled={uploading}
                style={{ flex: 1, height: 40, border: "1px solid #dce3eb", borderRadius: 8, background: "#fff", color: "#526983", cursor: "pointer", font: "inherit", fontSize: ".7rem", fontWeight: 700 }}>إلغاء</button>
              <button onClick={handleUpload} disabled={uploading || !file || !fileName.trim()}
                style={{ flex: 1, height: 40, border: 0, borderRadius: 8, background: uploading || !file || !fileName.trim() ? "#e5eaf0" : "#073766", color: uploading || !file || !fileName.trim() ? "#aab5c3" : "#fff", cursor: uploading || !file || !fileName.trim() ? "not-allowed" : "pointer", font: "inherit", fontSize: ".7rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Upload size={14} /> رفع
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="client-dash-empty"><Loader2 size={30} style={{ animation: "spin 1s linear infinite" }} /></div>
      ) : visible.length === 0 ? (
        <div className="client-dash-empty">
          <FileText size={40} />
          <p>{filterCat ? "لا توجد مستندات في هذا التصنيف" : "لا توجد مستندات مرفوعة بعد."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map(doc => {
            const cat = doc.category || "general";
            const catColor = getCategoryColor(cat);
            return (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #e5ebf3", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${catColor}15`, display: "grid", placeItems: "center", color: catColor, flexShrink: 0 }}>
                  <FileText size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: ".72rem", color: "#1a2d40" }}>{doc.filename}</strong>
                    <span style={{ fontSize: ".55rem", padding: "1px 8px", borderRadius: 10, background: `${catColor}15`, color: catColor, fontWeight: 700, whiteSpace: "nowrap" }}>{getCategoryLabel(cat)}</span>
                  </div>
                  {doc.description && <div style={{ fontSize: ".6rem", color: "#8b9dad", marginTop: 2 }}>{doc.description}</div>}
                  <div style={{ fontSize: ".58rem", color: "#aab5c3", marginTop: 2 }}>
                    {doc.original_name}
                    {doc.size_bytes ? ` · ${(doc.size_bytes / 1024).toFixed(0)} KB` : ""}
                    {" · " + new Date(doc.created_at).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {doc.signedUrl && (
                    <a href={doc.signedUrl} target="_blank" rel="noopener" style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 8, background: "#f0f4f8", color: "#5a6b7d" }}>
                      <Download size={14} />
                    </a>
                  )}
                  <button onClick={() => handleDelete(doc)} style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 8, background: "#fef2f2", color: "#dc2626", border: "none", cursor: "pointer" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
