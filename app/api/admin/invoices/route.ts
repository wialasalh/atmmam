import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/data/admin-team";

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
    await requireRole("operator");
    const serviceClient = makeServiceClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("client_id");

    let query = serviceClient
      .from("invoices")
      .select(`
        id, invoice_number, description, service_name,
        amount, tax_rate, tax_amount, total_amount,
        currency, payment_method, status,
        notes, paid_at, due_date, created_at, updated_at,
        client_id,
        orders(id, reference_no),
        clients(id, name, phone, email, tax_number, commercial_number, company_address, city)
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "الكل") query = query.eq("status", status);
    if (clientId) query = query.eq("client_id", clientId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requireRole("operator");
    const serviceClient = makeServiceClient();
    const body = await req.json() as {
      invoiceId: string;
      status?: string;
      payment_method?: string;
      notes?: string;
      amount?: number;
      paid_at?: string;
    };

    if (!body.invoiceId) return NextResponse.json({ error: "invoiceId مطلوب" }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status         !== undefined) updates.status         = body.status;
    if (body.payment_method !== undefined) updates.payment_method = body.payment_method;
    if (body.notes          !== undefined) updates.notes          = body.notes;
    if (body.amount         !== undefined) updates.amount         = body.amount;

    // When marking as paid, set paid_at
    if (body.status === "paid" && !updates.paid_at) {
      updates.paid_at = new Date().toISOString();
    }

    const { data, error } = await serviceClient
      .from("invoices")
      .update(updates)
      .eq("id", body.invoiceId)
      .select("id, status, paid_at, subscription_id, client_id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If marked as paid → activate linked subscription
    if (body.status === "paid" && data.subscription_id) {
      await serviceClient
        .from("subscriptions")
        .update({ status: "active" })
        .eq("id", data.subscription_id)
        .eq("status", "pending");
    }

    return NextResponse.json({ data });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500 });
  }
}

// Manually create invoice (admin override)
export async function POST(req: Request) {
  try {
    const { user } = await requireRole("operator");
    const serviceClient = makeServiceClient();
    const body = await req.json() as {
      client_id: string;
      order_id?: string;
      description: string;
      service_name?: string;
      amount: number;
      tax_rate?: number;
      payment_method?: string;
      notes?: string;
      due_date?: string;
    };

    if (!body.client_id || !body.description || !body.amount) {
      return NextResponse.json({ error: "client_id والوصف والمبلغ مطلوبة" }, { status: 400 });
    }

    const { data, error } = await serviceClient
      .from("invoices")
      .insert({
        client_id:      body.client_id,
        order_id:       body.order_id || null,
        description:    body.description,
        service_name:   body.service_name || null,
        amount:         body.amount,
        tax_rate:       body.tax_rate ?? 15,
        payment_method: body.payment_method || null,
        notes:          body.notes || null,
        due_date:       body.due_date || null,
        status:         "issued",
        created_by:     user?.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500 });
  }
}
