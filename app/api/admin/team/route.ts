import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { listAdminTeam, createTeamMember, updateTeamMember } from "@/lib/data/admin-team";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    return NextResponse.json(await listAdminTeam());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const body = await request.json();
    const user = await createTeamMember({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: body.role,
      phone: body.phone,
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "validation_error", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const body = await request.json();
    const result = await updateTeamMember({
      profileId: body.profileId,
      role: body.role,
      active: body.active,
      fullName: body.fullName,
      phone: body.phone,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: "validation_error", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}
