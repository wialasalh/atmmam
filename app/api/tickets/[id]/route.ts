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
