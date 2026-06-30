"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList, FileText, MessageSquare, ArrowLeft, Plus,
  Building2, CalendarX, CalendarClock, CreditCard, Package,
  CalendarDays, Bell, CheckCircle, AlertCircle, Layers,
} from "lucide-react";
import Link from "next/link";
import { formatAppDate, formatAppFullDateTime } from "@/lib/date-format";

type Order   = { id: string; reference_no: string; service_name?: string; status: string; created_at: string };
type Ticket  = { id: string; title: string; status: string; updated_at: string; priority: string; client?: { name: string } };
type Invoice = { id: string; invoice_number: string; total_amount: number; due_date: string | null; service_name: string | null };
type CompanyExpiry = { id: string; name: string; expiryDate: string; status: "expired" | "soon"; days: number };

type Stats = {
  totalOrders: number; activeOrders: number;
  totalTickets: number; openTickets: number;
  unpaidCount: number; unpaidTotal: number;
  activeSubscriptions: number;
};

type OrderCounts = { new: number; in_progress: number; waiting_documents: number; completed: number; cancelled: number; blocked: number };

function getExpiryDays(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { status: "expired" as const, days: Math.abs(diff) };
  if (diff <= 30) return { status: "soon"    as const, days: diff };
  return { status: "ok" as const, days: diff };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء النور";
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new:               { label: "جديد",              color: "#0875dc", bg: "#eaf4ff" },
  in_progress:       { label: "قيد التنفيذ",       color: "#b45309", bg: "#fef9ee" },
  waiting_documents: { label: "بانتظار المستندات", color: "#0f766e", bg: "#f0fdfa" },
  completed:         { label: "مكتمل",             color: "#15803d", bg: "#f0fdf4" },
  cancelled:         { label: "ملغي",              color: "#6b7280", bg: "#f3f4f6" },
  blocked:           { label: "موقوف",             color: "#dc2626", bg: "#fef2f2" },
  "جديدة":          { label: "جديدة",             color: "#0875dc", bg: "#eaf4ff" },
  "قيد المراجعة":   { label: "قيد المراجعة",      color: "#b45309", bg: "#fef9ee" },
  "بانتظار العميل": { label: "بانتظار ردك",       color: "#0f766e", bg: "#f0fdfa" },
  "تم الحل":        { label: "تم الحل",           color: "#15803d", bg: "#f0fdf4" },
  "مغلقة":          { label: "مغلقة",             color: "#6b7280", bg: "#f3f4f6" },
};

