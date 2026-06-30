import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const ticketId = new URL(req.url).searchParams.get("ticket_id");
  if (!ticketId) return NextResponse.json({ error: "ticket_id required" }, { status: 400 });
  const { data } = await supabase
    .from("ticket_time_logs")
    .select("*, profiles(full_name)")
    .eq("ticket_id", ticketId)
    .order("logged_at", { ascending: false });
  const total = (data || []).reduce((s: number, r: any) => s + r.minutes, 0);
  return NextResponse.json({ logs: data || [], total_minutes: total });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { ticket_id, minutes, note } = await req.json();
  if (!ticket_id || !minutes) return NextResponse.json({ error: "ticket_id and minutes required" }, { status: 400 });
  const { error } = await supabase.from("ticket_time_logs").insert({ ticket_id, user_id: user.id, minutes: Number(minutes), note });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
