import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("manager");
    const { serviceId, price } = await request.json();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("services")
      .update({ price })
      .eq("id", serviceId)
      .select()
      .single();
    if (error) throw new Error(`Unable to update price: ${error.message}`);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
