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

  // ── Maintenance mode check ──
  const isPublicPage = !path.startsWith("/admin") && !path.startsWith("/api") && !path.startsWith("/dashboard") && path !== "/maintenance";
  if (isPublicPage) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const res = await fetch(`${url}/rest/v1/site_content?key=eq.settings_general&select=data`, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" },
          next: { revalidate: 30 },
        });
        if (res.ok) {
          const rows = await res.json() as { data: { maintenanceMode?: boolean } }[];
          if (rows?.[0]?.data?.maintenanceMode === true) {
            return NextResponse.redirect(new URL("/maintenance", request.url));
          }
        }
      }
    } catch {}
  }

  // Admin page protection (fast: auth check only — role enforced by useRoleGuard + API routes)
  if (path.startsWith("/admin") && !isLoginPage && !user)
    return NextResponse.redirect(new URL("/admin/login", request.url));

  // Admin API protection (role check required — data is at stake)
  if (user && isAdminApi) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const userRole = profile?.role ?? null;
    if (!userRole || !["admin", "manager", "operator", "viewer"].includes(userRole))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!user && isAdminApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (user && isLoginPage && path.startsWith("/admin")) return NextResponse.redirect(new URL("/admin", request.url));

  // Client/ticket API protection
  if (!user && isTicketApi) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!user && isClientApi) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  // Dashboard protection — staff must never access client dashboard
  if (!user && isDashboard) return NextResponse.redirect(new URL("/login", request.url));
  if (user && isDashboard) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role && ["admin","manager","operator","viewer"].includes(profile.role))
      return NextResponse.redirect(new URL("/admin", request.url));
  }
  if (user && (isLoginPage || isRegisterPage) && !path.startsWith("/admin")) return NextResponse.redirect(new URL("/dashboard", request.url));

  return response;
}

export const config = { matcher: ["/", "/services/:path*", "/packages/:path*", "/faq/:path*", "/about/:path*", "/contact/:path*", "/en/:path*", "/admin/:path*", "/api/admin/:path*", "/api/client/:path*", "/api/tickets/:path*", "/dashboard/:path*", "/dashboard", "/login", "/register", "/api/auth/:path*"] };
