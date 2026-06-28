import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed, retryAfter } = rateLimit(`login:${ip}`, 10, 60_000);
    if (!allowed)
      return NextResponse.json({ error: "محاولات كثيرة، حاول بعد قليل" }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Check if user is a client (not admin)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin" || profile?.role === "manager" || profile?.role === "operator") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "هذا الحساب خاص بلوحة التحكم" }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        user: data.user,
        session: data.session,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "حدث خطأ في تسجيل الدخول" }, { status: 500 });
  }
}
