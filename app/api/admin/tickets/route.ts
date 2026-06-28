import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/data/admin-team";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllAuthUsers, buildUserMap } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: Request) {
  try {
    await requireRole("operator");
    const serviceClient = makeServiceClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = serviceClient
      .from("tickets")
      .select(`
        id, title, body, description, status, priority, category,
        created_at, updated_at, user_id, client_id,
        assigned_to, files,
        clients (
          id, name, client_type,
          tax_number, commercial_number,
          company_activity, company_address, city,
          entity_size, employee_count,
          company_scope, company_status,
          phone, email,
          commercial_register_doc, company_license_doc,
          national_id_doc, zakat_tax_doc, national_address_doc
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "الكل") {
      query = query.eq("status", status);
    }

    const { data: tickets, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch user metadata for all ticket creators
    const userIds = [...new Set((tickets || []).map(t => t.user_id).filter(Boolean))];
    let userMap: Record<string, { full_name: string; email: string; avatar_url?: string }> = {};
    if (userIds.length) {
      // Try profiles table first (service client bypasses RLS)
      const { data: profiles } = await serviceClient.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds);
      if (profiles) {
        for (const p of profiles) {
          userMap[p.id] = { full_name: p.full_name, email: p.email || "", avatar_url: p.avatar_url || undefined };
        }
      }
      // Fallback to auth users for any missing entries
      const missing = userIds.filter(id => !userMap[id]);
      if (missing.length) {
        const all = await getAllAuthUsers();
        const authMap = buildUserMap(all);
        for (const id of missing) {
          if (authMap[id]) userMap[id] = { ...authMap[id], avatar_url: undefined };
        }
      }
    }

    const data = (tickets || []).map(t => ({
      ...t,
      profiles: userMap[t.user_id] || { full_name: "مستخدم", email: "" },
    }));

    return NextResponse.json({ data });
  } catch (e) {
    const msg = String(e);
    const status = msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requireRole("operator");
    const supabase = await createSupabaseServerClient();
    const serviceClient = makeServiceClient();
    const body = await req.json() as {
      ticketId?: string;
      status?: string;
      assignedTo?: string | null;
      note?: string;
      files?: string[];
    };

    if (!body.ticketId) {
      return NextResponse.json({ error: "ticketId مطلوب" }, { status: 400 });
    }

    // Get old ticket status for history log
    const { data: oldTicket } = await serviceClient
      .from("tickets")
      .select("status")
      .eq("id", body.ticketId)
      .single();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.status !== undefined) updates.status = body.status;
    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
    if (body.files !== undefined) {
      const { data: existing } = await serviceClient
        .from("tickets")
        .select("files")
        .eq("id", body.ticketId)
        .single();
      updates.files = [...(existing?.files || []), ...body.files];
    }

    const { data, error } = await serviceClient
      .from("tickets")
      .update(updates)
      .eq("id", body.ticketId)
      .select("id, status, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log status change to history
    if (body.status !== undefined && oldTicket) {
      await serviceClient.from("ticket_status_history").insert({
        ticket_id: body.ticketId,
        from_status: oldTicket.status,
        to_status: body.status,
        changed_by: user?.id || "system",
        note: body.note || null,
      });
    }

    // If note provided, insert as a ticket message
    if (body.note?.trim() && body.status !== undefined) {
      await serviceClient.from("ticket_messages").insert({
        ticket_id: body.ticketId,
        user_id: user?.id || "system",
        body: `🔄 تغيير الحالة إلى "${body.status}": ${body.note.trim()}`,
        is_internal: false,
        message_type: "status_change",
      });
    }

    return NextResponse.json({ data });
  } catch (e) {
    const msg = String(e);
    const status = msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