/* ── Donut chart (pure SVG, no library) ── */
function DonutChart({ counts }: { counts: OrderCounts }) {
  const segments = [
    { key: "new",               label: "جديد",        color: "#0875dc", value: counts.new },
    { key: "in_progress",       label: "قيد التنفيذ", color: "#b45309", value: counts.in_progress },
    { key: "waiting_documents", label: "بانتظار",     color: "#0f766e", value: counts.waiting_documents },
    { key: "completed",         label: "مكتمل",       color: "#15803d", value: counts.completed },
    { key: "cancelled",         label: "ملغي",        color: "#94a3b8", value: counts.cancelled + counts.blocked },
  ].filter(s => s.value > 0);

  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 12 }}>لا توجد طلبات بعد</div>
  );

  const R = 34, cx = 44, cy = 44, stroke = 12;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <svg width={88} height={88} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segments.map(seg => {
          const dash = (seg.value / total) * circ;
          const gap  = circ - dash;
          const el = (
            <circle key={seg.key} cx={cx} cy={cy} r={R} fill="none"
              stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, transition: "stroke-dasharray .6s ease" }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight={800} fill="#073766">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#8b9dad">طلب</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {segments.map(seg => (
          <div key={seg.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#526983", flex: 1 }}>{seg.label}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#073766" }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [stats, setStats]     = useState<Stats>({ totalOrders: 0, activeOrders: 0, totalTickets: 0, openTickets: 0, unpaidCount: 0, unpaidTotal: 0, activeSubscriptions: 0 });
  const [counts, setCounts]   = useState<OrderCounts>({ new: 0, in_progress: 0, waiting_documents: 0, completed: 0, cancelled: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [name, setName]       = useState("");
  const [recentOrders, setRecentOrders]       = useState<Order[]>([]);
  const [recentTickets, setRecentTickets]     = useState<Ticket[]>([]);
  const [needsReply, setNeedsReply]           = useState<Ticket[]>([]);
  const [unpaidInvoices, setUnpaidInvoices]   = useState<Invoice[]>([]);
  const [expiryAlerts, setExpiryAlerts]       = useState<CompanyExpiry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard/summary");
        if (!res.ok) return;
        const d = await res.json();

        setName(d.profile?.full_name || "");
        setStats(d.stats);
        setCounts(d.orderStatusCounts || {});
        setRecentOrders(d.recentOrders || []);
        setRecentTickets(d.recentTickets || []);
        setNeedsReply(d.needsResponseTickets || []);
        setUnpaidInvoices(d.unpaidInvoices || []);

        const alerts: CompanyExpiry[] = [];
        for (const c of (d.clients || []) as { id: string; name: string; commercial_register_expiry: string }[]) {
          if (!c.commercial_register_expiry) continue;
          const r = getExpiryDays(c.commercial_register_expiry);
          if (r.status === "expired" || r.status === "soon")
            alerts.push({ id: c.id, name: c.name, expiryDate: c.commercial_register_expiry, status: r.status, days: r.days });
        }
        setExpiryAlerts(alerts);
      } catch { /* keep empty */ } finally { setLoading(false); }
    })();
  }, []);

  const attentionCount = needsReply.length + unpaidInvoices.length + expiryAlerts.length;

  return (
    <div className="client-dash-page">

      {/* ── Welcome ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: ".68rem", color: "#8b9dad", margin: "0 0 4px" }}>
          {formatAppFullDateTime(new Date())}
        </p>
        <h2 style={{ margin: "0 0 3px", fontSize: "1.25rem", color: "#073766", fontWeight: 800 }}>
          {getGreeting()}{name ? `، ${name}` : ""}
        </h2>
        <p style={{ margin: 0, fontSize: ".72rem", color: "#7a8fa6" }}>تابع طلباتك، فواتيرك، واشتراكاتك في مكان واحد.</p>
      </div>

      {/* ── 4 KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "الطلبات", value: stats.totalOrders, sub: `${stats.activeOrders} نشط`, icon: ClipboardList, color: "#073766", bg: "#eaf1fb", href: "/dashboard/orders" },
          { label: "التذاكر", value: stats.openTickets, sub: "مفتوحة", icon: MessageSquare, color: "#0f766e", bg: "#f0fdfa", href: "/dashboard/tickets" },
          { label: "فواتير غير مدفوعة", value: stats.unpaidCount, sub: stats.unpaidTotal > 0 ? `${stats.unpaidTotal.toLocaleString("ar-SA")} ر.س` : "لا يوجد", icon: CreditCard, color: "#b45309", bg: "#fef9ee", href: "/dashboard/invoices" },
          { label: "اشتراكات نشطة", value: stats.activeSubscriptions, sub: "اشتراك", icon: Layers, color: "#0f766e", bg: "#f0fdfa", href: "/dashboard/subscriptions" },
        ].map(c => (
          <Link key={c.label} href={c.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "#fff", border: "1.5px solid #e8edf5", borderRadius: 14, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, transition: "all .15s", height: "100%", boxSizing: "border-box" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.boxShadow = `0 4px 16px ${c.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8edf5"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: c.bg, display: "grid", placeItems: "center" }}>
                <c.icon size={16} color={c.color} />
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: c.color, lineHeight: 1 }}>
                {loading ? "—" : c.value}
              </div>
              <div>
                <div style={{ fontSize: ".6rem", color: "#526983", fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontSize: ".55rem", color: "#94a3b8", marginTop: 1 }}>{loading ? "" : c.sub}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Needs Attention ── */}
      {attentionCount > 0 && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Bell size={15} color="#b45309" />
            <span style={{ fontSize: ".75rem", fontWeight: 800, color: "#92400e" }}>يحتاج انتباهك</span>
            <span style={{ background: "#b45309", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{attentionCount}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {expiryAlerts.map(a => (
              <Link key={a.id} href="/dashboard/companies" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", borderRadius: 10, border: `1px solid ${a.status === "expired" ? "#fecaca" : "#fde68a"}` }}>
                  {a.status === "expired" ? <CalendarX size={15} color="#dc2626" /> : <CalendarClock size={15} color="#d97706" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: ".7rem", fontWeight: 700, color: a.status === "expired" ? "#991b1b" : "#92400e" }}>
                      {a.status === "expired" ? `السجل التجاري لـ "${a.name}" منتهي منذ ${a.days} يوم` : `بقي ${a.days} يوم على انتهاء سجل "${a.name}"`}
                    </span>
                  </div>
                  <span style={{ fontSize: ".62rem", fontWeight: 700, color: a.status === "expired" ? "#dc2626" : "#d97706", flexShrink: 0 }}>تجديد ←</span>
                </div>
              </Link>
            ))}
            {unpaidInvoices.map(inv => (
              <Link key={inv.id} href="/dashboard/invoices" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", borderRadius: 10, border: "1px solid #fed7aa" }}>
                  <CreditCard size={15} color="#b45309" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#92400e" }}>
                      فاتورة غير مدفوعة — {inv.total_amount.toLocaleString("ar-SA")} ر.س
                    </span>
                    <div style={{ fontSize: ".6rem", color: "#94a3b8", marginTop: 1 }}>{inv.invoice_number}{inv.service_name ? ` · ${inv.service_name}` : ""}</div>
                  </div>
                  <span style={{ fontSize: ".62rem", fontWeight: 700, color: "#b45309", flexShrink: 0 }}>عرض ←</span>
                </div>
              </Link>
            ))}
            {needsReply.map(t => (
              <Link key={t.id} href={`/dashboard/tickets/${t.id}`} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fff", borderRadius: 10, border: "1px solid #99f6e4" }}>
                  <MessageSquare size={15} color="#0f766e" />
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#073766", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                      تذكرة تنتظر ردك — {t.title}
                    </span>
                  </div>
                  <span style={{ fontSize: ".62rem", fontWeight: 700, color: "#0f766e", flexShrink: 0 }}>رد ←</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div style={{ background: "linear-gradient(135deg, #063461 0%, #0e4d8c 100%)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 12px", fontSize: ".7rem", color: "rgba(255,255,255,.65)", fontWeight: 700, letterSpacing: .3 }}>إجراءات سريعة</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { href: "/dashboard/tickets/new",     icon: Plus,         label: "فتح تذكرة دعم",     primary: true },
            { href: "/dashboard/services",         icon: Package,      label: "طلب خدمة",           primary: false },
            { href: "/dashboard/services?tab=consultations", icon: CalendarDays, label: "جدولة استشارة", primary: false },
            { href: "/dashboard/companies",        icon: Building2,    label: "بيانات المنشأة",     primary: false },
            { href: "/dashboard/documents",        icon: FileText,     label: "رفع مستند",          primary: false },
          ].map(a => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9, padding: "8px 14px", fontSize: ".7rem", fontWeight: 700, textDecoration: "none", transition: "all .15s", background: a.primary ? "#fff" : "rgba(255,255,255,.13)", color: a.primary ? "#073766" : "#fff", border: a.primary ? "none" : "1px solid rgba(255,255,255,.2)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = ".85"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
                <Icon size={13} /> {a.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Row 1: Donut + Orders ── */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, marginBottom: 14 }}>

        {/* Donut chart */}
        <div style={{ background: "#fff", border: "1.5px solid #e8edf5", borderRadius: 14, padding: "14px 16px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: ".7rem", color: "#073766", fontWeight: 800 }}>حالات الطلبات</h3>
          {loading ? (
            <div style={{ display: "grid", placeItems: "center", height: 88 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "3px solid #e5ecf3", borderTopColor: "#073766", animation: "spin .7s linear infinite" }} />
            </div>
          ) : <DonutChart counts={counts} />}
        </div>

        {/* Recent orders — cards */}
        <div style={{ background: "#fff", border: "1.5px solid #e8edf5", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f3f8" }}>
            <h3 style={{ margin: 0, fontSize: ".78rem", color: "#073766", fontWeight: 800 }}>آخر الطلبات</h3>
            <Link href="/dashboard/orders" style={{ fontSize: ".62rem", color: "#0875dc", textDecoration: "none", fontWeight: 700 }}>عرض الكل ←</Link>
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
          ) : recentOrders.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center", color: "#8b9dad" }}>
              <ClipboardList size={26} style={{ opacity: .25, display: "block", margin: "0 auto 8px" }} />
              <p style={{ margin: 0, fontSize: ".7rem" }}>لا توجد طلبات بعد</p>
              <Link href="/dashboard/services" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: ".68rem", color: "#0875dc", textDecoration: "none", fontWeight: 700 }}>
                <Plus size={12} /> طلب خدمة جديدة
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px" }}>
              {recentOrders.map(order => {
                const s = STATUS_LABELS[order.status] || { label: order.status, color: "#6b7280", bg: "#f3f4f6" };
                const isWaiting = order.status === "waiting_documents";
                return (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      border: `1.5px solid ${isWaiting ? "#fde68a" : "#e8edf5"}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: isWaiting ? "#fffbeb" : "#fff",
                      transition: "box-shadow .15s",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(7,55,102,.08)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                      {/* top row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: "#eaf1fb", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <ClipboardList size={13} color="#073766" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#1e3a56", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {order.service_name || "—"}
                          </div>
                          <div style={{ fontSize: ".57rem", color: "#94a3b8", marginTop: 1, fontFamily: "monospace" }}>{order.reference_no}</div>
                        </div>
                        <span style={{ fontSize: ".57rem", padding: "3px 8px", borderRadius: 20, color: s.color, background: s.bg, fontWeight: 700, flexShrink: 0, border: `1px solid ${s.color}22` }}>{s.label}</span>
                      </div>
                      {/* bottom row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6, borderTop: "1px dashed #e8edf5" }}>
                        <span style={{ fontSize: ".57rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}>
                          <CalendarDays size={10} /> تاريخ الطلب: {formatAppDate(order.created_at)}
                        </span>
                        {isWaiting && (
                          <span style={{ marginRight: "auto", fontSize: ".57rem", color: "#b45309", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                            <AlertCircle size={10} /> مطلوب مستندات
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>{/* end Row 1 grid */}

      {/* ── Row 2: Tickets full width — cards grid ── */}
      <div style={{ background: "#fff", border: "1.5px solid #e8edf5", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f3f8" }}>
          <h3 style={{ margin: 0, fontSize: ".78rem", color: "#073766", fontWeight: 800 }}>التذاكر النشطة</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {stats.openTickets > 0 && (
              <span style={{ background: "#eaf1fb", color: "#073766", borderRadius: 20, padding: "2px 10px", fontSize: ".58rem", fontWeight: 800 }}>{stats.openTickets} مفتوحة</span>
            )}
            <Link href="/dashboard/tickets" style={{ fontSize: ".62rem", color: "#0875dc", textDecoration: "none", fontWeight: 700 }}>عرض الكل ←</Link>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#8b9dad", fontSize: ".7rem" }}>جاري التحميل...</div>
        ) : recentTickets.length === 0 ? (
          <div style={{ padding: "28px 18px", textAlign: "center", color: "#8b9dad" }}>
            <MessageSquare size={26} style={{ opacity: .25, display: "block", margin: "0 auto 8px" }} />
            <p style={{ margin: "0 0 8px", fontSize: ".7rem" }}>لا توجد تذاكر نشطة</p>
            <Link href="/dashboard/tickets/new" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".68rem", color: "#0875dc", textDecoration: "none", fontWeight: 700 }}>
              <Plus size={12} /> افتح تذكرة الآن
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, padding: "12px 14px" }}>
            {recentTickets.map(ticket => {
              const s = STATUS_LABELS[ticket.status] || { label: ticket.status, color: "#6b7280", bg: "#f3f4f6" };
              const isUrgent = ticket.priority === "عاجلة";
              const needsMe  = ticket.status === "بانتظار العميل";
              const accentColor = needsMe ? "#0f766e" : isUrgent ? "#dc2626" : "#073766";
              const accentBg    = needsMe ? "#f0fdfa" : isUrgent ? "#fef2f2" : "#eaf1fb";
              return (
                <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    border: `1.5px solid ${needsMe ? "#99f6e4" : isUrgent ? "#fecaca" : "#e8edf5"}`,
                    borderRadius: 10,
                    padding: "11px 13px",
                    background: "#fff",
                    borderRight: `3px solid ${accentColor}`,
                    transition: "box-shadow .15s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(7,55,102,.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>

                    {/* top: icon + title + status */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: accentBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {needsMe ? <AlertCircle size={13} color={accentColor} /> : <MessageSquare size={13} color={accentColor} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#1e3a56", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ticket.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                          <span style={{ fontSize: ".57rem", padding: "2px 8px", borderRadius: 20, color: s.color, background: s.bg, fontWeight: 700, border: `1px solid ${s.color}22` }}>{s.label}</span>
                          {isUrgent && <span style={{ fontSize: ".55rem", background: "#fef2f2", color: "#dc2626", borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>عاجل</span>}
                          {needsMe && <span style={{ fontSize: ".55rem", background: "#f0fdfa", color: "#0f766e", borderRadius: 10, padding: "1px 6px", fontWeight: 700 }}>يحتاج ردك</span>}
                        </div>
                      </div>
                    </div>

                    {/* bottom: dates */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 7, borderTop: "1px dashed #e8edf5" }}>
                      <span style={{ fontSize: ".56rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 3 }}>
                        <CalendarDays size={9} /> فُتحت: {formatAppDate(ticket.updated_at)}
                      </span>
                      <span style={{ fontSize: ".56rem", color: needsMe ? "#0f766e" : "#94a3b8", fontWeight: needsMe ? 700 : 400, display: "flex", alignItems: "center", gap: 3 }}>
                        <Bell size={9} /> آخر تحديث: {formatAppDate(ticket.updated_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
