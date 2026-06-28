import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = await _request.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (body.toggle_active !== undefined) {
      const { data: client } = await supabase.from("clients").select("active").eq("id", id).single();
      if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const { data, error } = await supabase
        .from("clients")
        .update({ active: !client.active, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (e) {
    if (e instanceof Error && (e.message === "unauthorized" || e.message === "forbidden")) {
      return NextResponse.json({ error: "غير مصرح لك بهذا الإجراء" }, { status: 403 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
