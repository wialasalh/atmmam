import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Get all open tickets for this client
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, title, status, updated_at")
    .eq("user_id", user.id)
    .in("status", ["جديدة", "قيد المراجعة", "بانتظار العميل"]);

  if (!tickets || tickets.length === 0) return NextResponse.json({ count: 0, tickets: [] });

  // For each ticket, get the latest message sender
  const ticketIds = tickets.map(t => t.id);
  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("ticket_id, user_id")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: false })
    .neq("is_internal", true);

  // Group latest message per ticket
  const latestPerTicket = new Map<string, string>();
  for (const m of messages || []) {
    if (!latestPerTicket.has(m.ticket_id)) {
      latestPerTicket.set(m.ticket_id, m.user_id);
    }
  }

  // Count unread: tickets where latest message is not from the client
  let unreadCount = 0;
  const unreadTickets: { id: string; title: string; status: string }[] = [];

  for (const ticket of tickets) {
    const lastSenderId = latestPerTicket.get(ticket.id);
    if (lastSenderId && lastSenderId !== user.id) {
      unreadCount++;
      unreadTickets.push({ id: ticket.id, title: ticket.title, status: ticket.status });
    }
  }

  return NextResponse.json({ count: unreadCount, tickets: unreadTickets });
}
