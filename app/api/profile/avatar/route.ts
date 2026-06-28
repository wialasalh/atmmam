import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("avatar") as File | null;
  if (!file) return NextResponse.json({ error: "الملف مطلوب" }, { status: 400 });

  const ext = file.name.split(".").pop() || "png";
  const path = `avatars/${user.id}_${Date.now()}.${ext}`;

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const bucket = serviceClient.storage.from("avatars");

  // Ensure bucket exists and is public via storage admin API
  const { data: buckets } = await serviceClient.storage.listBuckets();
  const exists = buckets?.some(b => b.id === "avatars");
  if (!exists) {
    await serviceClient.storage.createBucket("avatars", { public: true });
  } else {
    await serviceClient.storage.updateBucket("avatars", { public: true });
  }

  const { error: uploadErr } = await bucket.upload(path, file, { contentType: file.type, upsert: true });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: urlData } = bucket.getPublicUrl(path);
  const avatarUrl = urlData?.publicUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;

  await serviceClient.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);

  return NextResponse.json({ avatar_url: avatarUrl });
}
