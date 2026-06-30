import PageLoader from "@/components/page-loader";
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, FileText, ExternalLink, Eye, Edit2, Trash2, UserCheck, UserX,
  AlertTriangle, Users, Building2, UserCog, Activity, X, Phone, Mail,
  CreditCard, User, FileCheck, Clock, Save, Ban, CheckCircle, KeyRound,
  MapPin, Download, Receipt, ShoppingBag, Package, MessageSquare, Info,
  ChevronLeft, MoreHorizontal,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { formatAppDate } from "@/lib/date-format";

type ClientRecord = {
  id: string;
  name: string;
  client_type: string;
  phone: string;
  email: string | null;
  commercial_number: string | null;
  national_id: string | null;
  unified_register_number: string | null;
  company_address: string | null;
  company_activity: string | null;
  notes: string | null;
  commercial_register_doc: string | null;
  company_license_doc: string | null;
  national_id_doc: string | null;
  user_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  profiles: { id: string; full_name: string } | null;
  commercial_register_expiry: string | null;
};

const STATUS_ORDER: Record<string, { label: string; color: string; bg: string }> = {
  new:        { label: "جديد",    color: "#0875dc", bg: "#eaf4ff" },
  pending:    { label: "انتظار",  color: "#b45309", bg: "#fef9ee" },
  processing: { label: "قيد التنفيذ", color: "#0f766e", bg: "#f0fdfa" },
  completed:  { label: "مكتمل",  color: "#15803d", bg: "#f0fdf4" },
  cancelled:  { label: "ملغي",   color: "#dc2626", bg: "#fef2f2" },
};
const STATUS_SUB: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: "نشط",    color: "#15803d", bg: "#f0fdf4" },
  pending:   { label: "انتظار", color: "#b45309", bg: "#fef9ee" },
  cancelled: { label: "ملغي",   color: "#dc2626", bg: "#fef2f2" },
  expired:   { label: "منتهي",  color: "#6b7280", bg: "#f3f4f6" },
};
const STATUS_INV: Record<string, { label: string; color: string; bg: string }> = {
  issued:    { label: "صادرة",  color: "#b45309", bg: "#fef9ee" },
  paid:      { label: "مدفوعة", color: "#15803d", bg: "#f0fdf4" },
  cancelled: { label: "ملغاة",  color: "#dc2626", bg: "#fef2f2" },
};
const STATUS_TKT: Record<string, { label: string; color: string; bg: string }> = {
  new:     { label: "جديدة",   color: "#0875dc", bg: "#eaf4ff" },
  open:    { label: "مفتوحة",  color: "#0f766e", bg: "#f0fdfa" },
  pending: { label: "انتظار",  color: "#b45309", bg: "#fef9ee" },
  resolved:{ label: "محلولة",  color: "#15803d", bg: "#f0fdf4" },
  closed:  { label: "مغلقة",   color: "#6b7280", bg: "#f3f4f6" },
};

