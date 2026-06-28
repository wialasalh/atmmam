import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic = "force-dynamic";

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    await requireRole("admin");
    const client = makeClient();

    // Get all rating messages
    const { data: ratings } = await client
      .from("ticket_messages")
      .select("body, created_at, user_id, ticket_id")
      .eq("message_type", "rating")
      .neq("is_internal", true);

    if (!ratings || ratings.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Collect unique user_ids to fetch client names
    const clientIds = [...new Set(ratings.map(r => r.user_id).filter(Boolean))];
    let clientNameMap: Record<string, string> = {};
    if (clientIds.length) {
      const { data: { users } } = await client.auth.admin.listUsers();
      for (const u of users || []) {
        if (clientIds.includes(u.id)) {
          clientNameMap[u.id] = u.user_metadata?.full_name || u.email?.split("@")[0] || "عميل";
        }
      }
    }

    // Parse rating bodies and aggregate per staff member
    const staffStats = new Map<string, { total: number; count: number; positive: number; negative: number; ratings: { rating: number; comment: string; date: string; client_name: string; ticket_id: string }[] }>();

    for (const msg of ratings) {
      try {
        const parsed = JSON.parse(msg.body);
        const { staff_id, staff_name, rating, comment } = parsed;

        if (!staff_id || !rating) continue;

        if (!staffStats.has(staff_id)) {
          staffStats.set(staff_id, {
            total: 0,
            count: 0,
            positive: 0,
            negative: 0,
            ratings: [],
          });
        }

        const stat = staffStats.get(staff_id)!;
        stat.total += rating;
        stat.count += 1;
        if (rating >= 3) stat.positive += 1;
        else stat.negative += 1;
        stat.ratings.push({ rating, comment: comment || "", date: msg.created_at, client_name: clientNameMap[msg.user_id] || "عميل", ticket_id: msg.ticket_id || "" });
      } catch {}
    }

    // Get resolved ticket counts per staff member
    const { data: tickets } = await client
      .from("tickets")
      .select("assigned_to")
      .in("status", ["تم الحل", "مغلقة"]);

    const resolvedCounts = new Map<string, number>();
    for (const t of tickets || []) {
      if (t.assigned_to) {
        resolvedCounts.set(t.assigned_to, (resolvedCounts.get(t.assigned_to) || 0) + 1);
      }
    }

    const data = Array.from(staffStats.entries()).map(([staffId, stat]) => ({
      staff_id: staffId,
      avg_rating: stat.count > 0 ? Math.round((stat.total / stat.count) * 10) / 10 : 0,
      total_ratings: stat.count,
      positive: stat.positive,
      negative: stat.negative,
      resolved_tickets: resolvedCounts.get(staffId) || 0,
      recent_ratings: stat.ratings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }));

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
