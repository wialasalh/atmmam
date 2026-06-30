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

  const [profileRes, clientsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, phone, avatar_url, member_of_client_id").eq("id", user.id).single(),
    supabase.from("clients").select("id, name, commercial_register_expiry").eq("user_id", user.id),
  ]);

  const memberClientId = profileRes.data?.member_of_client_id || null;

  let clients = clientsRes.data ?? [];
  if (memberClientId && serviceClient) {
    const { data: memberClient } = await serviceClient
      .from("clients").select("id, name, commercial_register_expiry").eq("id", memberClientId).limit(1);
    clients = memberClient ?? [];
  }

  const clientIds = clients.map(c => c.id);

  // Tickets
  let tickets: any[] = [];
  if (memberClientId && serviceClient) {
    const { data } = await serviceClient.from("tickets")
      .select("id, title, status, priority, updated_at, client:clients(name, client_type)")
      .eq("client_id", memberClientId).order("updated_at", { ascending: false }).limit(10);
    tickets = data ?? [];
  } else {
    const { data } = await supabase.from("tickets")
      .select("id, title, status, priority, updated_at, client:client_id(name, client_type)")
      .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10);
    tickets = data ?? [];
  }

  // Orders
  let orders: { id: string; reference_no: string; service_name: string; status: string; created_at: string }[] = [];
  let orderStatusCounts = { new: 0, in_progress: 0, waiting_documents: 0, completed: 0, cancelled: 0, blocked: 0 };

  if (serviceClient && clientIds.length > 0) {
    const { data: rawOrders } = await serviceClient.from("orders")
      .select("id, reference_no, status, created_at, service_id")
      .in("client_id", clientIds).is("deleted_at", null).order("created_at", { ascending: false });

    if (rawOrders?.length) {
      // Count statuses for donut chart
      for (const o of rawOrders) {
        const s = o.status as keyof typeof orderStatusCounts;
        if (s in orderStatusCounts) orderStatusCounts[s]++;
      }

      const serviceIds = [...new Set(rawOrders.slice(0, 5).map((o: any) => o.service_id).filter(Boolean))];
      let serviceNames: Record<string, string> = {};
      if (serviceIds.length > 0) {
        const { data: svcs } = await serviceClient.from("services").select("id, name").in("id", serviceIds as string[]);
        if (svcs) serviceNames = Object.fromEntries(svcs.map((s: any) => [s.id, s.name]));
      }
      orders = rawOrders.slice(0, 5).map((o: any) => ({ ...o, service_name: serviceNames[o.service_id] || "—" }));
    }
  }

  // Invoices
  let unpaidInvoices: { id: string; invoice_number: string; total_amount: number; due_date: string | null; service_name: string | null }[] = [];
  let unpaidCount = 0;
  let unpaidTotal = 0;

  if (serviceClient && clientIds.length > 0) {
    const { data: inv } = await serviceClient.from("invoices")
      .select("id, invoice_number, total_amount, due_date, service_name, status")
      .in("client_id", clientIds).eq("status", "issued").order("created_at", { ascending: false });
    if (inv) {
      unpaidCount = inv.length;
      unpaidTotal = inv.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      unpaidInvoices = inv.slice(0, 3).map(i => ({
        id: i.id, invoice_number: i.invoice_number, total_amount: i.total_amount,
        due_date: i.due_date, service_name: i.service_name,
      }));
    }
  }

  // Active subscriptions
  let activeSubscriptions = 0;
  if (serviceClient && clientIds.length > 0) {
    const { count } = await serviceClient.from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("client_id", clientIds).eq("status", "active");
    activeSubscriptions = count || 0;
  }

  // Tickets needing client response
  const needsResponseTickets = tickets
    .filter(t => t.status === "بانتظار العميل")
    .slice(0, 3);

  const totalOrders = Object.values(orderStatusCounts).reduce((a, b) => a + b, 0);
  const activeOrders = orderStatusCounts.new + orderStatusCounts.in_progress + orderStatusCounts.waiting_documents + orderStatusCounts.blocked;
  const openTickets = tickets.filter(t => !["تم الحل", "مغلقة"].includes(t.status)).length;

  return NextResponse.json({
    profile: { ...profileRes.data, email: user.email },
    stats: { totalOrders, activeOrders, totalTickets: tickets.length, openTickets, unpaidCount, unpaidTotal, activeSubscriptions },
    orderStatusCounts,
    recentOrders: orders.slice(0, 3),
    recentTickets: tickets.filter(t => !["تم الحل", "مغلقة"].includes(t.status)).slice(0, 4),
    needsResponseTickets,
    unpaidInvoices,
    clients,
  });
}
