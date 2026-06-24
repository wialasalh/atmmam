import { NextResponse } from "next/server";
import { changeTeamMemberPassword } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const { profileId, newPassword } = await request.json();
    if (!profileId || !newPassword) {
      return NextResponse.json({ error: "profileId and newPassword are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }
    await changeTeamMemberPassword({ profileId, newPassword });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "unknown_error",
    }, { status: 500 });
  }
}
