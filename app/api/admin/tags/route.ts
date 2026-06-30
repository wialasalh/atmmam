import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tags: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { name, color } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const { data, error } = await supabase.from("tags").insert({ name, color: color || "#0875dc" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { id } = await req.json();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { ticketId, tagId, action } = await req.json();
  if (action === "add") {
    await supabase.from("ticket_tags").upsert({ ticket_id: ticketId, tag_id: tagId });
  } else {
    await supabase.from("ticket_tags").delete().eq("ticket_id", ticketId).eq("tag_id", tagId);
  }
  const { data } = await supabase
    .from("ticket_tags").select("tag_id, tags(id, name, color)").eq("ticket_id", ticketId);
  return NextResponse.json({ tags: (data || []).map((r: any) => r.tags) });
}
