import { NextResponse } from "next/server";
import { orderDocumentMetadataSchema } from "@/lib/validation/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxSize = 10 * 1024 * 1024;

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  await requireRole("operator");
  const { id } = await context.params; const parsed = orderDocumentMetadataSchema.shape.orderId.safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.from("order_documents").select("id,name,status,storage_path,rejection_reason,uploaded_at,created_at").eq("order_id", id).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const withSignedUrls = await Promise.all((data ?? []).map(async (document) => {
    if (!document.storage_path) return { ...document, storage_path: undefined, download_url: null };
    const { data: signed } = await supabase.storage.from("order-documents").createSignedUrl(document.storage_path, 60);
    return { ...document, storage_path: undefined, download_url: signed?.signedUrl ?? null };
  }));
  return NextResponse.json({ data: withSignedUrls });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  await requireRole("operator");
  const { id } = await context.params; const form = await request.formData(); const file = form.get("file"); const name = String(form.get("name") ?? "");
  const metadata = orderDocumentMetadataSchema.safeParse({ orderId: id, name });
  if (!metadata.success) return NextResponse.json({ error: "validation_error", issues: metadata.error.issues }, { status: 400 });
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maxSize) return NextResponse.json({ error: "invalid_file", allowedTypes: [...allowedTypes], maxSize }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const storagePath = `${id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("order-documents").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const { data, error } = await supabase.from("order_documents").insert({ order_id: id, name, storage_path: storagePath, status: "received", uploaded_by: user.id, uploaded_at: new Date().toISOString() }).select().single();
  if (error) { await supabase.storage.from("order-documents").remove([storagePath]); return NextResponse.json({ error: error.message }, { status: 500 }); }
  await supabase.from("order_activity").insert({ order_id: id, actor_id: user.id, event_type: "document_received", message: `تم استلام المستند: ${name}` });
  return NextResponse.json({ data }, { status: 201 });
}
