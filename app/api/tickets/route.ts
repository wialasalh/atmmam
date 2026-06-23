import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile && ["admin", "manager", "operator"].includes(profile.role);

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  let query;
  if (isStaff && serviceClient) {
    query = serviceClient.from("tickets").select("*, profiles:user_id(full_name, email)");
  } else {
    query = supabase.from("tickets").select("*").eq("user_id", user.id);
  }

  query = query.order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: tickets, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ data: tickets });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json();
  const { title, description, category, priority } = body;

  if (!title || !description) {
    return NextResponse.json({ error: "العنوان والوصف مطلوبان" }, { status: 400 });
  }

  // Look up the client record for this user
  const { data: clientRecords } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const clientId = (clientRecords && clientRecords[0]?.id) || null;

  const { data: ticket, error: insertError } = await supabase
    .from("tickets")
    .insert({
      user_id: user.id,
      client_id: clientId,
      title,
      description,
      category: category || "استفسار",
      priority: priority || "عادية",
      status: "جديدة",
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ data: ticket }, { status: 201 });
}
