"use client";

import { useState, FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Header } from "@/components/header";
import "../dashboard/dashboard.css";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setMessage("البريد الإلكتروني غير مؤكد. يرجى التحقق من بريدك والضغط على رابط التفعيل.");
        } else {
          setMessage("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, member_of_client_id")
        .eq("id", data.user.id)
        .single();

      // Allow invited members without email confirmation
      const isMember = !!profile?.member_of_client_id;
      if (!data.user?.email_confirmed_at && !isMember) {
        await supabase.auth.signOut();
        setMessage("البريد الإلكتروني غير مؤكد. يرجى التحقق من بريدك والضغط على رابط التفعيل.");
        return;
      }

      if (["admin", "manager", "operator", "viewer"].includes(profile?.role)) {
        await supabase.auth.signOut();
        setMessage("هذا الحساب خاص بلوحة تحكم الفريق");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setMessage("حدث خطأ في الاتصال");
    } finally { setLoading(false); }
  }

  return (
    <>
      <Header />
      <main className="client-auth-page" dir="rtl">
        <section className="client-auth-card">
          <Link href="/"><img src="/assets/logo/atmmam-ai-lockup.png" alt="أتمم" className="client-auth-logo" /></Link>
          <h1>تسجيل الدخول</h1>
          <p className="client-auth-sub">منطقة العميل — تابع طلباتك ومستنداتك</p>
          <form onSubmit={handleSubmit}>
            <label>
              <span>البريد الإلكتروني</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
            </label>
            <label>
              <span>كلمة المرور</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </label>
            {message && <output className="client-auth-msg">{message}</output>}
            <button type="submit" className="client-auth-btn" disabled={loading}>{loading ? "جاري..." : "دخول"}</button>
          </form>
          <p className="client-auth-footer">ليس لديك حساب؟ <Link href="/register">إنشاء حساب جديد</Link></p>
        </section>
      </main>
    </>
  );
}
