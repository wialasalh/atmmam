import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl!, serviceRole!, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    // Verify the caller owns the requested client_id
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");

    if (!clientId) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    // Staff can query any client; regular users can only query their own
    const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const STAFF_ROLES = ["admin", "manager", "operator", "viewer"];
    const isStaff = callerProfile && STAFF_ROLES.includes(callerProfile.role);

    if (!isStaff) {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!clientRow) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!serviceClient) throw new Error("Service client not configured");

    const { data, error } = await serviceClient
      .from("subscriptions")
      .select("*, packages(id, title_ar, tier_ar, category, billing_cycle, price, features)")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(`Unable to fetch subscription: ${error.message}`);

    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
