import PageLoader from "@/components/page-loader";
"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { ClipboardList, Zap, Clock, Ticket, AlertTriangle, CheckCircle, BarChart3, Users, Star } from "lucide-react";

function getTodayArabic() {
  const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const now = new Date();
  return `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء النور";
}

type StaffRating = {
  staff_id: string; avg_rating: number; total_ratings: number;
  positive: number; negative: number; resolved_tickets: number;
  staff_name?: string;
  recent_ratings: Array<{ rating: number; comment: string; date: string; client_name: string; ticket_id: string }>;
};

type UrgentTask = { id: string; title: string; client: string; isLate: boolean };

export default function AdminDashboardPage() {
  const { role, userName, userAvatar, loading } = useRoleGuard("viewer");
  const isAdmin = role === "admin";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const endpoints = [
        fetch("/api/admin/orders").then(r => r.ok ? r.json() : { data: [] }),
        fetch("/api/admin/tickets").then(r => r.ok ? r.json() : { data: [] }),
        fetch("/api/admin/notifications").then(r => r.ok ? r.json() : {}),
        fetch("/api/admin/tasks").then(r => r.ok ? r.json() : { data: [] }),
        ...(isAdmin ? [fetch("/api/admin/team/ratings").then(r => r.ok ? r.json() : { data: [] })] : [Promise.resolve({ data: [] })]),
        ...(isAdmin ? [fetch("/api/admin/team").then(r => r.ok ? r.json() : null)] : [Promise.resolve(null)]),
      ];
      const [ordersRes, ticketsRes, notifRes, tasksRes, ratingsRes, teamRes] = await Promise.all(endpoints);
      const orders: any[] = ordersRes?.data || [];
      const tickets: any[] = ticketsRes?.data || [];
      const notif = notifRes || {};
      const tasks: any[] = tasksRes?.data || [];
      const ratings: StaffRating[] = ratingsRes?.data || [];
      const teamMembers: any[] = isAdmin ? (teamRes?.members || teamRes?.data || []) : [];

      const teamNameMap: Record<string, string> = {};
      for (const m of teamMembers) if (m.id) teamNameMap[m.id] = m.full_name || "";

      const ratingsWithName = ratings.map(r => ({ ...r, staff_name: teamNameMap[r.staff_id] || "" }));

      const ordStats = {
        total: orders.length,
        new: orders.filter((o: any) => o.status === "new" || o.status === "جديد").length,
        active: orders.filter((o: any) => o.status === "in_progress" || o.status === "قيد التنفيذ").length,
        waiting: orders.filter((o: any) => o.status === "waiting_documents" || o.status === "بانتظار المستندات").length,
        done: orders.filter((o: any) => o.status === "completed" || o.status === "مكتمل").length,
        cancelled: orders.filter((o: any) => o.status === "cancelled" || o.status === "ملغي").length,
      };
      const tktOpen = tickets.filter((t: any) => t.status !== "مغلقة" && t.status !== "closed").length;
      const urgent: UrgentTask[] = notif.urgent || [];
      const overdueTasks = notif.overdue ?? tasks.filter((t: any) => t.status === "open" && new Date(t.due_at) < new Date()).length;
      const todayTasks = notif.today ?? tasks.filter((t: any) => {
        if (t.status !== "open") return false;
        const due = new Date(t.due_at); const now = new Date();
        return due.toDateString() === now.toDateString();
      }).length;
      const recentOrders = orders.slice(0, 5);
      const openTickets = tickets.filter((t: any) => t.status !== "مغلقة" && t.status !== "closed").slice(0, 4);

      setData({ ordStats, tktOpen, urgent, overdueTasks, todayTasks, recentOrders, openTickets, ratings: ratingsWithName, teamCount: teamMembers.length, expiredRegs: notif.expiredRegs || [], soonRegs: notif.soonRegs || [] });
    }
    load();
  }, [isAdmin]);

  if (loading || !data) return Splash;

  if (role === "viewer") {
    return (
      <div style={s.page}>
        <div style={{ background: "#f0f4ff", border: "1px solid #bddcff", borderRadius: 12, padding: "24px", textAlign: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: "1rem", color: "#073766", margin: "0 0 8px" }}>مرحباً بك في لوحة التحكم</h2>
          <p style={{ fontSize: ".82rem", color: "#526983", margin: 0 }}>صلاحيتك (مشاهد) تسمح لك بعرض التقارير فقط. يمكنك الوصول إلى التقارير من القائمة الجانبية.</p>
          <div style={{ marginTop: 16 }}>
            <a href="/admin/reports" style={s.btnPrimary}><BarChart3 size={14} /> فتح التقارير</a>
          </div>
        </div>
      </div>
    );
  }

  const { ordStats, tktOpen, urgent, overdueTasks, todayTasks, recentOrders, openTickets, ratings, teamCount, expiredRegs, soonRegs } = data;
  const donePct = ordStats.total > 0 ? Math.round((ordStats.done / ordStats.total) * 100) : 0;
  const activePct = ordStats.total > 0 ? Math.round((ordStats.active / ordStats.total) * 100) : 0;
  const waitingPct = ordStats.total > 0 ? Math.round((ordStats.waiting / ordStats.total) * 100) : 0;

  return (
    <div style={s.page}>
      {/* ═══ HEADER ═══ */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {userAvatar ? (
            <img src={userAvatar} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e2e8f0", display: "grid", placeItems: "center", fontSize: "1.1rem", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>
              {(userName || "مدير النظام").charAt(0)}
            </div>
          )}
          <div>
            <p style={s.date}>{getTodayArabic()}</p>
            <h1 style={s.greeting}>{getGreeting()}، {userName || "مدير النظام"}</h1>
            <p style={s.sub}>ملخص الأداء والمؤشرات الرئيسية للمنصة</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/admin/reports" style={s.btnOutline}><BarChart3 size={14} /> التقارير</a>
          <a href="/admin/orders" style={s.btnPrimary}><ClipboardList size={14} /> طلب جديد</a>
        </div>
      </div>

      {/* ═══ KPI STRIP ═══ */}
      <div style={s.kpiStrip}>
        <KpiCard icon={<ClipboardList size={20} />} label="إجمالي الطلبات" value={ordStats.total} color="#0875dc" bg="#e8f1fb" />
        <KpiCard icon={<Zap size={20} />} label="قيد التنفيذ" value={ordStats.active} color="#d06418" bg="#fff0e5" />
        <KpiCard icon={<Clock size={20} />} label="بانتظار مستندات" value={ordStats.waiting} color="#ee892e" bg="#fff8e5" />
        <KpiCard icon={<Ticket size={20} />} label="تذاكر مفتوحة" value={tktOpen} color="#0f766e" bg="#f3e8ff" />
        <KpiCard icon={<AlertTriangle size={20} />} label="مهام متأخرة" value={overdueTasks} color="#dc2626" bg="#fef2f2" />
        <KpiCard icon={<CheckCircle size={20} />} label="مكتمل" value={ordStats.done} color="#13795a" bg="#e2f5ed" />
      </div>

      {/* ═══ MAIN GRID ═══ */}
      <div style={s.grid}>

        {/* LEFT COL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Urgent tasks */}
          {urgent.length > 0 && (
            <Panel title="مهام عاجلة تحتاج انتباهك" sub="المهام المتأخرة تتطلب معالجة فورية">
              {urgent.map((t: UrgentTask) => (
                <div key={t.id} style={s.urgentRow}>
                  <span style={s.urgentDot} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.urgentTitle}>{t.title}</div>
                    <div style={s.urgentClient}>{t.client} · #{t.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <span style={{ ...s.badge, background: t.isLate ? "#fef2f2" : "#fff8e5", color: t.isLate ? "#dc2626" : "#ee892e" }}>
                    {t.isLate ? "متأخر" : "اليوم"}
                  </span>
                </div>
              ))}
              <a href="/admin/followups" style={s.panelLink}>عرض كل المتابعات ←</a>
            </Panel>
          )}

          {/* Open Tickets */}
          <Panel title="التذاكر النشطة" sub={`${openTickets.length} تذاكر مفتوحة`}>
            {openTickets.length === 0 ? (
              <div style={s.empty}>✉ لا توجد تذاكر مفتوحة</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.ratingTable}>
                  <thead>
                    <tr>
                      <th style={s.th}>المرجع</th>
                      <th style={s.th}>العميل</th>
                      <th style={s.th}>العنوان</th>
                      <th style={s.th}>الحالة</th>
                      <th style={s.th}>الأولوية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTickets.map((t: any) => {
                      const PMAP: Record<string,string> = { normal:"عادية", urgent:"عاجلة", high:"مرتفعة", low:"عادية" };
                      const pri = PMAP[t.priority] ?? t.priority ?? "عادية";
                      const pColor = pri === "عاجلة" ? "#dc2626" : pri === "مرتفعة" ? "#d06418" : "#8b9dad";
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid #f0f3f8" }}>
                          <td style={s.td}><code style={s.code}>{t.ref_number || t.id.slice(0, 8).toUpperCase()}</code></td>
                          <td style={s.td}>{t.client?.name || t.profiles?.full_name || "—"}</td>
                          <td style={{ ...s.td, color: "#526983", fontSize: ".63rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                          <td style={s.td}><OrderStatusBadge status={t.status} /></td>
                          <td style={{ ...s.td }}><span style={{ fontSize: ".55rem", fontWeight: 700, color: pColor }}>●</span> {pri}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <a href="/admin/tickets" style={s.panelLink}>عرض كل التذاكر ←</a>
          </Panel>

          {/* Recent Orders */}
          <Panel title="آخر الطلبات" sub="أحدث 5 طلبات في النظام">
            {recentOrders.length === 0 ? (
              <div style={s.empty}>لا توجد طلبات بعد</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ ...s.ratingTable }}>
                  <thead>
                    <tr>
                      <th style={s.th}>المرجع</th>
                      <th style={s.th}>العميل</th>
                      <th style={s.th}>الخدمة</th>
                      <th style={s.th}>الحالة</th>
                      <th style={s.th}>المسؤول</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o: any) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #f0f3f8" }}>
                        <td style={s.td}><code style={s.code}>{o.reference_no || o.id.slice(0, 8).toUpperCase()}</code></td>
                        <td style={s.td}>{o.clients?.name || "—"}</td>
                        <td style={{ ...s.td, color: "#526983", fontSize: ".63rem" }}>{o.services?.name || "—"}</td>
                        <td style={s.td}><OrderStatusBadge status={o.status} /></td>
                        <td style={{ ...s.td, color: "#526983", fontSize: ".63rem" }}>{o.profiles?.full_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <a href="/admin/orders" style={s.panelLink}>عرض كل الطلبات ←</a>
          </Panel>

          {/* Staff Ratings */}
          {isAdmin && ratings.length > 0 && (
            <Panel title="تقييمات الموظفين" sub="متوسط التقييمات من العملاء">
              <div style={{ overflowX: "auto" }}>
                <table style={s.ratingTable}>
                  <thead>
                    <tr>
                      <th style={s.th}>الموظف</th>
                      <th style={s.th}>التقييم</th>
                      <th style={s.th}>إيجابي</th>
                      <th style={s.th}>سلبي</th>
                      <th style={s.th}>تم الحل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map((r: StaffRating) => (
                      <tr key={r.staff_id} style={{ borderBottom: "1px solid #f0f3f8" }}>
                        <td style={s.td}>{r.staff_name || "—"}</td>
                        <td style={s.td}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: ".7rem", fontWeight: 800, color: "#073766" }}>{r.avg_rating}</span>
                            <span style={{ display: "inline-flex", gap: 2 }}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} strokeWidth={1.5} fill={i < Math.round(r.avg_rating) ? "#f59e0b" : "#e5eaf0"} color={i < Math.round(r.avg_rating) ? "#f59e0b" : "#e5eaf0"} />)}</span>
                            <span style={{ fontSize: ".55rem", color: "#8b9dad" }}>({r.total_ratings})</span>
                          </span>
                        </td>
                        <td style={{ ...s.td, color: "#13795a", fontWeight: 700 }}>{r.positive}</td>
                        <td style={{ ...s.td, color: "#dc2626", fontWeight: 700 }}>{r.negative}</td>
                        <td style={{ ...s.td, color: "#0875dc", fontWeight: 700 }}>{r.resolved_tickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a href="/admin/team" style={s.panelLink}>عرض تفاصيل التقييمات ←</a>
            </Panel>
          )}
        </div>

        {/* RIGHT COL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Order Pipeline */}
          <Panel title="حالة الطلبات" sub="توزيع الطلبات حسب المرحلة">
            <div style={{ padding: "8px 18px 4px" }}>
              <PipelineRow label="قيد التنفيذ" count={ordStats.active} pct={activePct} color="#d06418" bg="#fff0e5" bar="#d06418" />
              <PipelineRow label="بانتظار مستندات" count={ordStats.waiting} pct={waitingPct} color="#ee892e" bg="#fff8e5" bar="#ee892e" />
              <PipelineRow label="مكتمل" count={ordStats.done} pct={donePct} color="#13795a" bg="#e2f5ed" bar="#13795a" />
              <PipelineRow label="ملغي/معلق" count={ordStats.cancelled} pct={ordStats.total > 0 ? Math.round((ordStats.cancelled / ordStats.total) * 100) : 0} color="#8b9dad" bg="#f5f6f8" bar="#aab5c3" />
            </div>
            <div style={{ padding: "10px 18px 14px", borderTop: "1px solid #edf0f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: ".65rem", color: "#526983", fontWeight: 700 }}>معدل الإنجاز الكلي</span>
              <span style={{ fontSize: ".85rem", fontWeight: 900, color: ordStats.done >= ordStats.active ? "#13795a" : "#d06418" }}>{donePct}%</span>
            </div>
          </Panel>

          {/* Quick Stats */}
          <div style={s.statsMiniGrid}>
            <div style={{ ...s.statMini, background: "#f0f9ff", borderColor: "#bddcff" }}>
              <div style={s.statMiniIcon}><ClipboardList size={18} color="#0875dc" /></div>
              <div>
                <div style={{ fontSize: ".55rem", color: "#526983", fontWeight: 700 }}>مهام اليوم</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0875dc" }}>{todayTasks}</div>
              </div>
            </div>
            <div style={{ ...s.statMini, background: "#f0fdfa", borderColor: "#99f6e4" }}>
              <div style={s.statMiniIcon}><Users size={18} color="#0f766e" /></div>
              <div>
                <div style={{ fontSize: ".55rem", color: "#526983", fontWeight: 700 }}>أعضاء الفريق</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f766e" }}>{teamCount}</div>
              </div>
            </div>
            <div style={{ ...s.statMini, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <div style={s.statMiniIcon}><Star size={18} color="#13795a" /></div>
              <div>
                <div style={{ fontSize: ".55rem", color: "#526983", fontWeight: 700 }}>متوسط التقييم</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#13795a" }}>
                  {ratings.length > 0 ? (ratings.reduce((a: number, r: StaffRating) => a + r.avg_rating, 0) / ratings.length).toFixed(1) : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Progress ring */}
          <div style={s.progressCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#edf2f7" strokeWidth="5" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={donePct >= 50 ? "#13795a" : "#0875dc"} strokeWidth="5"
                    strokeDasharray={`${donePct * 1.76} 176`} transform="rotate(-90 32 32)" strokeLinecap="round" />
                </svg>
                <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: ".85rem", fontWeight: 900, color: donePct >= 50 ? "#13795a" : "#0875dc" }}>
                  {donePct}%
                </span>
              </div>
              <div>
                <div style={{ fontSize: ".65rem", color: "#526983", fontWeight: 700 }}>نسبة الإنجاز</div>
                <div style={{ fontSize: ".8rem", color: "#1e3a56", fontWeight: 800 }}>{ordStats.done} من {ordStats.total} طلبات</div>
                <div style={{ fontSize: ".62rem", color: "#8b9dad", marginTop: 2 }}>{ordStats.new} طلبات جديدة تحتاج مراجعة</div>
              </div>
            </div>
          </div>

          {/* Expiry alerts */}
          {(expiredRegs?.length > 0 || soonRegs?.length > 0) && (
            <Panel title="تنبيهات السجلات التجارية" sub="سجلات تحتاج تجديد">
              {expiredRegs?.length > 0 && (
                <>
                  <div style={{ padding: "6px 18px 0", fontSize: ".6rem", fontWeight: 700, color: "#dc2626" }}>منتهية</div>
                  {expiredRegs.map((r: any) => (
                    <div key={r.clientId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 18px", borderBottom: "1px solid #fef2f2" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#991b1b" }}>{r.clientName}</div>
                        <div style={{ fontSize: ".55rem", color: "#b91c1c" }}>منتهي منذ {r.daysExpired} يوم</div>
                      </div>
                      <a href="/admin/clients" style={{ fontSize: ".55rem", padding: "2px 8px", borderRadius: 8, background: "#dc2626", color: "#fff", textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>تجديد</a>
                    </div>
                  ))}
                </>
              )}
              {soonRegs?.length > 0 && (
                <>
                  <div style={{ padding: expiredRegs?.length > 0 ? "4px 18px 0" : "6px 18px 0", fontSize: ".6rem", fontWeight: 700, color: "#d97706" }}>ستنتهي قريباً</div>
                  {soonRegs.map((r: any) => (
                    <div key={r.clientId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 18px", borderBottom: "1px solid #fffbeb" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: ".65rem", fontWeight: 700, color: "#92400e" }}>{r.clientName}</div>
                        <div style={{ fontSize: ".55rem", color: "#a16207" }}>بقي {r.daysLeft} يوم</div>
                      </div>
                      <a href="/admin/clients" style={{ fontSize: ".55rem", padding: "2px 8px", borderRadius: 8, background: "#d97706", color: "#fff", textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>تجديد</a>
                    </div>
                  ))}
                </>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function KpiCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 6px rgba(18,55,94,.03)", borderBottom: `3px solid ${color}` }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: bg, color }}>{icon}</div>
      <div>
        <div style={{ fontSize: ".6rem", color: "#8b9dad", fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function PipelineRow({ label, count, pct, color, bg, bar }: { label: string; count: number; pct: number; color: string; bg: string; bar: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f0f3f8" }}>
      <span style={{ fontSize: ".6rem", fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 6, minWidth: 95, textAlign: "center" }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "#edf2f7", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: bar, borderRadius: 10, transition: "width .5s" }} />
      </div>
      <b style={{ fontSize: ".7rem", color: "#526983", minWidth: 20, textAlign: "center" }}>{count}</b>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5eaf0", borderRadius: 13, boxShadow: "0 2px 10px rgba(18,55,94,.04)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #edf0f5" }}>
        <div>
          <h3 style={{ fontSize: ".78rem", margin: 0, color: "#073766", fontWeight: 800 }}>{title}</h3>
          {sub && <p style={{ fontSize: ".6rem", color: "#8c99a8", margin: "2px 0 0" }}>{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    "new": { label: "جديد", bg: "#e8f1fb", color: "#0875dc" },
    "جديد": { label: "جديد", bg: "#e8f1fb", color: "#0875dc" },
    "in_progress": { label: "قيد التنفيذ", bg: "#fff0e5", color: "#d06418" },
    "قيد التنفيذ": { label: "قيد التنفيذ", bg: "#fff0e5", color: "#d06418" },
    "waiting_documents": { label: "بانتظار مستندات", bg: "#fff8e5", color: "#ee892e" },
    "بانتظار المستندات": { label: "بانتظار مستندات", bg: "#fff8e5", color: "#ee892e" },
    "completed": { label: "مكتمل", bg: "#e2f5ed", color: "#13795a" },
    "مكتمل": { label: "مكتمل", bg: "#e2f5ed", color: "#13795a" },
    "cancelled": { label: "ملغي", bg: "#f5f6f8", color: "#8b9dad" },
    "ملغي": { label: "ملغي", bg: "#f5f6f8", color: "#8b9dad" },
    "جديدة": { label: "جديدة", bg: "#e8f1fb", color: "#0875dc" },
    "قيد المراجعة": { label: "قيد المراجعة", bg: "#fff0e5", color: "#d06418" },
    "بانتظار العميل": { label: "بانتظار العميل", bg: "#fff8e5", color: "#ee892e" },
    "تم الحل": { label: "تم الحل", bg: "#e2f5ed", color: "#13795a" },
    "مغلقة": { label: "مغلقة", bg: "#f5f6f8", color: "#8b9dad" },
  };
  const m = map[status] || { label: status, bg: "#f0f4f8", color: "#526983" };
  return <span style={{ fontSize: ".55rem", fontWeight: 700, background: m.bg, color: m.color, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" }}>{m.label}</span>;
}

const Splash = <PageLoader text="جاري تحميل لوحة التحكم..." />;

const s: Record<string, React.CSSProperties> = {
  page: { padding: "24px 24px 40px", width: "100%", direction: "rtl" },

  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" },
  date: { fontSize: ".7rem", color: "#7a8fa6", margin: "0 0 3px" },
  greeting: { fontSize: "1.4rem", color: "#073766", margin: "0 0 3px", fontWeight: 800 },
  sub: { fontSize: ".72rem", color: "#7a8fa6", margin: 0 },
  btnPrimary: { height: 38, padding: "0 16px", borderRadius: 8, background: "#0875dc", color: "#fff", fontWeight: 800, fontSize: ".75rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(8,117,220,.2)" },
  btnOutline: { height: 38, padding: "0 14px", borderRadius: 8, background: "#fff", border: "1px solid #dce5ef", color: "#344d69", fontWeight: 700, fontSize: ".72rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 },

  kpiStrip: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 18 },

  grid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, marginBottom: 0 },

  /* Urgent */
  urgentRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid #fef2f2" },
  urgentDot: { width: 8, height: 8, borderRadius: "50%", background: "#dc2626", flexShrink: 0 },
  urgentTitle: { fontSize: ".68rem", fontWeight: 700, color: "#1e3a56", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  urgentClient: { fontSize: ".57rem", color: "#8b9dad", marginTop: 1 },
  badge: { fontSize: ".55rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 },

  /* Rating table */
  ratingTable: { width: "100%", borderCollapse: "collapse", fontSize: ".64rem" },
  th: { textAlign: "right", fontSize: ".6rem", color: "#7a8fa6", fontWeight: 700, padding: "7px 12px", borderBottom: "2px solid #edf0f5", whiteSpace: "nowrap" },
  td: { padding: "9px 12px", color: "#1e3a56", borderBottom: "1px solid #f0f3f8" },
  code: { fontFamily: "inherit", background: "#f0f4f8", padding: "1px 5px", borderRadius: 4, fontSize: ".58rem" },
  panelLink: { display: "block", fontSize: ".62rem", color: "#0875dc", textDecoration: "none", fontWeight: 700, padding: "10px 18px", borderTop: "1px solid #edf0f5", textAlign: "center" as const },

  /* Ticket row */
  ticketRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid #f0f3f8" },
  ticketTitle: { fontSize: ".65rem", fontWeight: 700, color: "#1e3a56", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  /* Mini stats */
  statsMiniGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  statMini: { borderRadius: 10, padding: "11px", display: "flex", alignItems: "center", gap: 9, border: "1px solid" },
  statMiniIcon: { fontSize: "1rem", flexShrink: 0 },

  /* Progress card */
  progressCard: { background: "#fff", border: "1px solid #e5eaf0", borderRadius: 13, padding: "16px 18px", boxShadow: "0 2px 10px rgba(18,55,94,.04)" },

  /* Actions */
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  actionCard: { display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "#fff", border: "1px solid #e5eaf0", borderRadius: 10, textDecoration: "none", boxShadow: "0 1px 4px rgba(18,55,94,.02)" },
  actionIcon: { width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", fontSize: ".9rem", flexShrink: 0 },
  empty: { textAlign: "center", padding: "18px 0", fontSize: ".68rem", color: "#8b9dad" },
};
