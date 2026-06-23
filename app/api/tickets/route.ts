import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
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

async function getProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from("profiles").select("role, specializations").eq("id", userId).single();
  return data;
}

async function smartAssign(
  serviceClient: ReturnType<typeof createClient>,
  category: string
): Promise<string | null> {
  const specialization = CATEGORY_SPECIALIZATION[category];
  if (!specialization) return null;

  // Find available staff with matching specialization and least tickets
  const { data: agents } = await serviceClient
    .from("profiles")
    .select("id, max_tickets, specializations")
    .eq("role", "operator")
    .eq("is_available", true)
    .contains("specializations", [specialization]);

  if (!agents || agents.length === 0) {
    // Fallback: least loaded operator
    const { data: fallback } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("role", "operator")
      .eq("is_available", true)
      .limit(1)
      .single();
    return fallback?.id || null;
  }

  // Get ticket counts per agent
  const agentIds = agents.map((a: { id: string }) => a.id);
  const { data: counts } = await serviceClient
    .from("tickets")
    .select("assigned_to")
    .in("assigned_to", agentIds)
    .not("status", "in", '("تم الحل","مغلقة")');

  const countMap: Record<string, number> = {};
  (counts || []).forEach((t: { assigned_to: string }) => {
    if (t.assigned_to) countMap[t.assigned_to] = (countMap[t.assigned_to] || 0) + 1;
  });

  // Pick agent with fewest active tickets
  const sorted = agents.sort((a: { id: string; max_tickets: number }, b: { id: string; max_tickets: number }) =>
    (countMap[a.id] || 0) - (countMap[b.id] || 0)
  );

  return sorted[0]?.id || null;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const profile = await getProfile(supabase, user.id);
  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

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
      .select(`
        *,
        profiles:user_id(full_name, email),
        assigned_profile:assigned_to(full_name),
        client:client_id(name, client_type),
        locked_profile:locked_by(full_name)
      `);

    if (assignedToFilter) query = query.eq("assigned_to", assignedToFilter);
    if (categoryFilter) query = query.eq("category", categoryFilter);
  } else {
    query = supabase
      .from("tickets")
      .select(`*, client:client_id(name, client_type)`)
      .eq("user_id", user.id);

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
  const { title, description, category, priority, client_id } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "العنوان والوصف مطلوبان" }, { status: 400 });
  }

  // Validate client_id belongs to this user
  let resolvedClientId: string | null = null;
  if (client_id) {
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("user_id", user.id)
      .single();
    if (clientCheck) resolvedClientId = clientCheck.id;
  } else {
    // Default: first client of user
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1);
    resolvedClientId = clients?.[0]?.id || null;
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
      description: description.trim(),
      category: category || "استفسار",
      priority: priority || "عادية",
      status: "جديدة",
      assigned_to: assignedTo,
      assigned_at: assignedTo ? new Date().toISOString() : null,
      sla_due_at: slaDueAt,
      source: "web",
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
