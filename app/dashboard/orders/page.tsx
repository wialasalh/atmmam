"use client";

import { useEffect, useState } from "react";
import { ClipboardList, MessageSquare, Plus } from "lucide-react";
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

const statusLabels: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد التنفيذ",
  waiting_documents: "بانتظار المستندات",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/orders").then(r => r.json()).then(({ data }) => {
      if (data) setOrders(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="client-dash-page">
      <div className="client-dash-page-header">
        <h2 className="client-dash-page-title">طلباتي</h2>
        <Link href="/dashboard/tickets/new" className="client-dash-primary-btn">
          <MessageSquare size={15} /> طلب دعم
        </Link>
      </div>
      <p className="client-dash-page-desc">قائمة بطلباتك المقدمة لأتمم.</p>

      {loading ? (
        <div className="client-dash-empty"><p>جاري التحميل...</p></div>
      ) : orders.length === 0 ? (
        <div className="client-dash-empty">
          <ClipboardList size={40} />
          <p>لا توجد طلبات حتى الآن.</p>
        </div>
      ) : (
        <div className="client-dash-table-wrap">
          <table className="client-dash-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>الخدمة</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.reference_no}</td>
                  <td>{o.service_name}</td>
                  <td><span className="client-dash-badge">{statusLabels[o.status] || o.status}</span></td>
                  <td style={{ fontSize: ".6rem", color: "#8b9dad" }}>{new Date(o.created_at).toLocaleDateString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard/tickets/new" className="client-dash-secondary-btn">
          <Plus size={14} /> فتح تذكرة دعم جديدة
        </Link>
      </div>
    </div>
  );
}
