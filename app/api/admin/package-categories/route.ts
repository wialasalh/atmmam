import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("manager");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("package_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`Unable to fetch categories: ${error.message}`);
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

    if (!body.name_ar || !body.slug) {
      return NextResponse.json({ error: "name_ar and slug are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("package_categories")
      .insert({
        name_ar: body.name_ar,
        name_en: body.name_en || null,
        slug: body.slug,
        color: body.color || "#0875dc",
        icon: body.icon || "Package",
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Unable to create category: ${error.message}`);
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
    const { categoryId, ...changes } = body;

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("package_categories")
      .update(changes)
      .eq("id", categoryId)
      .select()
      .single();

    if (error) throw new Error(`Unable to update category: ${error.message}`);
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
      .from("package_categories")
      .delete()
      .eq("id", body.categoryId);

    if (error) throw new Error(`Unable to delete category: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
