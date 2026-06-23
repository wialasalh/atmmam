import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const [clients, services, agencies, profiles, orders] = await Promise.all([
    supabase.from("clients").select("id,name,phone,email").is("deleted_at", null).order("name"),
    supabase.from("services").select("id,name,agency_id").eq("active", true).order("name"),
    supabase.from("agencies").select("id,name,logo_url").eq("active", true).order("name"),
    supabase.from("profiles").select("id,full_name,role").eq("active", true).order("full_name"),
    supabase.from("orders").select("id,reference_no,client_id,service_id,assignee_id,clients(name),services(name),profiles!orders_assignee_id_fkey(full_name)").is("deleted_at", null).not("status", "in", "(completed,cancelled)").order("updated_at", { ascending: false }),
  ]);
  const error = clients.error ?? services.error ?? agencies.error ?? profiles.error ?? orders.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { clients: clients.data, services: services.data, agencies: agencies.data, profiles: profiles.data, orders: orders.data } });
}
