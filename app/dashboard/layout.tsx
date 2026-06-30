"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ClipboardList, FileText, MessageSquare,
  User, LogOut, Menu, X, ChevronLeft, Building2, Building,
  Bell, MessageCircle, ShoppingBag, Package, CreditCard, CalendarDays, LayoutGrid, CheckCheck, Headphones, Receipt
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
  { href: "/dashboard/services", label: "الخدمات", icon: LayoutGrid },
  { href: "/dashboard/orders", label: "طلباتي", icon: ClipboardList },
  { href: "/dashboard/packages", label: "الباقات", icon: Package },
  { href: "/dashboard/subscriptions", label: "اشتراكاتي", icon: CreditCard },
  { href: "/dashboard/invoices", label: "فواتيري", icon: Receipt },
  { href: "/dashboard/documents", label: "مستنداتي", icon: FileText },
  { href: "/dashboard/tickets", label: "مركز الدعم", icon: Headphones },
  { href: "/dashboard/companies", label: "المنشآت", icon: Building },
  { href: "/dashboard/profile", label: "الملف الشخصي", icon: User },
];

import "./dashboard.css";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientData | null>(null);
  const [emailConfirmed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<{id:string;type:string;title:string;body:string;link:string;is_read:boolean;created_at:string}[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Notification polling + realtime
  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const { count, notifications: list } = await res.json();
          setNotifCount(count);
          setNotifs(list || []);
        }
      } catch { /* non-critical */ }
    }
    fetchNotifs();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("client-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchNotifs())
      .subscribe();
    const iv = setInterval(fetchNotifs, 60000);
    return () => { clearInterval(iv); void supabase.removeChannel(channel); };
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

      const res = await fetch("/api/auth/me");
      if (!res.ok) { router.replace("/login"); return; }
      const { data } = await res.json();
      const STAFF_ROLES = ["admin", "manager", "operator", "viewer"];
      if (data?.role && STAFF_ROLES.includes(data.role)) {
        setUser(null);
        router.replace("/admin");
        return;
      }
      // member role is allowed in dashboard but with limited access
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
              <button onClick={() => {
                if (!showNotifs) {
                  setNotifLoading(true);
                  fetch("/api/notifications").then(r=>r.ok&&r.json()).then(d=>{if(d){setNotifs(d.notifications||[]);setNotifCount(d.count||0);}}).catch(()=>{}).finally(()=>setNotifLoading(false));
                }
                setShowNotifs(v => !v);
              }} style={{position:"relative",width:30,height:30,border:0,borderRadius:8,background:"transparent",color:"#8b9dad",cursor:"pointer",display:"grid",placeItems:"center",padding:0,transition:"all .15s"}}>
                <Bell size={16} />
                {notifCount > 0 && (
                  <span style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:"#dc2626",color:"#fff",fontSize:".45rem",fontWeight:800,display:"grid",placeItems:"center",border:"2px solid #fff",padding:"0 3px"}}>
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#fff",border:"1px solid #e5eaf0",borderRadius:14,boxShadow:"0 12px 32px rgba(0,0,0,.12)",width:290,zIndex:999,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px 10px",borderBottom:"1px solid #f0f3f8",fontSize:".7rem",fontWeight:700,color:"#073766"}}>
                    <span>الإشعارات</span>
                    {notifs.some(n=>!n.is_read) && (
                      <button onClick={()=>{
                        fetch("/api/notifications",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({})});
                        setNotifs(prev=>prev.map(n=>({...n,is_read:true})));
                        setNotifCount(0);
                      }} style={{display:"flex",alignItems:"center",gap:4,fontSize:".58rem",fontWeight:600,color:"#0875dc",background:"none",border:"none",cursor:"pointer",padding:0}}>
                        <CheckCheck size={11} /> تحديد كمقروء
                      </button>
                    )}
                  </div>
                  <div style={{maxHeight:340,overflowY:"auto"}}>
                    {notifLoading ? (
                      <div style={{padding:"20px",textAlign:"center",fontSize:".65rem",color:"#aab5c3"}}>جاري التحميل...</div>
                    ) : notifs.length === 0 ? (
                      <div style={{padding:"24px",textAlign:"center",fontSize:".65rem",color:"#aab5c3"}}>لا توجد إشعارات</div>
                    ) : notifs.map(n => {
                      const iconMap: Record<string,{icon:React.ReactNode;bg:string;color:string}> = {
                        ticket_reply: {icon:<MessageCircle size={13}/>,bg:"#eaf4ff",color:"#0875dc"},
                        order_status: {icon:<ShoppingBag size={13}/>,bg:"#f0f4ff",color:"#6366f1"},
                      };
                      const ic = iconMap[n.type] || {icon:<Bell size={13}/>,bg:"#f5f8fc",color:"#5a738e"};
                      const diff = Date.now()-new Date(n.created_at).getTime();
                      const m=Math.floor(diff/60000);
                      const timeStr = m<1?"الآن":m<60?`منذ ${m} د`:m<1440?`منذ ${Math.floor(m/60)} س`:`منذ ${Math.floor(m/1440)} ي`;
                      return (
                        <Link key={n.id} href={n.link||"#"} onClick={()=>{
                          fetch("/api/notifications",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:n.id})});
                          setNotifs(prev=>prev.map(x=>x.id===n.id?{...x,is_read:true}:x));
                          setShowNotifs(false);
                        }} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",textDecoration:"none",borderBottom:"1px solid #f5f7fa",background:n.is_read?"#fff":"#f8fbff",transition:"background .12s",position:"relative"}}>
                          <div style={{width:30,height:30,borderRadius:8,background:ic.bg,color:ic.color,display:"grid",placeItems:"center",flexShrink:0}}>{ic.icon}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:".64rem",fontWeight:700,color:"#1e3a56",marginBottom:2}}>{n.title}</div>
                            {n.body&&<div style={{fontSize:".59rem",color:"#5e7a95",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{n.body}</div>}
                            <div style={{fontSize:".54rem",color:"#aab5c3"}}>{timeStr}</div>
                          </div>
                          {!n.is_read&&<span style={{width:7,height:7,borderRadius:"50%",background:"#0875dc",flexShrink:0,marginTop:4}}/>}
                        </Link>
                      );
                    })}
                  </div>
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

        {/* Sidebar footer — desktop only */}
        <div className="client-dash-sidebar-footer-icons">
          <Link href="/" className="client-dash-sidebar-icon-btn" title="العودة للموقع">
            <Building2 size={16} />
          </Link>
          <button className="client-dash-sidebar-icon-btn client-dash-sidebar-icon-btn--danger" onClick={handleLogout} title="تسجيل خروج">
            <LogOut size={16} />
          </button>
        </div>

      </aside>

      {/* Main content */}
      <div className="client-dash-main">
        <header className="client-dash-topbar">
          <button className="client-dash-menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <div className="client-dash-topbar-title">
            {navItems.find((n) => pathname.startsWith(n.href))?.label || "منطقة العميل"}
          </div>
          <div className="client-dash-topbar-actions">
            <Link href="/" className="client-dash-topbar-icon-btn">
              <Building2 size={13} /> الموقع
            </Link>
            <button className="client-dash-topbar-icon-btn client-dash-topbar-icon-btn--danger" onClick={handleLogout}>
              <LogOut size={13} /> خروج
            </button>
          </div>
        </header>
        {!emailConfirmed && (
          <div className="client-dash-email-banner">
            <strong>البريد الإلكتروني غير مؤكد.</strong> يرجى الضغط على رابط التفعيل المرسل إلى بريدك الإلكتروني للتمكن من إرسال تذاكر الدعم ورفع المستندات.
          </div>
        )}
        <div className="client-dash-content">{children}</div>
      </div>

      {/* Floating action buttons */}
      <div className="client-dash-floating-actions" style={{ display: /^\/dashboard\/tickets\/[^/]+/.test(pathname) ? "none" : "flex" }}>
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
