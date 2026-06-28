"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ClipboardList, FileText, MessageSquare,
  User, LogOut, Menu, X, ChevronLeft, Building2, Building,
  Bell, MessageCircle, Package, CreditCard, CalendarDays
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
  { href: "/dashboard/packages", label: "الباقات", icon: Package },
  { href: "/dashboard/subscriptions", label: "اشتراكاتي", icon: CreditCard },
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
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifTickets, setNotifTickets] = useState<{id:string;title:string;status:string}[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Notification polling
  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await fetch("/api/dashboard/notifications");
        if (res.ok) {
          const { count, tickets } = await res.json();
          setNotifCount(count);
          setNotifTickets(tickets || []);
        }
      } catch {}
    }
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30000);
    return () => clearInterval(iv);
  }, []);

  // Close notif dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.replace("/login"); return; }
      if (!authUser.email_confirmed_at) {
        setEmailConfirmed(false);
      } else {
        setEmailConfirmed(true);
      }
      const res = await fetch("/api/auth/me");
      if (!res.ok) { router.replace("/login"); return; }
      const { data } = await res.json();
      if (data?.role === "admin" || data?.role === "manager" || data?.role === "operator") {
        // Don't render anything, just redirect
        setUser(null);
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
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{position:"relative"}} ref={notifRef}>
              <button onClick={() => setShowNotifs(v => !v)} style={{position:"relative",width:30,height:30,border:0,borderRadius:8,background:"transparent",color:"#8b9dad",cursor:"pointer",display:"grid",placeItems:"center",padding:0,transition:"all .15s"}}>
                <Bell size={16} />
                {notifCount > 0 && (
                  <span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#dc2626",color:"#fff",fontSize:".45rem",fontWeight:800,display:"grid",placeItems:"center",border:"2px solid #fff"}}>
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div style={{position:"absolute",top:"calc(100% + 4px)",right:0,background:"#fff",border:"1px solid #e5eaf0",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.10)",minWidth:260,zIndex:999,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",borderBottom:"1px solid #f0f3f8",fontSize:".68rem",fontWeight:700,color:"#073766"}}>الإشعارات</div>
                  {notifTickets.length === 0 ? (
                    <div style={{padding:"20px 14px",textAlign:"center",fontSize:".65rem",color:"#aab5c3"}}>لا توجد إشعارات جديدة</div>
                  ) : notifTickets.map(t => (
                    <Link key={t.id} href={`/dashboard/tickets/${t.id}`} onClick={() => setShowNotifs(false)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",textDecoration:"none",borderBottom:"1px solid #f0f3f8",transition:"background .1s"}} onMouseOver={e => e.currentTarget.style.background="#f5f8fc"} onMouseOut={e => e.currentTarget.style.background="transparent"}>
                      <div style={{width:30,height:30,borderRadius:8,background:"#eaf4ff",display:"grid",placeItems:"center",flexShrink:0}}>
                        <MessageCircle size={14} color="#0875dc" />
                      </div>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontSize:".62rem",color:"#344d69",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                          <span style={{fontSize:".55rem",color:"#0875dc",fontWeight:600}}>رد جديد من فريق الدعم</span>
                          <span style={{fontSize:".5rem",color:"#aab5c3",background:"#f5f8fc",padding:"1px 6px",borderRadius:6}}>{t.status}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <button className="client-dash-close-btn" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>
        </div>

        <div className="client-dash-user-card">
          <span className="client-dash-avatar">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} />
            ) : (
              user.full_name?.charAt(0) || "م"
            )}
          </span>
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

      {/* Floating action buttons */}
      <div className="client-dash-floating-actions">
        <Link href="/dashboard/tickets/new" className="floating-btn floating-btn-report" title="الإبلاغ عن مشكلة">
          <MessageCircle size={20} />
          <span>الإبلاغ عن مشكلة</span>
        </Link>
        <Link href="/dashboard/tickets/new?type=consultation" className="floating-btn floating-btn-consult" title="جدولة استشارة">
          <CalendarDays size={20} />
          <span>جدولة استشارة</span>
        </Link>
      </div>

      <style>{`
        .client-dash-floating-actions {
          position: fixed;
          bottom: 24px;
          left: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 1000;
        }
        .floating-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          border-radius: 12px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          white-space: nowrap;
        }
        .floating-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.16);
        }
        .floating-btn-report {
          background: #dc2626;
          color: #fff;
        }
        .floating-btn-report:hover {
          background: #b91c1c;
        }
        .floating-btn-consult {
          background: #0875dc;
          color: #fff;
        }
        .floating-btn-consult:hover {
          background: #0659a8;
        }
        @media (max-width: 768px) {
          .floating-btn span { display: none; }
          .floating-btn { padding: 12px; border-radius: 50%; }
        }
      `}</style>
    </main>
  );
}
