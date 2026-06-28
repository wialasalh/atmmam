import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import "./admin-extra.css";
import "./admin-followups.css";
import "./admin-overview.css";
import "./admin-secondary.css";
import "./admin-login.css";
import "./admin-documents.css";
import "./admin-mobile.css";
import "./admin-settings.css";
import "./admin-audit.css";
import "./admin-team.css";
import "./admin-hide-shell.css";
import "./admin-tickets.css";
import AdminAuthGuard from "./admin-auth-guard";
import AdminShellClient from "@/components/admin-shell-client";
import { ErrorBoundary } from "@/components/error-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "لوحة أتمم", template: "%s | أتمم" },
  description: "لوحة تشغيل أتمم لإدارة الطلبات والعملاء والمتابعات.",
};

const STAFF_ROLES = ["admin", "manager", "operator", "viewer"];

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-invoke-path") ?? hdrs.get("x-pathname") ?? "";

  // Allow login page without auth check
  if (!pathname.includes("/admin/login")) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) redirect("/admin/login");

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!profile || !STAFF_ROLES.includes(profile.role)) redirect("/dashboard");
    } catch {
      // If supabase not configured, let middleware handle it
    }
  }

  return <ErrorBoundary><AdminAuthGuard><AdminShellClient>{children}</AdminShellClient></AdminAuthGuard></ErrorBoundary>;
}
