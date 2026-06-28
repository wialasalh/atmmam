import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const serviceClient = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
})();

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  if (!serviceClient) return NextResponse.json({ error: "service not configured" }, { status: 503 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  // Find valid invitation
  const { data: inv, error: invErr } = await serviceClient
    .from("client_invitations")
    .select("id, client_id, email, full_name, status, expires_at")
    .eq("token", token)
    .single();

  if (invErr || !inv) return NextResponse.json({ error: "الدعوة غير صالحة" }, { status: 404 });
  if (inv.status !== "pending") return NextResponse.json({ error: "تم استخدام هذه الدعوة مسبقاً" }, { status: 400 });
  if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: "انتهت صلاحية الدعوة" }, { status: 400 });

  // Link user profile to client as member
  const { error: profileErr } = await serviceClient
    .from("profiles")
    .update({ role: "member", member_of_client_id: inv.client_id, full_name: inv.full_name || undefined })
    .eq("id", user.id);

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

  // Mark invitation as accepted
  await serviceClient
    .from("client_invitations")
    .update({ status: "accepted" })
    .eq("id", inv.id);

  return NextResponse.json({ success: true, client_id: inv.client_id });
}
