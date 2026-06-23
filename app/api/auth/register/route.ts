import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, clientType, companyName } = body;

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json({ error: "fullName, email, phone, password مطلوبة" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }
    if (!serviceClient) {
      return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
    }

    // Check existing user
    const { data: existing } = await serviceClient.auth.admin.listUsers();
    const emailTaken = existing?.users?.some((u: { email?: string }) => u.email === email);
    if (emailTaken) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
    }

    const meta: Record<string, string> = {
      full_name: fullName,
      phone,
      role: "client",
      client_type: clientType || "person",
    };
    if (companyName) meta.client_type = "company";

    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: meta,
    });
    if (error) throw new Error(error.message);

    // Generate confirmation link (user will receive this via email when SMTP is configured)
    const { data: linkData } = await serviceClient.auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });

    return NextResponse.json({
      data: { id: data.user?.id, email },
      confirmationLink: process.env.NODE_ENV === "development" ? linkData?.properties?.action_link : undefined,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}
