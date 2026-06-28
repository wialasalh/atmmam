import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isStaffRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl!, serviceRole!, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// SLA hours based on priority
const SLA_HOURS: Record<string, number> = {
  "عاجلة": 4,
  "مرتفعة": 24,
  "عادية": 72,
};

// Category → specialization mapping for smart routing
const CATEGORY_SPECIALIZATION: Record<string, string> = {
  "تأسيس الشركات والمنشآت": "company-formation",
  "إدارة المنصات الحكومية": "gov-platforms",
  "التراخيص والتصاريح": "licenses",
  "التأهيل والاعتمادات": "accreditation",
  "الخدمات القانونية والتوثيق": "legal",
  "الموارد البشرية وحماية الأجور": "hr",
  "الزكاة والضريبة والاستشارات": "tax",
};

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("role, specializations").eq("id", userId).single();
  return data;
}

async function smartAssign(
  client: any,
  category: string
): Promise<string | null> {
  const specialization = CATEGORY_SPECIALIZATION[category];
  if (!specialization) return null;

  const agentList = await client
    .from("profiles")
    .select("id, max_tickets, specializations")
    .eq("role", "operator")
    .eq("is_available", true)
    .contains("specializations", [specialization])
    .then((r: { data: any }) => r.data as { id: string; max_tickets: number }[] | null);

  if (!agentList || agentList.length === 0) {
    const fallback = await client
      .from("profiles")
      .select("id")
      .eq("role", "operator")
      .eq("is_available", true)
      .limit(1)
      .maybeSingle()
      .then((r: { data: any }) => r.data as { id: string } | null);
    return fallback?.id || null;
  }

  const agentIds = agentList.map((a: { id: string }) => a.id);
  const counts = await client
    .from("tickets")
    .select("assigned_to")
    .in("assigned_to", agentIds)
    .not("status", "in", '("تم الحل","مغلقة")')
    .then((r: { data: any }) => r.data as { assigned_to: string }[] | null);

  const countMap: Record<string, number> = {};
  (counts || []).forEach((t: { assigned_to: string }) => {
    if (t.assigned_to) countMap[t.assigned_to] = (countMap[t.assigned_to] || 0) + 1;
  });

  const sorted = agentList.sort((a: { id: string; max_tickets: number }, b: { id: string; max_tickets: number }) =>
    (countMap[a.id] || 0) - (countMap[b.id] || 0)
  );

  return sorted[0]?.id || null;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  const isStaff = profile && isStaffRole(profile.role);

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const priorityFilter = url.searchParams.get("priority");
  const clientIdFilter = url.searchParams.get("client_id");
  const assignedToFilter = url.searchParams.get("assigned_to");
  const categoryFilter = url.searchParams.get("category");

  let query;
  if (isStaff && serviceClient) {
    query = serviceClient
      .from("tickets")
      .select(`*, client:clients(name, client_type)`);

    if (assignedToFilter) query = query.eq("assigned_to", assignedToFilter);
    if (categoryFilter) query = query.eq("category", categoryFilter);
  } else {
    // For members, fetch tickets by their linked client company
    const { data: memberProfile } = await supabase
      .from("profiles")
      .select("member_of_client_id")
      .eq("id", user.id)
      .single();

    const memberClientId = memberProfile?.member_of_client_id;

    if (memberClientId && serviceClient) {
      // Use service client to bypass RLS for member access to company tickets
      query = serviceClient
        .from("tickets")
        .select(`*, client:clients(name, client_type)`)
        .eq("client_id", memberClientId);
    } else {
      query = supabase
        .from("tickets")
        .select(`*, client:client_id(name, client_type)`)
        .eq("user_id", user.id);
    }

    if (clientIdFilter) query = query.eq("client_id", clientIdFilter);
  }

  if (statusFilter) query = query.eq("status", statusFilter);
  if (priorityFilter) query = query.eq("priority", priorityFilter);

  query = query.order("created_at", { ascending: false });

  const { data: tickets, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ data: tickets });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { title, description, category, priority, client_id, type } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "العنوان والوصف مطلوبان" }, { status: 400 });
  }

  // Staff members must never get auto-created client records
  const { data: callerProfile } = await supabase.from("profiles").select("role, member_of_client_id").eq("id", user.id).single();
  const STAFF_ROLES = ["admin", "manager", "operator", "viewer"];
  const isStaffCaller = callerProfile && STAFF_ROLES.includes(callerProfile.role);
  const memberClientId = callerProfile?.member_of_client_id || null;

  // Validate client_id belongs to this user, or auto-create (clients only)
  let resolvedClientId: string | null = null;

  // Members: always use their linked company
  if (memberClientId) {
    resolvedClientId = memberClientId;
  } else if (client_id) {
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("user_id", user.id)
      .single();
    if (clientCheck) resolvedClientId = clientCheck.id;
  }
  if (!resolvedClientId && !isStaffCaller) {
    // Default: first client of user
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1);
    resolvedClientId = clients?.[0]?.id || null;
  }
  // If still no client, auto-create one from profile — only for non-staff
  if (!resolvedClientId && !isStaffCaller) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .single();
    const { data: newClient, error: insertErr } = await supabase
      .from("clients")
      .insert({
        client_type: "person",
        name: profile?.full_name || profile?.email?.split("@")[0] || "عميل",
        phone: profile?.phone || "",
        email: profile?.email || "",
        user_id: user.id,
        notes: "تم إنشاؤه تلقائياً عند إنشاء تذكرة",
      })
      .select("id")
      .single();
    if (insertErr && insertErr.code === "23505") {
      // Unique constraint hit — fetch the existing client
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      resolvedClientId = existing?.id || null;
    } else {
      resolvedClientId = newClient?.id || null;
    }
  }

  // Calculate SLA
  const slaHours = SLA_HOURS[priority || "عادية"] || 72;
  const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

  // Smart assignment
  let assignedTo: string | null = null;
  if (serviceClient && category) {
    assignedTo = await smartAssign(serviceClient, category);
  }

  const { data: ticket, error: insertError } = await supabase
    .from("tickets")
    .insert({
      user_id: user.id,
      client_id: resolvedClientId,
      title: title.trim(),
      body: description.trim(),
      description: description.trim(),
      category: category || "استفسار",
      priority: priority || "عادية",
      status: "جديدة",
      assigned_to: assignedTo,
      assigned_at: assignedTo ? new Date().toISOString() : null,
      sla_due_at: slaDueAt,
      source: "web",
      type: type || "ticket",
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Log status history
  if (serviceClient) {
    await serviceClient.from("ticket_status_history").insert({
      ticket_id: ticket.id,
      from_status: null,
      to_status: "جديدة",
      changed_by: user.id,
    });

    // Log assignment if assigned
    if (assignedTo) {
      await serviceClient.from("ticket_assignments").insert({
        ticket_id: ticket.id,
        assigned_to: assignedTo,
        assigned_by: user.id,
        note: "تعيين تلقائي بناءً على الخدمة",
      });
    }
  }

  return NextResponse.json({ data: ticket }, { status: 201 });
}
