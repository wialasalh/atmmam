"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminOrder, initialAdminOrders, OrderStatus, readAdminOrders, statusTone, writeAdminOrders } from "@/lib/admin-orders";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import { allowedOrderStatuses, canChangeOrderStatus, filterAdminOrders } from "@/lib/domain/orders";

const statusTabs: Array<OrderStatus | "الكل"> = ["الكل", "جديد", "بانتظار المستندات", "قيد التنفيذ", "مكتمل"];
const assignees = ["مدير النظام", "مدير النظام", "مدير النظام"];
type CatalogItem = { id: string; name?: string; full_name?: string; phone?: string; email?: string; agency_id?: string };
type Catalog = { clients: CatalogItem[]; services: CatalogItem[]; agencies: CatalogItem[]; profiles: CatalogItem[] };
type DatabaseOrder = { id:string; reference_no:string; status:string; next_action_text?:string; next_action_at?:string; updated_at:string; clients?:CatalogItem|null; services?:CatalogItem|null; agencies?:CatalogItem|null; profiles?:CatalogItem|null };
const statusFromDatabase: Record<string, OrderStatus> = { new:"جديد", waiting_documents:"بانتظار المستندات", in_progress:"قيد التنفيذ", completed:"مكتمل" };
const statusToDatabase: Record<OrderStatus, string> = { "جديد":"new", "بانتظار المستندات":"waiting_documents", "قيد التنفيذ":"in_progress", "مكتمل":"completed" };

