import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClientSchema } from "@/lib/validation/admin";

export async function listAdminClients() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("clients").select("id,client_type,name,commercial_number,national_id,contact_name,phone,email,notes,created_at,updated_at,orders(id,reference_no,status,updated_at,services(name))").is("deleted_at", null).order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Unable to list clients: ${error.message}`);
  return data;
}

export async function createAdminClient(input: unknown) {
  const parsed = createClientSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase.from("clients").insert({ client_type: parsed.clientType, name: parsed.name, commercial_number: parsed.commercialNumber, national_id: parsed.nationalId, contact_name: parsed.contactName, phone: parsed.phone, email: parsed.email || null, notes: parsed.notes, created_by: user.id }).select().single();
  if (error) throw new Error(`Unable to create client: ${error.message}`);
  revalidatePath("/admin/clients");
  return data;
}
