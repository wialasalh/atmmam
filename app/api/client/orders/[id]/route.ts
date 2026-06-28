import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  if (!serviceClient) return NextResponse.json({ error: "الخدمة غير متوفرة" }, { status: 503 });

  const { data: clientRecords } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id);

  if (!clientRecords || clientRecords.length === 0) {
    return NextResponse.json({ error: "لا يوجد عميل مرتبط بحسابك" }, { status: 404 });
  }

  const clientIds = clientRecords.map(c => c.id);

  const { data: order, error: orderError } = await serviceClient
    .from("orders")
    .select(`
      id, reference_no, status, priority, due_at, next_action_text, next_action_at,
      notes, created_at, updated_at, completed_at,
      client_id,
      service_id,
      clients!inner(id, name, phone, email),
      services!inner(id, name)
    `)
    .eq("id", id)
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }

  const clientData = order.clients as unknown as { id: string; name: string; phone: string | null; email: string | null };
  const serviceData = order.services as unknown as { id: string; name: string };

  return NextResponse.json({
    data: {
      id: order.id,
      reference_no: order.reference_no,
      status: order.status,
      priority: order.priority,
      due_at: order.due_at,
      next_action_text: order.next_action_text,
      next_action_at: order.next_action_at,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      completed_at: order.completed_at,
      client: clientData || { name: "—", phone: null, email: null },
      service_name: serviceData?.name || "—",
    },
  });
}
