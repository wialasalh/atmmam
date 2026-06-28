import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // Try with permissions column first (may fail if migration not run)
  let profile: any = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone, avatar_url, created_at, permissions")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch (_e) {
    // permissions column not yet migrated — fall through to query without it
  }

  // Fallback without permissions if the column doesn't exist
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone, avatar_url, created_at")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const permissions: string[] = profile?.permissions || [];

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
      permissions,
    },
  });
}
