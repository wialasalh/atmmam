import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(_req, { params }) {
  const { id } = await params;
  const client = makeClient();

  const { data: ticket, error } = await client
    .from("tickets")
    .select("id, title, body, status, priority, category, created_at, updated_at, client_id, assigned_to, clients(id, name, phone, email, commercial_number, company_activity, city, company_status, entity_size, employee_count)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: ticket });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = makeClient();
  const body = await req.json() as { status?: string; assigned_to?: string | null };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) updates.status = body.status;
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;

  const { data, error } = await client
    .from("tickets")
    .update(updates)
    .eq("id", id)
    .select("id, status, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
