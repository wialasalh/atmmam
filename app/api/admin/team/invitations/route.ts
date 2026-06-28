import { NextResponse } from "next/server";
import { listInvitations, cancelInvitation } from "@/lib/data/admin-team";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("admin");
    return NextResponse.json({ data: await listInvitations() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("admin");
    const body = await request.json();
    const result = await cancelInvitation(body.invitationId);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}
