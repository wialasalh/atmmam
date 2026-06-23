import { NextResponse } from "next/server";
import { inviteTeamMember } from "@/lib/data/admin-team";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const body = await request.json();
    if (!body.email)
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    if (!body.role)
      return NextResponse.json({ error: "الصلاحية مطلوبة" }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const result = await inviteTeamMember({
      email: body.email,
      role: body.role,
      invitedBy: user.id,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}
