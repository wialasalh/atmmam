import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Delete tickets closed by client and archived more than 24 hours ago
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: toDelete } = await serviceClient
    .from("tickets")
    .select("id")
    .eq("status", "مغلقة من العميل")
    .lt("archived_at", cutoff);

  if (!toDelete || toDelete.length === 0) {
    return NextResponse.json({ deleted: 0, message: "لا توجد تذاكر للحذف" });
  }

  const ids = toDelete.map(t => t.id);

  // Delete related records first
  await serviceClient.from("ticket_messages").delete().in("ticket_id", ids);
  await serviceClient.from("ticket_status_history").delete().in("ticket_id", ids);
  const { error } = await serviceClient.from("tickets").delete().in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: ids.length, message: `تم حذف ${ids.length} محادثة مغلقة` });
}
