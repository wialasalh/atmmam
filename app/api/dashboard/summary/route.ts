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

  const [profileRes, clientsRes, ticketsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, phone, avatar_url").eq("id", user.id).single(),
    supabase.from("clients").select("id, name, commercial_register_expiry").eq("user_id", user.id),
    supabase.from("tickets").select("id, title, status, priority, updated_at, client:client_id(name, client_type)").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10),
  ]);

  const clients = clientsRes.data ?? [];
  const tickets = ticketsRes.data ?? [];

  // Orders are linked via client_id, not user_id
  let orders: { id: string; reference_no: string; service_name: string; status: string; created_at: string }[] = [];
  if (serviceClient && clients.length > 0) {
    const clientIds = clients.map(c => c.id);
    const { data: rawOrders } = await serviceClient
      .from("orders")
      .select("id, reference_no, status, created_at, service_id")
      .in("client_id", clientIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (rawOrders?.length) {
      const serviceIds = [...new Set(rawOrders.map(o => o.service_id).filter(Boolean))];
      let serviceNames: Record<string, string> = {};
      if (serviceIds.length > 0) {
        const { data: svcs } = await serviceClient.from("services").select("id, name").in("id", serviceIds);
        if (svcs) serviceNames = Object.fromEntries(svcs.map(s => [s.id, s.name]));
      }
      orders = rawOrders.map(o => ({ ...o, service_name: serviceNames[o.service_id] || "—" }));
    }
  }

  const activeOrders = orders.filter(o => !["مكتمل", "completed", "ملغي", "cancelled"].includes(o.status)).length;
  const openTickets = tickets.filter(t => !["تم الحل", "مغلقة"].includes(t.status)).length;

  return NextResponse.json({
    profile: { ...profileRes.data, email: user.email },
    stats: { totalOrders: orders.length, activeOrders, totalTickets: tickets.length, openTickets },
    recentOrders: orders.slice(0, 3),
    recentTickets: tickets.filter(t => !["تم الحل", "مغلقة"].includes(t.status)).slice(0, 5),
    clients,
  });
}
