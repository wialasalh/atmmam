"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Search, Clock, CheckCircle, AlertCircle, XCircle, RefreshCw, Plus } from "lucide-react";
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new:               { label: "جديد",               color: "#0875dc", bg: "#eaf4ff", icon: <Clock size={11} /> },
  in_progress:       { label: "قيد التنفيذ",        color: "#b45309", bg: "#fef9ee", icon: <RefreshCw size={11} /> },
  waiting_documents: { label: "بانتظار المستندات",  color: "#7c3aed", bg: "#f5f3ff", icon: <AlertCircle size={11} /> },
  completed:         { label: "مكتمل",              color: "#15803d", bg: "#f0fdf4", icon: <CheckCircle size={11} /> },
  cancelled:         { label: "ملغي",               color: "#6b7280", bg: "#f3f4f6", icon: <XCircle size={11} /> },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/client/orders")
      .then(r => r.ok ? r.json() : { data: [] })
      .then(json => { setOrders(json.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = `${o.reference_no} ${o.service_name || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || o.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: orders.length,
    active: orders.filter(o => ["new","in_progress","waiting_documents"].includes(o.status)).length,
    completed: orders.filter(o => o.status === "completed").length,
    waiting: orders.filter(o => o.status === "waiting_documents").length,
  };

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("ar-SA", { year:"numeric", month:"short", day:"numeric" });
  }

  return (
    <div className="client-dash-page">
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 className="client-dash-page-title" style={{ marginBottom:2 }}>طلباتي</h2>
          <p className="client-dash-page-desc" style={{ margin:0 }}>قائمة بطلباتك المقدمة لفريق أتمم.</p>
        </div>
        <Link href="/services" className="client-dash-primary-btn">
          <Plus size={15} /> طلب جديد
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"إجمالي الطلبات", value: stats.total, color:"#073766" },
          { label:"نشطة", value: stats.active, color:"#0875dc" },
          { label:"بانتظار مستندات", value: stats.waiting, color:"#7c3aed" },
          { label:"مكتملة", value: stats.completed, color:"#15803d" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:12, padding:"14px 16px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
            <div style={{ fontSize:"1.5rem", fontWeight:800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize:".65rem", color:"#8b9dad", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", color:"#8b9dad" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث برقم الطلب أو الخدمة..."
            style={{ width:"100%", border:"1px solid #e5ecf3", borderRadius:8, padding:"8px 32px 8px 12px", fontSize:".72rem", color:"#344d69", background:"#fff", boxSizing:"border-box", outline:"none" }} />
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["", "new", "in_progress", "waiting_documents", "completed"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding:"7px 14px", borderRadius:8, border:"1px solid", fontSize:".68rem", cursor:"pointer", fontWeight: filter === s ? 700 : 400,
                borderColor: filter === s ? "#0875dc" : "#e5ecf3",
                background: filter === s ? "#eaf4ff" : "#fff",
                color: filter === s ? "#0875dc" : "#6b7280" }}>
              {s === "" ? "الكل" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#8b9dad", fontSize:".75rem" }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, background:"#fff", borderRadius:16, border:"1px solid #e5ecf3" }}>
          <ClipboardList size={36} color="#d1d9e0" style={{ marginBottom:12 }} />
          <p style={{ color:"#8b9dad", fontSize:".75rem", margin:0 }}>
            {orders.length === 0 ? "لا توجد طلبات بعد — اضغط طلب جديد للبدء" : "لا توجد نتائج لهذا الفلتر"}
          </p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || { label: order.status, color:"#6b7280", bg:"#f3f4f6", icon: null };
            return (
              <div key={order.id} style={{ background:"#fff", border:"1px solid #e5ecf3", borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ width:40, height:40, borderRadius:10, background:"#eaf4ff", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <ClipboardList size={18} color="#0875dc" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:".78rem", color:"#073766" }}>{order.reference_no}</span>
                    <span style={{ fontSize:".65rem", padding:"2px 8px", borderRadius:20, background: cfg.bg, color: cfg.color, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize:".72rem", color:"#8b9dad" }}>{order.service_name || "خدمة غير محددة"}</div>
                </div>
                <div style={{ textAlign:"left", flexShrink:0 }}>
                  <div style={{ fontSize:".65rem", color:"#b0bcc9" }}>{fmt(order.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
