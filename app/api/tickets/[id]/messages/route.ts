import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(_req, { params }) {
  const { id } = await params;
  const client = makeClient();

  const { data, error } = await client
    .from("ticket_messages")
    .select("id, ticket_id, user_id, body, created_at, is_internal, message_type")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((data || []).map(m => m.user_id).filter(Boolean))];
  let profileMap = {};
  if (userIds.length) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, full_name, role")
      .in("id", userIds);
    profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  }

  const enriched = (data || []).map(m => ({
    ...m,
    sender: profileMap[m.user_id] || { full_name: "مستخدم", role: "client" },
  }));

  return NextResponse.json({ data: enriched });
}

export async function POST(req, { params }) {
  const { id } = await params;
  const client = makeClient();
  const body = await req.json();

  if (!body.body || !body.body.trim()) {
    return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
  }

  const { data, error } = await client
    .from("ticket_messages")
    .insert({
      ticket_id: id,
      user_id: body.user_id,
      body: body.body.trim(),
      is_internal: body.is_internal || false,
      message_type: body.message_type || "reply",
    })
    .select("id, ticket_id, user_id, body, created_at, is_internal, message_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await client.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ data });
}
