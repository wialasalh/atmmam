"use client";

import { useEffect, useState } from "react";
import { ClipboardList, FileText, MessageSquare, TrendingUp } from "lucide-react";
import Link from "next/link";
export default function DashboardHome() {
  const [stats, setStats] = useState({ orders: 0, documents: 0, tickets: 0 });
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

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
          setStats(prev => ({ ...prev, orders: data?.length || 0 }));
        }

        if (ticketsRes.ok) {
          const { data } = await ticketsRes.json();
          setStats(prev => ({ ...prev, tickets: data?.length || 0 }));
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const cards = [
    { label: "الطلبات", count: stats.orders, icon: ClipboardList, color: "#0875dc", bg: "#eaf4ff", href: "/dashboard/orders" },
    { label: "المستندات", count: stats.documents, icon: FileText, color: "#16a34a", bg: "#e8faf0", href: "/dashboard/documents" },
    { label: "تذاكر الدعم", count: stats.tickets, icon: MessageSquare, color: "#e67e22", bg: "#fef5e7", href: "/dashboard/tickets" },
  ];

  return (
    <div className="client-dash-page">
      <h2 className="client-dash-page-title">{name ? `مرحباً ${name}` : "مرحباً بك في منطقة العميل"}</h2>
      <p className="client-dash-page-desc">تابع طلباتك، مستنداتك، وتذاكر الدعم في مكان واحد.</p>

      <div className="client-dash-cards">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="client-dash-stat-card" style={{ borderColor: c.color + "30" }}>
            <span className="client-dash-stat-icon" style={{ background: c.bg, color: c.color }}><c.icon size={24} /></span>
            <div>
              <strong>{loading ? "..." : c.count}</strong>
              <small>{c.label}</small>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="client-dash-section">
        <h3>إجراءات سريعة</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/tickets/new" className="client-dash-primary-btn">
            <MessageSquare size={15} /> فتح تذكرة دعم
          </Link>
          <Link href="/dashboard/documents" className="client-dash-secondary-btn">
            <FileText size={15} /> رفع مستند
          </Link>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="client-dash-section">
        <h3>آخر التحديثات</h3>
        <div className="client-dash-empty">
          <TrendingUp size={32} />
          <p>لا توجد تحديثات حديثة. سيتم عرض آخر التطورات على طلباتك هنا.</p>
        </div>
      </div>
    </div>
  );
}
