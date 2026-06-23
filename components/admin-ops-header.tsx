import { Settings, Bell } from "lucide-react";

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

export function AdminOpsHeader({ active }: { active: AdminSection }) {
  return <><header className="ops-header">
    <a className="ops-brand" href="/"><img src="/assets/logo/atmmam-dashboard-lockup-hd-v2.png?v=2" alt="أتمم" /></a>
    <nav>{links.map((link) => <a className={active === link.key ? "active" : ""} href={link.href} key={link.key}>{link.label}</a>)}</nav>
    <div className="ops-account">
      <a href="/admin/followups" aria-label="المتابعات" style={{ display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:8, color:"#8b9dad", textDecoration:"none" }}>
        <Bell size={18} />
      </a>
      <a href="/admin/settings" aria-label="الإعدادات" style={{ display:"flex", alignItems:"center", justifyContent:"center", width:32, height:32, borderRadius:8, color:"#8b9dad", textDecoration:"none" }}>
        <Settings size={18} />
      </a>
      <span>ح</span>
    </div>
  </header><nav className="ops-mobile-nav" aria-label="تنقل لوحة التحكم على الجوال">{links.slice(0, 5).map((link) => <a className={active === link.key ? "active" : ""} href={link.href} key={link.key}><span>{link.key === "orders" ? "▤" : link.key === "clients" ? "♙" : link.key === "followups" ? "◷" : link.key === "services" ? "◇" : "⌂"}</span>{link.label.replace("الخدمات والباقات", "الخدمات")}</a>)}</nav></>;
}
