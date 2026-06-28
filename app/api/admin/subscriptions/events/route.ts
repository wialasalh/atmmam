import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
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
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscription_id");

    if (!serviceClient) throw new Error("Service client not configured");

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscription_id مطلوب" }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from("subscription_events")
      .select("*, profiles:created_by(id, full_name)")
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false });

    if (error) {
      // Table doesn't exist yet → return empty gracefully
      if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
        return NextResponse.json({ data: [], hint: "run_migration" });
      }
      throw new Error(error.message);
    }
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
