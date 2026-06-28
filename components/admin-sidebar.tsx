"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings, ChevronDown, Bell, LayoutDashboard, ClipboardList, Users, Ticket, RefreshCw, Package, FileText, BarChart3, UserCog, CreditCard, CircleDollarSign } from "lucide-react";

type Section = "dashboard" | "orders" | "clients" | "tickets" | "followups" | "services" | "packages" | "subscriptions" | "content" | "reports" | "team";

const roleLinks: Record<string, Section[]> = {
  admin: ["dashboard", "orders", "clients", "tickets", "followups", "services", "packages", "subscriptions", "content", "reports", "team"],
  manager: ["dashboard", "orders", "clients", "tickets", "followups", "services", "packages", "subscriptions", "content", "reports"],
  operator: ["dashboard", "orders", "tickets", "followups", "clients"],
  viewer: ["dashboard", "reports"],
};

const groups: { title: string; items: { key: Section; label: string; icon: React.ReactNode }[] }[] = [
  {
    title: "الرئيسية",
    items: [
      { key: "dashboard", label: "لوحة التحكم", icon: <LayoutDashboard size={18} /> },
      { key: "orders", label: "الطلبات", icon: <ClipboardList size={18} /> },
      { key: "clients", label: "العملاء", icon: <Users size={18} /> },
    ],
  },
  {
    title: "المتابعة",
    items: [
      { key: "tickets", label: "التذاكر", icon: <Ticket size={18} /> },
      { key: "followups", label: "المتابعات", icon: <RefreshCw size={18} /> },
    ],
  },
  {
    title: "الإعدادات",
    items: [
      { key: "services", label: "الخدمات والباقات", icon: <Package size={18} /> },
      { key: "packages", label: "الباقات", icon: <CreditCard size={18} /> },
      { key: "subscriptions", label: "الاشتراكات", icon: <CircleDollarSign size={18} /> },
      { key: "content", label: "المحتوى", icon: <FileText size={18} /> },
      { key: "reports", label: "التقارير", icon: <BarChart3 size={18} /> },
      { key: "team", label: "الفريق", icon: <UserCog size={18} /> },
    ],
  },
];

const SECTION_PERMISSION: Record<Section, string> = {
  dashboard: "view_dashboard",
  orders: "view_orders",
  clients: "view_clients",
  tickets: "view_tickets",
  followups: "manage_followups",
  services: "manage_services",
  packages: "manage_services",
  subscriptions: "manage_services",
  content: "manage_content",
  reports: "view_reports",
  team: "manage_team",
};

type Props = {
  role?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  notifCount: number;
  onLogout: () => void;
  permissions?: string[];
  children: React.ReactNode;
};

