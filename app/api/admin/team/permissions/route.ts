import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/data/admin-team";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ALL_PERMISSIONS } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  try {
    await requireRole("admin");
    const { profileId, permissions } = await req.json();
    if (!profileId || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    const validKeys = ALL_PERMISSIONS.map(p => p.key);
    const invalid = permissions.filter((k: string) => !validKeys.includes(k as any));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `صلاحيات غير معروفة: ${invalid.join(", ")}` }, { status: 400 });
    }

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await client
      .from("profiles")
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq("id", profileId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: { success: true } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
