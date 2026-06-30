"use client";
import { useEffect, useState } from "react";
import {
  ClipboardList, Search, AlertCircle,
  Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle,
  ChevronLeft, Package, TrendingUp, Hourglass,
} from "lucide-react";
import Link from "next/link";
import { formatAppDate, formatAppRelativeTime } from "@/lib/date-format";

type Order = {
  id: string;
  reference_no: string;
  service_name: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  new:               { label: "جديد",              color: "#0875dc", bg: "#eaf4ff", border: "#bddcff", icon: <Clock size={11} /> },
  waiting_documents: { label: "بانتظار المستندات", color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", icon: <AlertTriangle size={11} /> },
  in_progress:       { label: "قيد التنفيذ",       color: "#b45309", bg: "#fef9ee", border: "#fde68a", icon: <RefreshCw size={11} /> },
  completed:         { label: "مكتمل",             color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle size={11} /> },
  cancelled:         { label: "ملغي",              color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <XCircle size={11} /> },
  blocked:           { label: "معلق",              color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <AlertCircle size={11} /> },
};

const TABS = [
  { key: "",                  label: "الكل" },
  { key: "new",               label: "جديد" },
  { key: "waiting_documents", label: "بانتظار مستندات" },
  { key: "in_progress",       label: "قيد التنفيذ" },
  { key: "completed",         label: "مكتمل" },
  { key: "cancelled",         label: "ملغي" },
  { key: "blocked",           label: "معلق" },
  { key: "__archive__",       label: "الأرشيف" },
];

const ARCHIVE_STATUSES = ["completed", "cancelled"];

const PRIORITY_ACCENT: Record<string, { color: string; label: string }> = {
  urgent: { color: "#dc2626", label: "عاجل" },
  high:   { color: "#ea580c", label: "مرتفع" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/client/orders");
        if (!r.ok) { setError("تعذّر تحميل الطلبات، حاول مجدداً"); return; }
        const j = await r.json();
        setOrders(j.data ?? []);
      } catch {
        setError("تعذّر الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function tabCount(key: string) {
    if (key === "") return orders.length;
    if (key === "__archive__") return orders.filter(o => ARCHIVE_STATUSES.includes(o.status)).length;
    return orders.filter(o => o.status === key).length;
  }

  const filtered = orders.filter(o => {
    const matchSearch = `${o.reference_no} ${o.service_name || ""}`.toLowerCase().includes(search.toLowerCase());
    let matchTab = false;
    if (activeTab === "") matchTab = true;
    else if (activeTab === "__archive__") matchTab = ARCHIVE_STATUSES.includes(o.status);
    else matchTab = o.status === activeTab;
    return matchSearch && matchTab;
  });

  const activeOrders  = orders.filter(o => ["new", "in_progress", "waiting_documents", "blocked"].includes(o.status));
  const completedCount = orders.filter(o => o.status === "completed").length;
  const waitingDocs   = orders.filter(o => o.status === "waiting_documents").length;
  const inProgress    = orders.filter(o => o.status === "in_progress").length;

  return (
    <div className="client-dash-page" style={{ paddingBottom: 32 }}>

      {/* ── Page title ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 className="client-dash-page-title" style={{ marginBottom: 3 }}>طلباتي</h2>
        <p className="client-dash-page-desc" style={{ margin: 0 }}>تتبّع جميع الطلبات التي يُنفّذها فريق أتمم لصالحك</p>
      </div>

      {/* ── Stats row ── */}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>

          {/* Active */}
          <div style={{ background: "#073766", borderRadius: 16, padding: "16px 16px 14px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -16, left: -16, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
            <div style={{ position: "absolute", bottom: -10, right: -10, width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", marginBottom: 10 }}>
                <TrendingUp size={16} color="#fff" />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{activeOrders.length}</div>
              <div style={{ fontSize: ".6rem", color: "rgba(255,255,255,.6)", marginTop: 5, fontWeight: 600 }}>طلب نشط</div>
            </div>
          </div>

          {/* In progress */}
          <div style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: 16, padding: "16px 16px 14px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#fef9ee", display: "grid", placeItems: "center", marginBottom: 10 }}>
              <Hourglass size={15} color="#b45309" />
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#b45309", lineHeight: 1 }}>{inProgress}</div>
            <div style={{ fontSize: ".6rem", color: "#92400e", marginTop: 5, fontWeight: 600 }}>قيد التنفيذ</div>
          </div>

          {/* Completed */}
          <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 16, padding: "16px 16px 14px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#f0fdf4", display: "grid", placeItems: "center", marginBottom: 10 }}>
              <CheckCircle size={15} color="#15803d" />
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#15803d", lineHeight: 1 }}>{completedCount}</div>
            <div style={{ fontSize: ".6rem", color: "#166534", marginTop: 5, fontWeight: 600 }}>مكتمل</div>
          </div>

        </div>
      )}

      {/* ── Waiting docs alert ── */}
      {!loading && waitingDocs > 0 && (
        <div style={{ background: "#f0fdfa", border: "1px solid #bae6fd", borderRadius: 12, padding: "11px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#0f766e", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <AlertTriangle size={14} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: ".68rem", fontWeight: 800, color: "#073766" }}>مطلوب منك إجراء</div>
            <div style={{ fontSize: ".6rem", color: "#073766" }}>{waitingDocs} طلب بانتظار رفع المستندات</div>
          </div>
          <button onClick={() => setActiveTab("waiting_documents")} style={{ marginRight: "auto", fontSize: ".6rem", fontWeight: 700, color: "#0f766e", background: "rgba(124,58,237,.1)", border: "1px solid #bae6fd", borderRadius: 8, padding: "5px 12px", cursor: "pointer", font: "inherit" }}>
            عرض
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.map(tab => {
            const count = tabCount(tab.key);
            const isActive = activeTab === tab.key;
            const cfg = tab.key && tab.key !== "__archive__" ? STATUS_CONFIG[tab.key] : null;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "8px 18px", borderRadius: 8, border: "none",
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                transition: "all .2s", font: "inherit",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? (cfg?.color || "#073766") : "#64748b",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}>
                {tab.label}
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8, display: "grid", placeItems: "center", padding: "0 4px", background: isActive ? (cfg?.color || "#073766") : "#e5eaf0", color: isActive ? "#fff" : "#6b7280" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search ── */}
      {!loading && !error && orders.length > 0 && (
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#8b9dad", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث برقم الطلب أو اسم الخدمة..."
            style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "9px 36px 9px 14px", fontSize: ".72rem", outline: "none", boxSizing: "border-box", background: "#f8fafc", font: "inherit" }}
          />
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ background: "#f5f8fc", borderRadius: 14, height: 86, animation: "pulse 1.5s ease-in-out infinite" }} />)}
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 60, background: "#fff8f8", borderRadius: 16, border: "1px solid #fecaca" }}>
          <AlertCircle size={36} color="#f87171" style={{ marginBottom: 12 }} />
          <p style={{ color: "#dc2626", fontSize: ".75rem", margin: "0 0 12px" }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", fontSize: ".68rem", cursor: "pointer" }}>إعادة المحاولة</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "52px 20px", background: "#fff", borderRadius: 16, border: "1px solid #e5ecf3" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0f4f9", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
            <Package size={26} color="#8b9dad" />
          </div>
          <p style={{ color: "#8b9dad", fontSize: ".75rem", margin: 0 }}>
            {orders.length === 0 ? "لا توجد طلبات بعد — سيقوم فريقنا بإرسال طلباتك هنا" : search ? "لا توجد نتائج مطابقة" : "لا توجد طلبات في هذه الفئة"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", icon: <ClipboardList size={11} /> };
            const priority = PRIORITY_ACCENT[order.priority];
            const needsClient = order.status === "waiting_documents";
            return (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div style={{
                  background: "#fff",
                  border: `1.5px solid ${needsClient ? "#99f6e4" : "#dbe5ef"}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  transition: "all .15s",
                  boxShadow: needsClient ? "0 8px 24px rgba(15,118,110,.1)" : "0 3px 14px rgba(7,55,102,.06)",
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(8,117,220,.12)"; e.currentTarget.style.borderColor = needsClient ? "#14b8a6" : "#bddcff"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = needsClient ? "0 8px 24px rgba(15,118,110,.1)" : "0 3px 14px rgba(7,55,102,.06)"; e.currentTarget.style.borderColor = needsClient ? "#99f6e4" : "#dbe5ef"; e.currentTarget.style.transform = "none"; }}
                >
                  {/* Top status stripe */}
                  <div style={{ height: 3, background: cfg.color, opacity: .7 }} />

                  <div style={{ padding: "15px 16px 14px", display: "flex", alignItems: "center", gap: 13 }}>
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: ".6rem", fontFamily: "monospace", color: "#8b9dad", fontWeight: 700, background: "#f5f8fc", padding: "2px 8px", borderRadius: 6, border: "1px solid #e8edf5" }}>
                          مرجع {order.reference_no}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".57rem", padding: "2px 8px", borderRadius: 20, border: `1px solid ${cfg.border}`, color: cfg.color, background: cfg.bg, fontWeight: 700 }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {needsClient && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".56rem", padding: "2px 8px", borderRadius: 20, border: "1px solid #99f6e4", color: "#0f766e", background: "#f0fdfa", fontWeight: 900 }}>
                            <AlertTriangle size={10} /> بانتظار ردك
                          </span>
                        )}
                        {priority && (
                          <span style={{ fontSize: ".55rem", padding: "2px 7px", borderRadius: 20, fontWeight: 700, color: "#fff", background: priority.color }}>
                            {priority.label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: ".75rem", fontWeight: 700, color: "#1a2d40", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                        {order.service_name || "خدمة"}
                      </div>
                      <div style={{ fontSize: ".58rem", color: "#7c8b9b", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={10} /> فتح: {formatAppDate(order.created_at)}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#526983", fontWeight: 700 }}>
                          <RefreshCw size={10} /> آخر تحديث: {formatAppRelativeTime(order.updated_at || order.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronLeft size={15} color="#c8d5e3" style={{ flexShrink: 0 }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
