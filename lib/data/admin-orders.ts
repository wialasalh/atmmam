import "server-only";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOrderSchema, updateOrderStatusSchema } from "@/lib/validation/admin";

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("service_role_not_configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function listAdminOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select(`id, reference_no, status, priority, due_at, next_action_text, next_action_at, created_at, updated_at, notes, clients(id,name,phone,email), services(id,name), agencies(id,name,logo_url), profiles!orders_assignee_id_fkey(id,full_name,avatar_url)`).is("deleted_at", null).order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Unable to list orders: ${error.message}`);
  return data;
}

export async function createAdminOrder(input: unknown) {
  const parsed = createOrderSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const referenceNo = `REQ-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await supabase.from("orders").insert({ reference_no: referenceNo, client_id: parsed.clientId, service_id: parsed.serviceId, agency_id: parsed.agencyId, priority: parsed.priority, assignee_id: parsed.assigneeId, created_by: user.id, due_at: parsed.dueAt, next_action_text: parsed.nextActionText, next_action_at: parsed.nextActionAt, notes: parsed.notes }).select().single();
  if (error) throw new Error(`Unable to create order: ${error.message}`);
  await supabase.from("order_activity").insert({ order_id: data.id, actor_id: user.id, event_type: "created", message: "تم إنشاء الطلب" });
  revalidatePath("/admin"); revalidatePath("/admin/overview");
  return data;
}

export async function changeAdminOrderStatus(input: unknown) {
  const parsed = updateOrderStatusSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const service = createServiceClient();
  const updateFields: Record<string, unknown> = { status: parsed.status, updated_at: new Date().toISOString() };
  if (parsed.reason && ["cancelled", "blocked"].includes(parsed.status)) updateFields.notes = parsed.reason;
  const { data, error } = await service.from("orders").update(updateFields).eq("id", parsed.orderId).is("deleted_at", null).select("id, reference_no, status").single();
  if (error) throw new Error(`Unable to update order: ${error.message}`);
  await service.from("order_activity").insert({ order_id: parsed.orderId, actor_id: user.id, event_type: "status_changed", message: `تغيير الحالة إلى ${parsed.status}` });
  await service.from("audit_logs").insert({
    actor_id: user.id,
    entity_type: "order",
    entity_id: parsed.orderId,
    action: "status_changed",
    metadata: { status: parsed.status, reason: parsed.reason },
  });
  revalidatePath("/admin"); revalidatePath("/admin/overview"); revalidatePath("/admin/followups");
  return data;
}
