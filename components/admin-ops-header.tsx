"use client";
import { ClipboardList, Users, RefreshCw, Package, LayoutDashboard, Settings, Bell, LogOut, User, ChevronDown, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminSection = "dashboard" | "orders" | "clients" | "tickets" | "followups" | "services" | "content" | "reports" | "team" | "settings";

const roleLinks: Record<string, AdminSection[]> = {
  admin: ["dashboard", "orders", "clients", "tickets", "followups", "services", "content", "reports", "team"],
  manager: ["dashboard", "orders", "clients", "tickets", "followups", "services", "content", "reports"],
  operator: ["dashboard", "orders", "tickets", "followups", "clients"],
  viewer: ["dashboard", "reports"],
};

const allLinks: Array<{ key: AdminSection; label: string; href: string }> = [
  { key: "dashboard", label: "لوحة التحكم", href: "/admin" },
  { key: "orders", label: "الطلبات", href: "/admin/orders" },
  { key: "clients", label: "العملاء", href: "/admin/clients" },
  { key: "tickets", label: "التذاكر", href: "/admin/tickets" },
  { key: "followups", label: "المتابعات", href: "/admin/followups" },
  { key: "services", label: "الخدمات والباقات", href: "/admin/services" },
  { key: "content", label: "المحتوى", href: "/admin/content" },
  { key: "reports", label: "التقارير", href: "/admin/reports" },
  { key: "team", label: "الفريق", href: "/admin/team" },
];

function AdminUserMenu({ name: propName, email: propEmail, avatarUrl: propAvatar, role: propRole }: { name: string; email: string; avatarUrl: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const roleLabel: Record<string, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف عمليات", viewer: "مشاهد" };
  const name = propName || "admin";
  const email = propEmail || "";
  const userRole = propRole || "";
  const showAdminLinks = propRole === "admin";
  const avatarUrl = propAvatar;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:24, padding:"5px 6px 5px 10px", cursor:"pointer", color:"#fff" }}>
        <ChevronDown size={13} style={{ opacity:0.7, transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
        <span style={{ fontSize:".72rem", fontWeight:600, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
        <div style={{ width:30, height:30, borderRadius:"50%", background:"#e8d9c4", display:"grid", placeItems:"center", fontSize:".8rem", fontWeight:800, color:"#5a3e2b", flexShrink:0, overflow:"hidden" }}>
          {avatarUrl ? <img src={avatarUrl} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : initial}
        </div>
      </button>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", left:0, background:"#fff", border:"1px solid #e5ecf3", borderRadius:14, boxShadow:"0 8px 24px rgba(0,0,0,.12)", minWidth:220, zIndex:9999, overflow:"hidden" }}>
          {/* معلومات المستخدم */}
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #f0f4f8", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"#073766", display:"grid", placeItems:"center", flexShrink:0 }}>
              <span style={{ fontSize:".85rem", fontWeight:800, color:"#fff" }}>{initial}</span>
            </div>
            <div>
              <div style={{ fontSize:".75rem", fontWeight:700, color:"#073766" }}>{name}</div>
              <div style={{ fontSize:".62rem", color:"#8b9dad", marginTop:1 }}>{email}</div>
              <div style={{ fontSize:".58rem", color:"#0875dc", marginTop:2, background:"#eaf4ff", padding:"1px 6px", borderRadius:8, display:"inline-block" }}>{roleLabel[userRole] || "مدير النظام"}</div>
            </div>
          </div>

          {/* روابط */}
          <div style={{ padding:"6px 0" }}>
            <a href="/admin/settings" onClick={() => setOpen(false)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", fontSize:".73rem", color:"#344d69", textDecoration:"none", cursor:"pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background="#f5f8fc")}
              onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
              <Settings size={15} color="#8b9dad" /> الإعدادات
            </a>
            {showAdminLinks && <a href="/admin/team" onClick={() => setOpen(false)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", fontSize:".73rem", color:"#344d69", textDecoration:"none" }}
              onMouseEnter={e => (e.currentTarget.style.background="#f5f8fc")}
              onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
              <User size={15} color="#8b9dad" /> إدارة الفريق
            </a>}
          </div>

          {/* تسجيل الخروج */}
          <div style={{ borderTop:"1px solid #f0f4f8", padding:"6px 0" }}>
            <button onClick={handleLogout}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", fontSize:".73rem", color:"#dc2626", background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"right" }}
              onMouseEnter={e => (e.currentTarget.style.background="#fef2f2")}
              onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
              <LogOut size={15} /> تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminOpsHeader({ active, role, name, email, avatarUrl }: { active: AdminSection; role?: string; name?: string; email?: string; avatarUrl?: string }) {
  const [fallbackRole, setFallbackRole] = useState("");
  const [notifCount, setNotifCount] = useState(0);
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; client: string; isLate: boolean }>>([]);
  const [newRatings, setNewRatings] = useState(0);
  const [ratingNotifs, setRatingNotifs] = useState<Array<{ from: string; rating: number; comment: string; date: string; ticket_id: string }>>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const resolvedRole = role || fallbackRole || "";
  const allowedKeys = roleLinks[resolvedRole] || roleLinks.operator;
  const visibleLinks = allLinks.filter(l => allowedKeys.includes(l.key));

  useEffect(() => {
    if (role) return;
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.data?.role) setFallbackRole(data.data.role); })
      .catch(() => {});
  }, [role]);

  useEffect(() => {
    function fetchNotifs() {
      const lastSeen = localStorage.getItem("lastRatingSeen") || "";
      fetch(`/api/admin/notifications?lastRatingSeen=${encodeURIComponent(lastSeen)}`).then(r => r.ok && r.json()).then(d => {
        if (!d) return;
        const total = (d.overdue || 0) + (d.today || 0) + (d.newRatings || 0);
        setNotifCount(total);
        setNotifs((d.urgent || []).map((u: any) => ({ id: u.id, title: u.title, client: u.client || "", isLate: u.isLate })));
        setNewRatings(d.newRatings || 0);
        setRatingNotifs((d.ratingNotifs || []).slice(0, 5));
      }).catch(() => {});
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <header className="ops-header">
        <a className="ops-brand" href="/admin"><img src="/assets/logo/atmmam-dashboard-lockup-hd-v2.png?v=2" alt="أتمم" /></a>
        <nav>{visibleLinks.map((link) => <a className={active === link.key ? "active" : ""} href={link.href} key={link.key}>{link.label}</a>)}</nav>
        <div className="ops-account">
          <div ref={notifRef} style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen(!notifOpen)}
              style={{ position: "relative", display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:8, color:"rgba(255,255,255,0.7)", background:"none", border:"none", cursor:"pointer" }}>
              <Bell size={18} />
              {notifCount > 0 && <span style={{
                position: "absolute", top: -2, right: -2, minWidth: 16, height: 16,
                borderRadius: 8, background: "#dc2626", color: "#fff",
                fontSize: ".55rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
              }}>{notifCount > 9 ? "9+" : notifCount}</span>}
            </button>
            {notifOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: "auto", left: 0, background: "#fff",
                border: "1px solid #e5ecf3", borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                minWidth: 260, maxWidth: "min(360px, calc(100vw - 20px))", zIndex: 999999, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f4f8", fontSize: ".75rem", fontWeight: 700, color: "#073766" }}>
                  التنبيهات
                </div>
                {notifs.length === 0 && ratingNotifs.length === 0 ? (
                  <div style={{ padding: "20px 16px", textAlign: "center", fontSize: ".7rem", color: "#8b9dad" }}>
                    لا توجد تنبيهات حالية
                  </div>
                ) : (
                  <>
                    {/* Urgent tasks */}
                    {notifs.length > 0 && <>
                      <div style={{ padding: "8px 16px 4px", fontSize: ".6rem", fontWeight: 700, color: "#8b9dad", textTransform: "uppercase", letterSpacing: 0.5 }}>متابعات</div>
                      {notifs.map((n) => (
                        <a key={n.id} href="/admin/followups" style={{
                          display: "block", padding: "10px 16px", textDecoration: "none",
                          borderBottom: "1px solid #f8fafc",
                          background: n.isLate ? "#fef2f2" : "transparent",
                        }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f8fc")}
                           onMouseLeave={e => (e.currentTarget.style.background = n.isLate ? "#fef2f2" : "transparent")}>
                          <div style={{ fontSize: ".7rem", fontWeight: 600, color: "#0f172a" }}>{n.title}</div>
                          {n.client && <div style={{ fontSize: ".6rem", color: "#64748b", marginTop: 2 }}>{n.client}</div>}
                          <div style={{ fontSize: ".55rem", color: n.isLate ? "#dc2626" : "#f59e0b", marginTop: 2 }}>
                            {n.isLate ? "متأخر" : "مستحق اليوم"}
                          </div>
                        </a>
                      ))}
                      <a href="/admin/followups" style={{
                        display: "block", padding: "8px 16px", textAlign: "center",
                        fontSize: ".65rem", color: "#0875dc", textDecoration: "none",
                        borderBottom: "1px solid #f0f4f8", fontWeight: 600,
                      }}>عرض كل المتابعات</a>
                    </>}

                    {/* Rating notifications */}
                    {ratingNotifs.length > 0 && <>
                      <div style={{ padding: "8px 16px 4px", fontSize: ".6rem", fontWeight: 700, color: "#8b9dad", textTransform: "uppercase", letterSpacing: 0.5 }}>تقييمات جديدة</div>
                      {ratingNotifs.map((r, i) => (
                        <a key={i} href={`/admin/tickets?selected=${r.ticket_id}`} onClick={() => localStorage.setItem("lastRatingSeen", new Date().toISOString())} style={{
                          display: "block", padding: "10px 16px", textDecoration: "none",
                          borderBottom: "1px solid #f8fafc",
                          background: r.rating >= 3 ? "#f0fdf4" : "#fef2f2",
                          direction: "rtl", textAlign: "right",
                        }} onMouseEnter={e => (e.currentTarget.style.background = "#f5f8fc")}
                           onMouseLeave={e => (e.currentTarget.style.background = r.rating >= 3 ? "#f0fdf4" : "#fef2f2")}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".65rem", color: "#0f172a" }}>
                            <Star size={14} strokeWidth={1.5} fill="#f59e0b" color="#f59e0b" />
                            <span>{r.rating}/5 من {r.from}</span>
                          </div>
                          {r.comment && <div style={{ fontSize: ".6rem", color: "#64748b", marginTop: 2 }}>"{r.comment}"</div>}
                        </a>
                      ))}
                    </>}
                  </>
                )}
              </div>
            )}
          </div>
          <AdminUserMenu name={name || ""} email={email || ""} avatarUrl={avatarUrl || ""} role={role || ""} />
        </div>
      </header>
      <nav className="ops-mobile-nav" aria-label="تنقل لوحة التحكم على الجوال">
        {visibleLinks.slice(0, 5).map((link) => (
          <a className={active === link.key ? "active" : ""} href={link.href} key={link.key}>
            {link.key === "orders" ? <ClipboardList size={16} /> : link.key === "clients" ? <Users size={16} /> : link.key === "followups" ? <RefreshCw size={16} /> : link.key === "services" ? <Package size={16} /> : <LayoutDashboard size={16} />}
            {link.label.replace("الخدمات والباقات", "الخدمات")}
          </a>
        ))}
      </nav>
    </>
  );
}
