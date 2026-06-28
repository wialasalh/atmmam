import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !serviceClient) {
    return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await requireRole("viewer");

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${user.id}.${ext}`;

  let { data: uploadData, error: uploadError } = await serviceClient
    .storage
    .from("avatars")
    .upload(fileName, buffer, { upsert: true, contentType: file.type });

  if (uploadError?.message?.includes("bucket") || uploadError?.message?.includes("not found")) {
    const { error: createError } = await serviceClient.storage.createBucket("avatars", { public: true });
    if (createError) {
      console.error("Avatar bucket create error:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    const retry = await serviceClient.storage.from("avatars").upload(fileName, buffer, { upsert: true, contentType: file.type });
    uploadData = retry.data;
    uploadError = retry.error;
  }

  // Ensure bucket is public
  await serviceClient.storage.updateBucket("avatars", { public: true }).catch(() => {});

  if (uploadError) {
    console.error("Avatar storage upload error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = serviceClient.storage.from("avatars").getPublicUrl(fileName);
  const urlWithBust = `${publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await serviceClient
    .from("profiles")
    .update({ avatar_url: urlWithBust })
    .eq("id", user.id);

  if (updateError) {
    console.error("Avatar profile update error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: urlWithBust });
}
