"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { AdminOrder, initialAdminOrders, OrderStatus, readAdminOrders, statusTone, writeAdminOrders } from "@/lib/admin-orders";
import { allowedOrderStatuses, canChangeOrderStatus, filterAdminOrders } from "@/lib/domain/orders";
import { X, Search, Plus, AlertTriangle, Check, Clock, Flag, User, FileText, Building2, Phone, Mail, Calendar, CheckCircle, MessageSquare, ChevronDown, Layers, ListChecks, ExternalLink, Upload, RefreshCw, Copy, ChevronLeft, AlertCircle } from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";

const statusTabs: Array<OrderStatus | "الكل"> = ["الكل", "جديد", "بانتظار المستندات", "قيد التنفيذ", "مكتمل", "ملغي", "معلق"];
type CatalogItem = { id: string; name?: string; full_name?: string; phone?: string; email?: string; agency_id?: string };
type RelatedTicket = { id: string; title: string; status: string; priority: string; category: string; client_id?: string };
type Catalog = { clients: CatalogItem[]; services: CatalogItem[]; agencies: CatalogItem[]; profiles: CatalogItem[] };
type DatabaseOrder = { id:string; reference_no:string; status:string; next_action_text?:string; next_action_at?:string; updated_at:string; archived_at?:string|null; clients?:CatalogItem|null; services?:CatalogItem|null; agencies?:CatalogItem|null; profiles?:CatalogItem|null; notes?:string|null };
const statusFromDatabase: Record<string, OrderStatus> = { new:"جديد", waiting_documents:"بانتظار المستندات", in_progress:"قيد التنفيذ", completed:"مكتمل", cancelled:"ملغي", blocked:"معلق" };
const statusToDatabase: Record<OrderStatus, string> = { "جديد":"new", "بانتظار المستندات":"waiting_documents", "قيد التنفيذ":"in_progress", "مكتمل":"completed", "ملغي":"cancelled", "معلق":"blocked" };

const priorityLabels: Record<string, string> = { normal: "عادي", high: "مرتفع", urgent: "عاجل" };
const priorityColors: Record<string, string> = { normal: "#6c757d", high: "#e67e22", urgent: "#dc3545" };

