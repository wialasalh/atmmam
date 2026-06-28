"use client";

import { useEffect, useMemo, useState } from "react";
import { initialAdminOrders, readAdminOrders } from "@/lib/admin-orders";
import { fetchAdminOrdersFromApi } from "@/lib/admin-orders-api";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const [orders, setOrders] = useState(initialAdminOrders);
  const { role, loading } = useRoleGuard("viewer");
  useEffect(() => { if(process.env.NEXT_PUBLIC_SUPABASE_URL)void fetchAdminOrdersFromApi().then((data)=>{if(data)setOrders(data)});else setOrders(readAdminOrders()); }, []);
  const agencies = useMemo(() => Array.from(new Set(orders.map((item) => item.agency))).map((name) => ({ name, count: orders.filter((item) => item.agency === name).length })).sort((a, b) => b.count - a.count), [orders]);
  const completion = orders.length ? Math.round(orders.filter((item) => item.status === "مكتمل").length / orders.length * 100) : 0;
  function exportReport() { const rows = [["رقم الطلب", "العميل", "الخدمة", "الجهة", "الحالة", "المسؤول", "آخر تحديث"], ...orders.map((order) => [order.id, order.client, order.service, order.agency, order.status, order.assignee, order.updatedAt])]; const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")}`; const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `atmmam-orders-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); }
  if (loading) return <div style={{display:"grid",placeItems:"center",height:"calc(100vh - 76px)"}}><div style={{width:24,height:24,border:"2px solid #e5ecf3",borderTopColor:"#073766",borderRadius:"50%",animation:"spin .6s linear infinite"}} /></div>;
  return <section className="report-page"><div className="secondary-heading"><div><p>التحليل واتخاذ القرار</p><h1>التقارير</h1><span>قراءة واضحة لحجم العمل والإنجاز وتوزيع الخدمات.</span></div><button onClick={exportReport}>تصدير التقرير <Download size={14} /></button></div><div className="report-kpis"><article><small>معدل الإنجاز</small><strong>{completion}%</strong><em>من إجمالي الطلبات</em></article><article><small>الطلبات النشطة</small><strong>{orders.filter((item) => item.status !== "مكتمل").length}</strong><em>طلب حالي</em></article><article><small>الجهة الأكثر طلبًا</small><strong>{agencies[0]?.count ?? 0}</strong><em>{agencies[0]?.name}</em></article><article><small>زمن الاستجابة</small><strong>2.4</strong><em>ساعة في المتوسط</em></article></div><div className="report-grid"><article className="report-panel"><header><h2>حركة الطلبات</h2><span>آخر 7 أيام</span></header><div className="report-bars">{[42,58,48,72,66,84,61].map((height,index) => <div key={index}><i style={{height:`${height}%`}}></i><span>{["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"][index]}</span></div>)}</div></article><article className="report-panel agency-report"><header><h2>توزيع الجهات</h2><span>حسب الطلبات</span></header>{agencies.map((agency) => <div key={agency.name}><span>{agency.name}</span><b><i style={{width:`${Math.max(12,agency.count/orders.length*100)}%`}}></i></b><strong>{agency.count}</strong></div>)}</article></div></section>;
}
