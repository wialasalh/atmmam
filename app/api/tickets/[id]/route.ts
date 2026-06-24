import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  "جديدة":          ["قيد المراجعة", "مغلقة"],
  "قيد المراجعة":   ["بانتظار العميل", "تم الحل", "جديدة"],
  "بانتظار العميل": ["قيد المراجعة", "تم الحل", "مغلقة"],
  "تم الحل":        ["مغلقة", "قيد المراجعة"],
  "مغلقة":          [],
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  let ticket;
  if (isStaff && serviceClient) {
    const { data } = await serviceClient
      .from("tickets")
      .select(`
        *,
        profiles:user_id(full_name, email, phone),
        assigned_profile:assigned_to(id, full_name),
        client:client_id(id, name, client_type, commercial_number),
        locked_profile:locked_by(id, full_name)
      `)
      .eq("id", id)
      .single();
    ticket = data;

    // Update presence: staff is viewing
    if (ticket) {
      await serviceClient.from("ticket_presence").upsert({
        ticket_id: id,
        user_id: user.id,
        last_seen_at: new Date().toISOString(),
      });
    }
  } else {
    const { data } = await supabase
      .from("tickets")
      .select(`*, client:client_id(name, client_type)`)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    ticket = data;
  }

  if (!ticket) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });

  // Get active viewers (agent collision detection)
  let activeViewers: { user_id: string; full_name: string; last_seen_at: string }[] = [];
  if (isStaff && serviceClient) {
    const cutoff = new Date(Date.now() - 30 * 1000).toISOString(); // 30 seconds
    const { data: presence } = await serviceClient
      .from("ticket_presence")
      .select("user_id, last_seen_at, profiles:user_id(full_name)")
      .eq("ticket_id", id)
      .neq("user_id", user.id)
      .gte("last_seen_at", cutoff);

    activeViewers = (presence || []).map((p: { user_id: string; last_seen_at: string; profiles: { full_name: string }[] | null }) => ({
      user_id: p.user_id,
      full_name: p.profiles?.[0]?.full_name || "مستخدم",
      last_seen_at: p.last_seen_at,
    }));
  }

  return NextResponse.json({ data: ticket, activeViewers });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  if (!isStaff) return NextResponse.json({ error: "لا يمكنك تعديل التذكرة" }, { status: 403 });

  const body = await request.json();
  const { status, assigned_to, priority, resolution_note } = body;

  const client = serviceClient || supabase;

  // Validate status transition
  if (status) {
    const { data: current } = await client.from("tickets").select("status").eq("id", id).single();
    if (!current) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });

    const allowed = STATUS_TRANSITIONS[current.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json({
        error: `لا يمكن الانتقال من "${current.status}" إلى "${status}"`,
        allowed,
      }, { status: 422 });
    }

    // Closing requires resolution note
    if (status === "مغلقة" && !resolution_note?.trim()) {
      return NextResponse.json({ error: "يجب كتابة ملاحظة الإغلاق قبل إغلاق التذكرة" }, { status: 422 });
    }
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) {
    updateData.status = status;
    if (status === "تم الحل") updateData.resolved_at = new Date().toISOString();
    if (status === "مغلقة") {
      updateData.closed_at = new Date().toISOString();
      if (resolution_note) updateData.resolution_note = resolution_note.trim();
    }
  }
  if (assigned_to !== undefined) {
    updateData.assigned_to = assigned_to;
    updateData.assigned_at = new Date().toISOString();
  }
  if (priority) updateData.priority = priority;

  const { data: updated, error: updateError } = await client
    .from("tickets")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Log status change
  if (status && serviceClient) {
    const { data: prev } = await serviceClient.from("tickets").select("status").eq("id", id).single();
    await serviceClient.from("ticket_status_history").insert({
      ticket_id: id,
      from_status: prev?.status || null,
      to_status: status,
      changed_by: user.id,
      note: resolution_note || null,
    });

    // Add status change as internal message
    await serviceClient.from("ticket_messages").insert({
      ticket_id: id,
      user_id: user.id,
      body: `تم تغيير الحالة إلى: ${status}${resolution_note ? `\n${resolution_note}` : ""}`,
      is_internal: false,
      message_type: "status_change",
    });
  }

  // Log assignment change
  if (assigned_to && serviceClient) {
    await serviceClient.from("ticket_assignments").insert({
      ticket_id: id,
      assigned_to,
      assigned_by: user.id,
    });
  }

  return NextResponse.json({ data: updated });
}
