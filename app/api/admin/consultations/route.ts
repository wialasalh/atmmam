import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/data/admin-team";
import { getAllAuthUsers, buildUserMap } from "@/lib/auth/users";

export const dynamic = "force-dynamic";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const { user } = await requireRole("operator");
    const serviceClient = makeServiceClient();

    // Fetch role separately (always exists) then permissions (may not exist on older DBs)
    const { data: callerProfile } = await serviceClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const staffRole = callerProfile?.role || "";
    const isAdminOrManager = ["admin", "manager"].includes(staffRole);

    // Try to fetch permissions column — graceful if column doesn't exist yet
    let userPerms: string[] = [];
    try {
      const { data: permRow } = await serviceClient
        .from("profiles")
        .select("permissions")
        .eq("id", user.id)
        .single();
      userPerms = (permRow as any)?.permissions || [];
    } catch { /* permissions column may not exist */ }

    const canViewAll = isAdminOrManager || userPerms.includes("view_consultations");
    // Operators without explicit permission get assigned-only view by default
    const canViewAssigned = canViewAll || userPerms.includes("view_consultations_assigned") || staffRole === "operator";

    let query = serviceClient
      .from("tickets")
      .select(`
        id, title, body, description, status, priority, category,
        created_at, updated_at, user_id, client_id, assigned_to,
        clients ( id, name, client_type, phone, email, city )
      `)
      .eq("type", "consultation")
      .order("created_at", { ascending: false });

    // Restrict to assigned only when user has limited permission
    if (!canViewAll) query = query.eq("assigned_to", user.id);

    const { data: consultations, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Load consultation-specific columns (graceful if migration not applied)
    let extraMap: Record<string, Record<string, unknown>> = {};
    const { data: extras } = await serviceClient
      .from("tickets")
      .select("id, consultation_method, consultation_phone, consultation_scheduled_at, consultation_meeting_link, consultation_price, consultation_status")
      .eq("type", "consultation")
      .order("created_at", { ascending: false });
    if (extras) for (const e of extras) extraMap[e.id] = e;

    // Load client profiles
    const userIds = [...new Set((consultations || []).map(t => t.user_id).filter(Boolean))];
    let userMap: Record<string, { full_name: string; email: string }> = {};
    if (userIds.length) {
      const { data: profiles } = await serviceClient.from("profiles").select("id, full_name, email").in("id", userIds);
      if (profiles) for (const p of profiles) userMap[p.id] = { full_name: p.full_name, email: p.email || "" };
      const missing = userIds.filter(id => !userMap[id]);
      if (missing.length) {
        try {
          const all = await getAllAuthUsers();
          const authMap = buildUserMap(all);
          for (const id of missing) if (authMap[id]) userMap[id] = authMap[id];
        } catch { /* non-fatal */ }
      }
    }

    // Load team members for assignment dropdown (only for those who can view all)
    let teamMembers: { id: string; full_name: string; role: string }[] = [];
    if (canViewAll) {
      const { data: team } = await serviceClient
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["admin", "manager", "operator"])
        .order("full_name");
      if (team) teamMembers = team;
    }

    const data = (consultations || []).map(c => ({
      ...c,
      ...(extraMap[c.id] || {
        consultation_method: null,
        consultation_phone: null,
        consultation_scheduled_at: null,
        consultation_meeting_link: null,
        consultation_price: null,
        consultation_status: "جديد",
      }),
      profiles: userMap[c.user_id] || { full_name: "مستخدم", email: "" },
    }));

    return NextResponse.json({ data, teamMembers });
  } catch (e) {
    const msg = String(e);
    const status = msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requireRole("operator");
    const serviceClient = makeServiceClient();
    const body = await req.json() as {
      id?: string;
      assigned_to?: string | null;
      consultation_status?: string;
      consultation_method?: string;
      consultation_scheduled_at?: string | null;
      consultation_meeting_link?: string | null;
      consultation_price?: number | null;
      note?: string;
    };

    if (!body.id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

    // Always-safe updates (columns that definitely exist)
    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.assigned_to !== undefined) safeUpdates.assigned_to = body.assigned_to;

    const { error: safeErr } = await serviceClient
      .from("tickets")
      .update(safeUpdates)
      .eq("id", body.id)
      .eq("type", "consultation");

    if (safeErr) return NextResponse.json({ error: safeErr.message }, { status: 500 });

    // Try consultation-specific columns (graceful if migration not applied)
    const consultationUpdates: Record<string, unknown> = {};
    if (body.consultation_status !== undefined) consultationUpdates.consultation_status = body.consultation_status;
    if (body.consultation_method !== undefined) consultationUpdates.consultation_method = body.consultation_method;
    if (body.consultation_scheduled_at !== undefined) consultationUpdates.consultation_scheduled_at = body.consultation_scheduled_at;
    if (body.consultation_meeting_link !== undefined) consultationUpdates.consultation_meeting_link = body.consultation_meeting_link;
    if (body.consultation_price !== undefined) consultationUpdates.consultation_price = body.consultation_price;

    if (Object.keys(consultationUpdates).length > 0) {
      await serviceClient
        .from("tickets")
        .update(consultationUpdates)
        .eq("id", body.id)
        .eq("type", "consultation");
      // Ignore error — columns may not exist yet (migration pending)
    }

    // Build a client-facing confirmation message when key fields are set
    const METHOD_LABELS: Record<string, string> = {
      phone: "مكالمة هاتفية", zoom: "اتصال مرئي", in_person: "حضوري", written: "كتابياً",
    };
    const STATUS_LABELS: Record<string, string> = {
      "جديد": "جديد", "مجدولة": "تم جدولة الاستشارة ✅", "منجزة": "تمت الاستشارة ✅", "ملغاة": "تم إلغاء الاستشارة ❌",
    };

    const parts: string[] = [];
    if (body.consultation_status && body.consultation_status !== "جديد") {
      parts.push(STATUS_LABELS[body.consultation_status] || body.consultation_status);
    }
    if (body.consultation_scheduled_at) {
      const d = new Date(body.consultation_scheduled_at);
      parts.push(`الموعد: ${d.toLocaleString("ar-SA", { calendar: "gregory", dateStyle: "full", timeStyle: "short" })}`);
    }
    if (body.consultation_method) {
      parts.push(`طريقة التواصل: ${METHOD_LABELS[body.consultation_method] || body.consultation_method}`);
    }
    if (body.consultation_price != null) {
      parts.push(`رسوم الاستشارة: ${body.consultation_price} ر.س`);
    }
    if (body.consultation_meeting_link) {
      parts.push(`رابط الاجتماع: ${body.consultation_meeting_link}`);
    }
    if (body.note?.trim()) {
      parts.push(body.note.trim());
    }

    if (parts.length > 0) {
      await serviceClient.from("ticket_messages").insert({
        ticket_id: body.id,
        user_id: user?.id || "system",
        body: parts.join("\n"),
        is_internal: false,
        message_type: "admin_reply",
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = String(e);
    const status = msg === "unauthorized" ? 401 : msg === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
