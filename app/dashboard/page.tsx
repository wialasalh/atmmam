"use client";

import { useEffect, useState } from "react";
import { ClipboardList, FileText, MessageSquare, ArrowLeft, Plus, Building2, CalendarX, CalendarClock } from "lucide-react";
import Link from "next/link";

type Order = { id: string; reference_no: string; service_name?: string; status: string; created_at: string; };
type Ticket = { id: string; title: string; status: string; updated_at: string; priority: string; client?: { name: string; client_type: string } };

type CompanyExpiry = { id: string; name: string; expiryDate: string; status: "expired" | "soon"; days: number };

function getExpiryDays(dateStr: string): { status: "expired" | "soon" | "ok" | null; days: number } {
  if (!dateStr) return { status: null, days: 0 };
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: "expired", days: Math.abs(diffDays) };
  if (diffDays <= 30) return { status: "soon", days: diffDays };
  return { status: "ok", days: diffDays };
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  new:                 { label: "جديد",                color: "#0875dc", bg: "#eaf4ff" },
  in_progress:         { label: "قيد التنفيذ",         color: "#b45309", bg: "#fef9ee" },
  waiting_documents:   { label: "بانتظار المستندات",   color: "#7c3aed", bg: "#f5f3ff" },
  completed:           { label: "مكتمل",               color: "#15803d", bg: "#f0fdf4" },
  cancelled:           { label: "ملغي",                color: "#6b7280", bg: "#f3f4f6" },
  "جديدة":            { label: "جديدة",               color: "#0875dc", bg: "#eaf4ff" },
  "قيد المراجعة":     { label: "قيد المراجعة",        color: "#b45309", bg: "#fef9ee" },
  "بانتظار العميل":   { label: "بانتظار ردك",         color: "#7c3aed", bg: "#f5f3ff" },
  "تم الحل":          { label: "تم الحل",             color: "#15803d", bg: "#f0fdf4" },
  "مغلقة":            { label: "مغلقة",               color: "#6b7280", bg: "#f3f4f6" },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء النور";
}

