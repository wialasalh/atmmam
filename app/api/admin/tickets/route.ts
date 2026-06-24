import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: Request) {
  try {
    const serviceClient = makeServiceClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = serviceClient
      .from("tickets")
      .select(`
        id, title, status, priority, category,
        created_at, updated_at, user_id, client_id,
        assigned_to, attachments,
        profiles!tickets_user_id_fkey ( full_name, email ),
        clients (
          id, name, client_type,
          tax_number, commercial_number,
          company_activity, company_address, city,
          entity_size, employee_count,
          company_scope, company_status,
          phone, email,
          commercial_register_doc, company_license_doc,
          national_id_doc, zakat_tax_doc, national_address_doc
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "الكل") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const serviceClient = makeServiceClient();
    const body = await req.json() as {
      ticketId?: string;
      status?: string;
      assignedTo?: string | null;
    };

    if (!body.ticketId) {
      return NextResponse.json({ error: "ticketId مطلوب" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.status !== undefined) updates.status = body.status;
    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;

    const { data, error } = await serviceClient
      .from("tickets")
      .update(updates)
      .eq("id", body.ticketId)
      .select("id, status, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
