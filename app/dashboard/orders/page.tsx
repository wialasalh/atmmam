"use client";

import { useEffect, useState } from "react";
import { ClipboardList, MessageSquare, Search, Clock, CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

type Order = {
  id: string;
  reference_no: string;
  service_name: string;
  status: string;
  priority: string;
  created_at: string;
  notes: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  new:               { label: "جديد",                color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} /> },
  in_progress:       { label: "قيد التنفيذ",         color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} /> },
  waiting_documents: { label: "بانتظار المستندات",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertCircle size={11} /> },
  completed:         { label: "مكتمل",               color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} /> },
  cancelled:         { label: "ملغي",                color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} /> },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  urgent:  { color: "#dc2626", bg: "#fef2f2" },
  high:    { color: "#ea580c", bg: "#fff7ed" },
  normal:  { color: "#6b7280", bg: "#f9fafb" },
  عاجلة:   { color: "#dc2626", bg: "#fef2f2" },
  مرتفعة:  { color: "#ea580c", bg: "#fff7ed" },
  عادية:   { color: "#6b7280", bg: "#f9fafb" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/client/orders").then(r => r.json()).then(({ data }) => {
      if (data) setOrders(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = `${o.reference_no} ${o.service_name}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || o.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: orders.length,
    active: orders.filter(o => ["new","in_progress","waiting_documents"].includes(o.status)).length,
    completed: orders.filter(o => o.status === "completed").length,
    waiting: orders.filter(o => o.status === "waiting_documents").length,
  };

  return (
    <div className="client-dash-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 className="client-dash-page-title" style={{ marginBottom: 2 }}>طلباتي</h2>
          <p className="client-dash-page-desc" style={{ margin: 0 }}>قائمة بطلباتك المقدمة لفريق أتمم.</p>
        </div>
        <Link href="/dashboard/tickets/new" className="client-dash-primary-btn">
          <MessageSquare size={15} /> طلب دعم
        </Link>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "إجمالي", value: stats.total, color: "#073766", bg: "#f0f4f8" },
            { label: "نشطة", value: stats.active, color: "#0875dc", bg: "#eaf4ff" },
            { label: "بانتظار مستندات", value: stats.waiting, color: "#7c3aed", bg: "#f5f3ff" },
            { label: "مكتملة", value: stats.completed, color: "#15803d", bg: "#f0fdf4" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: ".58rem", color: "#526983", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Waiting notice */}
      {stats.waiting > 0 && (
        <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertCircle size={15} color="#7c3aed" />
          <p style={{ margin: 0, fontSize: ".68rem", color: "#5b21b6", fontWeight: 600 }}>
            لديك {stats.waiting} طلب بانتظار تقديم المستندات. <Link href="/dashboard/tickets/new" style={{ color: "#7c3aed", fontWeight: 700 }}>تواصل مع الدعم</Link>
          </p>
        </div>
      )}

      {/* Search & filter */}
      {orders.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, background: "#f5f8fc", border: "1px solid #e5eaf0", borderRadius: 8, padding: "0 10px" }}>
            <Search size={13} color="#8b9dad" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو الخدمة..."
              style={{ border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: ".7rem", color: "#344d69", height: 34, width: "100%" }} />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ height: 36, border: "1px solid #e5eaf0", borderRadius: 8, background: "#f5f8fc", padding: "0 10px", font: "inherit", fontSize: ".65rem", color: "#344d69" }}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="client-dash-empty"><p>جاري التحميل...</p></div>
      ) : filtered.length === 0 ? (
        <div className="client-dash-empty">
          <ClipboardList size={40} />
          <p>{search ? "لا توجد نتائج." : "لا توجد طلبات حتى الآن."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(o => {
            const s = STATUS_CONFIG[o.status] || { label: o.status, color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: null };
            const p = PRIORITY_CONFIG[o.priority] || PRIORITY_CONFIG["عادية"];
            return (
              <div key={o.id} style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: ".68rem", fontWeight: 800, color: "#0875dc", background: "#eaf4ff", padding: "2px 8px", borderRadius: 6 }}>{o.reference_no}</span>
                      {o.priority && <span style={{ fontSize: ".55rem", padding: "2px 7px", borderRadius: 20, fontWeight: 700, color: p.color, background: p.bg }}>{o.priority}</span>}
                    </div>
                    <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#1e3a56" }}>{o.service_name}</div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", padding: "4px 9px", borderRadius: 20, border: `1px solid ${s.border}`, color: s.color, background: s.bg, fontWeight: 700, flexShrink: 0 }}>
                    {s.icon} {s.label}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <span style={{ fontSize: ".6rem", color: "#aab5c3" }}>
                    <Clock size={10} style={{ verticalAlign: "middle", marginLeft: 3 }} />
                    {new Date(o.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  {o.notes && <span style={{ fontSize: ".6rem", color: "#526983", background: "#f5f8fc", padding: "2px 8px", borderRadius: 6 }}>{o.notes}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Link href="/dashboard/tickets/new" className="client-dash-secondary-btn">
            <MessageSquare size={14} /> تحتاج مساعدة في طلب؟
          </Link>
        </div>
      )}
    </div>
  );
}
