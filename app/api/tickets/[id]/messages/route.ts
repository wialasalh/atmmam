import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = makeClient();

  // Authenticate
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Verify ticket ownership for clients
  const isStaff = await isStaffUser(supabase, user.id);
  if (!isStaff) {
    const { data: ticket } = await client
      .from("tickets")
      .select("user_id")
      .eq("id", id)
      .single();
    if (!ticket || ticket.user_id !== user.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }

  let query = client
    .from("ticket_messages")
    .select("id, ticket_id, user_id, body, created_at, is_internal, message_type")
    .eq("ticket_id", id);

  // Clients cannot see internal notes
  if (!isStaff) query = query.neq("is_internal", true);

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((data || []).map(m => m.user_id).filter(Boolean))];
  let profileMap: Record<string, { full_name: string; role: string; avatar_url?: string }> = {};
  if (userIds.length) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, full_name, role, avatar_url")
      .in("id", userIds);
    profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p])) as Record<string, { full_name: string; role: string; avatar_url?: string }>;
  }

  const enriched = (data || []).map(m => {
    const sender = profileMap[m.user_id] || { full_name: "مستخدم", role: "client" };
    return { ...m, sender };
  });

  return NextResponse.json({ data: enriched });
}

async function isStaffUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data && ["admin", "manager", "operator"].includes(data.role);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = makeClient();
  const body = await req.json();

  if (!body.body || !body.body.trim()) {
    return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
  }

  // Get authenticated user from session
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data, error } = await client
    .from("ticket_messages")
    .insert({
      ticket_id: id,
      user_id: user.id,
      body: body.body.trim(),
      is_internal: body.is_internal || false,
      message_type: body.message_type || "reply",
    })
    .select("id, ticket_id, user_id, body, created_at, is_internal, message_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update ticket: bump updated_at AND auto-update status based on sender
  const isStaff = await isStaffUser(supabase, user.id);
  const statusUpdates: Record<string, string> = { updated_at: new Date().toISOString() };

  if (isStaff) {
    // Staff replied → set to "قيد المراجعة" unless it's already resolved/closed
    const { data: t } = await client
      .from("tickets")
      .select("status")
      .eq("id", id)
      .single();

    if (t && !["تم الحل", "مغلقة", "قيد المراجعة"].includes(t.status)) {
      statusUpdates.status = "قيد المراجعة";
    }
  } else {
    // Client replied → set to "بانتظار العميل"
    statusUpdates.status = "بانتظار العميل";
  }

  await client.from("tickets").update(statusUpdates).eq("id", id);

  return NextResponse.json({ data });
}
