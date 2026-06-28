import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOrderSchema, updateOrderStatusSchema } from "@/lib/validation/admin";

export async function listAdminOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select(`id, reference_no, status, priority, due_at, next_action_text, next_action_at, created_at, updated_at, archived_at, clients(id,name,phone,email), services(id,name), agencies(id,name,logo_url), profiles!orders_assignee_id_fkey(id,full_name,avatar_url)`).is("deleted_at", null).order("updated_at", { ascending: false }).limit(200);
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
  const { data, error } = await supabase.rpc("change_order_status", { target_order_id: parsed.orderId, target_status: parsed.status, change_reason: parsed.reason });
  if (error) throw new Error(`Unable to update order: ${error.message}`);
  revalidatePath("/admin"); revalidatePath("/admin/overview"); revalidatePath("/admin/followups");
  return data;
}
