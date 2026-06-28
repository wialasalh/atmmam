import { NextResponse } from "next/server";
import { createAdminPackage, deleteAdminPackage, listAdminPackages, updateAdminPackage } from "@/lib/data/admin-packages";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "unknown_error" },
    { status: 500 }
  );
}

export async function GET() {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("manager");
    return NextResponse.json({ data: await listAdminPackages() });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("manager");
    const body = await request.json();
    return NextResponse.json({ data: await createAdminPackage(body) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("manager");
    const body = await request.json();
    return NextResponse.json({ data: await updateAdminPackage(body) });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("manager");
    const { packageId } = await request.json();
    await deleteAdminPackage(packageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
