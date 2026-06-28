"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, CalendarDays, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type SubscriptionItem = {
  id: string;
  status: string;
  employee_count: number;
  base_price: number;
  extra_price: number;
  tax_amount: number;
  total_price: number;
  billing_cycle: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  packages: {
    id: string;
    title_ar: string;
    tier_ar: string;
    category: string;
    billing_cycle: string;
    price: number;
  } | null;
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  active: { label: "نشط", color: "#15803d", bg: "#f0fdf4", icon: CheckCircle },
  pending: { label: "قيد الانتظار", color: "#b45309", bg: "#fef9ee", icon: Clock },
  cancelled: { label: "ملغي", color: "#dc2626", bg: "#fef2f2", icon: XCircle },
  expired: { label: "منتهي", color: "#6b7280", bg: "#f3f4f6", icon: AlertCircle },
};

const cycleLabels: Record<string, string> = {
  monthly: "شهري",
  yearly: "سنوي",
  quarterly: "ربع سنوي",
  "one-time": "مرة واحدة",
};

export default function ClientSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/client/subscriptions")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setSubscriptions(res.data);
        else setError(res.error || "فشل تحميل الاشتراكات");
      })
      .catch(() => setError("تعذر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, []);

  function getDaysRemaining(endDate: string | null): { days: number; status: "ok" | "soon" | "expired" } | null {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { days: Math.abs(diff), status: "expired" };
    if (diff <= 30) return { days: diff, status: "soon" };
    return { days: diff, status: "ok" };
  }

  if (loading) {
    return (
      <div className="subs-empty">
        <Loader2 size={32} className="spin" />
        <p>جاري تحميل الاشتراكات...</p>
      </div>
    );
  }

  return (
    <section className="subs-section">
      <div className="subs-heading">
        <div>
          <p className="eyebrow">اشتراكاتي</p>
          <h1>باقاتي واشتراكاتي</h1>
          <span>جميع الباقات التي اشتركت فيها، النشطة والمنتهية</span>
        </div>
        <Link href="/dashboard/packages" className="subs-new-btn">
          <Package size={16} />
          اشتراك جديد
        </Link>
      </div>

      {error ? (
        <div className="subs-error">{error}</div>
      ) : null}

      {subscriptions.length === 0 ? (
        <div className="subs-empty">
          <Package size={48} />
          <p>لا توجد اشتراكات حتى الآن</p>
          <Link href="/dashboard/packages" className="subs-browse-btn">
            تصفح الباقات
          </Link>
        </div>
      ) : (
        <div className="subs-list">
          {subscriptions.map((sub) => {
            const cfg = statusConfig[sub.status] || statusConfig.expired;
            const StatusIcon = cfg.icon;
            const remaining = getDaysRemaining(sub.end_date);

            return (
              <article className="subs-card" key={sub.id}>
                <div className="subs-card-header">
                  <div className="subs-card-title">
                    <h3>{sub.packages?.title_ar || "باقة غير معروفة"}</h3>
                    <span className="subs-tier">{sub.packages?.tier_ar}</span>
                  </div>
                  <span className="subs-status" style={{ background: cfg.bg, color: cfg.color }}>
                    <StatusIcon size={14} />
                    {cfg.label}
                  </span>
                </div>

                <div className="subs-card-body">
                  <div className="subs-info-grid">
                    <div className="subs-info-item">
                      <CalendarDays size={16} />
                      <div>
                        <small>تاريخ البداية</small>
                        <strong>{new Date(sub.start_date).toLocaleDateString("ar-SA")}</strong>
                      </div>
                    </div>
                    <div className="subs-info-item">
                      <CalendarDays size={16} />
                      <div>
                        <small>تاريخ النهاية</small>
                        <strong>
                          {sub.end_date
                            ? new Date(sub.end_date).toLocaleDateString("ar-SA")
                            : "غير محدد"}
                        </strong>
                      </div>
                    </div>
                    <div className="subs-info-item">
                      <CreditCard size={16} />
                      <div>
                        <small>المبلغ</small>
                        <strong>{sub.total_price.toLocaleString("ar-SA")} ر.س</strong>
                      </div>
                    </div>
                    <div className="subs-info-item">
                      <Clock size={16} />
                      <div>
                        <small>دورة الفوترة</small>
                        <strong>{cycleLabels[sub.billing_cycle] || sub.billing_cycle}</strong>
                      </div>
                    </div>
                  </div>

                  {remaining ? (
                    <div
                      className={`subs-remaining ${
                        remaining.status === "expired"
                          ? "is-expired"
                          : remaining.status === "soon"
                          ? "is-soon"
                          : "is-ok"
                      }`}
                    >
                      {remaining.status === "expired"
                        ? `منذ ${remaining.days} يوم`
                        : `متبقي ${remaining.days} يوم`}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <style>{`
        .subs-section {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }
        .subs-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .subs-heading .eyebrow {
          font-size: 12px;
          color: #0875dc;
          font-weight: 600;
          margin: 0;
        }
        .subs-heading h1 {
          font-size: 22px;
          color: #073766;
          margin: 4px 0;
        }
        .subs-heading span {
          font-size: 14px;
          color: #64748b;
        }
        .subs-new-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #073766;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: background .2s;
        }
        .subs-new-btn:hover { background: #0a4a8a; }
        .subs-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .subs-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5ecf3;
          overflow: hidden;
          transition: box-shadow .2s;
        }
        .subs-card:hover {
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .subs-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .subs-card-title h3 {
          font-size: 16px;
          color: #073766;
          margin: 0;
        }
        .subs-tier {
          font-size: 12px;
          color: #0875dc;
          font-weight: 600;
        }
        .subs-status {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .subs-card-body {
          padding: 18px 20px;
        }
        .subs-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .subs-info-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .subs-info-item svg {
          color: #94a3b8;
          flex-shrink: 0;
        }
        .subs-info-item div {
          display: flex;
          flex-direction: column;
        }
        .subs-info-item small {
          font-size: 11px;
          color: #94a3b8;
        }
        .subs-info-item strong {
          font-size: 14px;
          color: #334155;
        }
        .subs-remaining {
          margin-top: 12px;
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
        }
        .subs-remaining.is-ok {
          background: #f0fdf4;
          color: #15803d;
        }
        .subs-remaining.is-soon {
          background: #fef9ee;
          color: #b45309;
        }
        .subs-remaining.is-expired {
          background: #fef2f2;
          color: #dc2626;
        }
        .subs-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          color: #94a3b8;
          gap: 12px;
        }
        .subs-error {
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          margin-bottom: 16px;
          font-size: 13px;
        }
        .subs-browse-btn {
          padding: 10px 20px;
          background: #073766;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
