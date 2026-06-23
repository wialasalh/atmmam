import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { changeAdminOrderStatus } from "@/lib/data/admin-orders";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try { const { id } = await context.params; const body = await request.json(); return NextResponse.json({ data: await changeAdminOrderStatus({ ...body, orderId: id }) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "validation_error", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 }); }
}
