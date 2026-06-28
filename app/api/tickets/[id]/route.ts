import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/auth/roles";

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

  // Check access: ticket owner or staff
  const { data: ticket } = await client
    .from("tickets")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!ticket) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && isStaffRole(profile.role);
  if (ticket.user_id !== user.id && !isStaff) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { data: fullTicket, error } = await client
    .from("tickets")
    .select("id, title, body, status, priority, category, created_at, updated_at, client_id, assigned_to, clients(id, name, phone, email, commercial_number, company_activity, city, company_status, entity_size, employee_count)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: fullTicket });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = makeClient();
  const body = await req.json();

  // Authenticate
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // Fetch the ticket to verify ownership & get old data
  const { data: ticket, error: fetchError } = await client
    .from("tickets")
    .select("id, title, body, status, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !ticket) {
    return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });
  }

  // Only the ticket owner (client) or staff can edit
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && isStaffRole(profile.role);
  if (ticket.user_id !== user.id && !isStaff) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  // Handle cancellation (client closing their own ticket)
  if (body.status === "مغلقة") {
    const updates: Record<string, unknown> = {
      status: "مغلقة",
      updated_at: new Date().toISOString(),
    };

    const { error: closeErr } = await client.from("tickets").update(updates).eq("id", id);
    if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 500 });

    // Log to ticket_status_history
    await client.from("ticket_status_history").insert({
      ticket_id: id,
      from_status: ticket.status,
      to_status: "مغلقة",
      changed_by: user.id,
      note: body.note || "إلغاء من قبل العميل",
    });

    // Add closure message
    await client.from("ticket_messages").insert({
      ticket_id: id,
      user_id: user.id,
      body: `🔒 تم إغلاق التذكرة من قبل العميل${body.note ? `: ${body.note.trim()}` : ""}`,
      is_internal: false,
      message_type: "status_change",
    });

    return NextResponse.json({ data: { id, status: "مغلقة" } });
  }

  // Build updates for editing title/body
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const changes: string[] = [];

  if (body.title !== undefined && body.title.trim() !== ticket.title) {
    updates.title = body.title.trim();
    changes.push(`تم تغيير العنوان من "${ticket.title}" إلى "${body.title.trim()}"`);
  }

  if (body.body !== undefined && body.body.trim() !== ticket.body) {
    updates.body = body.body.trim();
    changes.push(`تم تعديل محتوى التذكرة`);
  }

  if (changes.length === 0) {
    return NextResponse.json({ data: ticket, message: "لا توجد تغييرات" });
  }

  // Save revision as a ticket message (archive the old version - internal for staff)
  await client.from("ticket_messages").insert({
    ticket_id: id,
    user_id: user.id,
    body: `📝 تعديل على التذكرة:\n${changes.join("\n")}\n\n--- النسخة القديمة ---\nالعنوان: ${ticket.title}\nالمحتوى: ${ticket.body}`,
    is_internal: true,
    message_type: "revision",
  });

  // Visible notice for the client
  await client.from("ticket_messages").insert({
    ticket_id: id,
    user_id: user.id,
    body: `📝 تم تعديل التذكرة`,
    is_internal: false,
    message_type: "revision",
  });

  // Apply the update
  const { data: updated, error: updateError } = await client
    .from("tickets")
    .update(updates)
    .eq("id", id)
    .select("id, title, body, status, priority, category, created_at, updated_at, client_id, assigned_to")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ data: updated });
}
