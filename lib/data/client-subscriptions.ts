import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubscriptionRecord = {
  id: string;
  client_id: string;
  package_id: string;
  order_id: string | null;
  status: "pending" | "active" | "cancelled" | "expired";
  employee_count: number;
  base_price: number;
  extra_price: number;
  tax_amount: number;
  total_price: number;
  billing_cycle: string;
  start_date: string;
  end_date: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  packages?: {
    id: string;
    title_ar: string;
    tier_ar: string;
    category: string;
    billing_cycle: string;
  } | null;
};

export async function getClientSubscriptions(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, packages(id, title_ar, tier_ar, category, billing_cycle)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to fetch subscriptions: ${error.message}`);
  return data as SubscriptionRecord[];
}

export async function getClientActiveSubscription(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, packages(id, title_ar, tier_ar, category, billing_cycle)")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`Unable to fetch active subscription: ${error.message}`);
  return data as SubscriptionRecord | null;
}

export async function createClientSubscription(input: {
  client_id: string;
  package_id: string;
  employee_count?: number;
  base_price: number;
  extra_price?: number;
  tax_amount?: number;
  total_price: number;
  billing_cycle?: string;
  start_date?: string;
  end_date?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      client_id: input.client_id,
      package_id: input.package_id,
      employee_count: input.employee_count || 0,
      base_price: input.base_price,
      extra_price: input.extra_price || 0,
      tax_amount: input.tax_amount || 0,
      total_price: input.total_price,
      billing_cycle: input.billing_cycle || "yearly",
      start_date: input.start_date || new Date().toISOString().split("T")[0],
      end_date: input.end_date || null,
    })
    .select()
    .single();
  if (error) throw new Error(`Unable to create subscription: ${error.message}`);
  return data;
}