export default function AdminSidebar({ role: propRole, name, email, avatarUrl, notifCount, onLogout, permissions, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState<{ id: string; title: string; client: string; isLate: boolean }[]>([]);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleNotif() {
    if (!notifOpen) {
      fetch("/api/admin/notifications")
        .then(r => r.ok && r.json())
        .then(d => { if (d) setUrgentTasks(d.urgent || []); })
        .catch(() => {});
    }
    setNotifOpen(!notifOpen);
  }

  const currentRole = propRole || "";
  const isActive = (key: string) => pathname === "/admin" && key === "dashboard" ? true : pathname.startsWith(`/admin/${key}`);
  const initial = (name || "م").charAt(0);
  const roleLabel: Record<string, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف عمليات", viewer: "مشاهد" };

  return (
    <>
      <div className={`adm-shell ${collapsed ? "collapsed" : ""}`}>
        <aside className="adm-sidebar">
          <div className="adm-sidebar-header">
            <a href="/admin" className="adm-logo">
              <img src="/assets/logo/atmmam-dashboard-lockup-hd-v2.png?v=2" alt="أتمم" />
            </a>
            <button className="adm-toggle" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "☰" : "✕"}</button>
          </div>

          <nav className="adm-nav">
            {groups.map((group) => {
              const allowedSections = permissions && permissions.length > 0
                ? (Object.keys(SECTION_PERMISSION) as Section[]).filter(s => permissions.includes(SECTION_PERMISSION[s]))
                : (roleLinks[currentRole] || []);
              const visible = group.items.filter((item) => allowedSections.includes(item.key));
              if (!visible.length) return null;
              return (
                <div className="adm-nav-group" key={group.title}>
                  {!collapsed && <span className="adm-nav-group-title">{group.title}</span>}
                  {visible.map((item) => (
                    <a
                      key={item.key}
                      href={item.key === "dashboard" ? "/admin" : `/admin/${item.key}`}
                      className={`adm-nav-link ${isActive(item.key) ? "active" : ""}`}
                    >
                      <span className="adm-nav-icon">{item.icon}</span>
                      {!collapsed && <span className="adm-nav-label">{item.label}</span>}
                    </a>
                  ))}
                </div>
              );
            })}
          </nav>


        </aside>

        <main className="adm-content">
          <header className="adm-topbar">
            <div className="adm-topbar-user" ref={userRef}>
              <div className="adm-user-trigger" onClick={() => setUserOpen(!userOpen)}>
                <div className="adm-top-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { const el = e.currentTarget; el.style.display = "none"; el.parentElement!.textContent = initial; }} /> : initial}
                </div>
                <span className="adm-top-name">{name || "admin"}</span>
                <ChevronDown size={12} style={{ opacity: 0.5, transform: userOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
              </div>
              <div className="adm-notif-wrap" ref={notifRef} style={{ cursor: "pointer", position: "relative" }}>
                <Bell size={16} onClick={toggleNotif} />
                {notifCount > 0 && <span className="adm-notif-badge">{notifCount > 9 ? "9+" : notifCount}</span>}
                {notifOpen && (
                  <div className="adm-notif-dropdown">
                    {urgentTasks.length === 0 ? (
                      <div className="adm-notif-empty">لا توجد تنبيهات</div>
                    ) : (
                      urgentTasks.map(t => (
                        <a key={t.id} href={`/admin/followups?id=${t.id}`} className="adm-notif-item" onClick={() => setNotifOpen(false)}>
                          <div className="adm-notif-item-title">{t.title}</div>
                          <div className="adm-notif-item-client">{t.client}</div>
                        </a>
                      ))
                    )}
                    <a href="/admin/followups" className="adm-notif-view-all" onClick={() => setNotifOpen(false)}>عرض الكل ←</a>
                  </div>
                )}
              </div>
              {userOpen && (
                <div className="adm-top-dropdown">
                  <div className="adm-top-dropdown-header">
                    <div className="adm-top-dropdown-avatar">
                      {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={(e) => { const el = e.currentTarget; el.style.display = "none"; el.parentElement!.textContent = initial; }} /> : initial}
                    </div>
                    <div>
                      <div className="adm-top-dropdown-name">{name || "admin"}</div>
                      <div className="adm-top-dropdown-role">{roleLabel[currentRole] || ""}</div>
                      {email && <div className="adm-top-dropdown-email">{email}</div>}
                    </div>
                  </div>
                  <a href="/admin/settings" className="adm-top-dropdown-item" onClick={() => setUserOpen(false)}>
                    <Settings size={14} /> الإعدادات
                  </a>
                  <button className="adm-top-dropdown-item logout" onClick={onLogout}>
                    <LogOut size={14} /> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </header>
          <div className="adm-content-inner">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        .adm-shell {
          display: flex;
          min-height: 100vh;
          background: #f5f8fc;
          direction: rtl;
        }

        .adm-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: #0f1a2e;
          color: #b8c7db;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          transition: width .25s ease;
          z-index: 100;
        }
        .collapsed .adm-sidebar { width: 60px; }

        .adm-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .adm-logo { display: block; }
        .adm-logo img { height: 28px; display: block; }
        .collapsed .adm-logo img { height: 22px; }
        .adm-toggle {
          background: none;
          border: none;
          color: #8899b4;
          font-size: 1rem;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .adm-toggle:hover { background: rgba(255,255,255,.06); }

        .adm-nav {
          flex: 1;
          padding: 8px 10px;
          overflow-y: auto;
        }
        .adm-nav-group { margin-bottom: 8px; }
        .adm-nav-group-title {
          display: block;
          font-size: .55rem;
          font-weight: 700;
          color: #5c6f8b;
          text-transform: uppercase;
          letter-spacing: .05em;
          padding: 12px 10px 6px;
        }
        .adm-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: #9aadc9;
          font-size: .75rem;
          font-weight: 500;
          transition: background .15s, color .15s;
          margin-bottom: 2px;
        }
        .adm-nav-link:hover { background: rgba(255,255,255,.06); color: #e4ecf5; }
        .adm-nav-link:hover svg { color: #e4ecf5; }
        .adm-nav-link.active { background: #0875dc; color: #fff; }
        .adm-nav-link.active svg { color: #fff; }
        .adm-nav-icon { font-size: 1rem; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .adm-nav-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .collapsed .adm-nav-link { justify-content: center; padding: 9px 0; }

        .adm-topbar-user { position: relative; display: flex; align-items: center; gap: 8px; }
        .adm-user-trigger {
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; padding: 4px 10px 4px 4px;
          border-radius: 8px; transition: background .15s;
        }
        .adm-user-trigger:hover { background: #f0f4f8; }
        .adm-top-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: #e8d9c4; color: #5a3e2b;
          display: grid; place-items: center;
          font-size: .7rem; font-weight: 800; flex-shrink: 0;
        }
        .adm-top-name { font-size: .72rem; font-weight: 700; color: #1e3a56; }

        .adm-top-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0;
          min-width: 220px; background: #fff;
          border: 1px solid #e5ecf3; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          overflow: hidden; z-index: 50;
        }
        .adm-top-dropdown-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; border-bottom: 1px solid #f0f4f8;
        }
        .adm-top-dropdown-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: #e8d9c4; color: #5a3e2b;
          display: grid; place-items: center;
          font-size: .8rem; font-weight: 800; flex-shrink: 0;
        }
        .adm-top-dropdown-name { font-size: .72rem; font-weight: 700; color: #1e3a56; }
        .adm-top-dropdown-role { font-size: .58rem; color: #7a8fa6; }
        .adm-top-dropdown-email { font-size: .55rem; color: #aab5c3; direction: ltr; text-align: right; }
        .adm-top-dropdown-item {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 16px; font-size: .68rem; color: #344d69;
          text-decoration: none; border: none; background: none;
          width: 100%; text-align: right; cursor: pointer;
        }
        .adm-top-dropdown-item:hover { background: #f5f8fc; }
        .adm-top-dropdown-item.logout { color: #dc2626; }
        .adm-top-dropdown-item.logout:hover { background: #fef2f2; }

        .adm-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .adm-topbar {
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 20px;
          background: #fff;
          border-bottom: 1px solid #e5eaf0;
          gap: 12px;
        }
        .adm-notif-wrap {
          position: relative;
          display: flex; align-items: center;
          color: #5a738e; text-decoration: none;
          transition: color .15s;
        }
        .adm-notif-wrap:hover { color: #1e3a56; }
        .adm-notif-badge {
          position: absolute; top: -6px; left: -6px;
          min-width: 16px; height: 16px;
          border-radius: 8px;
          background: #dc2626; color: #fff;
          font-size: .5rem; font-weight: 700;
          display: flex; align-items: center;
          justify-content: center;
          padding: 0 3px;
          line-height: 1;
        }
        .adm-notif-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0;
          min-width: 250px; background: #fff;
          border: 1px solid #e5ecf3; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          overflow: hidden; z-index: 50;
        }
        .adm-notif-empty {
          padding: 20px; text-align: center;
          font-size: .65rem; color: #aab5c3;
        }
        .adm-notif-item {
          display: block; padding: 10px 14px;
          text-decoration: none; border-bottom: 1px solid #f0f4f8;
          transition: background .15s;
        }
        .adm-notif-item:hover { background: #f5f8fc; }
        .adm-notif-item-title { font-size: .68rem; font-weight: 600; color: #1e3a56; }
        .adm-notif-item-client { font-size: .55rem; color: #7a8fa6; margin-top: 2px; }
        .adm-notif-view-all {
          display: block; padding: 10px 14px; text-align: center;
          font-size: .62rem; font-weight: 600; color: #0875dc;
          text-decoration: none; transition: background .15s;
        }
        .adm-notif-view-all:hover { background: #f0f7ff; }
        .adm-content-inner {
          flex: 1;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .adm-shell { flex-direction: column; }
          .adm-sidebar { width: 100%; height: auto; position: static; flex-direction: row; align-items: center; padding: 0 10px; }
          .adm-sidebar-header { border-bottom: none; padding: 8px; }
          .adm-nav { display: none; }
          .adm-logo img { height: 24px; }
          .adm-content { min-height: calc(100vh - 52px); }
        }
      `}</style>
    </>
  );
}
