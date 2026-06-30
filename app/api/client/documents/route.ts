import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function resolveClientId(service: ReturnType<typeof makeServiceClient>, userId: string): Promise<string | null> {
  // Direct owner
  const { data: directList } = await service.from("clients").select("id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1);
  if (directList?.[0]) return directList[0].id;

  // Member of another client
  const { data: profile } = await service.from("profiles").select("member_of_client_id").eq("id", userId).limit(1).maybeSingle();
  return profile?.member_of_client_id ?? null;
}

// GET — list documents for authenticated client
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const service = makeServiceClient();
  const clientId = await resolveClientId(service, user.id);
  if (!clientId) return NextResponse.json({ error: "لم يُعثر على سجل عميل" }, { status: 404 });

  const { data: docs, error } = await service
    .from("client_documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all((docs || []).map(async (d) => {
    const { data } = await service.storage.from("client-documents").createSignedUrl(d.storage_path, 3600);
    return { ...d, signedUrl: data?.signedUrl };
  }));

  return NextResponse.json({ data: withUrls, clientId });
}

// POST — upload a document
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const service = makeServiceClient();
  const clientId = await resolveClientId(service, user.id);
  if (!clientId) return NextResponse.json({ error: "لم يُعثر على سجل عميل" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fileName = (formData.get("fileName") as string | null)?.trim();
  const category = (formData.get("category") as string | null) || "general";
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!file) return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
  if (!fileName) return NextResponse.json({ error: "اسم الملف مطلوب" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.match(/\.([^.]+)$/)?.[1] ?? "bin";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await service.storage
    .from("client-documents")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return NextResponse.json({ error: "فشل رفع الملف: " + uploadErr.message }, { status: 500 });

  const { error: insertErr } = await service.from("client_documents").insert({
    client_id: clientId,
    filename: fileName,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    storage_path: storagePath,
    uploaded_by: user.id,
    category,
    description,
  });

  if (insertErr) {
    await service.storage.from("client-documents").remove([storagePath]);
    return NextResponse.json({ error: "فشل حفظ المستند: " + insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE — remove a document
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const service = makeServiceClient();
  const clientId = await resolveClientId(service, user.id);

  const { data: doc } = await service
    .from("client_documents")
    .select("storage_path, client_id")
    .eq("id", id)
    .single();

  if (!doc) return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
  if (doc.client_id !== clientId) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  await service.storage.from("client-documents").remove([doc.storage_path]);
  await service.from("client_documents").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
