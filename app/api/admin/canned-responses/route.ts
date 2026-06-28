import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const DEFAULTS = [
  { id: "def-1", title: "استفسار عام",      body: "شكراً لتواصلك مع فريق الدعم. سيتم الرد على استفسارك في أقرب وقت ممكن." },
  { id: "def-2", title: "تم الاستلام",      body: "تم استلام طلبك وسيتم معالجته من قبل المختصين. سنتواصل معك فور الانتهاء." },
  { id: "def-3", title: "نعمل على طلبك",   body: "نعتذر عن التأخير، جاري العمل على طلبك وسيتم إعلامك بأي تحديث." },
  { id: "def-4", title: "طلب توضيح",       body: "هل يمكنك توضيح المطلوب أكثر؟ نحتاج تفاصيل إضافية لمتابعة الطلب." },
  { id: "def-5", title: "إغلاق التذكرة",   body: "تم إغلاق التذكرة. إذا كان لديك أي استفسار آخر، يمكنك فتح تذكرة جديدة." },
];

export async function GET() {
  if (!serviceClient) return NextResponse.json({ data: DEFAULTS });
  await requireRole("operator");
  const { data } = await serviceClient
    .from("kb_articles")
    .select("id, title, body, category, created_at")
    .eq("category", "ردود جاهزة")
    .order("title");
  if (data && data.length > 0) return NextResponse.json({ data: data || [] });
  return NextResponse.json({ data: DEFAULTS });
}

export async function POST(req: Request) {
  if (!serviceClient) return NextResponse.json({ error: "not_configured" }, { status: 500 });
  await requireRole("operator");
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
  await requireRole("operator");
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  await serviceClient.from("kb_articles").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
