import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("key, data, updated_at")
    .order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const map: Record<string, unknown> = {};
  for (const row of data ?? []) map[row.key] = { data: row.data, updated_at: row.updated_at };
  return NextResponse.json({ data: map });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { key, data } = await req.json();
  if (!key || data === undefined) return NextResponse.json({ error: "key and data required" }, { status: 400 });
  const { error } = await supabase
    .from("site_content")
    .upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
