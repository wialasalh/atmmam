import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const serviceClient = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: clientList } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const clientData = clientList?.[0] ?? null;
    if (!clientData) return NextResponse.json({ data: [] });

    // جلب اشتراكات كل سجلات العميل (في حال وجود أكثر من سجل)
    const { data: allClients } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id);
    const clientIds = (allClients || []).map((c: { id: string }) => c.id);

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*, packages(id, title_ar, tier_ar, category, billing_cycle, price)")
      .in("client_id", clientIds)
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

    const { data: clientList2 } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    let clientData: { id: string } | null = clientList2?.[0] ?? null;

    // إذا لم يوجد سجل عميل، ننشئه تلقائياً
    if (!clientData) {
      const db = serviceClient || supabase;

      const { data: profile } = await db
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      // حاول الإنشاء — إذا فشل (race condition أو constraint) حاول الجلب مرة ثانية
      const { data: newClient } = await db
        .from("clients")
        .insert({
          user_id: user.id,
          name: profile?.full_name || user.email?.split("@")[0] || "عميل",
          email: user.email || "",
          phone: profile?.phone || "",
          client_type: "person",
          notes: "مسجل تلقائياً",
        })
        .select("id")
        .single();

      if (newClient) {
        clientData = newClient;
      } else {
        // ربما الـ trigger أنشأ السجل في نفس الوقت — جلب مجدداً
        const { data: retryList } = await db
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);
        clientData = retryList?.[0] ?? null;
      }

      if (!clientData)
        return NextResponse.json({ error: "تعذّر إنشاء ملف العميل، تواصل مع الدعم" }, { status: 500 });
    }

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
    let endDateStr: string | null = null;
    if (pkg.billing_cycle === "yearly") {
      const d = new Date(); d.setFullYear(d.getFullYear() + 1);
      endDateStr = d.toISOString().split("T")[0];
    } else if (pkg.billing_cycle === "monthly") {
      const d = new Date(); d.setMonth(d.getMonth() + 1);
      endDateStr = d.toISOString().split("T")[0];
    } else if (pkg.billing_cycle === "quarterly") {
      const d = new Date(); d.setMonth(d.getMonth() + 3);
      endDateStr = d.toISOString().split("T")[0];
    }
    // one-time: لا تاريخ انتهاء

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
        end_date: endDateStr,
        status: "pending",
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
