"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import { initialAdminOrders, readAdminOrders } from "@/lib/admin-orders";
import { fetchAdminOrdersFromApi } from "@/lib/admin-orders-api";

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

const TEAM = ["أحمد السبيعي", "سارة العتيبي", "نورة القحطاني"];

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState(initialAdminOrders);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL)
      void fetchAdminOrdersFromApi().then((data) => { if (data) setOrders(data); });
    else setOrders(readAdminOrders());
  }, []);

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter((o) => o.status === "قيد التنفيذ").length,
    waiting: orders.filter((o) => o.status === "بانتظار المستندات").length,
    done: orders.filter((o) => o.status === "مكتمل").length,
    review: orders.filter((o) => o.status === "قيد المراجعة").length,
  }), [orders]);

  const priority = orders.filter((o) => o.status !== "مكتمل").slice(0, 5);

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="dashboard" />

      <div className="ov-page">

        {/* Top bar */}
        <div className="ov-topbar">
          <div className="ov-welcome">
            <p className="ov-date">{getTodayArabic()}</p>
            <h1 className="ov-title">{getGreeting()}، حسن</h1>
            <p className="ov-sub">هذه أهم المؤشرات والأعمال التي تحتاجها اليوم.</p>
          </div>
          <div className="ov-top-actions">
            <a href="/admin/reports" className="ov-btn-secondary">
              <span>📊</span> التقارير
            </a>
            <a href="/admin" className="ov-btn-primary">
              <span>＋</span> طلب جديد
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="ov-kpis">
          <article className="ov-kpi">
            <div className="ov-kpi-icon blue">▤</div>
            <div>
              <small>إجمالي الطلبات</small>
              <strong className="ov-kpi-num">{stats.total}</strong>
              <em>جميع الطلبات المسجلة</em>
            </div>
          </article>
          <article className="ov-kpi">
            <div className="ov-kpi-icon gold">⌁</div>
            <div>
              <small>قيد التنفيذ</small>
              <strong className="ov-kpi-num gold">{stats.active}</strong>
              <em>يعمل عليها الفريق</em>
            </div>
          </article>
          <article className="ov-kpi warn">
            <div className="ov-kpi-icon orange">!</div>
            <div>
              <small>بانتظار مستندات</small>
              <strong className="ov-kpi-num orange">{stats.waiting}</strong>
              <em className="warn-em">تحتاج تواصلاً فورياً</em>
            </div>
          </article>
          <article className="ov-kpi">
            <div className="ov-kpi-icon green">✓</div>
            <div>
              <small>مكتملة</small>
              <strong className="ov-kpi-num green">{stats.done}</strong>
              <em>تم إنجازها بنجاح</em>
            </div>
          </article>
        </div>

        {/* Progress bar */}
        {stats.total > 0 && (
          <div className="ov-progress-bar-wrap">
            <div className="ov-progress-labels">
              <span>تقدم الإنجاز الكلي</span>
              <span className="ov-progress-pct">{Math.round((stats.done / stats.total) * 100)}%</span>
            </div>
            <div className="ov-progress-track">
              <div className="ov-progress-fill" style={{ width: `${Math.round((stats.done / stats.total) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="ov-main-grid">

          {/* Priority panel */}
          <article className="ov-panel ov-priority-panel">
            <header className="ov-panel-head">
              <div>
                <h2>أولوية اليوم</h2>
                <p>أعمال يوصى بالبدء بها الآن</p>
              </div>
              <a href="/admin/followups">عرض المتابعات ←</a>
            </header>
            <div className="ov-priority-list">
              {priority.length === 0 && (
                <div className="ov-empty">✓ لا توجد طلبات معلقة، عمل رائع!</div>
              )}
              {priority.map((order, i) => (
                <div className="ov-priority-row" key={order.id}>
                  <b className={`ov-rank ${i < 2 ? "urgent" : ""}`}>{i + 1}</b>
                  <div className="ov-priority-info">
                    <strong>{order.nextAction}</strong>
                    <span>{order.client} · <code>{order.id}</code></span>
                  </div>
                  <em className={`ov-tag ${i < 2 ? "urgent" : "normal"}`}>
                    {i < 2 ? "عاجل" : order.nextActionAt}
                  </em>
                  <a href="/admin" className="ov-open-link">فتح ←</a>
                </div>
              ))}
            </div>
          </article>

          {/* Side panels */}
          <aside className="ov-side">

            {/* Team workload */}
            <div className="ov-panel ov-team-panel">
              <header className="ov-panel-head">
                <div>
                  <h2>عبء الفريق</h2>
                  <p>توزيع الطلبات النشطة</p>
                </div>
              </header>
              <div className="ov-team-list">
                {TEAM.map((name) => {
                  const count = orders.filter((o) => o.assignee === name && o.status !== "مكتمل").length;
                  const max = Math.max(...TEAM.map((n) => orders.filter((o) => o.assignee === n && o.status !== "مكتمل").length), 1);
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div className="ov-team-row" key={name}>
                      <span className="ov-avatar">{name.charAt(0)}</span>
                      <div className="ov-team-info">
                        <strong>{name}</strong>
                        <small>{count} طلبات نشطة</small>
                      </div>
                      <div className="ov-bar-wrap">
                        <div className="ov-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <b className="ov-team-count">{count}</b>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="ov-panel ov-status-panel">
              <header className="ov-panel-head">
                <div><h2>توزيع الحالات</h2></div>
              </header>
              <div className="ov-status-list">
                {[
                  { label: "قيد التنفيذ", count: stats.active, cls: "progress" },
                  { label: "بانتظار مستندات", count: stats.waiting, cls: "waiting" },
                  { label: "مكتمل", count: stats.done, cls: "done" },
                ].map(({ label, count, cls }) => (
                  <div className="ov-status-row" key={label}>
                    <span className={`ops-status ${cls}`}>{label}</span>
                    <div className="ov-status-bar-wrap">
                      <div className={`ov-status-bar ${cls}`} style={{ width: stats.total > 0 ? `${Math.round((count / stats.total) * 100)}%` : "0%" }} />
                    </div>
                    <b>{count}</b>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>

        {/* Quick actions */}
        <div className="ov-actions">
          <h2 className="ov-section-title">وصول سريع</h2>
          <div className="ov-actions-grid">
            {[
              { href: "/admin", icon: "▤", label: "إدارة الطلبات", sub: "بحث وتحديث وإنشاء الطلبات" },
              { href: "/admin/clients", icon: "♙", label: "ملفات العملاء", sub: "الوصول لبيانات وطلبات العميل" },
              { href: "/admin/followups", icon: "◷", label: "المتابعات", sub: "الإجراءات والمواعيد القادمة" },
              { href: "/admin/services", icon: "◇", label: "كتالوج الخدمات", sub: "إدارة الخدمات والمتطلبات" },
              { href: "/admin/team", icon: "👥", label: "إدارة الفريق", sub: "الأعضاء والصلاحيات" },
              { href: "/admin/reports", icon: "📈", label: "التقارير", sub: "إحصائيات الأداء والإنجاز" },
            ].map(({ href, icon, label, sub }) => (
              <a href={href} className="ov-action-card" key={href}>
                <span className="ov-action-icon">{icon}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{sub}</small>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        .ov-page {
          padding: 28px 28px 48px;
          max-width: 1400px;
          margin: 0 auto;
          direction: rtl;
        }

        /* Top bar */
        .ov-topbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ov-date {
          font-size: .72rem;
          color: #7a8fa6;
          margin: 0 0 4px;
        }
        .ov-title {
          font-size: 1.6rem;
          color: #073766;
          margin: 0 0 4px;
          font-weight: 800;
        }
        .ov-sub {
          font-size: .78rem;
          color: #7a8fa6;
          margin: 0;
        }
        .ov-top-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .ov-btn-primary {
          height: 40px;
          padding: 0 18px;
          border-radius: 8px;
          background: #0875dc;
          color: #fff;
          font-weight: 800;
          font-size: .8rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(8,117,220,.2);
          transition: background .15s;
        }
        .ov-btn-primary:hover { background: #065fb8; }
        .ov-btn-secondary {
          height: 40px;
          padding: 0 16px;
          border-radius: 8px;
          background: #fff;
          border: 1px solid #dce5ef;
          color: #344d69;
          font-weight: 700;
          font-size: .78rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background .15s;
        }
        .ov-btn-secondary:hover { background: #f5f8fc; }

        /* KPIs */
        .ov-kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }
        .ov-kpi {
          background: #fff;
          border: 1px solid #e5eaf0;
          border-radius: 13px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 10px rgba(18,55,94,.04);
          transition: box-shadow .15s;
        }
        .ov-kpi:hover { box-shadow: 0 4px 18px rgba(18,55,94,.08); }
        .ov-kpi.warn { border-color: #ffd5a8; background: #fffaf5; }
        .ov-kpi-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 1.2rem;
          font-weight: 900;
        }
        .ov-kpi-icon.blue { background: #e8f1fb; color: #1758a6; }
        .ov-kpi-icon.gold { background: #fff4db; color: #c18409; }
        .ov-kpi-icon.orange { background: #fff0e5; color: #d06418; }
        .ov-kpi-icon.green { background: #e2f5ed; color: #13795a; }
        .ov-kpi small { font-size: .7rem; color: #7f8da0; display: block; margin-bottom: 4px; }
        .ov-kpi-num { font-size: 1.8rem; color: #073766; display: block; line-height: 1; font-weight: 800; }
        .ov-kpi-num.gold { color: #c18409; }
        .ov-kpi-num.orange { color: #d06418; }
        .ov-kpi-num.green { color: #13795a; }
        .ov-kpi em { font-size: .6rem; color: #92a0b0; font-style: normal; display: block; margin-top: 5px; }
        .ov-kpi .warn-em { color: #c1612c; }

        /* Progress bar */
        .ov-progress-bar-wrap {
          background: #fff;
          border: 1px solid #e5eaf0;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 18px;
          box-shadow: 0 2px 8px rgba(18,55,94,.03);
        }
        .ov-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: .72rem;
          color: #526983;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .ov-progress-pct { color: #0875dc; }
        .ov-progress-track {
          height: 8px;
          background: #edf2f7;
          border-radius: 20px;
          overflow: hidden;
        }
        .ov-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #0875dc, #12bcae);
          border-radius: 20px;
          transition: width .6s ease;
        }

        /* Main grid */
        .ov-main-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
          margin-bottom: 24px;
        }

        /* Panel base */
        .ov-panel {
          background: #fff;
          border: 1px solid #e5eaf0;
          border-radius: 13px;
          box-shadow: 0 2px 10px rgba(18,55,94,.04);
          overflow: hidden;
        }
        .ov-panel-head {
          padding: 18px 20px 14px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid #edf0f5;
        }
        .ov-panel-head h2 { font-size: .9rem; margin: 0 0 3px; color: #073766; }
        .ov-panel-head p { font-size: .65rem; color: #8c99a8; margin: 0; }
        .ov-panel-head > a { font-size: .68rem; color: #0875dc; text-decoration: none; font-weight: 700; white-space: nowrap; }

        /* Priority list */
        .ov-priority-list { padding: 0 20px; }
        .ov-empty { padding: 20px 0; font-size: .75rem; color: #13795a; text-align: center; }
        .ov-priority-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid #f0f3f8;
        }
        .ov-priority-row:last-child { border-bottom: none; }
        .ov-rank {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #edf2f7;
          display: grid;
          place-items: center;
          font-size: .7rem;
          color: #526983;
          font-style: normal;
          flex-shrink: 0;
        }
        .ov-rank.urgent { background: #fff0e5; color: #d06418; }
        .ov-priority-info { flex: 1; min-width: 0; }
        .ov-priority-info strong { font-size: .75rem; display: block; color: #1e3a56; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ov-priority-info span { font-size: .62rem; color: #8295a8; }
        .ov-priority-info code { font-family: inherit; background: #f0f4f8; padding: 1px 5px; border-radius: 4px; }
        .ov-tag { font-size: .6rem; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-style: normal; flex-shrink: 0; }
        .ov-tag.urgent { background: #fff0e5; color: #d06418; border: 1px solid #ffd5a8; }
        .ov-tag.normal { background: #eaf4ff; color: #0875dc; border: 1px solid #bddcff; }
        .ov-open-link { font-size: .65rem; color: #0875dc; text-decoration: none; font-weight: 700; flex-shrink: 0; }

        /* Side panels */
        .ov-side { display: flex; flex-direction: column; gap: 14px; }

        /* Team */
        .ov-team-list { padding: 8px 20px 12px; }
        .ov-team-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #f0f3f8;
        }
        .ov-team-row:last-child { border-bottom: none; }
        .ov-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #e8f1fb;
          color: #1758a6;
          display: grid;
          place-items: center;
          font-size: .72rem;
          font-weight: 900;
          flex-shrink: 0;
        }
        .ov-team-info { flex: 1; min-width: 0; }
        .ov-team-info strong { font-size: .73rem; display: block; color: #1e3a56; }
        .ov-team-info small { font-size: .6rem; color: #8c99a8; }
        .ov-bar-wrap { width: 70px; height: 6px; background: #edf2f7; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
        .ov-bar-fill { height: 100%; background: #0875dc; border-radius: 10px; transition: width .4s; }
        .ov-team-count { font-size: .75rem; font-weight: 800; color: #0875dc; min-width: 18px; text-align: center; }

        /* Status breakdown */
        .ov-status-list { padding: 10px 20px 14px; }
        .ov-status-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #f0f3f8;
        }
        .ov-status-row:last-child { border-bottom: none; }
        .ov-status-row .ops-status { flex-shrink: 0; min-width: 110px; text-align: center; }
        .ov-status-bar-wrap { flex: 1; height: 6px; background: #edf2f7; border-radius: 10px; overflow: hidden; }
        .ov-status-bar { height: 100%; border-radius: 10px; transition: width .4s; }
        .ov-status-bar.progress { background: #0875dc; }
        .ov-status-bar.waiting { background: #ee892e; }
        .ov-status-bar.done { background: #13795a; }
        .ov-status-row b { font-size: .75rem; color: #526983; min-width: 20px; text-align: center; }

        /* Quick actions */
        .ov-section-title { font-size: .8rem; color: #7a8fa6; margin: 0 0 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
        .ov-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .ov-action-card {
          background: #fff;
          border: 1px solid #e5eaf0;
          border-radius: 12px;
          padding: 16px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: box-shadow .15s, border-color .15s;
        }
        .ov-action-card:hover { box-shadow: 0 4px 16px rgba(18,55,94,.08); border-color: #bddcff; }
        .ov-action-icon { font-size: 1.4rem; flex-shrink: 0; }
        .ov-action-card strong { font-size: .78rem; display: block; color: #1e3a56; margin-bottom: 3px; }
        .ov-action-card small { font-size: .62rem; color: #8c99a8; }

        /* Responsive */
        @media (max-width: 1100px) {
          .ov-kpis { grid-template-columns: repeat(2, 1fr); }
          .ov-main-grid { grid-template-columns: 1fr; }
          .ov-side { display: grid; grid-template-columns: 1fr 1fr; }
          .ov-actions-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 680px) {
          .ov-page { padding: 16px; }
          .ov-kpis { grid-template-columns: 1fr 1fr; gap: 10px; }
          .ov-side { grid-template-columns: 1fr; }
          .ov-actions-grid { grid-template-columns: 1fr; }
          .ov-title { font-size: 1.25rem; }
        }
      `}</style>
    </main>
  );
}
