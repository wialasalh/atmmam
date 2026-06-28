import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceInputSchema, updateServiceSchema } from "@/lib/validation/admin";

export async function listAdminServices() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("services")
    .select("id,name,category,agency_id,default_duration_days,active,required_documents,price,agencies(id,name,logo_url)")
    .order("category").order("name");
  if (error) throw new Error(`Unable to list services: ${error.message}`);
  return data;
}

export async function createAdminService(input: unknown) {
  const parsed = serviceInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("services").insert({
    name: parsed.name, category: parsed.category,
    agency_id: parsed.agencyId || null,
    default_duration_days: parsed.defaultDurationDays || null,
    required_documents: parsed.requiredDocuments,
    price: parsed.price ?? null, active: parsed.active,
  }).select().single();
  if (error) throw new Error(`Unable to create service: ${error.message}`);
  revalidatePath("/admin/services");
  return data;
}

export async function updateAdminService(input: unknown) {
  const parsed = updateServiceSchema.parse(input);
  const { serviceId, ...changes } = parsed;
  const payload = {
    name: changes.name, category: changes.category,
    agency_id: changes.agencyId !== undefined ? (changes.agencyId || null) : undefined,
    default_duration_days: changes.defaultDurationDays !== undefined ? (changes.defaultDurationDays || null) : undefined,
    required_documents: changes.requiredDocuments,
    price: changes.price !== undefined ? (changes.price ?? null) : undefined,
    active: changes.active,
  };
  const clean = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("services").update(clean).eq("id", serviceId).select().single();
  if (error) throw new Error(`Unable to update service: ${error.message}`);
  revalidatePath("/admin/services");
  return data;
}
