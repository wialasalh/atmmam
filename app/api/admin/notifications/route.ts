import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  try {
    const { supabase, user } = await requireRole("viewer");
    const serviceClient = makeServiceClient();

    const now = new Date().toISOString();

    // Client's last-seen timestamp for ratings (passed from localStorage)
    const lastRatingSeen = req.nextUrl.searchParams.get("lastRatingSeen") || "";
    const ratingSeenSince = lastRatingSeen ? new Date(lastRatingSeen).toISOString() : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run independent queries in parallel
    const [tasksResult, openTicketsResult, overdueResult, todayResult, recentRatingsResult, expiredCrResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,due_at,status,orders!inner(clients!inner(name))")
        .neq("status", "completed")
        .lte("due_at", now)
        .order("due_at", { ascending: true })
        .limit(10),
      supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .neq("status", "closed"),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "completed")
        .lt("due_at", now),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "completed")
        .gte("due_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lte("due_at", new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
      serviceClient
        .from("ticket_messages")
        .select("body, created_at, user_id, ticket_id")
        .eq("message_type", "rating")
        .gte("created_at", ratingSeenSince)
        .order("created_at", { ascending: false })
        .limit(10),
      serviceClient
        .from("clients")
        .select("id, name, commercial_register_expiry, profiles!clients_user_id_fkey(full_name)")
        .not("commercial_register_expiry", "is", null)
        .lt("commercial_register_expiry", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("commercial_register_expiry", { ascending: true })
        .limit(30),
    ]);

    const tasks = tasksResult.data || [];
    const allExpiryRecords: any[] = expiredCrResult.data || [];
    const recentRatings = recentRatingsResult.data || [];

    const urgent = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      client: t.orders?.clients?.name || "",
      isLate: new Date(t.due_at) < new Date(),
    }));

    // Build a map of user_id -> full_name for ratings that lack client_name
    const ratingUserIds = [...new Set(recentRatings.map(r => r.user_id).filter(Boolean))];
    let ratingClientNames: Record<string, string> = {};
    if (ratingUserIds.length) {
      const { data: { users } } = await serviceClient.auth.admin.listUsers({ perPage: 100 });
      for (const u of users || []) {
        if (ratingUserIds.includes(u.id)) {
          ratingClientNames[u.id] = u.user_metadata?.full_name || u.email?.split("@")[0] || "عميل";
        }
      }
    }

    let newRatingCount = 0;
    const ratingNotifs: { from: string; rating: number; comment: string; date: string; ticket_id: string }[] = [];

    for (const msg of recentRatings) {
      try {
        const p = JSON.parse(msg.body);
        if (p.staff_id === user.id) {
          newRatingCount++;
          ratingNotifs.push({
            from: p.client_name || ratingClientNames[msg.user_id] || "عميل",
            rating: p.rating,
            comment: p.comment || "",
            date: msg.created_at,
            ticket_id: msg.ticket_id,
          });
        }
      } catch {}
    }

    const nowDate = new Date();
    const expiredRegs: any[] = [];
    const soonRegs: any[] = [];
    for (const r of allExpiryRecords) {
      const expiryDate = new Date(r.commercial_register_expiry);
      const name = r.profiles?.full_name || r.name || "عميل";
      const days = Math.ceil(Math.abs((expiryDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)));
      if (expiryDate < nowDate) {
        expiredRegs.push({ clientId: r.id, clientName: name, daysExpired: days, expiryDate: r.commercial_register_expiry });
      } else {
        soonRegs.push({ clientId: r.id, clientName: name, daysLeft: days, expiryDate: r.commercial_register_expiry });
      }
    }

    return NextResponse.json({
      overdue: overdueResult.count || 0,
      today: todayResult.count || 0,
      openTickets: openTicketsResult.count || 0,
      urgent: urgent.slice(0, 5),
      newRatings: newRatingCount,
      ratingNotifs: ratingNotifs.slice(0, 5),
      expiredRegs: expiredRegs.slice(0, 10),
      soonRegs: soonRegs.slice(0, 10),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
