"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import "../dashboard/dashboard.css";

function RegisterForm() {
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation");

  const [form, setForm] = useState({ fullName: "", companyName: "", email: "", phone: "", password: "", confirm: "" });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmLink, setConfirmLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInvite, setIsInvite] = useState(false);

  useEffect(() => {
    if (invitationToken) setIsInvite(true);
  }, [invitationToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(""); setLoading(true);

    if (form.password !== form.confirm) { setMessage("كلمتا المرور غير متطابقتين"); setLoading(false); return; }
    if (form.password.length < 6) { setMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); setLoading(false); return; }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          clientType: invitationToken ? "person" : (form.companyName ? "company" : "person"),
          companyName: !invitationToken && form.companyName ? form.companyName : undefined,
          invitationToken: invitationToken || undefined,
        }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { setMessage(`خطأ في الاستجابة: ${text}`); setLoading(false); return; }
      if (!res.ok) { setMessage(data.error || `فشل (${res.status}): ${text}`); return; }
      setSuccess(true);
      if (data.confirmationLink) setConfirmLink(data.confirmationLink);
      // Invited members go straight to login
      if (invitationToken) {
        setTimeout(() => { window.location.href = "/login?invited=1"; }, 1500);
      }
    } catch {
      setMessage("حدث خطأ في الاتصال");
    } finally { setLoading(false); }
  }

  if (success) {
    return (
      <>
        <Header />
        <main className="client-auth-page" dir="rtl">
        <section className="client-auth-card">
          <Link href="/"><img src="/assets/logo/atmmam-ai-lockup.png" alt="أتمم" className="client-auth-logo" /></Link>
          <h1>تم إنشاء الحساب</h1>
          {isInvite ? (
            <p className="client-auth-sub">تم قبول الدعوة بنجاح. سيتم تحويلك لتسجيل الدخول...</p>
          ) : (
            <p className="client-auth-sub">يرجى التحقق من بريدك الإلكتروني <strong>{form.email}</strong> وتأكيد الحساب للتمكن من تسجيل الدخول وإرسال تذاكر الدعم ورفع المستندات.</p>
          )}
          {confirmLink && process.env.NODE_ENV === "development" && (
            <div style={{ background: "#f0f7ff", padding: "12px 14px", borderRadius: 10, marginBottom: 16, fontSize: ".65rem", color: "#2a4a6a", wordBreak: "break-all" }}>
              <strong>رابط التفعيل (بيئة تطوير):</strong><br />
              <a href={confirmLink} style={{ color: "#0875dc" }}>{confirmLink}</a>
            </div>
          )}
          <Link href="/login" className="client-auth-btn" style={{ display: "block", textAlign: "center", marginTop: 16 }}>تسجيل الدخول</Link>
        </section>
      </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="client-auth-page" dir="rtl">
        <section className="client-auth-card">
        <Link href="/"><img src="/assets/logo/atmmam-ai-lockup.png" alt="أتمم" className="client-auth-logo" /></Link>
        {isInvite ? (
          <>
            <h1>قبول الدعوة</h1>
            <p className="client-auth-sub">أنت مدعو للانضمام كموظف/ممثل — أنشئ حسابك للبدء</p>
          </>
        ) : (
          <>
            <h1>إنشاء حساب جديد</h1>
            <p className="client-auth-sub">سجل الآن لتتمكن من متابعة طلباتك ورفع المستندات</p>
          </>
        )}
        <form onSubmit={handleSubmit}>
          <label>
            <span>الاسم الكامل</span>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="مثال: محمد أحمد" />
          </label>
          {!isInvite && (
            <label>
              <span>اسم المؤسسة أو الكيان (اختياري)</span>
              <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="مثال: مؤسسة النهضة للتجارة" />
            </label>
          )}
          <div className="client-auth-row">
            <label>
              <span>البريد الإلكتروني</span>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </label>
            <label>
              <span>رقم الجوال</span>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" />
            </label>
          </div>
          <div className="client-auth-row">
            <label>
              <span>كلمة المرور</span>
              <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} placeholder="••••••••" />
            </label>
            <label>
              <span>تأكيد كلمة المرور</span>
              <input required type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} minLength={6} placeholder="••••••••" />
            </label>
          </div>
          {message && <output className="client-auth-msg">{message}</output>}
          <button type="submit" className="client-auth-btn" disabled={loading}>{loading ? "جاري..." : "إنشاء الحساب"}</button>
        </form>
        <p className="client-auth-footer">لديك حساب بالفعل؟ <Link href="/login">تسجيل الدخول</Link></p>
      </section>
    </main>
    </>
  );
}

export default function ClientRegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
