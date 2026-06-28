import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: clientData } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!clientData) return NextResponse.json({ data: [] });

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, packages(id, title_ar, tier_ar, category, billing_cycle, price)")
      .eq("client_id", clientData.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to fetch subscriptions: ${error.message}`);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: clientData } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!clientData) return NextResponse.json({ error: "client_not_found" }, { status: 404 });

    const body = await request.json();
    const { package_id, employee_count = 0 } = body;

    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .single();

    if (pkgErr || !pkg) {
      return NextResponse.json({ error: "package_not_found" }, { status: 404 });
    }

    const extraEmployees = Math.max(0, employee_count - (pkg.max_employees || 0));
    const extraPrice = extraEmployees * (pkg.extra_employee_price || 0);
    const basePrice = pkg.price;
    const subtotal = basePrice + extraPrice;
    const taxAmount = Math.round(subtotal * (pkg.tax_percent || 15) / 100 * 100) / 100;
    const totalPrice = subtotal + taxAmount;

    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    if (pkg.billing_cycle === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (pkg.billing_cycle === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (pkg.billing_cycle === "quarterly") {
      endDate.setMonth(endDate.getMonth() + 3);
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        client_id: clientData.id,
        package_id,
        employee_count,
        base_price: basePrice,
        extra_price: extraPrice,
        tax_amount: taxAmount,
        total_price: totalPrice,
        billing_cycle: pkg.billing_cycle,
        start_date: startDate,
        end_date: endDate.toISOString().split("T")[0],
        status: "active",
      })
      .select("*, packages(id, title_ar, tier_ar, category, billing_cycle, price)")
      .single();

    if (error) throw new Error(`Unable to create subscription: ${error.message}`);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
