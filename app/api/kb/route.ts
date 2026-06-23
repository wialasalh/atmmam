import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// GET: search or list articles
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const category = url.searchParams.get("category");

  let dbQuery = supabase
    .from("kb_articles")
    .select("id, title, body, category, tags, views_count, helpful_count")
    .eq("is_published", true)
    .order("helpful_count", { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
  }
  if (category) {
    dbQuery = dbQuery.eq("category", category);
  }

  dbQuery = dbQuery.limit(10);

  const { data: articles, error } = await dbQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment view count for single article
  const articleId = url.searchParams.get("id");
  if (articleId && user) {
    await supabase.rpc("increment_kb_views", { article_id: articleId }).catch(() => {});
  }

  return NextResponse.json({ data: articles });
}

// POST: create article (staff only)
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  const body = await request.json();
  const { title, articleBody, category, tags, is_published, from_message_id } = body;

  if (!title?.trim() || !articleBody?.trim()) {
    return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
  }

  // If converting from a ticket message
  let finalBody = articleBody.trim();
  if (from_message_id && serviceClient) {
    const { data: msg } = await serviceClient
      .from("ticket_messages")
      .select("body")
      .eq("id", from_message_id)
      .single();
    if (msg) finalBody = msg.body;
  }

  const { data: article, error: insertError } = await supabase
    .from("kb_articles")
    .insert({
      title: title.trim(),
      body: finalBody,
      category: category || "عام",
      tags: tags || [],
      is_published: is_published ?? false,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ data: article }, { status: 201 });
}
