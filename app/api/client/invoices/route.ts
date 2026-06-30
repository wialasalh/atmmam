import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const serviceClient = makeServiceClient();

    // Get ALL client records for this user (may have multiple)
    const { data: allClients } = await serviceClient
      .from("clients")
      .select("id, name, tax_number, commercial_number, company_address, city, phone, email")
      .eq("user_id", user.id);

    if (!allClients || allClients.length === 0) return NextResponse.json({ data: [], client: null });

    const client = allClients[0];
    const clientIds = allClients.map(c => c.id);

    const { data: invoices, error } = await serviceClient
      .from("invoices")
      .select(`
        id, invoice_number, description, service_name,
        amount, tax_rate, tax_amount, total_amount,
        currency, payment_method, status,
        notes, paid_at, due_date, created_at, updated_at,
        orders(id, reference_no)
      `)
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: invoices || [], client });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
