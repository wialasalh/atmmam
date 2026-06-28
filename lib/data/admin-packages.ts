import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PackageRecord = {
  id: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  tier_ar: string;
  tier_en: string | null;
  price: number;
  original_price: number | null;
  billing_cycle: string;
  features: string[];
  max_employees: number;
  extra_employee_price: number;
  tax_percent: number;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function listAdminPackages() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to list packages: ${error.message}`);
  return data as PackageRecord[];
}

export async function createAdminPackage(input: {
  title_ar: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  category: string;
  tier_ar: string;
  tier_en?: string;
  price: number;
  original_price?: number;
  billing_cycle: string;
  features: string[];
  max_employees?: number;
  extra_employee_price?: number;
  tax_percent?: number;
  is_popular?: boolean;
  sort_order?: number;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("packages")
    .insert({
      title_ar: input.title_ar,
      title_en: input.title_en || null,
      description_ar: input.description_ar || null,
      description_en: input.description_en || null,
      category: input.category,
      tier_ar: input.tier_ar,
      tier_en: input.tier_en || null,
      price: input.price,
      original_price: input.original_price || null,
      billing_cycle: input.billing_cycle,
      features: input.features,
      max_employees: input.max_employees || 0,
      extra_employee_price: input.extra_employee_price || 0,
      tax_percent: input.tax_percent || 15,
      is_popular: input.is_popular || false,
      sort_order: input.sort_order || 0,
    })
    .select()
    .single();
  if (error) throw new Error(`Unable to create package: ${error.message}`);
  revalidatePath("/admin/services");
  return data;
}

export async function updateAdminPackage(input: {
  packageId: string;
  title_ar?: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  category?: string;
  tier_ar?: string;
  tier_en?: string;
  price?: number;
  original_price?: number;
  billing_cycle?: string;
  features?: string[];
  max_employees?: number;
  extra_employee_price?: number;
  tax_percent?: number;
  is_active?: boolean;
  is_popular?: boolean;
  sort_order?: number;
}) {
  const supabase = await createSupabaseServerClient();
  const { packageId, ...changes } = input;
  const clean = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined)
  );
  const { data, error } = await supabase
    .from("packages")
    .update(clean)
    .eq("id", packageId)
    .select()
    .single();
  if (error) throw new Error(`Unable to update package: ${error.message}`);
  revalidatePath("/admin/services");
  return data;
}

export async function deleteAdminPackage(packageId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("packages")
    .delete()
    .eq("id", packageId);
  if (error) throw new Error(`Unable to delete package: ${error.message}`);
  revalidatePath("/admin/services");
}
