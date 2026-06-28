import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    await requireRole("operator");
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");

    if (!clientId) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("client_employees")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Unable to fetch employees: ${error.message}`);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    await requireRole("manager");
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("client_employees")
      .insert({
        client_id: body.client_id,
        full_name: body.full_name,
        phone: body.phone || null,
        email: body.email || null,
        position: body.position || null,
        national_id: body.national_id || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Unable to create employee: ${error.message}`);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    await requireRole("manager");
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { employeeId, ...changes } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("client_employees")
      .update(changes)
      .eq("id", employeeId)
      .select()
      .single();

    if (error) throw new Error(`Unable to update employee: ${error.message}`);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    await requireRole("manager");
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const { error } = await supabase
      .from("client_employees")
      .delete()
      .eq("id", body.employeeId);

    if (error) throw new Error(`Unable to delete employee: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
