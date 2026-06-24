import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET() {
  if (!serviceClient) return NextResponse.json({ data: [] });
  const { data } = await serviceClient
    .from("kb_articles")
    .select("id, title, body, category, created_at")
    .eq("category", "ردود جاهزة")
    .order("title");
  return NextResponse.json({ data: data || [] });
}

export async function POST(req: Request) {
  if (!serviceClient) return NextResponse.json({ error: "not_configured" }, { status: 500 });
  const body = await req.json();
  const { data, error } = await serviceClient
    .from("kb_articles")
    .insert({
      title: body.title,
      body: body.body,
      category: "ردود جاهزة",
      is_published: true,
      created_by: body.created_by || null,
    })
    .select("id, title, body, category")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!serviceClient) return NextResponse.json({ error: "not_configured" }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  await serviceClient.from("kb_articles").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
