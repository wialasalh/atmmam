import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { source_id, target_id } = await req.json();
  if (!source_id || !target_id || source_id === target_id)
    return NextResponse.json({ error: "source و target مطلوبان ومختلفان" }, { status: 400 });

  // Move all messages from source to target
  await supabase.from("ticket_messages").update({ ticket_id: target_id }).eq("ticket_id", source_id);
  // Move all files
  await supabase.from("tickets").update({ merged_into: target_id, status: "مغلقة" }).eq("id", source_id);
  // Add internal note in target
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("ticket_messages").insert({
    ticket_id: target_id,
    user_id: user?.id,
    body: `تم دمج التذكرة #${source_id.slice(0,7).toUpperCase()} في هذه التذكرة.`,
    is_internal: true,
    message_type: "system",
  });
  return NextResponse.json({ ok: true });
}