export default function DashboardHome() {
  const [stats, setStats] = useState({ orders: 0, tickets: 0, openTickets: 0, activeOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<CompanyExpiry[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/summary");
        if (!res.ok) return;
        const { profile, stats: s, recentOrders: orders, recentTickets: tickets, clients } = await res.json();

        setName(profile?.full_name || "");
        setStats({ orders: s.totalOrders, activeOrders: s.activeOrders, tickets: s.totalTickets, openTickets: s.openTickets });
        setRecentOrders(orders || []);
        setRecentTickets(tickets || []);

        const alerts: CompanyExpiry[] = [];
        for (const c of (clients || []) as { id: string; name: string; commercial_register_expiry: string }[]) {
          if (!c.commercial_register_expiry) continue;
          const result = getExpiryDays(c.commercial_register_expiry);
          if (result.status === "expired" || result.status === "soon")
            alerts.push({ id: c.id, name: c.name, expiryDate: c.commercial_register_expiry, status: result.status, days: result.days });
        }
        setExpiryAlerts(alerts);
      } catch { /* network error — keep empty state */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="client-dash-page">

      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: ".7rem", color: "#8b9dad", margin: "0 0 4px" }}>
          {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem", color: "#073766", fontWeight: 800 }}>
          {getGreeting()}{name ? `، ${name}` : ""}
        </h2>
        <p style={{ margin: 0, fontSize: ".72rem", color: "#7a8fa6" }}>
          تابع طلباتك، مستنداتك، وتذاكر الدعم في مكان واحد.
        </p>
      </div>

      {/* Expiry alerts */}
      {expiryAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {expiryAlerts.map(alert => (
            <div key={alert.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 12, marginBottom: 8,
              background: alert.status === "expired" ? "#fef2f2" : "#fffbeb",
              border: alert.status === "expired" ? "1.5px solid #fecaca" : "1.5px solid #fde68a",
              animation: "slide-in-card .25s cubic-bezier(.22,1,.36,1) both"
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                display: "grid", placeItems: "center",
                background: alert.status === "expired" ? "#fee2e2" : "#fef3c7",
              }}>
                {alert.status === "expired"
                  ? <CalendarX size={18} color="#dc2626" />
                  : <CalendarClock size={18} color="#d97706" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".72rem", fontWeight: 800, color: alert.status === "expired" ? "#991b1b" : "#92400e" }}>
                  {alert.status === "expired" ? "السجل التجاري منتهي" : "السجل التجاري على وشك الانتهاء"}
                </div>
                <div style={{ fontSize: ".64rem", color: alert.status === "expired" ? "#b91c1c" : "#a16207", marginTop: 2 }}>
                  {alert.status === "expired"
                    ? `السجل التجاري لـ "${alert.name}" منتهي منذ ${alert.days} يوم — جدد الآن لتجنب الغرامات`
                    : `بقي ${alert.days} يوم على انتهاء السجل التجاري لـ "${alert.name}" — جدد قبل الانتهاء`
                  }
                </div>
              </div>
              <Link href="/dashboard/companies" style={{
                display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
                fontSize: ".62rem", fontWeight: 700, textDecoration: "none",
                padding: "6px 12px", borderRadius: 8,
                background: alert.status === "expired" ? "#dc2626" : "#d97706",
                color: "#fff", transition: "all .15s"
              }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity = ".85"}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
              >
                تجديد <ArrowLeft size={11} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "إجمالي الطلبات", value: stats.orders, sub: `${stats.activeOrders} نشطة`, icon: ClipboardList, color: "#0875dc", bg: "#eaf4ff", href: "/dashboard/orders" },
          { label: "تذاكر الدعم", value: stats.tickets, sub: `${stats.openTickets} مفتوحة`, icon: MessageSquare, color: "#7c3aed", bg: "#f5f3ff", href: "/dashboard/tickets" },
        ].map(c => (
          <Link key={c.label} href={c.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "#fff", border: `1px solid ${c.color}20`, borderRadius: 14, padding: "16px", display: "flex", alignItems: "center", gap: 14, transition: "all .15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = c.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = `${c.color}20`)}
            >
              <div style={{ width: 46, height: 46, borderRadius: 12, background: c.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <c.icon size={22} color={c.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: c.color, lineHeight: 1 }}>{loading ? "—" : c.value}</div>
                <div style={{ fontSize: ".65rem", color: "#526983", marginTop: 2 }}>{c.label}</div>
                <div style={{ fontSize: ".58rem", color: "#8b9dad", marginTop: 1 }}>{loading ? "" : c.sub}</div>
              </div>
              <ArrowLeft size={16} color={c.color} style={{ flexShrink: 0, opacity: .6 }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "linear-gradient(135deg, #063461 0%, #0875dc 100%)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 12px", fontSize: ".72rem", color: "rgba(255,255,255,.7)", fontWeight: 700 }}>إجراءات سريعة</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/tickets/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#0875dc", borderRadius: 8, padding: "8px 14px", fontSize: ".7rem", fontWeight: 700, textDecoration: "none" }}>
            <Plus size={14} /> فتح تذكرة دعم
          </Link>
          <Link href="/dashboard/companies" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: ".7rem", fontWeight: 700, textDecoration: "none" }}>
            <Building2 size={14} /> بيانات المنشأة
          </Link>
          <Link href="/dashboard/documents" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: ".7rem", fontWeight: 700, textDecoration: "none" }}>
            <FileText size={14} /> المستندات
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f3f8" }}>
          <h3 style={{ margin: 0, fontSize: ".78rem", color: "#073766" }}>آخر الطلبات</h3>
          <Link href="/dashboard/orders" style={{ fontSize: ".65rem", color: "#0875dc", textDecoration: "none", fontWeight: 700 }}>عرض الكل ←</Link>
        </div>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
        ) : recentOrders.length === 0 ? (
          <div style={{ padding: "24px 18px", textAlign: "center", color: "#8b9dad" }}>
            <ClipboardList size={28} style={{ opacity: .3, marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: ".7rem" }}>لا توجد طلبات بعد.</p>
          </div>
        ) : recentOrders.map((order, i) => {
          const s = statusLabels[order.status] || { label: order.status, color: "#6b7280", bg: "#f3f4f6" };
          return (
            <Link key={order.id} href={`/dashboard/orders/${order.id}`} style={{ textDecoration: "none" }}>
              <div style={{ padding: "12px 18px", borderBottom: i < recentOrders.length - 1 ? "1px solid #f0f3f8" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "#eaf4ff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <ClipboardList size={15} color="#0875dc" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {order.service_name || order.reference_no}
                </div>
                <div style={{ fontSize: ".58rem", color: "#8b9dad", marginTop: 2 }}>
                  {new Date(order.created_at).toLocaleDateString("ar-SA")}
                </div>
              </div>
              <span style={{ fontSize: ".58rem", padding: "3px 8px", borderRadius: 20, color: s.color, background: s.bg, fontWeight: 700, flexShrink: 0 }}>
                {s.label}
              </span>
            </div>
            </Link>
          );
        })}
      </div>

      {/* Recent tickets */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, overflow: "hidden", marginBottom: 14, minHeight: 160, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f3f8" }}>
          <h3 style={{ margin: 0, fontSize: ".78rem", color: "#073766" }}>التذاكر النشطة</h3>
          <div style={{ fontSize: ".65rem", color: "#7c3aed", fontWeight: 700 }}>{stats.openTickets} تذاكر مفتوحة</div>
        </div>
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
        ) : recentTickets.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#8b9dad" }}>
            <MessageSquare size={28} style={{ opacity: .3, marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: ".7rem" }}>لا توجد تذاكر دعم بعد.</p>
            <Link href="/dashboard/tickets/new" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: ".68rem", color: "#0875dc", textDecoration: "none", fontWeight: 700 }}>
              <Plus size={13} /> افتح تذكرة الآن
            </Link>
          </div>
        ) : recentTickets.map((ticket, i) => {
          const s = statusLabels[ticket.status] || { label: ticket.status, color: "#6b7280", bg: "#f3f4f6" };
          const isUrgent = ticket.priority === "عاجلة";
          return (
            <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} style={{ textDecoration: "none" }}>
              <div style={{ padding: "16px 18px", borderBottom: i < recentTickets.length - 1 ? "1px solid #f0f3f8" : "none", display: "flex", alignItems: "center", gap: 12, borderRight: isUrgent ? "3px solid #dc2626" : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f5f3ff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <MessageSquare size={18} color="#7c3aed" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ticket.title}
                    {isUrgent && <span style={{ fontSize: ".55rem", background: "#fef2f2", color: "#dc2626", borderRadius: 10, padding: "1px 6px", marginRight: 6, fontWeight: 700 }}>عاجل</span>}
                  </div>
                  <div style={{ fontSize: ".58rem", color: "#8b9dad", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{new Date(ticket.updated_at).toLocaleDateString("ar-SA")}</span>
                    {ticket.client?.name && (
                      <><span style={{ color: "#d1d9e0" }}>·</span><span>{ticket.client.name}</span></>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: ".58rem", padding: "3px 8px", borderRadius: 20, color: s.color, background: s.bg, fontWeight: 700, flexShrink: 0 }}>
                  {s.label}
                </span>
              </div>
            </Link>
          );
        })}
        <Link href="/dashboard/tickets" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "10px 18px", fontSize: ".65rem", color: "#0875dc", textDecoration: "none", fontWeight: 700, borderTop: "1px solid #f0f3f8" }}>
          عرض كل التذاكر ←
        </Link>
      </div>
    </div>
  );
}
