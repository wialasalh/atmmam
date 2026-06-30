import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "manager", "operator", "viewer"];

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getUserAndRole() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const service = makeServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return { user, role: profile?.role as string | undefined, service };
}

// GET /api/notifications — fetch latest 30 notifications
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ notifications: [], count: 0 });

  const ctx = await getUserAndRole();
  if (!ctx) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { user, role, service } = ctx;
  const isStaff = role && STAFF_ROLES.includes(role);

  let query = service
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(30);

  if (isStaff) {
    query = query.or(`target_role.eq.admin,user_id.eq.${user.id}`);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data: notifications } = await query;
  const list = notifications || [];
  const count = list.filter(n => !n.is_read).length;

  return NextResponse.json({ notifications: list, count });
}

// PATCH /api/notifications — mark as read
// Body: { id?: string }  →  single item; omit to mark all
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });

  const ctx = await getUserAndRole();
  if (!ctx) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { user, role, service } = ctx;
  const isStaff = role && STAFF_ROLES.includes(role);
  const body = await req.json().catch(() => ({})) as { id?: string };

  if (body.id) {
    await service
      .from("notifications")
      .update({ is_read: true })
      .eq("id", body.id);
  } else {
    // Mark all unread as read
    let q = service.from("notifications").update({ is_read: true }).eq("is_read", false);
    if (isStaff) {
      q = q.or(`target_role.eq.admin,user_id.eq.${user.id}`);
    } else {
      q = q.eq("user_id", user.id);
    }
    await q;
  }

  return NextResponse.json({ ok: true });
}