function fmtDate(d: string) {
  return formatAppDate(d);
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2 }).format(n);
}
function Badge({ cfg }: { cfg: { label: string; color: string; bg: string } }) {
  return (
    <span style={{ fontSize: ".55rem", fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20 }}>
      {cfg.label}
    </span>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 12px", border: "1px solid #dce3eb",
  borderRadius: 8, fontSize: ".75rem", background: "#fff", outline: "none",
} as React.CSSProperties;

type Tab = "info" | "orders" | "subscriptions" | "invoices" | "tickets" | "docs";

export default function AdminClientsPage() {
  const { loading: authLoading } = useRoleGuard("admin");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [passModal, setPassModal] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");

  // Per-tab data
  const [clientDocs, setClientDocs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const router = useRouter();

  useEffect(() => { loadClients(); fetchRole(); }, []);

  useEffect(() => {
    if (!selected) {
      setClientDocs([]); setOrders([]); setSubscriptions([]); setInvoices([]); setTickets([]);
      return;
    }
    setActiveTab("info");
    loadTabData("info", selected.id);
  }, [selected]);

  useEffect(() => {
    if (selected) loadTabData(activeTab, selected.id);
  }, [activeTab]);

  async function loadTabData(tab: Tab, clientId: string) {
    if (tab === "info") {
      // docs
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.from("client_documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (data) {
        const withUrls = await Promise.all(data.map(async (d) => {
          const { data: signed } = await supabase.storage.from("client-documents").createSignedUrl(d.storage_path, 3600);
          return { ...d, signedUrl: signed?.signedUrl };
        }));
        setClientDocs(withUrls);
      }
      return;
    }
    setTabLoading(true);
    try {
      if (tab === "orders") {
        const r = await fetch(`/api/admin/orders?client_id=${clientId}`);
        const j = await r.json();
        setOrders(j.data || []);
      } else if (tab === "subscriptions") {
        const r = await fetch(`/api/admin/subscriptions?client_id=${clientId}`);
        const j = await r.json();
        setSubscriptions(j.data || []);
      } else if (tab === "invoices") {
        const r = await fetch(`/api/admin/invoices?client_id=${clientId}`);
        const j = await r.json();
        setInvoices(j.data || []);
      } else if (tab === "tickets") {
        const r = await fetch(`/api/admin/tickets?client_id=${clientId}`);
        const j = await r.json();
        setTickets(j.data || []);
      } else if (tab === "docs") {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.from("client_documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
        if (data) {
          const withUrls = await Promise.all(data.map(async (d) => {
            const { data: signed } = await supabase.storage.from("client-documents").createSignedUrl(d.storage_path, 3600);
            return { ...d, signedUrl: signed?.signedUrl };
          }));
          setClientDocs(withUrls);
        }
      }
    } finally {
      setTabLoading(false);
    }
  }

  async function fetchRole() {
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) {
        const payload = await res.json();
        const list: any[] = Array.isArray(payload?.members) ? payload.members : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        const uid = payload?.currentUserId ?? null;
        const me = list.find((m: any) => m.id === uid);
        if (me?.role) {
          setCurrentUserRole(me.role);
          if (me.role !== "admin") router.replace("/admin");
        }
      }
    } catch { }
  }

  const isAdmin = currentUserRole === "admin";

  async function loadClients() {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const { data } = await res.json();
        if (data) setClients(data as ClientRecord[]);
      }
    } catch { }
    setLoading(false);
  }

  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg); setNoticeType(type);
    window.setTimeout(() => setNotice(""), 2800);
  }

  async function toggleActive(client: ClientRecord) {
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ toggle_active: true }),
      });
      if (!res.ok) { showNotice("تعذر تغيير الحالة", "error"); return; }
      await loadClients();
      showNotice(client.active ? "تم إيقاف العميل" : "تم تفعيل العميل");
    } catch { showNotice("حدث خطأ", "error"); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, name: editing.name, phone: editing.phone, email: editing.email, commercial_number: editing.commercial_number, national_id: editing.national_id, notes: editing.notes }),
      });
      if (!res.ok) { showNotice("تعذر حفظ التعديلات", "error"); return; }
      const { data: updated } = await res.json();
      setSelected(updated);
      setEditing(null);
      loadClients();
      showNotice("تم حفظ التعديلات");
    } catch { showNotice("حدث خطأ", "error"); }
  }

  async function handleDelete(clientId: string) {
    try {
      const res = await fetch("/api/admin/clients", {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: clientId, permanent: false }),
      });
      if (!res.ok) { showNotice("تعذر حذف العميل", "error"); return; }
      await loadClients();
      setConfirmDelete(null);
      if (selected?.id === clientId) setSelected(null);
      showNotice("تم حذف العميل");
    } catch { showNotice("حدث خطأ", "error"); }
  }

  async function changeClientPassword() {
    if (!passModal || newPass.length < 6) { showNotice("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error"); return; }
    setPassLoading(true);
    try {
      const res = await fetch("/api/admin/clients/password", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: passModal, newPassword: newPass }),
      });
      if (!res.ok) { const err = await res.json(); showNotice(err.error || "تعذر تغيير كلمة المرور", "error"); }
      else showNotice("تم تغيير كلمة المرور بنجاح");
    } catch { showNotice("حدث خطأ", "error"); }
    setPassLoading(false); setPassModal(null); setNewPass("");
  }

  const userGroupMap = useMemo(() => {
    const map = new Map<string, { profile: ClientRecord["profiles"]; clients: ClientRecord[] }>();
    clients.forEach(c => {
      const key = c.user_id || `__orphan__${c.id}`;
      if (!map.has(key)) map.set(key, { profile: c.profiles, clients: [] });
      map.get(key)!.clients.push(c);
    });
    return map;
  }, [clients]);

  const accountRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("ar");
    const rows: { key: string; profile: ClientRecord["profiles"]; clients: ClientRecord[] }[] = [];
    for (const [key, group] of userGroupMap) {
      if (q && !`${group.profile?.full_name || ""} ${group.clients.map(c => c.name).join(" ")} ${group.clients.map(c => c.phone).join(" ")}`.toLocaleLowerCase("ar").includes(q)) continue;
      rows.push({ key, profile: group.profile, clients: group.clients });
    }
    return rows;
  }, [userGroupMap, search]);

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.active).length,
    inactive: clients.filter(c => !c.active).length,
    companies: clients.filter(c => c.client_type === "company").length,
    sharedAccounts: [...userGroupMap.values()].filter(g => g.clients.length > 1).length,
  }), [clients, userGroupMap]);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "info",          label: "المعلومات",    icon: <Info size={13} /> },
    { id: "orders",        label: "الطلبات",       icon: <ShoppingBag size={13} /> },
    { id: "subscriptions", label: "الاشتراكات",   icon: <Package size={13} /> },
    { id: "invoices",      label: "الفواتير",      icon: <Receipt size={13} /> },
    { id: "tickets",       label: "التذاكر",       icon: <MessageSquare size={13} /> },
    { id: "docs",          label: "المستندات",     icon: <FileText size={13} /> },
  ];

  if (authLoading) return <PageLoader text="جاري تحميل العملاء..." />;

  return (
    <div style={{ direction: "rtl", display: "flex", height: "calc(100vh - 60px)", overflow: "hidden" }}>

      {/* ── List pane ── */}
      <div style={{
        width: selected ? 320 : "100%", minWidth: selected ? 320 : undefined, flexShrink: 0,
        borderLeft: selected ? "1.5px solid #e8edf5" : "none",
        display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "width .2s",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 12px", borderBottom: "1.5px solid #e8edf5" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Users size={18} color="#073766" />
            <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#073766" }}>العملاء</h1>
            <span style={{ marginRight: "auto", fontSize: ".6rem", background: "#eaf4ff", color: "#0875dc", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>{clients.length}</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, background: "#f4f7fb", border: "1.5px solid #e8edf5", borderRadius: 9, padding: "7px 12px" }}>
            <Search size={13} color="#a0adb8" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم، الجوال..."
              style={{ background: "none", border: "none", outline: "none", fontSize: ".68rem", color: "#344d69", width: "100%" }} />
          </label>
        </div>

        {/* Stats — only when no client selected */}
        {!selected && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", borderBottom: "1.5px solid #e8edf5" }}>
            {[
              { icon: Users,     label: "إجمالي العملاء",  value: stats.total,          color: "#073766", bg: "#eaf4ff",  iconBg: "#d1e9ff" },
              { icon: UserCheck, label: "نشط",              value: stats.active,         color: "#15803d", bg: "#f0fdf4",  iconBg: "#bbf7d0" },
              { icon: UserX,     label: "موقوف",            value: stats.inactive,       color: "#dc2626", bg: "#fef2f2",  iconBg: "#fecaca" },
              { icon: Building2, label: "مؤسسات",           value: stats.companies,      color: "#0f766e", bg: "#f0fdfa",  iconBg: "#99f6e4" },
              { icon: Users,     label: "حسابات مشتركة",   value: stats.sharedAccounts, color: "#b45309", bg: "#fef9ee",  iconBg: "#fde68a" },
            ].map((card, i, a) => (
              <div key={card.label} style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "14px 8px",
                borderLeft: i < a.length - 1 ? "1px solid #e8edf5" : "none",
                background: "#fff",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: card.iconBg, display: "grid", placeItems: "center" }}>
                  <card.icon size={15} color={card.color} />
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: ".52rem", color: "#8b9dad", fontWeight: 600, textAlign: "center" }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Notice */}
        {notice && (
          <div style={{
            margin: "8px 16px 0", padding: "8px 12px", borderRadius: 8, fontSize: ".68rem",
            background: noticeType === "success" ? "#f0fdf4" : "#fef2f2",
            color: noticeType === "success" ? "#15803d" : "#dc2626",
            border: `1px solid ${noticeType === "success" ? "#bbf7d0" : "#fecaca"}`,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {noticeType === "success" ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
            {notice}
          </div>
        )}

        {/* Client list */}
        <div style={{ flex: 1, overflowY: "auto", padding: selected ? "8px 0" : "10px 14px", display: "flex", flexDirection: "column", gap: selected ? 0 : 6 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
          ) : accountRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8b9dad" }}>
              <Users size={28} style={{ opacity: .3, marginBottom: 8 }} />
              <p style={{ fontSize: ".7rem" }}>{search ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}</p>
            </div>
          ) : accountRows.map(acc => {
            const isActive = acc.clients.some(c => c.active);
            const isSelected = !!(selected && acc.clients.some(c => c.id === selected.id));
            const hasExpiry = acc.clients.some(c => c.commercial_register_expiry && Math.ceil((new Date(c.commercial_register_expiry).getTime() - Date.now()) / 86400000) < 0);
            const hasExpirySoon = !hasExpiry && acc.clients.some(c => c.commercial_register_expiry && Math.ceil((new Date(c.commercial_register_expiry).getTime() - Date.now()) / 86400000) <= 30);
            const avatarColors = [
              { bg: "#dbeafe", color: "#1d4ed8" }, { bg: "#dcfce7", color: "#15803d" },
              { bg: "#f3e8ff", color: "#0f766e" }, { bg: "#fef9c3", color: "#a16207" },
              { bg: "#ffe4e6", color: "#be123c" }, { bg: "#cffafe", color: "#0e7490" },
            ];
            const avatarColor = avatarColors[(acc.profile?.full_name || "?").charCodeAt(0) % avatarColors.length];
            const primaryClient = acc.clients[0];
            const allPhones = [...new Set(acc.clients.map(c => c.phone).filter(Boolean))];

            if (selected) {
              // Compact mode when detail panel open
              return (
                <div key={acc.key} onClick={() => setSelected(primaryClient)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderBottom: "1px solid #f0f4f8", cursor: "pointer",
                    background: isSelected ? "#eef5ff" : "transparent",
                    borderRight: isSelected ? "3px solid #0875dc" : "3px solid transparent",
                    opacity: isActive ? 1 : .55,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f7fafc"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: avatarColor.bg, color: avatarColor.color, display: "grid", placeItems: "center", fontSize: ".72rem", fontWeight: 800, flexShrink: 0 }}>
                    {(acc.profile?.full_name || "?").charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#1a2d40", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{acc.profile?.full_name || "بدون حساب"}</span>
                      {hasExpiry && <span style={{ fontSize: ".45rem", background: "#fef2f2", color: "#dc2626", padding: "1px 5px", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>منتهي</span>}
                    </div>
                    <div style={{ fontSize: ".56rem", color: "#8b9dad", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.clients.map(c => c.name).join("، ")}
                    </div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                </div>
              );
            }

            // Full card mode (no detail panel)
            return (
              <div key={acc.key} onClick={() => setSelected(primaryClient)}
                style={{
                  background: "#fff", border: `1.5px solid ${isSelected ? "#bddcff" : "#e8edf5"}`,
                  borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                  boxShadow: isSelected ? "0 0 0 3px rgba(8,117,220,.08)" : "0 1px 3px rgba(0,0,0,.04)",
                  opacity: isActive ? 1 : .65, transition: "box-shadow .15s, border-color .15s",
                }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)"; e.currentTarget.style.borderColor = "#c8d9ee"; } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.04)"; e.currentTarget.style.borderColor = "#e8edf5"; } }}>

                {/* Card — single row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: avatarColor.bg, color: avatarColor.color, display: "grid", placeItems: "center", fontSize: ".9rem", fontWeight: 800, flexShrink: 0 }}>
                    {(acc.profile?.full_name || "?").charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: ".73rem", fontWeight: 800, color: "#073766", marginBottom: 3 }}>{acc.profile?.full_name || "بدون حساب"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: ".58rem", color: "#8b9dad", direction: "ltr" }}>{allPhones[0]}</span>
                      {acc.clients.length > 1 && (
                        <span style={{ fontSize: ".5rem", background: "#f0f4f9", color: "#526983", padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>
                          {acc.clients.length} منشآت
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: ".52rem", fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: isActive ? "#f0fdf4" : "#fef2f2", color: isActive ? "#15803d" : "#dc2626" }}>
                      {isActive ? "● نشط" : "● موقوف"}
                    </span>
                    {hasExpiry && <span style={{ fontSize: ".49rem", background: "#fef2f2", color: "#dc2626", padding: "1px 7px", borderRadius: 20, fontWeight: 700, border: "1px solid #fecaca" }}>سجل منتهي</span>}
                    {hasExpirySoon && !hasExpiry && <span style={{ fontSize: ".49rem", background: "#fffbeb", color: "#d97706", padding: "1px 7px", borderRadius: 20, fontWeight: 700, border: "1px solid #fde68a" }}>سينتهي السجل التجاري قريباً</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail pane ── */}
      {selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: "#fff" }}>

          {/* Detail header */}
          <div style={{ padding: "16px 24px 0", borderBottom: "1.5px solid #e8edf5", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#eaf4ff", color: "#073766", display: "grid", placeItems: "center", fontWeight: 800, fontSize: ".85rem", flexShrink: 0 }}>
                {selected.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".85rem", fontWeight: 800, color: "#073766" }}>{selected.name}</div>
                <div style={{ fontSize: ".6rem", color: "#8b9dad", marginTop: 1 }}>
                  {selected.profiles?.full_name && <span>{selected.profiles.full_name} · </span>}
                  {selected.phone}
                  {selected.email && <span> · {selected.email}</span>}
                </div>
              </div>
              {/* Status badge */}
              <span style={{
                fontSize: ".58rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: selected.active ? "#f0fdf4" : "#fef2f2",
                color: selected.active ? "#15803d" : "#dc2626",
              }}>
                {selected.active ? "● نشط" : "● موقوف"}
              </span>
              {/* Actions */}
              {isAdmin && (
                <div style={{ display: "flex", gap: 5 }}>
                  <Btn icon={Edit2} label="تعديل" color="#0875dc" bg="#eaf4ff" onClick={() => setEditing({ ...selected })} />
                  <Btn icon={selected.active ? UserX : UserCheck} label={selected.active ? "إيقاف" : "تفعيل"}
                    color={selected.active ? "#dc2626" : "#15803d"}
                    bg={selected.active ? "#fef2f2" : "#f0fdf4"}
                    onClick={() => toggleActive(selected)} />
                  {selected.user_id && <Btn icon={KeyRound} label="كلمة المرور" color="#0f766e" bg="#f0fdfa" onClick={() => { setPassModal(selected.user_id!); setNewPass(""); }} />}
                  <Btn icon={Trash2} label="حذف" color="#dc2626" bg="#fef2f2" onClick={() => setConfirmDelete(selected.id)} />
                </div>
              )}
              <button onClick={() => setSelected(null)}
                style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e8edf5", background: "#f8fafc", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <X size={14} color="#7c8b9b" />
              </button>
            </div>

            {/* Confirm delete */}
            {confirmDelete === selected.id && (
              <div style={{ marginBottom: 10, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: ".65rem" }}>
                <AlertTriangle size={13} color="#dc2626" />
                <span style={{ flex: 1, color: "#991b1b", fontWeight: 600 }}>تأكيد حذف العميل؟</span>
                <button onClick={() => handleDelete(selected.id)} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: ".62rem", fontWeight: 600, cursor: "pointer" }}>احذف</button>
                <button onClick={() => setConfirmDelete(null)} style={{ background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 10px", fontSize: ".62rem", cursor: "pointer" }}>إلغاء</button>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: -1.5 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5, padding: "9px 14px",
                    fontSize: ".63rem", fontWeight: activeTab === t.id ? 800 : 600,
                    color: activeTab === t.id ? "#0875dc" : "#7c8b9b",
                    background: "none", border: "none", cursor: "pointer",
                    borderBottom: activeTab === t.id ? "2.5px solid #0875dc" : "2.5px solid transparent",
                    marginBottom: -1.5, whiteSpace: "nowrap",
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {tabLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
            ) : activeTab === "info" ? (
              <InfoTab client={selected} docs={clientDocs} />
            ) : activeTab === "orders" ? (
              <OrdersTab orders={orders} />
            ) : activeTab === "subscriptions" ? (
              <SubsTab subs={subscriptions} />
            ) : activeTab === "invoices" ? (
              <InvoicesTab invoices={invoices} />
            ) : activeTab === "tickets" ? (
              <TicketsTab tickets={tickets} />
            ) : (
              <DocsTab client={selected} docs={clientDocs} />
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#8b9dad" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0f4f8", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Users size={26} style={{ opacity: .35 }} />
            </div>
            <p style={{ fontSize: ".78rem", fontWeight: 600, color: "#5a6b7d" }}>اختر عميلاً لعرض ملفه الشامل</p>
            <p style={{ fontSize: ".62rem", marginTop: 4 }}>الطلبات · الاشتراكات · الفواتير · التذاكر</p>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "grid", placeItems: "center" }}
          onClick={() => setEditing(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, boxShadow: "0 16px 48px rgba(0,0,0,.18)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 800, color: "#073766" }}>تعديل {editing.name}</div>
              <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color="#8b9dad" /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "الاسم", key: "name" as const },
                { label: "الجوال", key: "phone" as const },
                { label: "البريد", key: "email" as const },
                { label: "السجل التجاري", key: "commercial_number" as const },
                { label: "رقم الهوية", key: "national_id" as const },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: ".6rem", color: "#6b7d93", fontWeight: 600, display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input value={(editing as any)[f.key] || ""} onChange={e => setEditing({ ...editing, [f.key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: ".6rem", color: "#6b7d93", fontWeight: 600, display: "block", marginBottom: 4 }}>ملاحظات</label>
                <textarea value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })}
                  rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={saveEdit} style={{ flex: 1, background: "#073766", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Save size={13} /> حفظ
                </button>
                <button onClick={() => setEditing(null)} style={{ flex: 1, background: "#f0f4f8", color: "#5a6b7d", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", cursor: "pointer" }}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password modal */}
      {passModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "grid", placeItems: "center" }}
          onClick={() => { if (!passLoading) setPassModal(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,.15)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: ".85rem", marginBottom: 16 }}>تغيير كلمة مرور العميل</h3>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="كلمة المرور الجديدة" autoFocus
              style={{ ...inputStyle, boxSizing: "border-box" as const }} />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={changeClientPassword} disabled={passLoading || newPass.length < 6}
                style={{ flex: 1, background: "#073766", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", fontWeight: 700, cursor: "pointer", opacity: (passLoading || newPass.length < 6) ? .5 : 1 }}>
                {passLoading ? "جاري..." : "حفظ"}
              </button>
              <button onClick={() => { if (!passLoading) setPassModal(null); }}
                style={{ flex: 1, background: "#f0f4f8", color: "#5a6b7d", border: "none", borderRadius: 8, padding: "10px 0", fontSize: ".73rem", cursor: "pointer" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Btn ── */
function Btn({ icon: Icon, label, color, bg, onClick }: { icon: any; label: string; color: string; bg: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, border: "none", borderRadius: 7, padding: "5px 10px", fontSize: ".6rem", fontWeight: 600, cursor: "pointer" }}
      onMouseEnter={e => e.currentTarget.style.opacity = ".8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      <Icon size={12} /> {label}
    </button>
  );
}

/* ── InfoRow ── */
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: "1px solid #f5f8fc" }}>
      <Icon size={14} color="#8b9dad" style={{ marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: ".57rem", color: "#8b9dad", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: ".7rem", color: "#344d69", fontWeight: 500, wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}

/* ── EmptyState ── */
function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#8b9dad" }}>
      <Icon size={28} style={{ opacity: .25, marginBottom: 10 }} />
      <p style={{ fontSize: ".7rem" }}>{text}</p>
    </div>
  );
}

/* ── Tab panels ── */

function InfoTab({ client, docs }: { client: ClientRecord; docs: any[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Left column */}
      <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontSize: ".65rem", fontWeight: 800, color: "#073766", marginBottom: 12 }}>بيانات العميل</div>
        <InfoRow icon={User} label="نوع العميل" value={client.client_type === "company" ? "مؤسسة / شركة" : "فرد"} />
        <InfoRow icon={Phone} label="الجوال" value={client.phone} />
        {client.email && <InfoRow icon={Mail} label="البريد الإلكتروني" value={client.email} />}
        {client.national_id && <InfoRow icon={CreditCard} label="رقم الهوية" value={client.national_id} />}
        {client.commercial_number && <InfoRow icon={FileText} label="السجل التجاري" value={client.commercial_number} />}
        {client.unified_register_number && <InfoRow icon={FileText} label="الرقم الموحد" value={client.unified_register_number} />}
        {client.company_address && <InfoRow icon={MapPin} label="العنوان" value={client.company_address} />}
        {client.company_activity && <InfoRow icon={Activity} label="النشاط التجاري" value={client.company_activity} />}
        {client.notes && <InfoRow icon={FileCheck} label="ملاحظات" value={client.notes} />}
        <InfoRow icon={Clock} label="تاريخ التسجيل" value={fmtDate(client.created_at)} />
      </div>
      {/* Right column - docs */}
      <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ fontSize: ".65rem", fontWeight: 800, color: "#073766", marginBottom: 12 }}>المستندات</div>
        {[
          { label: "السجل التجاري", path: client.commercial_register_doc },
          { label: "رخصة المنشأة", path: client.company_license_doc },
          { label: "صورة الهوية", path: client.national_id_doc },
        ].filter(d => d.path).map(d => (
          <DocLink key={d.label} label={d.label} path={d.path!} />
        ))}
        {docs.map(doc => (
          <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #f0f4f8" }}>
            <FileText size={13} color="#6b7d93" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".62rem", fontWeight: 600, color: "#1a2d40" }}>{doc.filename}</div>
              <div style={{ fontSize: ".53rem", color: "#8b9dad" }}>{fmtDate(doc.created_at)}</div>
            </div>
            {doc.signedUrl && (
              <a href={doc.signedUrl} target="_blank" rel="noopener"
                style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 6, background: "#eaf4ff", color: "#0875dc" }}>
                <Download size={11} />
              </a>
            )}
          </div>
        ))}
        {!client.commercial_register_doc && !client.company_license_doc && !client.national_id_doc && docs.length === 0 && (
          <p style={{ fontSize: ".65rem", color: "#b0bcc9" }}>لا توجد مستندات</p>
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  if (!orders.length) return <Empty icon={ShoppingBag} text="لا توجد طلبات لهذا العميل" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid #e8edf5", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 100px 120px 100px", background: "#f4f7fb", borderBottom: "1px solid #e8edf5" }}>
        {["رقم الطلب", "الخدمة", "الجهة", "الحالة", "التاريخ"].map((h, i, a) => (
          <div key={h} style={{ padding: "9px 12px", fontSize: ".55rem", fontWeight: 800, color: "#4a6075", borderLeft: i < a.length - 1 ? "1px solid #e8edf5" : "none" }}>{h}</div>
        ))}
      </div>
      {orders.map((o, i, a) => {
        const cfg = STATUS_ORDER[o.status] || { label: o.status, color: "#526983", bg: "#f3f4f6" };
        return (
          <div key={o.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 100px 120px 100px", borderBottom: i < a.length - 1 ? "1px solid #f0f4f8" : "none" }}>
            <div style={{ padding: "10px 12px", fontSize: ".6rem", fontWeight: 700, color: "#0875dc", fontFamily: "monospace", borderLeft: "1px solid #f0f4f8" }}>{o.reference_no || o.id?.slice(0,8)}</div>
            <div style={{ padding: "10px 12px", fontSize: ".63rem", color: "#334155", borderLeft: "1px solid #f0f4f8" }}>{o.service_name || o.description || "—"}</div>
            <div style={{ padding: "10px 12px", fontSize: ".58rem", color: "#526983", borderLeft: "1px solid #f0f4f8" }}>{o.government_entity || "—"}</div>
            <div style={{ padding: "10px 12px", borderLeft: "1px solid #f0f4f8" }}>
              <span style={{ fontSize: ".55rem", fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20 }}>{cfg.label}</span>
            </div>
            <div style={{ padding: "10px 12px", fontSize: ".58rem", color: "#526983" }}>{fmtDate(o.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function SubsTab({ subs }: { subs: any[] }) {
  if (!subs.length) return <Empty icon={Package} text="لا توجد اشتراكات لهذا العميل" />;
  return (
    <div style={{ border: "1px solid #e8edf5", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 100px 100px", background: "#f4f7fb", borderBottom: "1px solid #e8edf5" }}>
        {["الباقة", "الحالة", "دورة الفوترة", "المبلغ", "البداية"].map((h, i, a) => (
          <div key={h} style={{ padding: "9px 12px", fontSize: ".55rem", fontWeight: 800, color: "#4a6075", borderLeft: i < a.length - 1 ? "1px solid #e8edf5" : "none" }}>{h}</div>
        ))}
      </div>
      {subs.map((s, i, a) => {
        const cfg = STATUS_SUB[s.status] || { label: s.status, color: "#526983", bg: "#f3f4f6" };
        return (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 100px 100px", borderBottom: i < a.length - 1 ? "1px solid #f0f4f8" : "none" }}>
            <div style={{ padding: "10px 12px", fontSize: ".65rem", fontWeight: 700, color: "#073766", borderLeft: "1px solid #f0f4f8" }}>{s.packages?.name || s.package_name || "—"}</div>
            <div style={{ padding: "10px 12px", borderLeft: "1px solid #f0f4f8" }}>
              <span style={{ fontSize: ".55rem", fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20 }}>{cfg.label}</span>
            </div>
            <div style={{ padding: "10px 12px", fontSize: ".6rem", color: "#526983", borderLeft: "1px solid #f0f4f8" }}>{s.billing_cycle === "monthly" ? "شهري" : s.billing_cycle === "yearly" ? "سنوي" : s.billing_cycle || "—"}</div>
            <div style={{ padding: "10px 12px", fontSize: ".65rem", fontWeight: 700, color: "#073766", borderLeft: "1px solid #f0f4f8" }}>{s.amount ? fmtMoney(s.amount) : "—"}</div>
            <div style={{ padding: "10px 12px", fontSize: ".58rem", color: "#526983" }}>{s.start_date ? fmtDate(s.start_date) : "—"}</div>
          </div>
        );
      })}
    </div>
  );
}

function InvoicesTab({ invoices }: { invoices: any[] }) {
  if (!invoices.length) return <Empty icon={Receipt} text="لا توجد فواتير لهذا العميل" />;
  const total = invoices.filter(i => i.status === "paid").reduce((a, i) => a + i.total_amount, 0);
  return (
    <div>
      {total > 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={15} color="#15803d" />
          <span style={{ fontSize: ".68rem", color: "#15803d", fontWeight: 700 }}>إجمالي المدفوع: {fmtMoney(total)} ر.س</span>
        </div>
      )}
      <div style={{ border: "1px solid #e8edf5", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 110px 120px 100px 50px", background: "#f4f7fb", borderBottom: "1px solid #e8edf5" }}>
          {["رقم الفاتورة", "الخدمة", "الحالة", "الإجمالي", "التاريخ", ""].map((h, i, a) => (
            <div key={i} style={{ padding: "9px 12px", fontSize: ".55rem", fontWeight: 800, color: "#4a6075", borderLeft: i < a.length - 1 ? "1px solid #e8edf5" : "none" }}>{h}</div>
          ))}
        </div>
        {invoices.map((inv, i, a) => {
          const cfg = STATUS_INV[inv.status] || { label: inv.status, color: "#526983", bg: "#f3f4f6" };
          return (
            <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 110px 120px 100px 50px", borderBottom: i < a.length - 1 ? "1px solid #f0f4f8" : "none" }}>
              <div style={{ padding: "10px 12px", fontSize: ".6rem", fontWeight: 700, color: "#0875dc", fontFamily: "monospace", borderLeft: "1px solid #f0f4f8" }}>{inv.invoice_number}</div>
              <div style={{ padding: "10px 12px", fontSize: ".63rem", color: "#334155", borderLeft: "1px solid #f0f4f8" }}>{inv.service_name || inv.description}</div>
              <div style={{ padding: "10px 12px", borderLeft: "1px solid #f0f4f8" }}>
                <span style={{ fontSize: ".55rem", fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20 }}>{cfg.label}</span>
              </div>
              <div style={{ padding: "10px 12px", fontSize: ".65rem", fontWeight: 700, color: "#073766", borderLeft: "1px solid #f0f4f8" }}>{fmtMoney(inv.total_amount)}</div>
              <div style={{ padding: "10px 12px", fontSize: ".58rem", color: "#526983", borderLeft: "1px solid #f0f4f8" }}>{fmtDate(inv.created_at)}</div>
              <div style={{ padding: "10px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener"
                  style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 6, background: "#eaf4ff", color: "#0875dc" }}>
                  <Eye size={11} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketsTab({ tickets }: { tickets: any[] }) {
  if (!tickets.length) return <Empty icon={MessageSquare} text="لا توجد تذاكر لهذا العميل" />;
  return (
    <div style={{ border: "1px solid #e8edf5", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 100px", background: "#f4f7fb", borderBottom: "1px solid #e8edf5" }}>
        {["العنوان", "الحالة", "الأولوية", "التاريخ"].map((h, i, a) => (
          <div key={h} style={{ padding: "9px 12px", fontSize: ".55rem", fontWeight: 800, color: "#4a6075", borderLeft: i < a.length - 1 ? "1px solid #e8edf5" : "none" }}>{h}</div>
        ))}
      </div>
      {tickets.map((t, i, a) => {
        const cfg = STATUS_TKT[t.status] || { label: t.status, color: "#526983", bg: "#f3f4f6" };
        const priColor = t.priority === "urgent" ? "#dc2626" : t.priority === "high" ? "#b45309" : "#8b9dad";
        return (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 100px 100px", borderBottom: i < a.length - 1 ? "1px solid #f0f4f8" : "none" }}>
            <div style={{ padding: "10px 12px", borderLeft: "1px solid #f0f4f8" }}>
              <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#073766" }}>{t.title}</div>
              <div style={{ fontSize: ".55rem", color: "#a0adb8", marginTop: 2 }}>{t.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div style={{ padding: "10px 12px", borderLeft: "1px solid #f0f4f8" }}>
              <span style={{ fontSize: ".55rem", fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "2px 8px", borderRadius: 20 }}>{cfg.label}</span>
            </div>
            <div style={{ padding: "10px 12px", fontSize: ".6rem", color: priColor, fontWeight: 600, borderLeft: "1px solid #f0f4f8" }}>
              {t.priority === "urgent" ? "● عاجلة" : t.priority === "high" ? "● مرتفعة" : "● عادية"}
            </div>
            <div style={{ padding: "10px 12px", fontSize: ".58rem", color: "#526983" }}>{fmtDate(t.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function DocsTab({ client, docs }: { client: ClientRecord; docs: any[] }) {
  const hasAny = client.commercial_register_doc || client.company_license_doc || client.national_id_doc || docs.length > 0;
  if (!hasAny) return <Empty icon={FileText} text="لا توجد مستندات مرفوعة" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { label: "السجل التجاري", path: client.commercial_register_doc },
        { label: "رخصة المنشأة", path: client.company_license_doc },
        { label: "صورة الهوية", path: client.national_id_doc },
      ].filter(d => d.path).map(d => <DocLink key={d.label} label={d.label} path={d.path!} />)}
      {docs.map(doc => (
        <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: 10 }}>
          <FileText size={15} color="#6b7d93" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: ".65rem", fontWeight: 600, color: "#1a2d40" }}>{doc.filename}</div>
            <div style={{ fontSize: ".55rem", color: "#8b9dad", marginTop: 2 }}>{doc.original_name} · {fmtDate(doc.created_at)}</div>
          </div>
          {doc.signedUrl && (
            <a href={doc.signedUrl} target="_blank" rel="noopener"
              style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: "#eaf4ff", color: "#0875dc" }}>
              <Download size={13} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function DocLink({ label, path }: { label: string; path: string }) {
  const supabase = createSupabaseBrowserClient();
  const [url, setUrl] = useState("");
  useEffect(() => {
    supabase.storage.from("client-documents").createSignedUrl(path, 3600).then(({ data }) => { if (data) setUrl(data.signedUrl); });
  }, [path]);
  return (
    <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <FileText size={15} color="#6b7d93" />
      <span style={{ flex: 1, fontSize: ".65rem", color: "#344d69", fontWeight: 600 }}>{label}</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".6rem", color: "#0875dc", textDecoration: "none", background: "#eaf4ff", padding: "4px 10px", borderRadius: 6 }}>
          <ExternalLink size={10} /> فتح
        </a>
      ) : (
        <span style={{ fontSize: ".58rem", color: "#b0bcc9" }}>جاري...</span>
      )}
    </div>
  );
}
