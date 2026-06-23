"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function signIn(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setMessage(""); const data = new FormData(event.currentTarget); try { const supabase = createSupabaseBrowserClient(); const { error } = await supabase.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) }); if (error) setMessage("تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور."); else window.location.href = "/admin/overview"; } catch { setMessage("لم يتم ربط قاعدة البيانات بعد. أضف مفاتيح Supabase للمتابعة."); } finally { setLoading(false); } }
  return <main className="admin-login" dir="rtl"><section><a href="/"><img src="/assets/logo/atmmam-logo-selected.png?v=2" alt="أتمم" /></a><p>لوحة العمليات</p><h1>تسجيل الدخول</h1><span>دخول مخصص لفريق أتمم المصرح له.</span><form onSubmit={signIn}><label><b>البريد الإلكتروني</b><input name="email" type="email" autoComplete="email" required placeholder="name@atmmam.com.sa" /></label><label><b>كلمة المرور</b><input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" /></label><button disabled={loading}>{loading ? "جاري التحقق..." : "دخول آمن"}</button><output>{message}</output></form><small>جميع محاولات الدخول والتغييرات المهمة تسجل لأغراض الحماية.</small></section></main>;
}
