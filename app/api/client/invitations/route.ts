import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const serviceClient = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
})();

// GET — list invitations for a client
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const clientId = new URL(request.url).searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  // Verify ownership
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).eq("user_id", user.id).single();
  if (!client) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("client_invitations")
    .select("id, email, full_name, status, token, expires_at, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST — send invitation
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { client_id, email, full_name } = body;
  if (!client_id || !email) return NextResponse.json({ error: "client_id و email مطلوبان" }, { status: 400 });

  // Verify ownership
  const { data: client } = await supabase.from("clients").select("id, name").eq("id", client_id).eq("user_id", user.id).single();
  if (!client) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Create invitation record
  const { data: inv, error: invErr } = await supabase
    .from("client_invitations")
    .insert({ client_id, invited_by: user.id, email, full_name: full_name || null })
    .select("id, token")
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://atmmam.com"}/register?invitation=${inv.token}`;

  // Send invitation email via Resend
  if (resend) {
    try {
      await resend.emails.send({
        from: "أتمم <noreply@atmmam.com>",
        to: email,
        subject: `دعوة للانضمام إلى ${client.name} على منصة أتمم`,
        html: `
          <div dir="rtl" style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f8fafc;border-radius:16px">
            <img src="https://atmmam.com/assets/logo/atmmam-ai-lockup.png" alt="أتمم" style="height:36px;margin-bottom:24px"/>
            <h2 style="color:#0b1e36;margin:0 0 8px">مرحباً ${full_name || ""}،</h2>
            <p style="color:#425c76;margin:0 0 24px">تمت دعوتك للانضمام إلى منشأة <strong>${client.name}</strong> على منصة أتمم.</p>
            <a href="${inviteUrl}" style="display:inline-block;background:#0875dc;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">قبول الدعوة</a>
            <p style="color:#9aafbf;font-size:13px;margin-top:24px">أو انسخ هذا الرابط: <span style="color:#0875dc">${inviteUrl}</span></p>
            <p style="color:#c8d6e4;font-size:12px;margin-top:16px">تنتهي صلاحية هذه الدعوة خلال 7 أيام.</p>
          </div>
        `,
      });
    } catch {
      // Email failure doesn't block the invitation — token still works
    }
  }

  return NextResponse.json({ data: { token: inv.token, invite_url: inviteUrl } });
}

// DELETE — cancel invitation
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("client_invitations")
    .delete()
    .eq("id", id)
    .eq("invited_by", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
