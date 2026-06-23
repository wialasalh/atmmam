import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  // Get client records if user is a client
  let clientRecords = null;
  if (profile?.role === "client") {
    const { data: cr } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    clientRecords = cr || [];
  }

  return NextResponse.json({
    data: {
      ...profile,
      email: user.email,
      clients: clientRecords,
    },
  });
}
