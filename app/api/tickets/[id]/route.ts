import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  let ticket;
  if (isStaff && serviceClient) {
    const { data } = await serviceClient
      .from("tickets")
      .select("*, profiles:user_id(full_name, email)")
      .eq("id", id)
      .single();
    ticket = data;
  } else {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    ticket = data;
  }

  if (!ticket) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });
  return NextResponse.json({ data: ticket });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  const body = await request.json();
  const allowedFields = isStaff
    ? ["status", "assigned_to", "priority"]
    : [];

  if (allowedFields.length === 0) {
    return NextResponse.json({ error: "لا يمكنك تعديل التذكرة" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }
  updateData.updated_at = new Date().toISOString();

  const client = serviceClient || supabase;
  const { data: updated, error: updateError } = await client
    .from("tickets")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ data: updated });
}
