import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: { default: "لوحة أتمم", template: "%s | أتمم" },
  description: "لوحة تشغيل أتمم لإدارة الطلبات والعملاء والمتابعات.",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ErrorBoundary><AdminAuthGuard><AdminShellClient>{children}</AdminShellClient></AdminAuthGuard></ErrorBoundary>;
}
