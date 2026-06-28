import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const serviceClient = makeServiceClient();
    const { id } = await params;
    const { archive } = await req.json() as { archive: boolean };

    const { error } = await serviceClient
      .from("orders")
      .update({ archived_at: archive ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = String(e);
    const status = msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const serviceClient = makeServiceClient();
    const { id } = await params;

    await serviceClient.from("order_documents").delete().eq("order_id", id);
    const { error } = await serviceClient.from("orders").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = String(e);
    const status = msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
