"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ClipboardList, FileText, MessageSquare,
  User, LogOut, Menu, X, ChevronLeft, Building2, Building
} from "lucide-react";

type ClientRecord = {
  id: string; name: string; client_type: string; phone?: string; email?: string;
  commercial_number?: string | null; national_id?: string | null;
  unified_register_number?: string | null; company_address?: string | null;
  company_activity?: string | null; notes?: string | null;
  city?: string | null; tax_number?: string | null;
  commercial_register_date?: string | null; commercial_register_expiry?: string | null;
  entity_size?: string | null; employee_count?: number | null;
  company_scope?: string | null; company_status?: string | null;
  commercial_register_doc?: string | null; company_license_doc?: string | null;
  national_id_doc?: string | null; zakat_tax_doc?: string | null;
  national_address_doc?: string | null; extra_docs?: unknown;
  created_at: string;
};

type ClientData = {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  phone?: string;
  avatar_url?: string | null;
  clients?: ClientRecord[];
};

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "طلباتي", icon: ClipboardList },
  { href: "/dashboard/documents", label: "مستنداتي", icon: FileText },
  { href: "/dashboard/tickets", label: "الدعم", icon: MessageSquare },
  { href: "/dashboard/companies", label: "المنشآت", icon: Building },
  { href: "/dashboard/profile", label: "الملف الشخصي", icon: User },
];

import "./dashboard.css";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientData | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.replace("/login"); return; }
      if (!authUser.email_confirmed_at) {
        setEmailConfirmed(false);
        // Still load user data but show banner
      } else {
        setEmailConfirmed(true);
      }
      const res = await fetch("/api/auth/me");
      if (!res.ok) { router.replace("/login"); return; }
      const { data } = await res.json();
      if (data?.role === "admin" || data?.role === "manager" || data?.role === "operator") {
        router.replace("/admin");
        return;
      }
      setUser(data);
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="client-dash-shell" dir="rtl">
        <div className="client-dash-loading">جاري التحميل...</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="client-dash-shell" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="client-dash-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`client-dash-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="client-dash-sidebar-header">
          <Link href="/" className="client-dash-logo">
            <img src="/assets/logo/atmmam-ai-lockup.png" alt="أتمم" />
          </Link>
          <button className="client-dash-close-btn" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <div className="client-dash-user-card">
          <span className="client-dash-avatar">{user.full_name.charAt(0)}</span>
          <div>
            <strong>{user.full_name}</strong>
            <small>{user.clients?.[0]?.name || user.email}</small>
          </div>
        </div>

        <nav className="client-dash-nav">
          {navItems.map((item) => {
            const active = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`client-dash-nav-item ${active ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
                <item.icon size={18} />
                <span>{item.label}</span>
                {active && <ChevronLeft size={14} className="client-dash-nav-chevron" />}
              </Link>
            );
          })}
        </nav>

        <div className="client-dash-sidebar-footer">
          <Link href="/" className="client-dash-back-link"><Building2 size={14} /> العودة للموقع</Link>
          <button className="client-dash-logout-btn" onClick={handleLogout}><LogOut size={14} /> تسجيل خروج</button>
        </div>
      </aside>

      {/* Main content */}
      <div className="client-dash-main">
        <header className="client-dash-topbar">
          <button className="client-dash-menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <div className="client-dash-topbar-title">
            {navItems.find((n) => pathname.startsWith(n.href))?.label || "منطقة العميل"}
          </div>
          <div />
        </header>
        {!emailConfirmed && (
          <div className="client-dash-email-banner">
            <strong>البريد الإلكتروني غير مؤكد.</strong> يرجى الضغط على رابط التفعيل المرسل إلى بريدك الإلكتروني للتمكن من إرسال تذاكر الدعم ورفع المستندات.
          </div>
        )}
        <div className="client-dash-content">{children}</div>
      </div>
    </main>
  );
}
