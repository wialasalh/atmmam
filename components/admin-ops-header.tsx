"use client";
import { Settings, Bell, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminSection = "dashboard" | "orders" | "clients" | "tickets" | "followups" | "services" | "content" | "reports" | "team" | "settings";

const links: Array<{ key: AdminSection; label: string; href: string }> = [
  { key: "dashboard", label: "لوحة التحكم", href: "/admin/overview" },
  { key: "orders", label: "الطلبات", href: "/admin" },
  { key: "clients", label: "العملاء", href: "/admin/clients" },
  { key: "tickets", label: "التذاكر", href: "/admin/tickets" },
  { key: "followups", label: "المتابعات", href: "/admin/followups" },
  { key: "services", label: "الخدمات والباقات", href: "/admin/services" },
  { key: "content", label: "المحتوى", href: "/admin/content" },
  { key: "reports", label: "التقارير", href: "/admin/reports" },
  { key: "team", label: "الفريق", href: "/admin/team" },
];

function AdminUserMenu() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("admin");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // نجلب بيانات الأدمن الحقيقي من قاعدة البيانات
    fetch("/api/admin/team")
      .then(r => r.ok ? r.json() : null)
      .then(payload => {
        const members = payload?.members || payload?.data || [];
        const uid: string = payload?.currentUserId || "";
        const me = members.find((m: any) => m.id === uid) ?? members.find((m: any) => m.role === "admin");
        if (me) {
          setName(me.full_name || "admin");
          setEmail(me.email || "admin@atmmam.com.sa");
          setAvatarUrl(me.avatar_url || "");
        }
      })
      .catch(() => {});
  }, []);

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
              <div style={{ fontSize:".58rem", color:"#0875dc", marginTop:2, background:"#eaf4ff", padding:"1px 6px", borderRadius:8, display:"inline-block" }}>مدير النظام</div>
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
            <a href="/admin/team" onClick={() => setOpen(false)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", fontSize:".73rem", color:"#344d69", textDecoration:"none" }}
              onMouseEnter={e => (e.currentTarget.style.background="#f5f8fc")}
              onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
              <User size={15} color="#8b9dad" /> إدارة الفريق
            </a>
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

export function AdminOpsHeader({ active }: { active: AdminSection }) {
  return (
    <>
      <header className="ops-header">
        <a className="ops-brand" href="/"><img src="/assets/logo/atmmam-dashboard-lockup-hd-v2.png?v=2" alt="أتمم" /></a>
        <nav>{links.map((link) => <a className={active === link.key ? "active" : ""} href={link.href} key={link.key}>{link.label}</a>)}</nav>
        <div className="ops-account">
          <a href="/admin/followups" aria-label="المتابعات"
            style={{ display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:8, color:"rgba(255,255,255,0.7)", textDecoration:"none" }}>
            <Bell size={18} />
          </a>
          <AdminUserMenu />
        </div>
      </header>
      <nav className="ops-mobile-nav" aria-label="تنقل لوحة التحكم على الجوال">
        {links.slice(0, 5).map((link) => (
          <a className={active === link.key ? "active" : ""} href={link.href} key={link.key}>
            <span>{link.key === "orders" ? "▤" : link.key === "clients" ? "♙" : link.key === "followups" ? "◷" : link.key === "services" ? "◇" : "⌂"}</span>
            {link.label.replace("الخدمات والباقات", "الخدمات")}
          </a>
        ))}
      </nav>
    </>
  );
}
