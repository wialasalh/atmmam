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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = makeClient();
  const body = await req.json();

  const { staff_id, rating, comment } = body as {
    staff_id: string;
    rating: number;
    comment?: string;
  };

  if (!staff_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "بيانات التقييم غير صحيحة" }, { status: 400 });
  }

  // Authenticate
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // Verify ticket exists and belongs to this user
  const { data: ticket, error: ticketError } = await client
    .from("tickets")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });
  }

  // Only the ticket owner or staff can rate
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = profile && isStaffRole(profile.role);
  if (ticket.user_id !== user.id && !isStaff) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  // Check not already rated this staff for this ticket
  const { data: existing } = await client
    .from("ticket_messages")
    .select("id")
    .eq("ticket_id", id)
    .eq("message_type", "rating")
    .eq("user_id", user.id)
    .ilike("body", `%"staff_id":"${staff_id}"%`);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "لقد قمت بتقييم هذا المشرف مسبقاً" }, { status: 409 });
  }

  // Get staff name
  const { data: staffProfile } = await client
    .from("profiles")
    .select("full_name")
    .eq("id", staff_id)
    .single();

  const isPositive = rating >= 3;

  // Look up client name from auth (more reliable than JWT metadata)
  let clientName = user.user_metadata?.full_name || user.email?.split("@")[0] || "عميل";
  try {
    const { data: { user: authUser } } = await client.auth.admin.getUserById(user.id);
    if (authUser?.user_metadata?.full_name) {
      clientName = authUser.user_metadata.full_name;
    } else if (authUser?.email) {
      clientName = authUser.email.split("@")[0];
    }
  } catch {}

  // Save rating as a ticket message
  const { error: insertError } = await client.from("ticket_messages").insert({
    ticket_id: id,
    user_id: user.id,
    body: JSON.stringify({
      staff_id,
      staff_name: staffProfile?.full_name || "موظف",
      client_name: clientName,
      rating,
      like: isPositive,
      comment: comment || "",
    }),
    is_internal: false,
    message_type: "rating",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
}
