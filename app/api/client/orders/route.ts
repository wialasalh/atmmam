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
    .select("id, reference_no, status, priority, created_at, updated_at, notes, service_id")
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
    updated_at: o.updated_at,
    notes: o.notes,
    service_name: serviceNames[o.service_id] || "—",
  }));

  return NextResponse.json({ data: enriched });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!serviceClient) return NextResponse.json({ error: "الخدمة غير متوفرة" }, { status: 503 });

  const body = await req.json() as { service_id: string; client_id?: string; notes?: string };
  if (!body.service_id) return NextResponse.json({ error: "service_id مطلوب" }, { status: 400 });

  // Verify service exists
  const { data: service } = await serviceClient.from("services").select("id, name, price").eq("id", body.service_id).single();
  if (!service) return NextResponse.json({ error: "الخدمة غير موجودة" }, { status: 404 });

  // Get client_id — prefer provided, else first client for user
  let clientId = body.client_id;
  if (!clientId) {
    const { data: clients } = await supabase.from("clients").select("id").eq("user_id", user.id).limit(1);
    clientId = clients?.[0]?.id;
  }
  if (!clientId) return NextResponse.json({ error: "لا يوجد سجل عميل لهذا الحساب" }, { status: 400 });

  // Generate unique reference number
  const ref = "ORD-" + Date.now().toString(36).toUpperCase();

  const { data: order, error: insertError } = await serviceClient.from("orders").insert({
    reference_no: ref,
    client_id: clientId,
    service_id: body.service_id,
    status: "new",
    priority: "normal",
    notes: body.notes || `طلب خدمة: ${service.name}`,
    created_by: user.id,
  }).select("id, reference_no, status, created_at").single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ data: { ...order, service_name: service.name } }, { status: 201 });
}