function Agency({ type, name }: { type: AdminOrder["agencyType"]; name: string }) {
  const src = type === "commerce" ? "/assets/agencies/ministry-commerce.svg" : type === "zatca" ? "/assets/agencies/zatca-official.svg" : null;
  return <span className="ops-agency">{src ? <img src={src} alt="" /> : <i>ح</i>}<span>{name}</span></span>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState(initialAdminOrders);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "الكل">("الكل");
  const [selectedId, setSelectedId] = useState(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});
  const [remoteDocs, setRemoteDocs] = useState<Record<string, Array<{name:string;status:string;download_url?:string|null}>>>({});
  const [databaseMode, setDatabaseMode] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ clients:[], services:[], agencies:[], profiles:[] });

  async function loadDatabase() {
    const [ordersResponse, catalogResponse] = await Promise.all([fetch("/api/admin/orders"), fetch("/api/admin/catalog")]);
    if (!ordersResponse.ok || !catalogResponse.ok) return false;
    const ordersPayload = await ordersResponse.json() as { data: DatabaseOrder[] }; const catalogPayload = await catalogResponse.json() as { data: Catalog };
    const mapped = ordersPayload.data.map((order):AdminOrder => ({ databaseId:order.id, clientId:order.clients?.id, serviceId:order.services?.id, agencyId:order.agencies?.id, assigneeId:order.profiles?.id, id:order.reference_no, client:order.clients?.name??"عميل غير معروف", service:order.services?.name??"خدمة غير معروفة", agency:order.agencies?.name??"غير محددة", agencyType:order.agencies?.name?.includes("الزكاة")?"zatca":order.agencies?.name?.includes("التجارة")?"commerce":"ip", status:statusFromDatabase[order.status]??"جديد", assignee:order.profiles?.full_name??"غير مسند", updatedAt:new Date(order.updated_at).toLocaleString("ar-SA"), phone:order.clients?.phone??"", email:order.clients?.email??"", nextAction:order.next_action_text??"تحديد الإجراء التالي", nextActionAt:order.next_action_at?new Date(order.next_action_at).toLocaleString("ar-SA"):"غير محدد" }));
    setCatalog(catalogPayload.data); setOrders(mapped); setDatabaseMode(true); if(mapped[0]) setSelectedId(mapped[0].id); return true;
  }

  useEffect(() => { const client = new URLSearchParams(window.location.search).get("client"); if (client) setQuery(client); if (process.env.NEXT_PUBLIC_SUPABASE_URL) void loadDatabase(); else setOrders(readAdminOrders()); }, []);

  const filteredOrders = useMemo(() => filterAdminOrders(orders, query, statusFilter), [orders, query, statusFilter]);

  const selected = orders.find((order) => order.id === selectedId) ?? orders[0];
  useEffect(()=>{if(!databaseMode||!selected?.databaseId)return;void fetch(`/api/admin/orders/${selected.databaseId}/documents`).then(async(response)=>{if(response.ok){const payload=await response.json() as {data:Array<{name:string;status:string;download_url?:string|null}>};setRemoteDocs((current)=>({...current,[selected.id]:payload.data}))}})},[databaseMode,selected?.databaseId,selected?.id]);
  const counts = useMemo(() => ({
    "الكل": orders.length,
    "جديد": orders.filter((item) => item.status === "جديد").length,
    "بانتظار المستندات": orders.filter((item) => item.status === "بانتظار المستندات").length,
    "قيد التنفيذ": orders.filter((item) => item.status === "قيد التنفيذ").length,
    "مكتمل": orders.filter((item) => item.status === "مكتمل").length,
  }), [orders]);

  function persist(nextOrders: AdminOrder[], message: string) {
    setOrders(nextOrders);
    writeAdminOrders(nextOrders);
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function updateStatus(status: OrderStatus) {
    if (!selected) return;
    if (!canChangeOrderStatus(selected.status, status)) { setNotice("لا يمكن تنفيذ هذا الانتقال في مسار الطلب"); return; }
    if (databaseMode && selected.databaseId) { const response = await fetch(`/api/admin/orders/${selected.databaseId}/status`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status:statusToDatabase[status]}) }); if(!response.ok){setNotice("تعذر تحديث الحالة");return} await loadDatabase(); setNotice("تم تحديث الحالة وتسجيلها"); return; }
    persist(orders.map((order) => order.id === selected.id ? { ...order, status, updatedAt: "الآن" } : order), `تم تحديث حالة ${selected.id}`);
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if(databaseMode){const service=catalog.services.find((item)=>item.id===form.get("serviceId"));const response=await fetch("/api/admin/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({clientId:form.get("clientId"),serviceId:form.get("serviceId"),agencyId:service?.agency_id||undefined,assigneeId:form.get("assigneeId")||undefined,priority:"normal",nextActionText:"مراجعة بيانات الطلب والتواصل مع العميل"})});if(!response.ok){setNotice("تعذر إنشاء الطلب");return}await loadDatabase();setShowCreate(false);setNotice("تم إنشاء الطلب وتسجيله");return}
    const service = String(form.get("service") ?? "");
    const isTax = service.includes("ضريبة");
    const next: AdminOrder = {
      id: `REQ-${new Date().getFullYear()}-${String(orders.length + 43).padStart(4, "0")}`,
      client: String(form.get("client") ?? ""), service,
      agency: isTax ? "هيئة الزكاة والضريبة والجمارك" : "وزارة التجارة",
      agencyType: isTax ? "zatca" : "commerce", status: "جديد",
      assignee: String(form.get("assignee") ?? assignees[0]), updatedAt: "الآن",
      phone: String(form.get("phone") ?? ""), email: String(form.get("email") ?? ""),
      nextAction: "مراجعة بيانات الطلب والتواصل مع العميل", nextActionAt: "اليوم",
    };
    const nextOrders = [next, ...orders];
    persist(nextOrders, `تم إنشاء الطلب ${next.id}`);
    setSelectedId(next.id); setStatusFilter("الكل"); setShowCreate(false);
  }

  async function uploadSupportingDocument(file:File){if(!selected)return;if(databaseMode&&selected.databaseId){const form=new FormData();form.set("name","المستند الداعم");form.set("file",file);const response=await fetch(`/api/admin/orders/${selected.databaseId}/documents`,{method:"POST",body:form});if(!response.ok){setNotice("تعذر رفع المستند؛ تحقق من النوع والحجم والصلاحية");return}const documentsResponse=await fetch(`/api/admin/orders/${selected.databaseId}/documents`);if(documentsResponse.ok){const payload=await documentsResponse.json() as {data:Array<{name:string;status:string;download_url?:string|null}>};setRemoteDocs((current)=>({...current,[selected.id]:payload.data}))}setNotice("تم رفع المستند وتسجيله");return}setUploadedDocs((current)=>({...current,[selected.id]:[...(current[selected.id]??[]),"supporting"]}));setNotice("تمت إضافة المستند إلى الطلب")}

  return <main className="ops-shell" dir="rtl">
    <AdminOpsHeader active="orders" />

    <div className="ops-layout">
      <section className="ops-main">
        <h1>إدارة الطلبات</h1>
        <div className="ops-toolbar"><button className="ops-new" onClick={() => setShowCreate(true)}>＋ طلب جديد</button><label><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالعميل، الخدمة، أو الجهة" /><span>⌕</span></label></div>
        <div className="ops-stats"><article><span>▢</span><div><strong>{orders.length}</strong><small>إجمالي الطلبات</small></div></article><article><span>▧</span><div><strong className="orange">{counts["بانتظار المستندات"]}</strong><small>بانتظار المستندات</small></div></article><article><span>⌁</span><div><strong className="teal">{counts["قيد التنفيذ"]}</strong><small>قيد التنفيذ</small></div></article></div>
        <div className="ops-tabs">{statusTabs.map((label) => <button className={statusFilter === label ? "active" : ""} onClick={() => setStatusFilter(label)} key={label}>{label} <b>{counts[label]}</b></button>)}</div>
        <div className="ops-table-card"><div className="ops-table-scroll"><table><thead><tr><th>العميل</th><th>الخدمة</th><th>الجهة</th><th>الحالة</th><th>المسؤول</th><th>آخر تحديث</th><th></th></tr></thead><tbody>
          {filteredOrders.map((order) => <tr className={selectedId === order.id ? "selected" : ""} onClick={() => setSelectedId(order.id)} key={order.id}><td><span className="ops-radio"></span>{order.client}</td><td>{order.service}</td><td><Agency type={order.agencyType} name={order.agency} /></td><td><span className={`ops-status ${statusTone[order.status]}`}>{order.status}</span></td><td><span className="ops-owner"><i>{order.assignee.charAt(0)}</i>{order.assignee}</span></td><td>{order.updatedAt}</td><td>⌄</td></tr>)}
          {!filteredOrders.length ? <tr><td className="ops-empty" colSpan={7}>لا توجد طلبات مطابقة.</td></tr> : null}
        </tbody></table></div><footer><span>عرض {filteredOrders.length} من {orders.length} طلب</span><div className="ops-pages"><button className="active">1</button></div><button className="ops-per-page">10 لكل صفحة⌄</button></footer></div>
      </section>

      {selected ? <aside className="ops-summary">
        <div className="ops-summary-head"><h2>ملخص الطلب</h2><button aria-label="إغلاق">×</button></div>
        <dl><div><dt>رقم الطلب</dt><dd>{selected.id}</dd></div><div><dt>العميل</dt><dd>▦ {selected.client}</dd></div><div><dt>الخدمة</dt><dd>{selected.service}</dd></div><div><dt>الجهة</dt><dd><Agency type={selected.agencyType} name={selected.agency} /></dd></div><div><dt>الحالة</dt><dd><select className={`ops-status-select ${statusTone[selected.status]}`} value={selected.status} onChange={(event) => updateStatus(event.target.value as OrderStatus)}>{allowedOrderStatuses(selected.status).map((status) => <option key={status}>{status}</option>)}</select></dd></div><div><dt>المسؤول</dt><dd><span className="ops-owner"><i>{selected.assignee.charAt(0)}</i>{selected.assignee}</span></dd></div><div><dt>آخر تحديث</dt><dd>{selected.updatedAt}</dd></div></dl>
        <section className="ops-documents"><header><h3>▱ المستندات</h3><span>{databaseMode?(remoteDocs[selected.id]?.length??0):((uploadedDocs[selected.id]?.length??0)+2)} مستندات</span></header><div>{databaseMode?<>{(remoteDocs[selected.id]??[]).map((document,index)=><p key={`${document.name}-${index}`}><i>✓</i><span>{document.download_url?<a href={document.download_url} target="_blank" rel="noreferrer">{document.name} ↗</a>:document.name}<small>{document.status==="approved"?"تمت المراجعة":"تم الاستلام"}</small></span></p>)}{!(remoteDocs[selected.id]?.length)?<p><i>—</i><span>لا توجد مستندات بعد<small>ابدأ برفع المستند المطلوب</small></span></p>:null}</>:<><p><i>✓</i><span>السجل التجاري<small>تمت المراجعة</small></span></p><p><i>✓</i><span>هوية المالك أو الشركاء<small>تمت المراجعة</small></span></p>{uploadedDocs[selected.id]?.includes("supporting")?<p><i>✓</i><span>المستند الداعم<small>تم الاستلام الآن</small></span></p>:null}</>}<label><i>＋</i><span>رفع مستند<small>PDF أو صورة، بحد أقصى 10MB</small></span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event)=>{const file=event.target.files?.[0];if(file)void uploadSupportingDocument(file);event.target.value=""}}/></label></div></section>
        <section className="ops-next"><h3>▣ الإجراء التالي</h3><p>{selected.nextAction}</p><small>موعد الإجراء: {selected.nextActionAt}</small></section>
        <section className="ops-contact"><h3>تواصل مع العميل</h3><div><a href={`tel:+${selected.phone}`}>♢<small>اتصال</small></a><a href={`https://wa.me/${selected.phone}`} target="_blank" rel="noreferrer">◉<small>واتساب</small></a><a href={`mailto:${selected.email}`}>✉<small>بريد</small></a></div></section>
        <section className="ops-timeline"><h3>الخط الزمني</h3><div><i className="teal"></i><p>آخر تحديث للطلب<small>{selected.assignee} · {selected.updatedAt}</small></p></div><div><i></i><p>تم إنشاء الطلب<small>فريق أتمم</small></p></div><a href="/admin/followups">عرض المتابعات المرتبطة</a></section>
      </aside> : null}
    </div>

    {showCreate ? <div className="ops-modal-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}><section className="ops-modal" role="dialog" aria-modal="true" aria-labelledby="create-order-title" onMouseDown={(event) => event.stopPropagation()}><header><div><h2 id="create-order-title">إنشاء طلب جديد</h2><p>{databaseMode?"اختر بيانات الطلب من السجلات المعتمدة.":"أدخل البيانات الأساسية، ويمكن إكمال المستندات والإجراءات لاحقًا."}</p></div><button onClick={() => setShowCreate(false)}>×</button></header><form onSubmit={createOrder}><div className="ops-form-grid">{databaseMode?<><label><span>العميل</span><select name="clientId" required>{catalog.clients.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>الخدمة</span><select name="serviceId" required>{catalog.services.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="wide"><span>المسؤول</span><select name="assigneeId"><option value="">غير مسند</option>{catalog.profiles.map((item)=><option value={item.id} key={item.id}>{item.full_name}</option>)}</select></label></>:<><label><span>اسم العميل</span><input name="client" required placeholder="مثال: شركة أتمم الأعمال" /></label><label><span>الخدمة</span><select name="service" required><option>تأسيس شركة ذات مسؤولية محدودة</option><option>إصدار سجل تجاري</option><option>تعديل عقد شركة</option><option>تسجيل علامة تجارية</option><option>ضريبة القيمة المضافة</option></select></label><label><span>المسؤول</span><select name="assignee">{assignees.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>رقم الجوال</span><input name="phone" inputMode="tel" required placeholder="9665xxxxxxxx" /></label><label className="wide"><span>البريد الإلكتروني</span><input name="email" type="email" required placeholder="name@company.com" /></label></>}</div><footer><button type="button" onClick={() => setShowCreate(false)}>إلغاء</button><button className="primary" type="submit">إنشاء الطلب</button></footer></form></section></div> : null}
    {notice ? <div className="ops-toast" role="status">✓ {notice}</div> : null}
  </main>;
}
