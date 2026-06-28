import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    await requireRole("admin");

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*, profiles!clients_user_id_fkey(id, full_name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "client_id_required" }, { status: 400 });

    const allowed = ["name", "phone", "email", "commercial_number", "national_id", "contact_name", "notes", "client_type", "commercial_register_date", "commercial_register_expiry", "city", "tax_number", "company_activity", "company_address", "entity_size", "employee_count", "company_scope", "company_status"];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) updates[key] = fields[key];
    }
    updates.updated_at = new Date().toISOString();

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof Error && (e.message === "unauthorized" || e.message === "forbidden")) {
      return NextResponse.json({ error: "غير مصرح لك بهذا الإجراء" }, { status: 403 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");

    const { id, permanent } = await request.json();
    if (!id) return NextResponse.json({ error: "client_id_required" }, { status: 400 });

    const supabase = getServiceClient();
    if (permanent) {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("clients")
        .update({ deleted_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && (e.message === "unauthorized" || e.message === "forbidden")) {
      return NextResponse.json({ error: "غير مصرح لك بهذا الإجراء" }, { status: 403 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
