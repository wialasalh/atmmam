import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  if (!serviceClient) return NextResponse.json({ error: "الخدمة غير متوفرة" }, { status: 503 });

  // Get client IDs for this user
  const { data: clientRecords } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id);

  if (!clientRecords || clientRecords.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const clientIds = clientRecords.map(c => c.id);

  // Fetch orders for all client records using service client (bypasses RLS)
  const { data: orders, error: ordersError } = await serviceClient
    .from("orders")
    .select("id, reference_no, status, priority, created_at, notes, service_id")
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  // Get service names
  const serviceIds = [...new Set(orders?.map(o => o.service_id).filter(Boolean) || [])];
  let serviceNames: Record<string, string> = {};
  if (serviceIds.length > 0) {
    const { data: services } = await serviceClient
      .from("services")
      .select("id, name")
      .in("id", serviceIds);
    if (services) {
      serviceNames = Object.fromEntries(services.map(s => [s.id, s.name]));
    }
  }

  const enriched = (orders || []).map(o => ({
    id: o.id,
    reference_no: o.reference_no,
    status: o.status,
    priority: o.priority,
    created_at: o.created_at,
    notes: o.notes,
    service_name: serviceNames[o.service_id] || "—",
  }));

  return NextResponse.json({ data: enriched });
}
