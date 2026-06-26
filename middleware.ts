import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminApi = path.startsWith("/api/admin/");
  const isClientApi = path.startsWith("/api/client/");
  const isTicketApi = path.startsWith("/api/tickets");
  const isDashboard = path.startsWith("/dashboard");
  const isAuthApi = path.startsWith("/api/auth/");
  const isLoginPage = path === "/login" || path === "/admin/login";
  const isRegisterPage = path === "/register";
  const isPublicAuthApi = path === "/api/auth/register" || path === "/api/auth/login";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== "production" || isLoginPage || isRegisterPage) return NextResponse.next();
    if (isAdminApi) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const isAdminPage = path.startsWith("/admin") && !isLoginPage;

  // Admin protection — fetch role once for both page and API checks
  if (isAdminPage || isAdminApi) {
    if (!user) {
      if (isAdminApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const userRole = profile?.role ?? null;
    const allowed = ["admin", "manager", "operator", "viewer"];

    if (!userRole || !allowed.includes(userRole)) {
      if (isAdminApi) return NextResponse.json({ error: "forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (user && isLoginPage && path.startsWith("/admin")) return NextResponse.redirect(new URL("/admin", request.url));

  // Client/ticket API protection
  if (!user && isTicketApi) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!user && isClientApi) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Dashboard protection
  if (!user && isDashboard) return NextResponse.redirect(new URL("/login", request.url));
  if (user && (isLoginPage || isRegisterPage) && !path.startsWith("/admin")) return NextResponse.redirect(new URL("/dashboard", request.url));

  return response;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/api/client/:path*", "/api/tickets/:path*", "/dashboard/:path*", "/dashboard", "/login", "/register", "/api/auth/:path*"] };
