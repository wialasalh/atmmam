"use client";

import { useEffect, useState } from "react";
import { ClipboardList, FileText, MessageSquare, TrendingUp, ArrowLeft, Clock, CheckCircle, AlertCircle, Plus, Building2 } from "lucide-react";
import Link from "next/link";

type Order = { id: string; reference_no: string; service_name?: string; status: string; created_at: string; };
type Ticket = { id: string; title: string; status: string; updated_at: string; priority: string; };

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

  useEffect(() => {
    void (async () => {
      try {
        const [meRes, ordersRes, ticketsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/client/orders"),
          fetch("/api/tickets"),
        ]);
        if (meRes.ok) {
          const { data } = await meRes.json();
          setName(data?.full_name || "");
        }
        if (ordersRes.ok) {
          const { data } = await ordersRes.json();
          const orders: Order[] = data || [];
          setRecentOrders(orders.slice(0, 3));
          setStats(prev => ({
            ...prev,
            orders: orders.length,
            activeOrders: orders.filter(o => !["completed","cancelled"].includes(o.status)).length,
          }));
        }
        if (ticketsRes.ok) {
          const { data } = await ticketsRes.json();
          const tickets: Ticket[] = data || [];
          setRecentTickets(tickets.slice(0, 3));
          setStats(prev => ({
            ...prev,
            tickets: tickets.length,
            openTickets: tickets.filter(t => !["مغلقة","تم الحل"].includes(t.status)).length,
          }));
        }
      } catch {} finally { setLoading(false); }
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
          {getGreeting()}{name ? `، ${name}` : ""} 👋
        </h2>
        <p style={{ margin: 0, fontSize: ".72rem", color: "#7a8fa6" }}>
          تابع طلباتك، مستنداتك، وتذاكر الدعم في مكان واحد.
        </p>
      </div>

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
            <div key={order.id} style={{ padding: "12px 18px", borderBottom: i < recentOrders.length - 1 ? "1px solid #f0f3f8" : "none", display: "flex", alignItems: "center", gap: 10 }}>
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
          );
        })}
      </div>

      {/* Recent tickets */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f3f8" }}>
          <h3 style={{ margin: 0, fontSize: ".78rem", color: "#073766" }}>آخر تذاكر الدعم</h3>
          <Link href="/dashboard/tickets" style={{ fontSize: ".65rem", color: "#0875dc", textDecoration: "none", fontWeight: 700 }}>عرض الكل ←</Link>
        </div>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
        ) : recentTickets.length === 0 ? (
          <div style={{ padding: "24px 18px", textAlign: "center", color: "#8b9dad" }}>
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
              <div style={{ padding: "12px 18px", borderBottom: i < recentTickets.length - 1 ? "1px solid #f0f3f8" : "none", display: "flex", alignItems: "center", gap: 10, borderRight: isUrgent ? "3px solid #dc2626" : "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#f5f3ff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <MessageSquare size={15} color="#7c3aed" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#1e3a56", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ticket.title}
                    {isUrgent && <span style={{ fontSize: ".55rem", background: "#fef2f2", color: "#dc2626", borderRadius: 10, padding: "1px 6px", marginRight: 6, fontWeight: 700 }}>عاجل</span>}
                  </div>
                  <div style={{ fontSize: ".58rem", color: "#8b9dad", marginTop: 2 }}>
                    {new Date(ticket.updated_at).toLocaleDateString("ar-SA")}
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
    </div>
  );
}
