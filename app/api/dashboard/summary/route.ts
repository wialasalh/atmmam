import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const [profileRes, ordersRes, ticketsRes, clientsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, phone, avatar_url").eq("id", user.id).single(),
    supabase.from("orders").select("id, reference_no, service_name, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("tickets").select("id, title, status, priority, updated_at, client_id, client:client_id(name, client_type)").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(10),
    supabase.from("clients").select("id, name, commercial_register_expiry").eq("user_id", user.id),
  ]);

  const orders = ordersRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const clients = clientsRes.data ?? [];

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
