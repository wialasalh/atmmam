import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl!, serviceRole!, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const status = searchParams.get("status");

    if (!serviceClient) throw new Error("Service client not configured");

    let query = serviceClient
      .from("subscriptions")
      .select("*, packages(id, title_ar, tier_ar, category, billing_cycle, price, features, max_employees), clients(id, name, email, phone)")
      .order("created_at", { ascending: false });

    if (clientId) query = query.eq("client_id", clientId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
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

    if (!serviceClient) throw new Error("Service client not configured");

    const body = await request.json();
    const { client_id, package_id, employee_count = 0, status = "active", start_date, end_date } = body;

    if (!client_id) return NextResponse.json({ error: "client_id مطلوب" }, { status: 400 });
    if (!package_id) return NextResponse.json({ error: "package_id مطلوب" }, { status: 400 });

    const { data: pkg, error: pkgErr } = await serviceClient
      .from("packages")
      .select("*")
      .eq("id", package_id)
      .single();

    if (pkgErr || !pkg) return NextResponse.json({ error: "package_not_found" }, { status: 404 });

    const { data: client } = await serviceClient
      .from("clients")
      .select("id, name")
      .eq("id", client_id)
      .single();

    if (!client) return NextResponse.json({ error: "client_not_found" }, { status: 404 });

    const extraEmployees = Math.max(0, employee_count - (pkg.max_employees || 0));
    const extraPrice = extraEmployees * (pkg.extra_employee_price || 0);
    const basePrice = pkg.price;
    const subtotal = basePrice + extraPrice;
    const taxAmount = Math.round(subtotal * (pkg.tax_percent || 15) / 100 * 100) / 100;
    const totalPrice = subtotal + taxAmount;

    const start = start_date || new Date().toISOString().split("T")[0];
    let end = end_date;
    if (!end) {
      const endDate = new Date();
      if (pkg.billing_cycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
      else if (pkg.billing_cycle === "monthly") endDate.setMonth(endDate.getMonth() + 1);
      else if (pkg.billing_cycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
      else endDate.setFullYear(endDate.getFullYear() + 1);
      end = endDate.toISOString().split("T")[0];
    }

    const { data, error } = await serviceClient
      .from("subscriptions")
      .insert({
        client_id,
        package_id,
        employee_count,
        base_price: basePrice,
        extra_price: extraPrice,
        tax_amount: taxAmount,
        total_price: totalPrice,
        billing_cycle: pkg.billing_cycle,
        start_date: start,
        end_date: end,
        status,
      })
      .select("*, packages(id, title_ar, tier_ar, category, billing_cycle, price), clients(id, name)")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (!serviceClient) throw new Error("Service client not configured");
    const body = await request.json();
    const { id, extension_price, extension_notes, ...changes } = body;

    if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

    // Fetch old subscription to detect changes
    const { data: oldSub, error: fetchErr } = await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr || !oldSub) throw new Error("subscription_not_found");

    // Build update payload
    const updatePayload: Record<string, any> = { ...changes, updated_by: user.id };

    const { data, error } = await serviceClient
      .from("subscriptions")
      .update(updatePayload)
      .eq("id", id)
      .select("*, packages(id, title_ar, tier_ar, category, billing_cycle, price), clients(id, name)")
      .single();

    if (error) throw new Error(error.message);

    // Detect changes and create events
    const events: Array<{
      subscription_id: string;
      event_type: string;
      previous_data: any;
      new_data: any;
      price: number;
      notes: string;
      created_by: string;
    }> = [];

    // End date changed → extension
    if (changes.end_date && changes.end_date !== oldSub.end_date) {
      // Auto-calculate price from package
      const { data: extPkg } = await serviceClient
        .from("packages")
        .select("price, billing_cycle")
        .eq("id", oldSub.package_id)
        .single();

      let autoPrice = 0;
      if (extPkg) {
        const oldEnd = new Date(oldSub.end_date || oldSub.start_date);
        const newEnd = new Date(changes.end_date);
        const daysDiff = Math.max(0, Math.round((newEnd.getTime() - oldEnd.getTime()) / 86400000));
        const cycleDays = extPkg.billing_cycle === "yearly" ? 365 : extPkg.billing_cycle === "quarterly" ? 90 : 30;
        if (daysDiff > 0) autoPrice = Math.round((extPkg.price / cycleDays) * daysDiff);
      }

      const extraAmount = Math.max(0, Number(extension_price) || 0);
      const totalPrice = autoPrice + extraAmount;

      events.push({
        subscription_id: id,
        event_type: "extension",
        previous_data: { end_date: oldSub.end_date },
        new_data: { end_date: changes.end_date, auto_price: autoPrice, extra_amount: extraAmount },
        price: totalPrice,
        notes: extension_notes || "",
        created_by: user.id,
      });
    }

    // Status changed
    if (changes.status && changes.status !== oldSub.status) {
      if (changes.status === "cancelled") {
        events.push({
          subscription_id: id,
          event_type: "cancellation",
          previous_data: { status: oldSub.status },
          new_data: { status: changes.status },
          price: 0,
          notes: extension_notes || "",
          created_by: user.id,
        });
      } else if (oldSub.status === "cancelled" && changes.status === "active") {
        events.push({
          subscription_id: id,
          event_type: "reactivation",
          previous_data: { status: oldSub.status },
          new_data: { status: changes.status },
          price: 0,
          notes: extension_notes || "",
          created_by: user.id,
        });
      } else {
        events.push({
          subscription_id: id,
          event_type: "modification",
          previous_data: { status: oldSub.status },
          new_data: { status: changes.status },
          price: 0,
          notes: extension_notes || "",
          created_by: user.id,
        });
      }
    }

    // Employee count changed
    if (changes.employee_count !== undefined && Number(changes.employee_count) !== oldSub.employee_count) {
      events.push({
        subscription_id: id,
        event_type: "modification",
        previous_data: { employee_count: oldSub.employee_count },
        new_data: { employee_count: changes.employee_count },
        price: 0,
        notes: extension_notes || "",
        created_by: user.id,
      });
    }

    // Insert all events
    if (events.length > 0) {
      const { error: evErr } = await serviceClient
        .from("subscription_events")
        .insert(events);
      if (evErr) console.error("Failed to insert subscription events:", evErr);
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
