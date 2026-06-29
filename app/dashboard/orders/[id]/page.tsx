"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Hash, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw, User, Phone, Mail, Calendar, FileText, Building2 } from "lucide-react";

type OrderDetail = {
  id: string;
  reference_no: string;
  status: string;
  priority: string;
  due_at: string | null;
  next_action_text: string | null;
  next_action_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  client: { name: string; phone: string | null; email: string | null };
  service_name: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  new:               { label: "جديد",               color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} /> },
  in_progress:       { label: "قيد التنفيذ",         color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} /> },
  waiting_documents: { label: "بانتظار المستندات",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <AlertCircle size={11} /> },
  completed:         { label: "مكتمل",               color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} /> },
  cancelled:         { label: "ملغي",                color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} /> },
  blocked:           { label: "معلق",                color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <AlertCircle size={11} /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "عادي",     color: "#6b7280", bg: "#f9fafb" },
  high:   { label: "مرتفع",    color: "#ea580c", bg: "#fff7ed" },
  urgent: { label: "عاجل",     color: "#dc2626", bg: "#fef2f2" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/client/orders/${orderId}`);
        const j = await r.json();
        if (!r.ok) { setError(j.error || "حدث خطأ"); return; }
        setOrder(j.data);
      } catch { setError("حدث خطأ في تحميل الطلب"); }
      finally { setLoading(false); }
    })();
  }, [orderId]);

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("ar-SA", {calendar:"gregory",  year: "numeric", month: "long", day: "numeric" });
  }
  function fmtTime(d: string) {
    return new Date(d).toLocaleString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div className="client-dash-page">
        <div className="client-dash-empty"><p style={{ color: "#8b9dad", fontSize: ".75rem" }}>جاري التحميل...</p></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="client-dash-page">
        <Link href="/dashboard/orders" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".68rem", color: "#526983", textDecoration: "none", marginBottom: 12 }}>
          <ChevronRight size={13} /> العودة للطلبات
        </Link>
        <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 16, border: "1px solid #e5ecf3" }}>
          <FileText size={36} color="#d1d9e0" style={{ marginBottom: 12 }} />
          <p style={{ color: "#8b9dad", fontSize: ".75rem", margin: 0 }}>{error || "الطلب غير موجود"}</p>
        </div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
  const pc = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.normal;

  const timeline = [
    { label: "تم الإنشاء", date: order.created_at, done: true },
    { label: "قيد التنفيذ", date: order.status === "in_progress" || order.status === "waiting_documents" || order.status === "completed" ? order.updated_at : null, done: order.status !== "new" },
    { label: "بانتظار المستندات", done: order.status === "waiting_documents" || order.status === "completed" },
    { label: "مكتمل", date: order.completed_at, done: order.status === "completed" },
  ];

  return (
    <div className="client-dash-page" style={{ paddingBottom: 0 }}>

      {/* Back */}
      <Link href="/dashboard/orders" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".68rem", color: "#526983", textDecoration: "none", marginBottom: 12 }}>
        <ChevronRight size={13} /> العودة للطلبات
      </Link>

      {/* Header card */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 0", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".78rem", fontWeight: 800, color: "#0875dc", fontFamily: "monospace", direction: "ltr" }}>
            <Hash size={14} /> {order.reference_no}
          </span>
          <span style={{ marginRight: "auto" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", padding: "3px 9px", borderRadius: 20, border: `1px solid ${sc.border}`, color: sc.color, background: sc.bg, fontWeight: 700 }}>
            {sc.icon} {sc.label}
          </span>
          <span style={{ fontSize: ".6rem", padding: "3px 9px", borderRadius: 20, color: pc.color, background: pc.bg, fontWeight: 700 }}>
            {pc.label}
          </span>
        </div>

        <h2 style={{ margin: "10px 18px 0", fontSize: ".92rem", color: "#073766", fontWeight: 700 }}>{order.service_name}</h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 18px 16px" }}>
          <span style={{ fontSize: ".58rem", color: "#aab5c3", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Calendar size={10} /> {fmt(order.created_at)}
          </span>
          {order.due_at && (
            <span style={{ fontSize: ".58rem", color: order.due_at < new Date().toISOString() ? "#dc2626" : "#aab5c3", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Clock size={10} /> تسليم: {fmt(order.due_at)}
            </span>
          )}
        </div>
      </div>

      {/* Client info */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, padding: "14px 18px" }}>
        <h3 style={{ margin: 0, fontSize: ".72rem", color: "#073766", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <User size={14} /> بيانات العميل
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".68rem", color: "#344d69" }}>
            <User size={12} color="#8b9dad" /> {order.client.name}
          </div>
          {order.client.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".68rem", color: "#344d69" }}>
              <Phone size={12} color="#8b9dad" /> {order.client.phone}
            </div>
          )}
          {order.client.email && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".68rem", color: "#344d69" }}>
              <Mail size={12} color="#8b9dad" /> {order.client.email}
            </div>
          )}
        </div>
      </div>

      {/* Order details */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, padding: "14px 18px" }}>
        <h3 style={{ margin: 0, fontSize: ".72rem", color: "#073766", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={14} /> تفاصيل الطلب
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ background: "#f5f8fc", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>الخدمة</div>
            <div style={{ fontSize: ".68rem", color: "#1e3a56", fontWeight: 700 }}>{order.service_name}</div>
          </div>
          <div style={{ background: "#f5f8fc", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>الأولوية</div>
            <div style={{ fontSize: ".68rem", color: pc.color, fontWeight: 700 }}>{pc.label}</div>
          </div>
          <div style={{ background: "#f5f8fc", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>تاريخ الإنشاء</div>
            <div style={{ fontSize: ".68rem", color: "#1e3a56", fontWeight: 700 }}>{fmtTime(order.created_at)}</div>
          </div>
          {order.due_at && (
            <div style={{ background: "#f5f8fc", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>تاريخ التسليم</div>
              <div style={{ fontSize: ".68rem", color: "#1e3a56", fontWeight: 700 }}>{fmt(order.due_at)}</div>
            </div>
          )}
          {order.completed_at && (
            <div style={{ background: "#f5f8fc", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>تاريخ الإكمال</div>
              <div style={{ fontSize: ".68rem", color: "#15803d", fontWeight: 700 }}>{fmt(order.completed_at)}</div>
            </div>
          )}
          {order.next_action_text && (
            <div style={{ background: "#fef9ee", borderRadius: 8, padding: "8px 10px", borderRight: "3px solid #f59e0b" }}>
              <div style={{ fontSize: ".55rem", color: "#b45309", fontWeight: 600, marginBottom: 2 }}>الإجراء التالي</div>
              <div style={{ fontSize: ".68rem", color: "#92400e", fontWeight: 700 }}>{order.next_action_text}</div>
              {order.next_action_at && (
                <div style={{ fontSize: ".55rem", color: "#b45309", marginTop: 2 }}>تاريخ: {fmt(order.next_action_at)}</div>
              )}
            </div>
          )}
        </div>
        {order.notes && (
          <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 8, padding: "10px 12px", borderRight: "3px solid #e5eaf0" }}>
            <div style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, marginBottom: 4 }}>ملاحظات</div>
            <div style={{ fontSize: ".68rem", color: "#425c76", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{order.notes}</div>
          </div>
        )}
      </div>

      {/* Progress timeline */}
      <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 14, marginBottom: 12, padding: "14px 18px" }}>
        <h3 style={{ margin: 0, fontSize: ".72rem", color: "#073766", fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> سير الطلب
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {timeline.map((step, i) => {
            const isDone = step.done;
            const isLast = i === timeline.length - 1;
            const isActive = step.done && (!timeline[i + 1] || !timeline[i + 1].done);
            return (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                    background: isDone ? (isActive ? "#0875dc" : "#15803d") : "#e5eaf0",
                    border: isActive ? "3px solid #bddcff" : "none",
                  }} />
                  {!isLast && <div style={{ width: 2, flex: 1, background: isDone ? "#15803d" : "#e5eaf0", minHeight: 20 }} />}
                </div>
                <div style={{ paddingBottom: isLast ? 0 : 16 }}>
                  <div style={{ fontSize: ".68rem", color: isDone ? "#1e3a56" : "#aab5c3", fontWeight: isDone ? 700 : 400 }}>{step.label}</div>
                  {step.date && <div style={{ fontSize: ".58rem", color: "#8b9dad", marginTop: 2 }}>{fmtTime(step.date)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
