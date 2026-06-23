import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  let query = supabase
    .from("ticket_messages")
    .select("*, profiles:user_id(full_name)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

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

  const { data: messages, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ data: messages });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  if (!body.body || !body.body.trim()) {
    return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 });
  }

  // Verify access to ticket
  const { data: ticket } = await supabase
    .from("tickets")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!ticket) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);
  const isOwner = ticket.user_id === user.id;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { data: message, error: insertError } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: id,
      user_id: user.id,
      body: body.body.trim(),
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Update ticket timestamp
  await supabase
    .from("tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ data: message }, { status: 201 });
}
