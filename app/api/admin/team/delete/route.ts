import { NextResponse } from "next/server";
import { deleteTeamMember } from "@/lib/data/admin-team";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const body = await request.json();
    if (!body.profileId)
      return NextResponse.json({ error: "معرف العضو مطلوب" }, { status: 400 });
    const result = await deleteTeamMember(body.profileId);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}
