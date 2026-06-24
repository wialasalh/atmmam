import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  if (!isStaff) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("user_id")
      .eq("id", id)
      .single();
    if (!ticket || ticket.user_id !== user.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }

  const client = isStaff && serviceClient ? serviceClient : supabase;

  let query = client
    .from("ticket_messages")
    .select("*, profiles:user_id(full_name, role)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  // Clients cannot see internal notes
  if (!isStaff) {
    query = query.eq("is_internal", false);
  }

  const { data: messages, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });

  // Mark ticket as viewed by staff
  if (isStaff && serviceClient) {
    await serviceClient.from("tickets").update({ viewed_by_staff: true }).eq("id", id);
  }

  return NextResponse.json({ data: messages });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { body: msgBody, is_internal, message_type } = body;

  if (!msgBody?.trim()) {
    return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  // Verify access
  const { data: ticket } = await supabase
    .from("tickets")
    .select("user_id, status")
    .eq("id", id)
    .single();

  if (!ticket) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });
  if (ticket.status === "مغلقة") return NextResponse.json({ error: "التذكرة مغلقة" }, { status: 422 });

  const isOwner = ticket.user_id === user.id;
  if (!isStaff && !isOwner) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // Only staff can post internal notes
  const isInternalNote = isStaff && is_internal === true;

  const { data: message, error: insertError } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: id,
      user_id: user.id,
      body: msgBody.trim(),
      is_internal: isInternalNote,
      message_type: message_type || (isInternalNote ? "internal_note" : "reply"),
    })
    .select("*, profiles:user_id(full_name, role)")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Update ticket: if client replied → set status to قيد المراجعة
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (isOwner && ticket.status === "بانتظار العميل") {
    updateData.status = "قيد المراجعة";
    // Log status change
    if (serviceClient) {
      await serviceClient.from("ticket_status_history").insert({
        ticket_id: id,
        from_status: "بانتظار العميل",
        to_status: "قيد المراجعة",
        changed_by: user.id,
        note: "رد العميل تلقائياً",
      });
    }
  }

  await supabase.from("tickets").update(updateData).eq("id", id);

  return NextResponse.json({ data: message }, { status: 201 });
}