function Agency({ type, name }: { type: AdminOrder["agencyType"]; name: string }) {
  const src = type === "commerce" ? "/assets/agencies/ministry-commerce.svg" : type === "zatca" ? "/assets/agencies/zatca-official.svg" : null;
  return <span className="ops-agency">{src ? <img src={src} alt="" /> : <i>ح</i>}<span>{name}</span></span>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState(initialAdminOrders);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "الكل">("الكل");
  const [selectedId, setSelectedId] = useState<string|undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});
  const [remoteDocs, setRemoteDocs] = useState<Record<string, Array<{name:string;status:string;download_url?:string|null}>>>({});
  const [databaseMode, setDatabaseMode] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ clients:[], services:[], agencies:[], profiles:[] });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<string|null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<OrderStatus | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<RelatedTicket[]>([]);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const { role, loading } = useRoleGuard("operator");

  async function loadDatabase() {
    const [ordersResponse, catalogResponse] = await Promise.all([fetch("/api/admin/orders"), fetch("/api/admin/catalog")]);
    if (!ordersResponse.ok || !catalogResponse.ok) return false;
    const ordersPayload = await ordersResponse.json() as { data: DatabaseOrder[] }; const catalogPayload = await catalogResponse.json() as { data: Catalog };
    const mapped = ordersPayload.data.map((order):AdminOrder => ({ databaseId:order.id, clientId:order.clients?.id, serviceId:order.services?.id, agencyId:order.agencies?.id, assigneeId:order.profiles?.id, id:order.reference_no, client:order.clients?.name??"عميل غير معروف", service:order.services?.name??"خدمة غير معروفة", agency:order.agencies?.name??"غير محددة", agencyType:order.agencies?.name?.includes("الزكاة")?"zatca":order.agencies?.name?.includes("التجارة")?"commerce":"ip", status:statusFromDatabase[order.status]??"جديد", assignee:order.profiles?.full_name??"غير مسند", updatedAt:new Date(order.updated_at).toLocaleString("ar-SA"), phone:order.clients?.phone??"", email:order.clients?.email??"", nextAction:order.next_action_text??"تحديد الإجراء التالي", nextActionAt:order.next_action_at?new Date(order.next_action_at).toLocaleString("ar-SA"):"غير محدد", statusReason:(order as any).notes || undefined, archivedAt: order.archived_at || null }));
    setCatalog(catalogPayload.data); setOrders(mapped); setDatabaseMode(true); return true;
  }

  useEffect(() => { const client = new URLSearchParams(window.location.search).get("client"); if (client) setQuery(client); if (process.env.NEXT_PUBLIC_SUPABASE_URL) void loadDatabase(); else setOrders(readAdminOrders()); }, []);

  const filteredOrders = useMemo(() => {
    const base = showArchived ? orders.filter(o => o.archivedAt) : orders.filter(o => !o.archivedAt);
    return showArchived ? base : filterAdminOrders(base, query, statusFilter);
  }, [orders, query, statusFilter, showArchived]);

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  useEffect(()=>{if(!databaseMode||!selected?.databaseId)return;void fetch(`/api/admin/orders/${selected.databaseId}/documents`).then(async(response)=>{if(response.ok){const payload=await response.json() as {data:Array<{name:string;status:string;download_url?:string|null}>};setRemoteDocs((current)=>({...current,[selected.id]:payload.data}))}})},[databaseMode,selected?.databaseId,selected?.id]);

  useEffect(() => {
    if (!selected?.clientId) { setRelatedTickets([]); return; }
    fetch("/api/admin/tickets")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const all = (data?.data ?? []) as RelatedTicket[];
        setRelatedTickets(all.filter(t => t.client_id === selected.clientId).slice(0, 6));
      })
      .catch(() => {});
  }, [selected?.clientId]);
  const counts = useMemo(() => ({
    "الكل": orders.length,
    "جديد": orders.filter((item) => item.status === "جديد").length,
    "بانتظار المستندات": orders.filter((item) => item.status === "بانتظار المستندات").length,
    "قيد التنفيذ": orders.filter((item) => item.status === "قيد التنفيذ").length,
    "مكتمل": orders.filter((item) => item.status === "مكتمل").length,
    "ملغي": orders.filter((item) => item.status === "ملغي").length,
    "معلق": orders.filter((item) => item.status === "معلق").length,
  }), [orders]);

  function persist(nextOrders: AdminOrder[], message: string) {
    setOrders(nextOrders);
    writeAdminOrders(nextOrders);
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function archiveOrder(orderId: string, archive: boolean) {
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ archive }) });
    if (res.ok) { await loadDatabase(); setNotice(archive ? "تم أرشفة الطلب" : "تم استعادة الطلب"); setTimeout(() => setNotice(""), 2500); }
    else setNotice("تعذّر تغيير حالة الأرشيف");
  }

  async function deleteOrder(orderId: string) {
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedId(undefined);
      setConfirmDeleteOrder(null);
      await loadDatabase();
    } else {
      setNotice("تعذّر حذف الطلب");
    }
  }

  async function confirmStatusChange(status: OrderStatus, reason?: string) {
    if (!selected) return;
    if (databaseMode && selected.databaseId) {
      const response = await fetch(`/api/admin/orders/${selected.databaseId}/status`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status:statusToDatabase[status], reason}) });
      if(!response.ok){const err=await response.json();setNotice(err.error||"تعذر تحديث الحالة");return} await loadDatabase(); setNotice("تم تحديث الحالة وتسجيلها"); return;
    }
    persist(orders.map((order) => order.id === selected.id ? { ...order, status, updatedAt: "الآن" } : order), `تم تحديث حالة ${selected.id}`);
  }

  function updateStatus(status: OrderStatus) {
    if (!selected) return;
    if (!canChangeOrderStatus(selected.status, status)) { setNotice("لا يمكن تنفيذ هذا الانتقال في مسار الطلب"); return; }
    if (status === "ملغي" || status === "معلق") { setPendingTargetStatus(status); setShowReasonDialog(true); setTimeout(() => reasonRef.current?.focus(), 100); return; }
    void confirmStatusChange(status);
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormSubmitted(true);
    const form = new FormData(event.currentTarget);
    if(databaseMode){
      const service=catalog.services.find((item)=>item.id===form.get("serviceId"));
      const client=catalog.clients.find((item)=>item.id===form.get("clientId"));
      if (!service || !client) { setNotice("يرجى اختيار العميل والخدمة"); setFormSubmitted(false); return; }
      const response=await fetch("/api/admin/orders",{
        method:"POST", headers:{"content-type":"application/json"},
        body:JSON.stringify({
          clientId:form.get("clientId"),
          serviceId:form.get("serviceId"),
          agencyId:form.get("agencyId") || service?.agency_id || undefined,
          assigneeId:form.get("assigneeId")||undefined,
          priority:form.get("priority")||"normal",
          dueAt:form.get("dueAt")?new Date(form.get("dueAt") as string).toISOString():undefined,
          nextActionText:form.get("nextActionText")||undefined,
          nextActionAt:form.get("nextActionAt")?new Date(form.get("nextActionAt") as string).toISOString():undefined,
          notes:form.get("notes")||undefined,
        })
      });
      if(!response.ok){const err=await response.json(); setNotice(err.error||"تعذر إنشاء الطلب"); setFormSubmitted(false); return;}
      await loadDatabase(); setShowCreate(false); setNotice("تم إنشاء الطلب بنجاح"); setFormSubmitted(false); return;
    }
    const service = String(form.get("service") ?? "");
    const isTax = service.includes("ضريبة");
    const next: AdminOrder = {
      id: `REQ-${new Date().getFullYear()}-${String(orders.length + 43).padStart(4, "0")}`,
      client: String(form.get("client") ?? ""), service,
      agency: isTax ? "هيئة الزكاة والضريبة والجمارك" : "وزارة التجارة",
      agencyType: isTax ? "zatca" : "commerce", status: "جديد",
      assignee: String(form.get("assignee") ?? ""), updatedAt: "الآن",
      phone: String(form.get("phone") ?? ""), email: String(form.get("email") ?? ""),
      nextAction: "مراجعة بيانات الطلب والتواصل مع العميل", nextActionAt: "اليوم",
    };
    const nextOrders = [next, ...orders];
    persist(nextOrders, `تم إنشاء الطلب ${next.id}`);
    setSelectedId(next.id); setStatusFilter("الكل"); setShowCreate(false); setFormSubmitted(false);
  }

  async function uploadSupportingDocument(file:File){if(!selected)return;if(databaseMode&&selected.databaseId){const form=new FormData();form.set("name","المستند الداعم");form.set("file",file);const response=await fetch(`/api/admin/orders/${selected.databaseId}/documents`,{method:"POST",body:form});if(!response.ok){setNotice("تعذر رفع المستند؛ تحقق من النوع والحجم والصلاحية");return}const documentsResponse=await fetch(`/api/admin/orders/${selected.databaseId}/documents`);if(documentsResponse.ok){const payload=await documentsResponse.json() as {data:Array<{name:string;status:string;download_url?:string|null}>};setRemoteDocs((current)=>({...current,[selected.id]:payload.data}))}setNotice("تم رفع المستند وتسجيله");return}setUploadedDocs((current)=>({...current,[selected.id]:[...(current[selected.id]??[]),"supporting"]}));setNotice("تمت إضافة المستند إلى الطلب")}

  if (loading) return <div style={{display:"grid",placeItems:"center",height:"calc(100vh - 76px)"}}><div style={{width:24,height:24,border:"2px solid #e5ecf3",borderTopColor:"#073766",borderRadius:"50%",animation:"spin .6s linear infinite"}} /></div>;
  return <>

    <div style={{
      display: "grid",
      gridTemplateColumns: selected ? "minmax(0,1fr) 315px" : "1fr",
      gap: 16, padding: "28px 24px 24px", maxWidth: 1800, margin: "auto", direction: "rtl",
    }}>
      <section className="ops-main">
        {/* Header: Title + Actions */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
          padding: "10px 16px", background: "#fff", borderRadius: 10,
          border: "1px solid #e8edf4",
        }}>
          <h1 style={{ margin: 0, fontSize: ".78rem", color: "#073766", fontWeight: 800 }}>إدارة الطلبات</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a7b9", pointerEvents: "none" }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث برقم الطلب، العميل، الخدمة..."
                style={{
                  height: 36, width: 260, border: "1px solid #e4ebf3", borderRadius: 8,
                  padding: "0 34px 0 12px", font: "inherit", fontSize: ".62rem",
                  color: "#2a4a6a", outline: "none", background: "#f8fafc",
                  transition: "all .2s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0875dc"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(8,117,220,.08)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e4ebf3"; e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.boxShadow = "none"; }}
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  style={{
                    position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                    border: 0, background: "none", color: "#94a7b9", cursor: "pointer",
                    padding: 4, display: "flex",
                  }}
                  title="مسح البحث"
                ><X size={13} /></button>
              ) : null}
            </div>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                height: 34, borderRadius: 8, border: 0, padding: "0 16px",
                background: "linear-gradient(135deg, #0875dc, #0a5fba)",
                color: "#fff", font: "inherit", fontWeight: 800, fontSize: ".65rem",
                display: "inline-flex", alignItems: "center", gap: 6,
                cursor: "pointer", boxShadow: "0 3px 10px rgba(8,117,220,.2)",
                transition: "all .2s", whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
            >
              <Plus size={15} /> طلب جديد
            </button>
          </div>
        </div>



        {/* Status Tabs */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap",
        }}>
          {statusTabs.map((label) => (
            <button
              onClick={() => setStatusFilter(label)}
              key={label}
              style={{
                padding: "4px 12px", borderRadius: 16, border: 0,
                font: "inherit", fontSize: ".62rem", fontWeight: statusFilter === label ? 800 : 600,
                cursor: "pointer", whiteSpace: "nowrap",
                background: statusFilter === label ? "#0875dc" : "#f1f5f9",
                color: statusFilter === label ? "#fff" : "#536a82",
                boxShadow: statusFilter === label ? "0 2px 8px rgba(8,117,220,.2)" : "none",
                transition: "all .15s",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
              onMouseEnter={(e) => { if (statusFilter !== label) e.currentTarget.style.background = "#e8edf5"; }}
              onMouseLeave={(e) => { if (statusFilter !== label) e.currentTarget.style.background = "#f1f5f9"; }}
            >
              {label}
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 18, height: 18, borderRadius: 9,
                fontSize: ".5rem", fontWeight: 800,
                background: statusFilter === label ? "rgba(255,255,255,.2)" : "#dfe7ef",
                color: statusFilter === label ? "#fff" : "#536a82",
                padding: "0 6px",
              }}>{counts[label]}</span>
            </button>
          ))}
          <button
            onClick={() => { setShowArchived(v => !v); setSelectedId(undefined); }}
            style={{
              padding: "4px 12px", borderRadius: 16, border: 0,
              font: "inherit", fontSize: ".62rem", fontWeight: showArchived ? 800 : 600,
              cursor: "pointer", whiteSpace: "nowrap",
              background: showArchived ? "#64748b" : "#f1f5f9",
              color: showArchived ? "#fff" : "#536a82",
              display: "inline-flex", alignItems: "center", gap: 6,
              transition: "all .15s",
            }}
          >
            الأرشيف
            <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", minWidth:18, height:18, borderRadius:9, fontSize:".5rem", fontWeight:800, background: showArchived ? "rgba(255,255,255,.2)" : "#dfe7ef", color: showArchived ? "#fff" : "#536a82", padding:"0 6px" }}>
              {orders.filter(o => o.archivedAt).length}
            </span>
          </button>
        </div>

        {/* Orders Table */}
        <div style={{
          background: "#fff", border: "1px solid #e8edf4", borderRadius: 12,
          overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.03)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ width: 36, padding: "8px 6px", fontSize: ".55rem", color: "#6b829b", fontWeight: 700, borderBottom: "1px solid #e8edf4", textAlign: "center" }}></th>
                  <th style={{ width: "22%", padding: "8px 8px", fontSize: ".55rem", color: "#6b829b", fontWeight: 700, borderBottom: "1px solid #e8edf4", textAlign: "right" }}>العميل</th>
                  <th style={{ width: "22%", padding: "8px 8px", fontSize: ".55rem", color: "#6b829b", fontWeight: 700, borderBottom: "1px solid #e8edf4", textAlign: "right" }}>الخدمة</th>
                  <th style={{ width: "16%", padding: "8px 8px", fontSize: ".55rem", color: "#6b829b", fontWeight: 700, borderBottom: "1px solid #e8edf4", textAlign: "right" }}>الجهة</th>
                  <th style={{ width: "13%", padding: "8px 8px", fontSize: ".55rem", color: "#6b829b", fontWeight: 700, borderBottom: "1px solid #e8edf4", textAlign: "right" }}>الحالة</th>
                  <th style={{ width: "12%", padding: "8px 8px", fontSize: ".55rem", color: "#6b829b", fontWeight: 700, borderBottom: "1px solid #e8edf4", textAlign: "right" }}>المسؤول</th>
                  <th style={{ width: "15%", padding: "8px 8px", fontSize: ".55rem", color: "#6b829b", fontWeight: 700, borderBottom: "1px solid #e8edf4", textAlign: "right" }}>آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    style={{
                      cursor: "pointer",
                      background: selectedId === order.id ? "#f0f7ff" : idx % 2 === 0 ? "#fff" : "#fafcfe",
                      transition: "background .1s",
                      borderBottom: "1px solid #f0f4f9",
                    }}
                    onMouseEnter={(e) => { if (selectedId !== order.id) e.currentTarget.style.background = "#f5f9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selectedId === order.id ? "#f0f7ff" : idx % 2 === 0 ? "#fff" : "#fafcfe"; }}
                  >
                    <td style={{ padding: "7px 6px", textAlign: "center" }}>
                      <input type="radio" name="orderSelect" checked={selectedId === order.id} onChange={() => setSelectedId(order.id)} style={{ cursor: "pointer", accentColor: "#0875dc" }} />
                    </td>
                    <td style={{ padding: "7px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }} title={order.client}>
                      <span style={{ fontWeight: 700, color: "#1a3655", fontSize: ".6rem" }}>{order.client}</span>
                    </td>
                    <td style={{ padding: "7px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0, fontSize: ".58rem", color: "#425c76" }} title={order.service}>{order.service}</td>
                    <td style={{ padding: "7px 8px" }}><Agency type={order.agencyType} name={order.agency} /></td>
                    <td style={{ padding: "7px 8px" }}><span className={`ops-status ${statusTone[order.status]}`} style={{ fontSize: ".5rem" }}>{order.status}</span></td>
                    <td style={{ padding: "7px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0, fontSize: ".56rem", color: "#536a82" }} title={order.assignee}>{order.assignee}</td>
                    <td style={{ padding: "7px 8px", fontSize: ".52rem", color: "#7c8b9b", direction: "ltr", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }} title={order.updatedAt}>{order.updatedAt}</td>
                  </tr>
                ))}
                {!filteredOrders.length ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "50px 0", color: "#8b9dad" }}>
                      <FileText size={28} style={{ display: "block", margin: "0 auto 10px", opacity: 0.2 }} />
                      <span style={{ fontSize: ".72rem", fontWeight: 600 }}>لا توجد طلبات مطابقة.</span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderTop: "1px solid #eef2f7", fontSize: ".55rem", color: "#6b829b" }}>
            <span>عرض {filteredOrders.length} من {orders.length} طلب</span>
            {!selected ? <span style={{ marginRight: "auto", fontSize: ".52rem", color: "#0875dc", display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={10} /> اختر طلباً لعرض التفاصيل
            </span> : null}
          </div>
        </div>
      </section>

      {/* Summary Panel (only when an order is selected) */}
      {selected ? <aside className="ops-summary">
        <div className="ops-summary-head">
          <h2 style={{ fontSize: ".85rem", display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={16} style={{ color: "#0875dc" }} /> ملخص الطلب
          </h2>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {selected?.databaseId && !selected?.archivedAt && <button onClick={()=>archiveOrder(selected.databaseId!, true)} style={{padding:"4px 10px",border:"1px solid #e5eaf0",background:"#f5f8fc",color:"#526983",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>أرشفة</button>}
            {selected?.databaseId && selected?.archivedAt && <button onClick={()=>archiveOrder(selected.databaseId!, false)} style={{padding:"4px 10px",border:"1px solid #bfdbfe",background:"#eff6ff",color:"#1d4ed8",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>استعادة</button>}
            {selected?.databaseId && <button onClick={()=>setConfirmDeleteOrder(selected.databaseId!)} style={{padding:"4px 10px",border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>حذف</button>}
            <button onClick={() => setSelectedId(undefined)} aria-label="إغلاق" style={{ border: 0, background: "#f1f4f7", color: "#536b84", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "grid", placeItems: "center", fontSize: ".9rem" }}><X size={16} /></button>
          </div>
        </div>

        {/* Order Info */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #e7edf3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: ".6rem", color: "#7c8b9b", fontWeight: 600 }}>رقم الطلب</span>
            <span style={{ fontSize: ".72rem", fontWeight: 800, color: "#073766", fontFamily: "monospace", direction: "ltr" }}>{selected.id}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
            {[
              { label: "العميل", value: selected.client, icon: <User size={13} /> },
              { label: "الخدمة", value: selected.service, icon: <Layers size={13} /> },
              { label: "الجهة", value: <Agency type={selected.agencyType} name={selected.agency} /> },
              { label: "المسؤول", value: selected.assignee, icon: <User size={13} /> },
              { label: "آخر تحديث", value: selected.updatedAt, icon: <Clock size={13} /> },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: ".55rem", color: "#8b9dad", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  {item.icon}{item.label}
                </span>
                <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#1a3655" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Timeline */}
        {(() => {
          const stages: Array<{ label: string; color: string }> = [
            { label: "جديد", color: "#9ca3af" },
            { label: "قيد التنفيذ", color: "#0875dc" },
            { label: "بانتظار المستندات", color: "#f59e0b" },
            { label: "مكتمل", color: "#16a34a" },
          ];
          const idxMap: Record<string, number> = { "جديد": 0, "قيد التنفيذ": 1, "بانتظار المستندات": 2, "مكتمل": 3 };
          const cur = idxMap[selected.status] ?? -1;
          return (
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e7edf3", direction: "rtl" }}>
              <span style={{ fontSize: ".6rem", color: "#6b829b", fontWeight: 700, display: "block", marginBottom: 10 }}>مسار الطلب</span>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                {stages.flatMap((s, i) => {
                  const isActive = i === cur;
                  const isPast = i < cur;
                  const clr = (isActive || isPast) ? s.color : "#e2e8f0";
                  const items = [
                    <div key={`d${i}`} style={{ width: isActive ? 13 : 9, height: isActive ? 13 : 9, borderRadius: "50%", flexShrink: 0, background: clr, boxShadow: isActive ? `0 0 0 3px ${s.color}33` : "none", transition: "all .2s" }} />,
                  ];
                  if (i < stages.length - 1) items.push(<div key={`l${i}`} style={{ flex: 1, height: 2, background: i < cur ? stages[i + 1].color : "#e2e8f0", margin: "0 3px", transition: "background .3s" }} />);
                  return items;
                })}
              </div>
              <div style={{ display: "flex" }}>
                {stages.map((s, i) => {
                  const isActive = i === cur;
                  const isPast = i < cur;
                  return <span key={i} style={{ flex: 1, fontSize: ".47rem", fontWeight: isActive ? 800 : 500, color: isActive ? s.color : isPast ? "#6b829b" : "#c0ccd8", textAlign: "center", lineHeight: 1.3 }}>{s.label}</span>;
                })}
              </div>
            </div>
          );
        })()}

        {/* Status Change */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e7edf3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#425c76", display: "flex", alignItems: "center", gap: 6 }}>
            <Flag size={14} style={{ color: "#0875dc" }} /> تغيير الحالة
          </span>
          <select className={`ops-status-select ${statusTone[selected.status]}`} value={selected.status} onChange={(event) => updateStatus(event.target.value as OrderStatus)} style={{ fontSize: ".65rem", padding: "6px 14px" }}>
            {allowedOrderStatuses(selected.status).map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>

        {/* Documents */}
        <section className="ops-documents">
          <header>
            <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem" }}><FileText size={14} style={{ color: "#0875dc" }} /> المستندات</h3>
            <span style={{ fontSize: ".6rem", color: "#6b829b" }}>{databaseMode ? (remoteDocs[selected.id]?.length ?? 0) : ((uploadedDocs[selected.id]?.length ?? 0) + 2)} مستندات</span>
          </header>
          <div>
            {databaseMode ? (
              <>{(remoteDocs[selected.id] ?? []).map((document, index) => (
                <p key={`${document.name}-${index}`}>
                  <Check size={12} style={{ color: "#0a705f", flexShrink: 0 }} />
                  <span>
                    {document.download_url ? <a href={document.download_url} target="_blank" rel="noreferrer">{document.name} <ExternalLink size={10} /></a> : document.name}
                    <small>{document.status === "approved" ? "تمت المراجعة" : "تم الاستلام"}</small>
                  </span>
                </p>
              ))}{!(remoteDocs[selected.id]?.length) ? <p><span style={{ color: "#8b9dad" }}>لا توجد مستندات بعد<small>ابدأ برفع المستند المطلوب</small></span></p> : null}</>
            ) : (
              <><p><Check size={12} style={{ color: "#0a705f", flexShrink: 0 }} /><span>السجل التجاري<small>تمت المراجعة</small></span></p><p><Check size={12} style={{ color: "#0a705f", flexShrink: 0 }} /><span>هوية المالك أو الشركاء<small>تمت المراجعة</small></span></p>
                {uploadedDocs[selected.id]?.includes("supporting") ? <p><Check size={12} style={{ color: "#0a705f", flexShrink: 0 }} /><span>المستند الداعم<small>تم الاستلام الآن</small></span></p> : null}</>
            )}
            <label style={{ border: "1px dashed #d0dae5", borderRadius: 8, padding: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: ".68rem", color: "#536a82", fontWeight: 600, marginTop: 6 }}>
              <Upload size={14} style={{ color: "#0875dc" }} /> رفع مستند
              <small style={{ fontWeight: 400, color: "#8b9dad" }}>PDF أو صورة</small>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSupportingDocument(file); event.target.value = ""; }} style={{ display: "none" }} />
            </label>
          </div>
        </section>

        {/* Status Reason */}
        {(selected.status === "ملغي" || selected.status === "معلق") && selected.statusReason ? (
          <section style={{ background: selected.status === "ملغي" ? "#fef2f2" : "#fffbeb", borderRadius: 8, padding: "10px 12px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".7rem", margin: 0 }}>
              {selected.status === "ملغي" ? <X size={13} style={{ color: "#dc2626" }} /> : <AlertCircle size={13} style={{ color: "#e67e22" }} />}
              <span style={{ color: selected.status === "ملغي" ? "#dc2626" : "#e67e22", fontWeight: 700 }}>
                سبب {selected.status === "ملغي" ? "الإلغاء" : "التعليق"}
              </span>
            </h3>
            <p style={{ fontSize: ".68rem", color: "#2a4a6a", margin: "6px 0 0", lineHeight: 1.5 }}>{selected.statusReason}</p>
          </section>
        ) : null}

        {/* Next Action */}
        <section className="ops-next">
          <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem" }}>
            <AlertCircle size={14} style={{ color: "#e67e22" }} /> الإجراء التالي
          </h3>
          <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#1a3655", margin: "4px 0 2px" }}>{selected.nextAction}</p>
          <small style={{ fontSize: ".6rem", color: "#8b9dad" }}>موعد الإجراء: {selected.nextActionAt}</small>
        </section>

        {/* Contact */}
        <section className="ops-contact">
          <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem" }}>
            <Phone size={14} style={{ color: "#0875dc" }} /> تواصل مع العميل
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={`tel:+${selected.phone}`} style={{ flex: 1, height: 50, border: "1px solid #e0e7ef", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#0875dc", fontSize: ".75rem", gap: 2 }}>
              <Phone size={16} /><small style={{ fontSize: ".55rem" }}>اتصال</small>
            </a>
            <a href={`https://wa.me/${selected.phone}`} target="_blank" rel="noreferrer" style={{ flex: 1, height: 50, border: "1px solid #e0e7ef", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#25D366", fontSize: ".75rem", gap: 2 }}>
              <MessageSquare size={16} /><small style={{ fontSize: ".55rem" }}>واتساب</small>
            </a>
            <a href={`mailto:${selected.email}`} style={{ flex: 1, height: 50, border: "1px solid #e0e7ef", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#0875dc", fontSize: ".75rem", gap: 2 }}>
              <Mail size={16} /><small style={{ fontSize: ".55rem" }}>بريد</small>
            </a>
          </div>
        </section>

        {/* Related Tickets */}
        {relatedTickets.length > 0 && (
          <section style={{ padding: "14px 18px", borderBottom: "1px solid #e7edf3" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem", margin: "0 0 10px" }}>
              <MessageSquare size={14} style={{ color: "#7c3aed" }} /> التذاكر المرتبطة
              <span style={{ marginRight: "auto", fontSize: ".56rem", color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "1px 8px", fontWeight: 800 }}>{relatedTickets.length}</span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {relatedTickets.map(t => {
                const sColor: Record<string,string> = { "جديدة": "#0875dc", "قيد المراجعة": "#b45309", "بانتظار العميل": "#7c3aed", "تم الحل": "#15803d", "مغلقة": "#6b7280" };
                const sBg:    Record<string,string> = { "جديدة": "#eaf4ff", "قيد المراجعة": "#fef9ee", "بانتظار العميل": "#f5f3ff", "تم الحل": "#f0fdf4", "مغلقة": "#f3f4f6" };
                return (
                  <a key={t.id} href="/admin/tickets"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e5eaf0", borderRadius: 8, textDecoration: "none", transition: "border-color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#e5eaf0"}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#1e3a56", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                      <div style={{ fontSize: ".54rem", color: "#8b9dad", marginTop: 1 }}>{t.category}</div>
                    </div>
                    <span style={{ fontSize: ".54rem", fontWeight: 700, padding: "2px 7px", borderRadius: 12, background: sBg[t.status] ?? "#f3f4f6", color: sColor[t.status] ?? "#6b7280", whiteSpace: "nowrap" }}>{t.status}</span>
                  </a>
                );
              })}
            </div>
            <a href="/admin/tickets" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: ".62rem", color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>
              عرض كل التذاكر <ChevronLeft size={12} />
            </a>
          </section>
        )}

        {/* Timeline */}
        <section className="ops-timeline">
          <h3 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem", marginBottom: 12 }}>
            <RefreshCw size={14} style={{ color: "#6b829b" }} /> الخط الزمني
          </h3>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0a705f", marginTop: 4, flexShrink: 0 }}></div>
            <p style={{ margin: 0, fontSize: ".68rem", color: "#1a3655", fontWeight: 600, lineHeight: 1.5 }}>
              آخر تحديث للطلب
              <small style={{ display: "block", fontSize: ".6rem", color: "#8b9dad", fontWeight: 400 }}>{selected.assignee} · {selected.updatedAt}</small>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d0dae5", marginTop: 4, flexShrink: 0 }}></div>
            <p style={{ margin: 0, fontSize: ".68rem", color: "#536a82", lineHeight: 1.5 }}>
              تم إنشاء الطلب
              <small style={{ display: "block", fontSize: ".6rem", color: "#8b9dad" }}>فريق أتمم</small>
            </p>
          </div>
          <a href="/admin/followups" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: ".65rem", color: "#0875dc", fontWeight: 600, textDecoration: "none" }}>
            عرض المتابعات المرتبطة <ChevronLeft size={13} />
          </a>
        </section>
      </aside> : null}
    </div>

    {showCreate ? (
      <div style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(4,31,60,.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }} role="presentation" onMouseDown={() => !formSubmitted && setShowCreate(false)}>
        <section style={{
          width: "min(760px, 100%)", maxHeight: "calc(100vh - 40px)",
          background: "#fff", borderRadius: 14, boxShadow: "0 25px 70px rgba(0,25,55,.3)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }} role="dialog" aria-modal="true" aria-labelledby="create-order-title" onMouseDown={(event) => event.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid #e6ecf2", flexShrink: 0 }}>
            <div>
              <h2 id="create-order-title" style={{ fontSize: "1.1rem", margin: "0 0 4px", color: "#073766" }}>إنشاء طلب جديد</h2>
              <p style={{ fontSize: ".7rem", color: "#7c8b9b", margin: 0 }}>{databaseMode ? "أدخل بيانات الطلب من السجلات المعتمدة." : "أدخل البيانات الأساسية للطلب."}</p>
            </div>
            <button onClick={() => setShowCreate(false)} disabled={formSubmitted} style={{ border: 0, background: "#f1f4f7", color: "#536b84", borderRadius: "50%", width: 32, height: 32, fontSize: "1.1rem", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}><X size={20} /></button>
          </div>
          <form onSubmit={createOrder} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
              {databaseMode ? <CreateOrderForm catalog={catalog} /> : <CreateOrderSimple />}
            </div>
            <div style={{
              padding: "14px 24px", borderTop: "1px solid #eef2f7", background: "#fff",
              display: "flex", justifyContent: "flex-start", gap: 12, flexShrink: 0,
            }}>
              <button type="submit" disabled={formSubmitted} style={{
                height: 44, borderRadius: 10, padding: "0 28px", fontSize: ".78rem", fontWeight: 800,
                border: 0, background: "#0875dc", color: "#fff", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 2px 8px rgba(8,117,220,.3)", opacity: formSubmitted ? 0.6 : 1,
              }}>
                {formSubmitted ? <><span className="btn-spinner" /> جاري الإنشاء...</> : <><Plus size={18} /> إنشاء الطلب</>}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} disabled={formSubmitted} style={{
                height: 44, borderRadius: 10, padding: "0 28px", fontSize: ".78rem", fontWeight: 700,
                border: "1.5px solid #dfe7ef", background: "#fff", color: "#5e7489",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                opacity: formSubmitted ? 0.5 : 1,
              }}>إلغاء</button>
            </div>
          </form>
        </section>
      </div>
    ) : null}

    {showReasonDialog && pendingTargetStatus ? (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(4,31,60,.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }} role="presentation" onMouseDown={() => setShowReasonDialog(false)}>
        <section style={{
          width: "min(440px, 100%)", background: "#fff", borderRadius: 14,
          boxShadow: "0 25px 70px rgba(0,25,55,.3)", padding: "24px 28px",
        }} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={22} style={{ color: status === "ملغي" ? "#dc2626" : "#e67e22" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: ".85rem", color: "#073766" }}>
                {pendingTargetStatus === "ملغي" ? "إلغاء الطلب" : "تعليق الطلب"}
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: ".65rem", color: "#7c8b9b" }}>
                الرجاء إدخال سبب {pendingTargetStatus === "ملغي" ? "الإلغاء" : "التعليق"}
              </p>
            </div>
          </div>
          <textarea
            ref={reasonRef}
            dir="rtl"
            placeholder="اكتب سبب التغيير هنا..."
            style={{
              width: "100%", height: 100, resize: "vertical", padding: 12,
              border: "1.5px solid #dfe7ef", borderRadius: 10, font: "inherit",
              fontSize: ".72rem", color: "#2a4a6a", outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#0875dc"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#dfe7ef"; }}
          />
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, marginTop: 16 }}>
            <button onClick={() => { const reason = reasonRef.current?.value.trim(); if (!reason) { setNotice("السبب مطلوب لهذه الحالة"); return; } setShowReasonDialog(false); void confirmStatusChange(pendingTargetStatus, reason); }} style={{
              height: 40, borderRadius: 10, padding: "0 22px", fontSize: ".72rem", fontWeight: 800,
              border: 0, background: pendingTargetStatus === "ملغي" ? "#dc2626" : "#e67e22",
              color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              boxShadow: pendingTargetStatus === "ملغي" ? "0 2px 8px rgba(220,38,38,.3)" : "0 2px 8px rgba(230,126,34,.3)",
            }}>
              {pendingTargetStatus === "ملغي" ? <X size={16} /> : <AlertCircle size={16} />}
              تأكيد {pendingTargetStatus === "ملغي" ? "الإلغاء" : "التعليق"}
            </button>
            <button onClick={() => setShowReasonDialog(false)} style={{
              height: 40, borderRadius: 10, padding: "0 22px", fontSize: ".72rem", fontWeight: 700,
              border: "1.5px solid #dfe7ef", background: "#fff", color: "#5e7489",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}>رجوع</button>
          </div>
        </section>
      </div>
    ) : null}

    {notice ? <div className="ops-toast" role="status"><CheckCircle size={14} /> {notice}</div> : null}

    {confirmDeleteOrder&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:9999,display:"grid",placeItems:"center"}} onClick={()=>setConfirmDeleteOrder(null)}>
        <div style={{background:"#fff",borderRadius:14,padding:"24px 28px",width:340,boxShadow:"0 8px 32px rgba(0,0,0,.18)"}} onClick={e=>e.stopPropagation()}>
          <h3 style={{margin:"0 0 8px",color:"#dc2626",fontSize:16}}>حذف الطلب نهائياً</h3>
          <p style={{margin:"0 0 20px",fontSize:13,color:"#526983"}}>سيتم حذف الطلب بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setConfirmDeleteOrder(null)} style={{padding:"8px 16px",border:"1px solid #e5eaf0",background:"#f5f8fc",color:"#526983",borderRadius:8,cursor:"pointer",fontWeight:600}}>إلغاء</button>
            <button onClick={()=>deleteOrder(confirmDeleteOrder)} style={{padding:"8px 16px",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>حذف نهائي</button>
          </div>
        </div>
      </div>
    )}
  </>;
}

/* ── Full Create Order Form (Database Mode) ── */
function CreateOrderForm({ catalog }: { catalog: Catalog }) {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clientTickets, setClientTickets] = useState<RelatedTicket[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedClientId) { setClientTickets([]); return; }
    fetch("/api/admin/tickets")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const all = (data?.data ?? []) as RelatedTicket[];
        setClientTickets(all.filter(t => t.client_id === selectedClientId && !["تم الحل","مغلقة"].includes(t.status)));
      })
      .catch(() => {});
  }, [selectedClientId]);

  const selectedService = catalog.services.find((s) => s.id === selectedServiceId);
  const selectedClient = catalog.clients.find((c) => c.id === selectedClientId);

  const filteredClients = catalog.clients.filter((c) =>
    (c.name || "").toLowerCase().includes(clientSearch.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fStyle: Record<string, React.CSSProperties> = {
    label: { display: "block", marginBottom: 14 },
    labelText: { display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 },
    field: { width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".7rem", color: "#2a4a6a", background: "#fff", boxSizing: "border-box", outline: "none", transition: "border-color .2s, box-shadow .2s" },
    textarea: { width: "100%", minHeight: 80, border: "1px solid #dfe7ef", borderRadius: 10, padding: "10px 14px", font: "inherit", fontSize: ".7rem", color: "#2a4a6a", background: "#fff", boxSizing: "border-box", outline: "none", resize: "vertical" as const, transition: "border-color .2s, box-shadow .2s" },
    select: { width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".7rem", color: "#2a4a6a", background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='6'%3E%3Cpath d='M0 0l5.5 6 5.5-6z' fill='%23536a82'/%3E%3C/svg%3E\") no-repeat left 14px center", cursor: "pointer", boxSizing: "border-box", outline: "none", appearance: "none" as const },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  };
  const chipStyle = (color: string, bg: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: ".65rem", fontWeight: 700, cursor: "pointer", border: `2px solid ${color}`, background: bg, color, transition: "all .15s" });

  function onFieldFocus(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.borderColor = "#0875dc";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(8,117,220,.1)";
  }
  function onFieldBlur(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.borderColor = "#dfe7ef";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div className="ops-form-grid" style={{ padding: "4px 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Client Selection (Dropdown) */}
      <label style={fStyle.label}>
        <span style={fStyle.labelText}><Building2 size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> العميل <span style={{ color: "#dc2626" }}>*</span></span>
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <input
            name="clientDisplay"
            required
            placeholder="ابحث عن عميل..."
            value={selectedClient ? selectedClient.name : clientSearch}
            onChange={(e) => { setClientSearch(e.target.value); setSelectedClientId(""); setDropdownOpen(true); }}
            onFocus={(e) => { setDropdownOpen(true); onFieldFocus(e); }}
            onBlur={onFieldBlur}
            style={fStyle.field}
          />
          <input type="hidden" name="clientId" value={selectedClientId} />
          {dropdownOpen && filteredClients.length > 0 && !selectedClientId && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0,
              background: "#fff", border: "1px solid #e5ecf3", borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 100, maxHeight: 220, overflow: "auto",
            }}>
              {filteredClients.map((c) => (
                <div key={c.id} onClick={() => { setSelectedClientId(c.id); setClientSearch(c.name || ""); setDropdownOpen(false); }}
                  style={{ padding: "10px 14px", cursor: "pointer", fontSize: ".68rem", color: "#2a4a6a", borderBottom: "1px solid #f0f4f8", transition: "background .15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f5f9ff"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <strong style={{ display: "block", fontSize: ".7rem" }}>{c.name}</strong>
                  <small style={{ color: "#8b9dad" }}>{c.phone || c.email || ""}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </label>

      {/* Service + Agency */}
      <div style={fStyle.row}>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}><Layers size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> الخدمة <span style={{ color: "#dc2626" }}>*</span></span>
          <select
            name="serviceId"
            required
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            style={fStyle.select}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          >
            <option value="">اختر الخدمة</option>
            {catalog.services.map((item) => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>

        <label style={fStyle.label}>
          <span style={fStyle.labelText}><Building2 size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> الجهة</span>
          <select
            name="agencyId"
            value={selectedService?.agency_id || ""}
            onChange={() => {}}
            style={{ ...fStyle.select, color: selectedService?.agency_id ? "#2a4a6a" : "#8b9dad" }}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          >
            {selectedService?.agency_id ? (
              <option value={selectedService.agency_id}>
                {catalog.agencies.find((a) => a.id === selectedService.agency_id)?.name || "تلقائي"}
              </option>
            ) : (
              <option value="">تحدد تلقائياً من الخدمة</option>
            )}
            {catalog.agencies.map((a) => (
              <option value={a.id} key={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Priority + Assignee */}
      <div style={fStyle.row}>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}><Flag size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> الأولوية</span>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {(["normal", "high", "urgent"] as const).map((p) => (
              <label key={p} style={{ ...chipStyle(priorityColors[p], "#fff"), cursor: "pointer", userSelect: "none" } as React.CSSProperties}>
                <input type="radio" name="priority" value={p} defaultChecked={p === "normal"} style={{ display: "none" }}
                  onChange={(e) => {
                    const parent = e.currentTarget.closest("label");
                    if (parent) parent.style.background = priorityColors[p] + "18";
                  }}
                />
                {priorityLabels[p]}
              </label>
            ))}
          </div>
        </label>

        <label style={fStyle.label}>
          <span style={fStyle.labelText}><User size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> المسؤول</span>
          <select name="assigneeId" style={fStyle.select} onFocus={onFieldFocus} onBlur={onFieldBlur}>
            <option value="">غير مسند</option>
            {catalog.profiles.map((item) => (
              <option value={item.id} key={item.id}>{item.full_name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Due Date + Next Action Date */}
      <div style={fStyle.row}>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}><Calendar size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> تاريخ التسليم المتوقع</span>
          <input type="date" name="dueAt" style={fStyle.field} onFocus={onFieldFocus} onBlur={onFieldBlur} />
        </label>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}><Clock size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> موعد الإجراء التالي</span>
          <input type="datetime-local" name="nextActionAt" style={fStyle.field} onFocus={onFieldFocus} onBlur={onFieldBlur} />
        </label>
      </div>

      {/* Next Action Text */}
      <label style={fStyle.label}>
        <span style={fStyle.labelText}><MessageSquare size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> الإجراء التالي</span>
        <input name="nextActionText" placeholder="مثال: التواصل مع العميل لتأكيد البيانات" style={fStyle.field} onFocus={onFieldFocus} onBlur={onFieldBlur} />
      </label>

      {/* Notes */}
      <label style={fStyle.label}>
        <span style={fStyle.labelText}><FileText size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> ملاحظات</span>
        <textarea name="notes" placeholder="ملاحظات إضافية عن الطلب..." style={fStyle.textarea} onFocus={onFieldFocus} onBlur={onFieldBlur} />
      </label>

      {/* Linked Ticket (optional) — shown only when the selected client has open tickets */}
      {clientTickets.length > 0 && (
        <label style={fStyle.label}>
          <span style={fStyle.labelText}><MessageSquare size={13} style={{ verticalAlign: "middle", marginLeft: 4 }} /> التذكرة المرتبطة <span style={{ color: "#8b9dad", fontWeight: 400 }}>(اختياري)</span></span>
          <select name="relatedTicketId" style={fStyle.select} onFocus={onFieldFocus} onBlur={onFieldBlur}>
            <option value="">— لا يوجد ربط بتذكرة —</option>
            {clientTickets.map(t => (
              <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

/* ── Simple Create Order Form (Non-Database Mode) ── */
function CreateOrderSimple() {
  const fStyle: Record<string, React.CSSProperties> = {
    label: { display: "block", marginBottom: 14 },
    labelText: { display: "block", fontSize: ".65rem", fontWeight: 700, color: "#425c76", marginBottom: 6 },
    field: { width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".7rem", color: "#2a4a6a", background: "#fff", boxSizing: "border-box", outline: "none", transition: "border-color .2s, box-shadow .2s" },
    select: { width: "100%", height: 42, border: "1px solid #dfe7ef", borderRadius: 10, padding: "0 14px", font: "inherit", fontSize: ".7rem", color: "#2a4a6a", background: "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='6'%3E%3Cpath d='M0 0l5.5 6 5.5-6z' fill='%23536a82'/%3E%3C/svg%3E\") no-repeat left 14px center", cursor: "pointer", boxSizing: "border-box", outline: "none", appearance: "none" as const },
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  };

  function onFieldFocus(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.borderColor = "#0875dc";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(8,117,220,.1)";
  }
  function onFieldBlur(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.style.borderColor = "#dfe7ef";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div className="ops-form-grid" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={fStyle.row}>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}>اسم العميل <span style={{ color: "#dc2626" }}>*</span></span>
          <input name="client" required placeholder="مثال: شركة أتمم الأعمال" style={fStyle.field} onFocus={onFieldFocus} onBlur={onFieldBlur} />
        </label>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}>الخدمة <span style={{ color: "#dc2626" }}>*</span></span>
          <select name="service" required style={fStyle.select} onFocus={onFieldFocus} onBlur={onFieldBlur}>
            <option>تأسيس شركة ذات مسؤولية محدودة</option>
            <option>إصدار سجل تجاري</option>
            <option>تعديل عقد شركة</option>
            <option>تسجيل علامة تجارية</option>
            <option>ضريبة القيمة المضافة</option>
          </select>
        </label>
      </div>
      <div style={fStyle.row}>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}>رقم الجوال <span style={{ color: "#dc2626" }}>*</span></span>
          <input name="phone" inputMode="tel" required placeholder="9665xxxxxxxx" style={fStyle.field} onFocus={onFieldFocus} onBlur={onFieldBlur} />
        </label>
        <label style={fStyle.label}>
          <span style={fStyle.labelText}>البريد الإلكتروني <span style={{ color: "#dc2626" }}>*</span></span>
          <input name="email" type="email" required placeholder="name@company.com" style={fStyle.field} onFocus={onFieldFocus} onBlur={onFieldBlur} />
        </label>
      </div>
      <label style={fStyle.label}>
        <span style={fStyle.labelText}>المسؤول</span>
        <select name="assignee" style={fStyle.select} onFocus={onFieldFocus} onBlur={onFieldBlur}>
          <option>مدير النظام</option>
          <option>مدير عمليات</option>
          <option>موظف عمليات</option>
        </select>
      </label>
    </div>
  );
}
