import PageLoader from "@/components/page-loader";
"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  Clock,
  Copy,
  FileText,
  Flag,
  Layers,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { AdminOrder, OrderStatus, readAdminOrders, statusTone, writeAdminOrders } from "@/lib/admin-orders";
import { allowedOrderStatuses, canChangeOrderStatus } from "@/lib/domain/orders";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  formatAppDate,
  formatAppDateTime,
  formatAppRelativeTime,
  fromDateInputValue,
  fromDateTimeLocalValue,
} from "@/lib/date-format";

type CatalogItem = { id: string; name?: string; full_name?: string; phone?: string; email?: string; agency_id?: string };
type Catalog = { clients: CatalogItem[]; services: CatalogItem[]; agencies: CatalogItem[]; profiles: CatalogItem[] };
type RelatedTicket = { id: string; title: string; status: string; priority: string; category: string; client_id?: string };
type OrderDocument = { name: string; status: string; download_url?: string | null; uploaded_at?: string | null; created_at?: string | null };
type DatabaseOrder = {
  id: string;
  reference_no: string;
  status: string;
  priority?: "normal" | "high" | "urgent";
  due_at?: string | null;
  next_action_text?: string | null;
  next_action_at?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  notes?: string | null;
  clients?: CatalogItem | null;
  services?: CatalogItem | null;
  agencies?: CatalogItem | null;
  profiles?: CatalogItem | null;
};
type OpsOrder = AdminOrder & {
  priority?: "normal" | "high" | "urgent";
  dueAtRaw?: string | null;
  nextActionAtRaw?: string | null;
  createdAtRaw?: string | null;
  updatedAtRaw?: string | null;
};

