import { NextResponse } from "next/server";
import { changeTeamMemberPassword } from "@/lib/data/admin-team";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const body = await request.json();
    if (!body.profileId || !body.newPassword || body.newPassword.length < 6)
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    const result = await changeTeamMemberPassword({ profileId: body.profileId, newPassword: body.newPassword });
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}
