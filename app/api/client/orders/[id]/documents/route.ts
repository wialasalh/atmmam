import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function verifyOrderOwnership(orderId: string, userId: string) {
  if (!serviceClient) return false;
  const { data: clients } = await serviceClient
    .from("clients")
    .select("id")
    .eq("user_id", userId);
  if (!clients?.length) return false;

  const clientIds = clients.map(c => c.id);
  const { data: order } = await serviceClient
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .maybeSingle();
  return !!order;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!serviceClient) return NextResponse.json({ error: "الخدمة غير متوفرة" }, { status: 503 });

  const owned = await verifyOrderOwnership(id, user.id);
  if (!owned) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  const { data, error } = await serviceClient
    .from("order_documents")
    .select("id, name, status, storage_path, rejection_reason, uploaded_at, created_at")
    .eq("order_id", id)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all((data ?? []).map(async (doc) => {
    if (!doc.storage_path) return { ...doc, storage_path: undefined, download_url: null };
    const { data: signed } = await serviceClient!.storage
      .from("order-documents")
      .createSignedUrl(doc.storage_path, 3600);
    return { ...doc, storage_path: undefined, download_url: signed?.signedUrl ?? null };
  }));

  return NextResponse.json({ data: withUrls });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!serviceClient) return NextResponse.json({ error: "الخدمة غير متوفرة" }, { status: 503 });

  const owned = await verifyOrderOwnership(id, user.id);
  if (!owned) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  const name = String(form.get("name") ?? "مستند").trim() || "مستند";

  if (!(file instanceof File)) return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "نوع الملف غير مدعوم — PDF أو صورة فقط" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "حجم الملف يتجاوز 10 ميجابايت" }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await serviceClient.storage
    .from("order-documents")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await serviceClient
    .from("order_documents")
    .insert({
      order_id: id,
      name,
      storage_path: storagePath,
      status: "received",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    await serviceClient.storage.from("order-documents").remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // سجّل في نشاط الطلب
  try {
    await serviceClient.from("order_activity").insert({
      order_id: id,
      actor_id: user.id,
      event_type: "document_uploaded",
      message: `العميل رفع مستنداً: ${name}`,
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ data }, { status: 201 });
}