const statusTabs: Array<OrderStatus | "الكل"> = ["الكل", "جديد", "بانتظار المستندات", "قيد التنفيذ", "معلق", "مكتمل", "ملغي"];
const statusFromDatabase: Record<string, OrderStatus> = {
  new: "جديد",
  waiting_documents: "بانتظار المستندات",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  blocked: "معلق",
};
const statusToDatabase: Record<OrderStatus, string> = {
  "جديد": "new",
  "بانتظار المستندات": "waiting_documents",
  "قيد التنفيذ": "in_progress",
  "مكتمل": "completed",
  "ملغي": "cancelled",
  "معلق": "blocked",
};
const statusMeta: Record<OrderStatus, { label: string; color: string; bg: string; border: string; help: string }> = {
  "جديد": { label: "جديد", color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", help: "بانتظار الفرز" },
  "بانتظار المستندات": { label: "بانتظار المستندات", color: "#b45309", bg: "#fef9ee", border: "#fde68a", help: "ينتظر العميل" },
  "قيد التنفيذ": { label: "قيد التنفيذ", color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", help: "لدى الفريق" },
  "معلق": { label: "معلق", color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", help: "يحتاج قرار" },
  "مكتمل": { label: "مكتمل", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", help: "منجز" },
  "ملغي": { label: "ملغي", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", help: "متوقف" },
};
const priorityMeta: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "عادي", color: "#64748b", bg: "#f1f5f9" },
  high: { label: "مرتفع", color: "#b45309", bg: "#fef9ee" },
  urgent: { label: "عاجل", color: "#dc2626", bg: "#fef2f2" },
};
const queueFilters = [
  { value: "all", label: "كل الطلبات" },
  { value: "needsClient", label: "بانتظار العميل" },
  { value: "needsTeam", label: "تحتاج إجراء" },
  { value: "overdue", label: "متأخرة" },
] as const;

function agencyType(name?: string): AdminOrder["agencyType"] {
  if (name?.includes("الزكاة")) return "zatca";
  if (name?.includes("التجارة")) return "commerce";
  return "ip";
}

function initials(name?: string) {
  return (name || "؟").trim().slice(0, 2);
}

function isOverdue(order: OpsOrder) {
  if (!order.nextActionAtRaw || ["مكتمل", "ملغي"].includes(order.status)) return false;
  return new Date(order.nextActionAtRaw).getTime() < Date.now();
}

function statusOf(status: OrderStatus) {
  return statusMeta[status] || statusMeta["جديد"];
}

function AgencyMark({ order }: { order: OpsOrder }) {
  const iconBg = order.agencyType === "zatca" ? "#f0fdfa" : order.agencyType === "commerce" ? "#eaf4ff" : "#f8fafc";
  const iconColor = order.agencyType === "zatca" ? "#0f766e" : order.agencyType === "commerce" ? "#0875dc" : "#64748b";
  return (
    <span className="ord-agency">
      <i style={{ background: iconBg, color: iconColor }}><Building2 size={12} /></i>
      {order.agency}
    </span>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const meta = statusOf(status);
  return <span className="ord-pill" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>{meta.label}</span>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OpsOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "الكل">("الكل");
  const [queueFilter, setQueueFilter] = useState<(typeof queueFilters)[number]["value"]>("all");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [databaseMode, setDatabaseMode] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ clients: [], services: [], agencies: [], profiles: [] });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [statusDialog, setStatusDialog] = useState<OrderStatus | null>(null);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [remoteDocs, setRemoteDocs] = useState<Record<string, OrderDocument[]>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string[]>>({});
  const [relatedTickets, setRelatedTickets] = useState<RelatedTicket[]>([]);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const { loading } = useRoleGuard("operator");

  async function loadDatabase(keepSelection = true) {
    setDataLoading(true);
    const [ordersResponse, catalogResponse] = await Promise.all([fetch("/api/admin/orders"), fetch("/api/admin/catalog")]);
    if (!ordersResponse.ok || !catalogResponse.ok) {
      setOrdersLoading(false);
      setDataLoading(false);
      return false;
    }
    const ordersPayload = await ordersResponse.json() as { data: DatabaseOrder[] };
    const catalogPayload = await catalogResponse.json() as { data: Catalog };
    const mapped = ordersPayload.data.map((order): OpsOrder => ({
      databaseId: order.id,
      clientId: order.clients?.id,
      serviceId: order.services?.id,
      agencyId: order.agencies?.id,
      assigneeId: order.profiles?.id,
      id: order.reference_no,
      client: order.clients?.name ?? "عميل غير معروف",
      service: order.services?.name ?? "خدمة غير معروفة",
      agency: order.agencies?.name ?? "غير محددة",
      agencyType: agencyType(order.agencies?.name),
      status: statusFromDatabase[order.status] ?? "جديد",
      assignee: order.profiles?.full_name ?? "غير مسند",
      updatedAt: formatAppDateTime(order.updated_at),
      phone: order.clients?.phone ?? "",
      email: order.clients?.email ?? "",
      nextAction: order.next_action_text ?? "تحديد الإجراء التالي",
      nextActionAt: order.next_action_at ? formatAppDateTime(order.next_action_at) : "غير محدد",
      statusReason: order.notes || undefined,
      archivedAt: order.archived_at || null,
      priority: order.priority || "normal",
      dueAtRaw: order.due_at,
      nextActionAtRaw: order.next_action_at,
      createdAtRaw: order.created_at,
      updatedAtRaw: order.updated_at,
    }));
    setCatalog(catalogPayload.data);
    setOrders(mapped);
    setDatabaseMode(true);
    if (!keepSelection || (selectedId && !mapped.some(order => order.id === selectedId))) setSelectedId(mapped[0]?.id);
    else if (!selectedId && mapped.length) setSelectedId(mapped[0].id);
    setOrdersLoading(false);
    setDataLoading(false);
    return true;
  }

  useEffect(() => {
    const client = new URLSearchParams(window.location.search).get("client");
    if (client) setQuery(client);
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      void loadDatabase(false);
    } else {
      const fallback = readAdminOrders() as OpsOrder[];
      setOrders(fallback);
      setSelectedId(fallback[0]?.id);
      setOrdersLoading(false);
    }
  }, []);

  const selected = orders.find(order => order.id === selectedId) ?? null;

  useEffect(() => {
    if (!databaseMode || !selected?.databaseId) return;
    void fetch(`/api/admin/orders/${selected.databaseId}/documents`).then(async response => {
      if (response.ok) {
        const payload = await response.json() as { data: OrderDocument[] };
        setRemoteDocs(current => ({ ...current, [selected.id]: payload.data }));
      }
    });
  }, [databaseMode, selected?.databaseId, selected?.id]);

  useEffect(() => {
    if (!selected?.clientId) { setRelatedTickets([]); return; }
    fetch("/api/admin/tickets")
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        const all = (data?.data ?? []) as RelatedTicket[];
        setRelatedTickets(all.filter(ticket => ticket.client_id === selected.clientId).slice(0, 5));
      })
      .catch(() => {});
  }, [selected?.clientId]);

  const activeOrders = useMemo(() => orders.filter(order => showArchived ? order.archivedAt : !order.archivedAt), [orders, showArchived]);
  const stats = useMemo(() => {
    const active = orders.filter(order => !order.archivedAt);
    return {
      total: active.length,
      needsClient: active.filter(order => order.status === "بانتظار المستندات").length,
      inProgress: active.filter(order => order.status === "قيد التنفيذ").length,
      overdue: active.filter(isOverdue).length,
      completed: active.filter(order => order.status === "مكتمل").length,
    };
  }, [orders]);
  const counts = useMemo(() => {
    const base: Record<OrderStatus | "الكل", number> = {
      "الكل": orders.filter(order => !order.archivedAt).length,
      "جديد": 0,
      "بانتظار المستندات": 0,
      "قيد التنفيذ": 0,
      "مكتمل": 0,
      "ملغي": 0,
      "معلق": 0,
    };
    for (const order of orders) if (!order.archivedAt) base[order.status] += 1;
    return base;
  }, [orders]);
  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeOrders
      .filter(order => statusFilter === "الكل" || order.status === statusFilter)
      .filter(order => {
        if (queueFilter === "needsClient") return order.status === "بانتظار المستندات";
        if (queueFilter === "needsTeam") return ["جديد", "قيد التنفيذ", "معلق"].includes(order.status);
        if (queueFilter === "overdue") return isOverdue(order);
        return true;
      })
      .filter(order => !q || `${order.id} ${order.client} ${order.service} ${order.agency} ${order.assignee}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const aTime = new Date(a.nextActionAtRaw || a.updatedAtRaw || a.createdAtRaw || 0).getTime();
        const bTime = new Date(b.nextActionAtRaw || b.updatedAtRaw || b.createdAtRaw || 0).getTime();
        return bTime - aTime;
      });
  }, [activeOrders, query, queueFilter, statusFilter]);

  function toast(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function persist(nextOrders: OpsOrder[], message: string) {
    setOrders(nextOrders);
    writeAdminOrders(nextOrders);
    toast(message);
  }

  async function refreshOrders() {
    if (databaseMode) await loadDatabase(true);
    else setOrders(readAdminOrders() as OpsOrder[]);
    toast("تم تحديث الطلبات");
  }

  async function archiveOrder(orderId: string, archive: boolean) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archive }),
    });
    if (res.ok) {
      await loadDatabase();
      toast(archive ? "تم أرشفة الطلب" : "تم استعادة الطلب");
    } else toast("تعذر تغيير حالة الأرشيف");
  }

  async function deleteOrder(orderId: string) {
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedId(undefined);
      setConfirmDeleteOrder(null);
      await loadDatabase(false);
      toast("تم حذف الطلب");
    } else toast("تعذر حذف الطلب");
  }

  async function confirmStatusChange(status: OrderStatus, reason?: string) {
    if (!selected) return;
    if (databaseMode && selected.databaseId) {
      const response = await fetch(`/api/admin/orders/${selected.databaseId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: statusToDatabase[status], reason }),
      });
      if (!response.ok) {
        const err = await response.json();
        toast(err.error || "تعذر تحديث الحالة");
        return;
      }
      await loadDatabase();
      toast("تم تحديث حالة الطلب وتسجيلها");
      return;
    }
    persist(
      orders.map(order => order.id === selected.id ? {
        ...order,
        status,
        updatedAt: "الآن",
        updatedAtRaw: new Date().toISOString(),
        statusReason: reason || order.statusReason,
      } : order),
      `تم تحديث حالة ${selected.id}`,
    );
  }

  function updateStatus(status: OrderStatus) {
    if (!selected || selected.status === status) return;
    if (!canChangeOrderStatus(selected.status, status)) {
      toast("لا يمكن تنفيذ هذا الانتقال في مسار الطلب");
      return;
    }
    if (status === "ملغي" || status === "معلق") {
      setStatusDialog(status);
      window.setTimeout(() => reasonRef.current?.focus(), 100);
      return;
    }
    void confirmStatusChange(status);
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormSubmitted(true);
    const form = new FormData(event.currentTarget);
    if (databaseMode) {
      const service = catalog.services.find(item => item.id === form.get("serviceId"));
      const client = catalog.clients.find(item => item.id === form.get("clientId"));
      if (!service || !client) {
        toast("يرجى اختيار العميل والخدمة");
        setFormSubmitted(false);
        return;
      }
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: form.get("clientId"),
          serviceId: form.get("serviceId"),
          agencyId: form.get("agencyId") || service.agency_id || undefined,
          assigneeId: form.get("assigneeId") || undefined,
          priority: form.get("priority") || "normal",
          dueAt: fromDateInputValue(String(form.get("dueAt") || "")) || undefined,
          nextActionText: form.get("nextActionText") || undefined,
          nextActionAt: fromDateTimeLocalValue(String(form.get("nextActionAt") || "")) || undefined,
          notes: form.get("notes") || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        toast(err.error || "تعذر إنشاء الطلب");
        setFormSubmitted(false);
        return;
      }
      await loadDatabase(false);
      setShowCreate(false);
      setFormSubmitted(false);
      toast("تم إنشاء الطلب بنجاح");
      return;
    }
    const service = String(form.get("service") ?? "");
    const isTax = service.includes("ضريبة");
    const next: OpsOrder = {
      id: `REQ-${new Date().getFullYear()}-${String(orders.length + 43).padStart(4, "0")}`,
      client: String(form.get("client") ?? ""),
      service,
      agency: isTax ? "هيئة الزكاة والضريبة والجمارك" : "وزارة التجارة",
      agencyType: isTax ? "zatca" : "commerce",
      status: "جديد",
      assignee: String(form.get("assignee") ?? "غير مسند"),
      updatedAt: "الآن",
      updatedAtRaw: new Date().toISOString(),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      nextAction: "مراجعة بيانات الطلب والتواصل مع العميل",
      nextActionAt: "اليوم",
      nextActionAtRaw: new Date().toISOString(),
      priority: "normal",
    };
    persist([next, ...orders], `تم إنشاء الطلب ${next.id}`);
    setSelectedId(next.id);
    setShowCreate(false);
    setFormSubmitted(false);
  }

  async function uploadSupportingDocument(file: File) {
    if (!selected) return;
    if (databaseMode && selected.databaseId) {
      const form = new FormData();
      form.set("name", file.name || "مستند داعم");
      form.set("file", file);
      const response = await fetch(`/api/admin/orders/${selected.databaseId}/documents`, { method: "POST", body: form });
      if (!response.ok) {
        toast("تعذر رفع المستند؛ تحقق من النوع والحجم");
        return;
      }
      const documentsResponse = await fetch(`/api/admin/orders/${selected.databaseId}/documents`);
      if (documentsResponse.ok) {
        const payload = await documentsResponse.json() as { data: OrderDocument[] };
        setRemoteDocs(current => ({ ...current, [selected.id]: payload.data }));
      }
      toast("تم رفع المستند وتسجيله");
      return;
    }
    setUploadedDocs(current => ({ ...current, [selected.id]: [...(current[selected.id] ?? []), file.name || "supporting"] }));
    toast("تمت إضافة المستند إلى الطلب");
  }

  if (loading || ordersLoading) return <PageLoader text="جاري تحميل الطلبات..." />;

  const currentDocs: OrderDocument[] = selected
    ? databaseMode
      ? remoteDocs[selected.id] ?? []
      : (uploadedDocs[selected.id] ?? []).map(name => ({ name, status: "received" }))
    : [];

  return (
    <section className="ord-shell" dir="rtl">
      <style>{`
        .ord-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;color:#173d65;overflow:hidden}
        .ord-head{padding:20px 24px 14px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff)}
        .ord-head-main{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:14px}
        .ord-eyebrow{margin:0 0 4px;color:#0f766e;font-size:.66rem;font-weight:900}
        .ord-head h1{margin:0 0 5px;font-size:1.52rem;color:#073766;letter-spacing:0}
        .ord-head p{margin:0;color:#7f8e9f;font-size:.72rem}
        .ord-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .ord-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer;text-decoration:none}
        .ord-btn.primary{background:#073766;border-color:#073766;color:#fff}
        .ord-btn.danger{background:#fef2f2;border-color:#fecaca;color:#dc2626}
        .ord-btn:disabled{opacity:.62;cursor:not-allowed}
        .ord-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px}
        .ord-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;min-width:0}
        .ord-kpi i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex-shrink:0}
        .ord-kpi small,.ord-kpi strong{display:block}.ord-kpi small{font-size:.56rem;color:#8190a1;font-weight:800}.ord-kpi strong{font-size:1.22rem;color:#073766;line-height:1;margin-top:4px}
        .ord-workspace{min-height:0;display:grid;grid-template-columns:minmax(430px,520px) minmax(0,1fr);gap:14px;padding:14px 16px 18px}
        .ord-panel{min-height:0;background:#fff;border:1px solid #dfe8f1;border-radius:14px;box-shadow:0 6px 24px rgba(7,55,102,.05);overflow:hidden}
        .ord-queue{display:grid;grid-template-rows:auto 1fr}
        .ord-toolbar{padding:14px;border-bottom:1px solid #edf2f7;background:#fff}
        .ord-tabs{display:flex;gap:6px;overflow:auto;padding-bottom:2px;margin-bottom:12px;scrollbar-width:none}
        .ord-tabs button{height:34px;border:1px solid #dfe8f1;border-radius:9px;background:#f8fafc;color:#65788c;padding:0 11px;font:inherit;font-size:.61rem;font-weight:800;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .ord-tabs button.active{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .ord-tools{display:grid;grid-template-columns:1fr;gap:8px}
        .ord-search{height:38px;border:1px solid #dfe8f1;border-radius:10px;background:#f8fafc;display:flex;align-items:center;gap:8px;padding:0 11px;color:#8b9dad}
        .ord-search input{border:0;outline:0;background:transparent;font:inherit;font-size:.68rem;width:100%;color:#173d65}
        .ord-chip-row{display:flex;gap:6px;overflow:auto;margin-top:10px;scrollbar-width:none}
        .ord-chip-row button{height:32px;border:1px solid #dfe8f1;border-radius:999px;background:#fff;color:#65788c;padding:0 10px;font:inherit;font-size:.59rem;font-weight:800;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
        .ord-chip-row button.active{color:#073766;background:#f0f7ff;border-color:#bddcff}
        .ord-list{min-height:0;overflow:auto;padding:10px;background:#f8fafc}
        .ord-card{width:100%;border:1px solid #dfe8f1;border-radius:12px;background:#fff;padding:12px;text-align:right;cursor:pointer;margin-bottom:9px;transition:border-color .15s,box-shadow .15s,transform .15s,background .15s}
        .ord-card:hover{border-color:#bddcff;box-shadow:0 8px 24px rgba(8,117,220,.08);transform:translateY(-1px)}
        .ord-card.active{border-color:#0875dc;background:#f0f8ff;box-shadow:0 8px 24px rgba(8,117,220,.1)}
        .ord-card.overdue{border-right:4px solid #dc2626}
        .ord-card-top{display:flex;align-items:flex-start;gap:10px}
        .ord-avatar{width:40px;height:40px;border-radius:12px;background:#eaf4ff;color:#0875dc;display:grid;place-items:center;font-size:.72rem;font-weight:900;flex-shrink:0}
        .ord-card-body{flex:1;min-width:0}
        .ord-ref{font-size:.55rem;color:#8b9dad;font-weight:900;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:2px}
        .ord-card h2{margin:0 0 6px;font-size:.78rem;line-height:1.45;color:#173d65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ord-card-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:#7f8e9f;font-size:.58rem}
        .ord-card-meta span{display:inline-flex;align-items:center;gap:4px;min-width:0}
        .ord-card-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
        .ord-badges{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .ord-pill,.ord-priority{display:inline-flex;align-items:center;gap:4px;border:1px solid;border-radius:999px;padding:3px 8px;font-size:.55rem;font-weight:900;white-space:nowrap}
        .ord-time{font-size:.56rem;color:#6f8193;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
        .ord-empty{height:100%;display:grid;place-items:center;text-align:center;color:#8b9dad;padding:30px}
        .ord-empty div{display:grid;gap:8px;justify-items:center}
        .ord-detail{min-height:0;display:grid;grid-template-rows:auto 1fr auto;background:#fff}
        .ord-detail-head{padding:18px 20px 16px;border-bottom:1px solid #edf2f7;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;background:linear-gradient(180deg,#fff,#fbfdff)}
        .ord-detail-title{display:flex;align-items:flex-start;gap:12px;min-width:0}
        .ord-detail-icon{width:44px;height:44px;border-radius:12px;background:#eaf4ff;color:#0875dc;display:grid;place-items:center;flex-shrink:0}
        .ord-detail h2{margin:0 0 7px;font-size:1rem;line-height:1.45;color:#073766}
        .ord-detail-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.61rem;color:#7f8e9f}
        .ord-detail-meta span,.ord-detail-meta a{display:inline-flex;align-items:center;gap:4px;color:inherit;text-decoration:none}
        .ord-close{width:32px;height:32px;border:1px solid #dfe8f1;border-radius:9px;background:#fff;color:#536a82;display:grid;place-items:center;cursor:pointer;flex-shrink:0}
        .ord-detail-body{min-height:0;overflow:auto;padding:18px 20px 22px}
        .ord-section{border:1px solid #e4ebf2;border-radius:12px;background:#fff;margin-bottom:14px;overflow:hidden}
        .ord-section header{min-height:42px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #edf2f7;background:#fbfdff;color:#48617b;font-size:.64rem;font-weight:900}
        .ord-section-content{padding:14px}
        .ord-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
        .ord-info{border:1px solid #edf2f7;border-radius:10px;background:#f8fafc;padding:10px}
        .ord-info small,.ord-info strong{display:block}.ord-info small{font-size:.55rem;color:#8795a5;font-weight:800;margin-bottom:5px}.ord-info strong{font-size:.69rem;color:#173d65;line-height:1.5;word-break:break-word}
        .ord-stepper{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .ord-step{border:1px solid #e4ebf2;border-radius:10px;padding:10px;background:#f8fafc;color:#8190a1}
        .ord-step.done{background:#f0fdfa;border-color:#99f6e4;color:#0f766e}.ord-step.active{background:#eaf4ff;border-color:#bddcff;color:#0875dc}
        .ord-step b{display:block;font-size:.62rem;margin-top:6px}.ord-step span{display:block;font-size:.52rem;color:inherit;opacity:.78;margin-top:2px}
        .ord-doc-list{display:grid;gap:8px}.ord-doc{border:1px solid #e4ebf2;border-radius:10px;padding:10px;background:#f8fafc;display:flex;align-items:center;gap:9px;font-size:.66rem;color:#173d65;text-decoration:none}.ord-doc small{display:block;color:#8b9dad;font-size:.54rem;margin-top:2px}
        .ord-ticket-list{display:grid;gap:8px}.ord-ticket{border:1px solid #e4ebf2;border-radius:10px;padding:10px;background:#f8fafc;display:flex;align-items:center;gap:10px;text-decoration:none;color:#173d65}.ord-ticket b{display:block;font-size:.66rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ord-ticket small{display:block;color:#8b9dad;font-size:.54rem;margin-top:2px}
        .ord-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ord-field{display:grid;gap:6px;min-width:0}.ord-field.full{grid-column:1/-1}.ord-field span{font-size:.62rem;font-weight:900;color:#48617b}
        .ord-field input,.ord-field select,.ord-field textarea{width:100%;border:1.5px solid #dfe8f1;border-radius:10px;background:#fff;color:#173d65;font:inherit;font-size:.72rem;outline:none;box-sizing:border-box}
        .ord-field input,.ord-field select{height:42px;padding:0 12px}.ord-field select{padding-left:40px}.ord-field textarea{min-height:86px;padding:10px 12px;resize:vertical;line-height:1.7}
        .ord-field input:focus,.ord-field select:focus,.ord-field textarea:focus{border-color:#0875dc;box-shadow:0 0 0 3px rgba(8,117,220,.1)}
        .ord-footer{border-top:1px solid #edf2f7;padding:12px 16px;background:#fbfdff;display:flex;align-items:center;justify-content:space-between;gap:10px}
        .ord-footer-note{font-size:.58rem;color:#7f8e9f;display:flex;align-items:center;gap:6px}
        .ord-agency{display:inline-flex;align-items:center;gap:5px;color:#536a82;font-size:.56rem;font-weight:800;min-width:0}.ord-agency i{width:20px;height:20px;border-radius:7px;display:grid;place-items:center;flex-shrink:0}
        .ord-blank{height:100%;display:grid;place-items:center;text-align:center;color:#7f8e9f;background:linear-gradient(180deg,#fff,#f8fbff)}.ord-blank-card{max-width:340px;display:grid;gap:10px;justify-items:center}.ord-blank-icon{width:68px;height:68px;border-radius:20px;background:#eaf4ff;color:#0875dc;display:grid;place-items:center}.ord-blank h2{margin:0;color:#073766;font-size:1rem}.ord-blank p{margin:0;font-size:.7rem;line-height:1.8}
        .ord-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#073766;color:#fff;padding:10px 18px;border-radius:11px;font-size:.72rem;font-weight:800;box-shadow:0 12px 32px rgba(0,0,0,.2);z-index:1000;display:flex;align-items:center;gap:8px}
        .ord-loading{min-height:calc(100vh - 60px);display:grid;place-items:center;background:#f4f7fb;color:#61748a;font-size:.74rem;font-weight:800}.ord-loading>svg{animation:spin .7s linear infinite;color:#0875dc}
        @media(max-width:1150px){.ord-kpis{grid-template-columns:repeat(3,1fr)}.ord-workspace{grid-template-columns:390px minmax(0,1fr)}.ord-info-grid{grid-template-columns:1fr 1fr}.ord-stepper{grid-template-columns:1fr 1fr}}
        @media(max-width:860px){.ord-shell{height:auto;min-height:calc(100vh - 60px);overflow:visible}.ord-head-main{align-items:flex-start;flex-direction:column}.ord-kpis{grid-template-columns:1fr 1fr}.ord-workspace{display:flex;flex-direction:column;overflow:visible}.ord-panel{min-height:420px}.ord-queue{max-height:680px}.ord-info-grid,.ord-form-grid{grid-template-columns:1fr}.ord-detail{min-height:680px}.ord-footer{align-items:flex-start;flex-direction:column}.ord-btn.primary{width:100%;justify-content:center}}
        @media(max-width:560px){.ord-head{padding:18px 14px 12px}.ord-workspace{padding:10px}.ord-kpis{grid-template-columns:1fr}.ord-card-bottom{align-items:flex-start;flex-direction:column}.ord-detail-head{padding:15px}.ord-detail-body{padding:14px}.ord-section-content{padding:12px}}
      `}</style>

      <header className="ord-head">
        <div className="ord-head-main">
          <div>
            <p className="ord-eyebrow">مركز تشغيل الخدمات</p>
            <h1>إدارة الطلبات</h1>
            <p>مسار موحّد لمتابعة طلبات العميل من الإنشاء حتى الإغلاق مع المستندات والتذاكر المرتبطة.</p>
          </div>
          <div className="ord-actions">
            <button className="ord-btn" onClick={() => void refreshOrders()} disabled={dataLoading}>
              <RefreshCw size={14} style={{ animation: dataLoading ? "spin .7s linear infinite" : undefined }} />
              تحديث
            </button>
            <button className="ord-btn primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> طلب جديد
            </button>
          </div>
        </div>
        <div className="ord-kpis">
          {[
            { label: "إجمالي الطلبات", value: stats.total, icon: Layers, color: "#073766", bg: "#eaf4ff" },
            { label: "بانتظار العميل", value: stats.needsClient, icon: User, color: "#b45309", bg: "#fef9ee" },
            { label: "قيد التنفيذ", value: stats.inProgress, icon: RefreshCw, color: "#0f766e", bg: "#f0fdfa" },
            { label: "متأخرة", value: stats.overdue, icon: AlertCircle, color: "#dc2626", bg: "#fef2f2" },
            { label: "مكتملة", value: stats.completed, icon: CheckCircle, color: "#15803d", bg: "#f0fdf4" },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <article className="ord-kpi" key={kpi.label}>
                <i style={{ background: kpi.bg, color: kpi.color }}><Icon size={17} /></i>
                <div><small>{kpi.label}</small><strong>{kpi.value}</strong></div>
              </article>
            );
          })}
        </div>
      </header>

      <div className="ord-workspace">
        <aside className="ord-panel ord-queue">
          <div className="ord-toolbar">
            <div className="ord-tabs">
              {statusTabs.map(status => (
                <button key={status} className={!showArchived && statusFilter === status ? "active" : ""} onClick={() => { setShowArchived(false); setStatusFilter(status); }}>
                  {status} <b>{counts[status]}</b>
                </button>
              ))}
              <button className={showArchived ? "active" : ""} onClick={() => { setShowArchived(true); setStatusFilter("الكل"); }}>
                الأرشيف <b>{orders.filter(order => order.archivedAt).length}</b>
              </button>
            </div>
            <div className="ord-tools">
              <label className="ord-search">
                <Search size={13} />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="بحث بالطلب، العميل، الخدمة، المسؤول..." />
                {query && <button className="ord-close" style={{ width: 24, height: 24 }} onClick={() => setQuery("")} type="button"><X size={12} /></button>}
              </label>
            </div>
            <div className="ord-chip-row">
              {queueFilters.map(filter => (
                <button key={filter.value} className={queueFilter === filter.value ? "active" : ""} onClick={() => setQueueFilter(filter.value)}>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ord-list">
            {visibleOrders.length === 0 ? (
              <div className="ord-empty">
                <div>
                  <FileText size={30} />
                  <strong>لا توجد طلبات مطابقة</strong>
                  <span>غيّر البحث أو الفلاتر لعرض نتائج أخرى.</span>
                </div>
              </div>
            ) : visibleOrders.map(order => {
              const active = selected?.id === order.id;
              const pri = priorityMeta[order.priority || "normal"] || priorityMeta.normal;
              return (
                <button key={order.id} className={`ord-card ${active ? "active" : ""} ${isOverdue(order) ? "overdue" : ""}`} onClick={() => setSelectedId(order.id)}>
                  <div className="ord-card-top">
                    <span className="ord-avatar">{initials(order.client)}</span>
                    <div className="ord-card-body">
                      {/* ref + date */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <div className="ord-ref" style={{ fontFamily: "monospace", fontSize: ".6rem", color: "#8b9dad" }}>{order.id}</div>
                        <span style={{ fontSize: ".57rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}>
                          <Calendar size={9} />
                          {order.createdAtRaw ? formatAppDate(order.createdAtRaw) : "—"}
                        </span>
                      </div>
                      {/* client name */}
                      <h2 style={{ margin: "0 0 4px", fontSize: ".8rem", fontWeight: 700, color: "#0b1e36" }}>{order.client}</h2>
                      {/* service + assignee */}
                      <div className="ord-card-meta" style={{ marginBottom: 6 }}>
                        <span><Layers size={10} /> {order.service}</span>
                        <span><User size={10} /> {order.assignee || "غير محدد"}</span>
                      </div>
                      {/* divider */}
                      <div style={{ borderTop: "1px dashed #e8edf5", paddingTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className="ord-badges">
                          <StatusPill status={order.status} />
                          <span className="ord-priority" style={{ color: pri.color, background: pri.bg, borderColor: pri.bg }}>{pri.label}</span>
                          {isOverdue(order) && <span className="ord-priority" style={{ color: "#dc2626", background: "#fef2f2", borderColor: "#fecaca" }}>متأخر</span>}
                        </div>
                        <span className="ord-time" style={{ fontSize: ".57rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}>
                          <RefreshCw size={9} />
                          {order.updatedAtRaw ? formatAppRelativeTime(order.updatedAtRaw) : "—"}
                        </span>
                      </div>
                    </div>
                    <ChevronLeft size={14} color="#b7c4d1" style={{ marginTop: 14, flexShrink: 0 }} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="ord-panel ord-detail">
          {selected ? (
            <>
              <div className="ord-detail-head">
                <div className="ord-detail-title">
                  <span className="ord-detail-icon"><ShieldCheck size={20} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ord-badges" style={{ marginBottom: 8 }}>
                      <StatusPill status={selected.status} />
                      {isOverdue(selected) && <span className="ord-priority" style={{ color: "#dc2626", background: "#fef2f2", borderColor: "#fecaca" }}>تجاوز الموعد</span>}
                    </div>
                    <h2>{selected.service}</h2>
                    <div className="ord-detail-meta">
                      <span><Building2 size={11} /> {selected.client}</span>
                      <span><Calendar size={11} /> فتح {formatAppDate(selected.createdAtRaw || selected.updatedAtRaw)}</span>
                      <span><RefreshCw size={11} /> آخر تحديث {formatAppRelativeTime(selected.updatedAtRaw)}</span>
                      <button className="ord-btn" style={{ height: 26, padding: "0 8px" }} onClick={() => { navigator.clipboard?.writeText(selected.id); toast("تم نسخ رقم الطلب"); }}><Copy size={11} /> {selected.id}</button>
                    </div>
                  </div>
                </div>
                <button className="ord-close" onClick={() => setSelectedId(undefined)} aria-label="إغلاق التفاصيل"><X size={14} /></button>
              </div>

              <div className="ord-detail-body">
                <section className="ord-section">
                  <header>
                    <span>مسار التنفيذ</span>
                    <select value={selected.status} onChange={event => updateStatus(event.target.value as OrderStatus)} className={`ops-status-select ${statusTone[selected.status]}`} style={{ height: 34, border: "1px solid #dfe8f1", borderRadius: 9, font: "inherit", fontSize: ".62rem", fontWeight: 900, padding: "0 12px 0 38px", backgroundColor: "#fff" }}>
                      {allowedOrderStatuses(selected.status).map(status => <option key={status}>{status}</option>)}
                    </select>
                  </header>
                  <div className="ord-section-content">
                    <div className="ord-stepper">
                      {[
                        { status: "جديد", label: "استلام الطلب", hint: "فرز وربط البيانات" },
                        { status: "قيد التنفيذ", label: "تنفيذ الخدمة", hint: "إجراء داخلي" },
                        { status: "بانتظار المستندات", label: "مستندات العميل", hint: "تجهيز/استكمال" },
                        { status: "مكتمل", label: "التسليم", hint: "إغلاق الطلب" },
                      ].map((step, index) => {
                        const orderIndex: Record<string, number> = { "جديد": 0, "قيد التنفيذ": 1, "بانتظار المستندات": 2, "مكتمل": 3 };
                        const current = orderIndex[selected.status] ?? -1;
                        const cls = index < current ? "done" : index === current ? "active" : "";
                        return (
                          <div className={`ord-step ${cls}`} key={step.status}>
                            {index < current ? <Check size={15} /> : <Clock size={15} />}
                            <b>{step.label}</b>
                            <span>{step.hint}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="ord-section">
                  <header><span>معلومات الطلب والعميل</span><AgencyMark order={selected} /></header>
                  <div className="ord-section-content ord-info-grid">
                    <Info label="العميل" value={selected.client} />
                    <Info label="الخدمة" value={selected.service} />
                    <Info label="المسؤول" value={selected.assignee} />
                    <Info label="تاريخ التسليم المتوقع" value={formatAppDate(selected.dueAtRaw)} />
                    <Info label="الإجراء التالي" value={selected.nextAction} />
                    <Info label="موعد الإجراء" value={selected.nextActionAtRaw ? formatAppDateTime(selected.nextActionAtRaw) : "غير محدد"} />
                  </div>
                </section>

                <section className="ord-section">
                  <header>
                    <span>المستندات</span>
                    <label className="ord-btn" style={{ height: 30, padding: "0 10px" }}>
                      <Upload size={13} /> رفع مستند
                      <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadSupportingDocument(file); event.target.value = ""; }} />
                    </label>
                  </header>
                  <div className="ord-section-content">
                    {currentDocs.length ? (
                      <div className="ord-doc-list">
                        {currentDocs.map((doc, index) => (
                          doc.download_url ? (
                            <a className="ord-doc" href={doc.download_url} target="_blank" rel="noreferrer" key={`${doc.name}-${index}`}>
                              <FileText size={16} color="#0875dc" />
                              <span>{doc.name}<small>{doc.status === "approved" ? "تمت المراجعة" : "تم الاستلام"}</small></span>
                            </a>
                          ) : (
                            <div className="ord-doc" key={`${doc.name}-${index}`}>
                              <FileText size={16} color="#0875dc" />
                              <span>{doc.name}<small>{doc.status === "approved" ? "تمت المراجعة" : "تم الاستلام"}</small></span>
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      <div className="ord-empty" style={{ minHeight: 120 }}>
                        <div><FileText size={26} /><strong>لا توجد مستندات بعد</strong><span>ارفع مستنداً أو اطلبه من العميل عبر التذاكر.</span></div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="ord-section">
                  <header><span>التواصل والتكامل مع العميل</span></header>
                  <div className="ord-section-content" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    <a className="ord-btn" href={`tel:${selected.phone}`}><Phone size={13} /> اتصال</a>
                    <a className="ord-btn" href={`https://wa.me/${selected.phone}`} target="_blank" rel="noreferrer"><MessageSquare size={13} /> واتساب</a>
                    <a className="ord-btn" href={`mailto:${selected.email}`}><Mail size={13} /> بريد</a>
                  </div>
                </section>

                <section className="ord-section">
                  <header><span>التذاكر المرتبطة</span><a className="ord-btn" style={{ height: 30, padding: "0 10px" }} href="/admin/tickets"><MessageSquare size={13} /> فتح التذاكر</a></header>
                  <div className="ord-section-content">
                    {relatedTickets.length ? (
                      <div className="ord-ticket-list">
                        {relatedTickets.map(ticket => (
                          <a className="ord-ticket" href="/admin/tickets" key={ticket.id}>
                            <MessageSquare size={16} color="#0f766e" />
                            <span style={{ minWidth: 0, flex: 1 }}><b>{ticket.title}</b><small>{ticket.category}</small></span>
                            <span className="ord-pill" style={{ color: statusOf((statusFromDatabase[ticket.status] || ticket.status) as OrderStatus).color, background: "#fff", borderColor: "#e4ebf2" }}>{ticket.status}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="ord-empty" style={{ minHeight: 110 }}>
                        <div><MessageSquare size={24} /><strong>لا توجد تذاكر مرتبطة</strong><span>عند وجود تذاكر للعميل ستظهر هنا لربط التشغيل بالدعم.</span></div>
                      </div>
                    )}
                  </div>
                </section>

                {(selected.status === "ملغي" || selected.status === "معلق") && selected.statusReason ? (
                  <section className="ord-section">
                    <header><span>{selected.status === "ملغي" ? "سبب الإلغاء" : "سبب التعليق"}</span></header>
                    <div className="ord-section-content" style={{ color: "#3d5872", fontSize: ".72rem", lineHeight: 1.8 }}>{selected.statusReason}</div>
                  </section>
                ) : null}
              </div>

              <footer className="ord-footer">
                <span className="ord-footer-note"><Send size={13} /> أي تغيير في الحالة ينعكس على مسار الطلب في لوحة العميل.</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selected.databaseId && !selected.archivedAt && <button className="ord-btn" onClick={() => archiveOrder(selected.databaseId!, true)}><Archive size={13} /> أرشفة</button>}
                  {selected.databaseId && selected.archivedAt && <button className="ord-btn" onClick={() => archiveOrder(selected.databaseId!, false)}><Archive size={13} /> استعادة</button>}
                  {selected.databaseId && <button className="ord-btn danger" onClick={() => setConfirmDeleteOrder(selected.databaseId!)}><Trash2 size={13} /> حذف</button>}
                </div>
              </footer>
            </>
          ) : (
            <div className="ord-blank">
              <div className="ord-blank-card">
                <span className="ord-blank-icon"><Layers size={30} /></span>
                <h2>اختر طلباً من القائمة</h2>
                <p>ستظهر تفاصيل العميل، المستندات، مسار التنفيذ، والتذاكر المرتبطة هنا.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showCreate && (
        <OrderModal
          catalog={catalog}
          databaseMode={databaseMode}
          formSubmitted={formSubmitted}
          onClose={() => !formSubmitted && setShowCreate(false)}
          onSubmit={createOrder}
        />
      )}

      {statusDialog && (
        <ReasonDialog
          status={statusDialog}
          reasonRef={reasonRef}
          onClose={() => setStatusDialog(null)}
          onConfirm={() => {
            const reason = reasonRef.current?.value.trim();
            if (!reason) { toast("السبب مطلوب لهذه الحالة"); return; }
            const status = statusDialog;
            setStatusDialog(null);
            void confirmStatusChange(status, reason);
          }}
        />
      )}

      {confirmDeleteOrder && (
        <ConfirmDelete onClose={() => setConfirmDeleteOrder(null)} onConfirm={() => void deleteOrder(confirmDeleteOrder)} />
      )}

      {notice && <div className="ord-toast" role="status"><CheckCircle size={14} /> {notice}</div>}
    </section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="ord-info"><small>{label}</small><strong>{value || "غير محدد"}</strong></div>;
}

function OrderModal({ catalog, databaseMode, formSubmitted, onClose, onSubmit }: {
  catalog: Catalog;
  databaseMode: boolean;
  formSubmitted: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(4,31,60,.55)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 20 }} onMouseDown={onClose}>
      <section style={{ width: "min(680px,100%)", maxHeight: "calc(100vh - 40px)", background: "#fff", borderRadius: 16, boxShadow: "0 25px 70px rgba(0,25,55,.3)", display: "grid", gridTemplateRows: "auto 1fr auto", overflow: "hidden" }} onMouseDown={event => event.stopPropagation()}>
        <header style={{ padding: "18px 22px", borderBottom: "1px solid #e6ecf2", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div><h2 style={{ margin: "0 0 4px", fontSize: "1rem", color: "#073766" }}>إنشاء طلب خدمة</h2><p style={{ margin: 0, fontSize: ".66rem", color: "#7c8b9b" }}>اربط الطلب بعميل وخدمة حتى يظهر في لوحة العميل ومسار التشغيل.</p></div>
          <button className="ord-close" onClick={onClose} disabled={formSubmitted}><X size={14} /></button>
        </header>
        <form id="create-order-form" onSubmit={onSubmit} style={{ minHeight: 0, overflow: "auto", padding: 22 }}>
          {databaseMode ? <CreateOrderForm catalog={catalog} /> : <CreateOrderSimple />}
        </form>
        <footer style={{ padding: "14px 22px", borderTop: "1px solid #e6ecf2", background: "#fbfdff", display: "flex", justifyContent: "flex-start", gap: 8 }}>
          <button className="ord-btn primary" type="submit" form="create-order-form" disabled={formSubmitted}>{formSubmitted ? <RefreshCw size={14} style={{ animation: "spin .7s linear infinite" }} /> : <Plus size={14} />} إنشاء الطلب</button>
          <button className="ord-btn" type="button" onClick={onClose} disabled={formSubmitted}>إلغاء</button>
        </footer>
      </section>
    </div>
  );
}

function CreateOrderForm({ catalog }: { catalog: Catalog }) {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedService = catalog.services.find(service => service.id === selectedServiceId);
  const selectedClient = catalog.clients.find(client => client.id === selectedClientId);
  const filteredClients = catalog.clients.filter(client => (client.name || "").toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="ord-form-grid">
      <label className="ord-field full">
        <span>العميل *</span>
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <input
            required
            value={selectedClient ? selectedClient.name : clientSearch}
            onChange={event => { setClientSearch(event.target.value); setSelectedClientId(""); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="ابحث باسم العميل"
          />
          <input type="hidden" name="clientId" value={selectedClientId} />
          {dropdownOpen && !selectedClientId && (
            <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, left: 0, zIndex: 30, background: "#fff", border: "1px solid #dfe8f1", borderRadius: 12, boxShadow: "0 16px 42px rgba(7,55,102,.14)", maxHeight: 230, overflow: "auto" }}>
              {filteredClients.length ? filteredClients.map(client => (
                <button key={client.id} type="button" onClick={() => { setSelectedClientId(client.id); setClientSearch(client.name || ""); setDropdownOpen(false); }} style={{ width: "100%", border: 0, borderBottom: "1px solid #edf2f7", background: "#fff", padding: "10px 12px", textAlign: "right", cursor: "pointer" }}>
                  <strong style={{ display: "block", fontSize: ".72rem", color: "#173d65" }}>{client.name}</strong>
                  <small style={{ color: "#8b9dad" }}>{client.phone || client.email || "بدون بيانات تواصل"}</small>
                </button>
              )) : <div style={{ padding: 14, color: "#8b9dad", fontSize: ".7rem" }}>لا توجد نتائج</div>}
            </div>
          )}
        </div>
      </label>
      <label className="ord-field">
        <span>الخدمة *</span>
        <select name="serviceId" required value={selectedServiceId} onChange={event => setSelectedServiceId(event.target.value)}>
          <option value="">اختر الخدمة</option>
          {catalog.services.map(service => <option value={service.id} key={service.id}>{service.name}</option>)}
        </select>
      </label>
      <label className="ord-field">
        <span>الجهة</span>
        <select name="agencyId" defaultValue={selectedService?.agency_id || ""}>
          <option value="">تحدد تلقائياً من الخدمة</option>
          {catalog.agencies.map(agency => <option value={agency.id} key={agency.id}>{agency.name}</option>)}
        </select>
      </label>
      <label className="ord-field">
        <span>الأولوية</span>
        <select name="priority" defaultValue="normal">
          <option value="normal">عادي</option>
          <option value="high">مرتفع</option>
          <option value="urgent">عاجل</option>
        </select>
      </label>
      <label className="ord-field">
        <span>المسؤول</span>
        <select name="assigneeId">
          <option value="">غير مسند</option>
          {catalog.profiles.map(profile => <option value={profile.id} key={profile.id}>{profile.full_name}</option>)}
        </select>
      </label>
      <label className="ord-field">
        <span>تاريخ التسليم المتوقع</span>
        <input type="date" name="dueAt" />
      </label>
      <label className="ord-field">
        <span>موعد الإجراء التالي</span>
        <input type="datetime-local" name="nextActionAt" />
      </label>
      <label className="ord-field full">
        <span>الإجراء التالي</span>
        <input name="nextActionText" placeholder="مثال: التواصل مع العميل لتأكيد البيانات" />
      </label>
      <label className="ord-field full">
        <span>ملاحظات داخلية</span>
        <textarea name="notes" placeholder="ملاحظات تشغيلية تظهر للفريق فقط..." />
      </label>
    </div>
  );
}

function CreateOrderSimple() {
  return (
    <div className="ord-form-grid">
      <label className="ord-field"><span>اسم العميل *</span><input name="client" required placeholder="مثال: شركة أتمم الأعمال" /></label>
      <label className="ord-field"><span>الخدمة *</span><select name="service" required><option>تأسيس شركة ذات مسؤولية محدودة</option><option>إصدار سجل تجاري</option><option>تعديل عقد شركة</option><option>تسجيل علامة تجارية</option><option>ضريبة القيمة المضافة</option></select></label>
      <label className="ord-field"><span>رقم الجوال *</span><input name="phone" inputMode="tel" required placeholder="9665xxxxxxxx" /></label>
      <label className="ord-field"><span>البريد الإلكتروني *</span><input name="email" type="email" required placeholder="name@company.com" /></label>
      <label className="ord-field full"><span>المسؤول</span><select name="assignee"><option>مدير النظام</option><option>مدير عمليات</option><option>موظف عمليات</option></select></label>
    </div>
  );
}

function ReasonDialog({ status, reasonRef, onClose, onConfirm }: {
  status: OrderStatus;
  reasonRef: React.RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,31,60,.55)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 20 }} onMouseDown={onClose}>
      <section style={{ width: "min(460px,100%)", background: "#fff", borderRadius: 16, boxShadow: "0 25px 70px rgba(0,25,55,.3)", padding: 24 }} onMouseDown={event => event.stopPropagation()}>
        <h3 style={{ margin: "0 0 6px", color: "#073766", fontSize: "1rem" }}>{status === "ملغي" ? "إلغاء الطلب" : "تعليق الطلب"}</h3>
        <p style={{ margin: "0 0 14px", color: "#7f8e9f", fontSize: ".7rem" }}>اكتب سبباً واضحاً حتى يظهر في سجل التشغيل.</p>
        <textarea ref={reasonRef} className="ord-field" placeholder="اكتب السبب هنا..." style={{ width: "100%", minHeight: 110, border: "1.5px solid #dfe8f1", borderRadius: 12, padding: 12, font: "inherit", fontSize: ".74rem", outline: 0, resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="ord-btn primary" onClick={onConfirm}>تأكيد</button>
          <button className="ord-btn" onClick={onClose}>إلغاء</button>
        </div>
      </section>
    </div>
  );
}

function ConfirmDelete({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9999, display: "grid", placeItems: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", width: 340, boxShadow: "0 8px 32px rgba(0,0,0,.18)" }} onClick={event => event.stopPropagation()}>
        <h3 style={{ margin: "0 0 8px", color: "#dc2626", fontSize: 16 }}>حذف الطلب نهائياً</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#526983" }}>سيتم حذف الطلب بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="ord-btn" onClick={onClose}>إلغاء</button>
          <button className="ord-btn danger" onClick={onConfirm}>حذف نهائي</button>
        </div>
      </div>
    </div>
  );
}
