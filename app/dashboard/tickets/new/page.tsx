"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, ChevronRight } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "استفسار", label: "استفسار" },
  { value: "مشكلة تقنية", label: "مشكلة تقنية" },
  { value: "طلب توثيق", label: "طلب توثيق" },
  { value: "شكوى", label: "شكوى" },
  { value: "اقتراح", label: "اقتراح" },
  { value: "أخرى", label: "أخرى" },
];

const PRIORITIES = [
  { value: "عادية", label: "عادية" },
  { value: "مرتفعة", label: "مرتفعة" },
  { value: "عاجلة", label: "عاجلة" },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("استفسار");
  const [priority, setPriority] = useState("عادية");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category, priority }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "حدث خطأ");
        setSaving(false);
        return;
      }
      router.push(`/dashboard/tickets/${json.data.id}`);
    } catch {
      setError("حدث خطأ في الاتصال");
      setSaving(false);
    }
  }

  return (
    <div className="client-dash-page">
      <div className="client-dash-page-header">
        <div>
          <Link href="/dashboard/tickets" className="client-dash-back-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <ChevronRight size={14} /> العودة للتذاكر
          </Link>
          <h2 className="client-dash-page-title">تذكرة جديدة</h2>
        </div>
      </div>
      <p className="client-dash-page-desc">أرسل استفسارك أو طلبك لفريق الدعم.</p>

      <div className="client-dash-card">
        <form onSubmit={handleSubmit}>
          <label>
            <span>عنوان التذكرة *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ملخص مختصر للطلب"
              maxLength={200}
            />
          </label>

          <div className="client-auth-row">
            <label>
              <span>القسم</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="client-dash-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>الأولوية</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="client-dash-select"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>وصف الطلب *</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اشرح تفاصيل طلبك هنا..."
              rows={6}
              className="client-dash-textarea"
            />
          </label>

          {error && <output className="client-auth-msg">{error}</output>}

          <button type="submit" className="client-dash-primary-btn" disabled={saving} style={{ marginTop: 8 }}>
            <Send size={15} /> {saving ? "جاري الإرسال..." : "إرسال التذكرة"}
          </button>
        </form>
      </div>
    </div>
  );
}
