import PageLoader from "@/components/page-loader";
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Clock, FileText, Building2, ShoppingCart, ChevronDown, ChevronUp,
  Store, Landmark, BarChart3, Lightbulb, Users, ShieldCheck, TrendingUp,
  MessageSquare, Pin, CheckCircle, X, Phone, Video, MapPin, PenLine,
  CalendarDays, Package, Grid3X3,
} from "lucide-react";
import { fromDateTimeLocalValue } from "@/lib/date-format";

type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  default_duration_days: number | null;
  required_documents: string[] | null;
  agencies: { name: string } | null;
};

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const CAT_ICONS: Record<string, LucideIcon> = {
  "السجل التجاري":   Store,
  "تأسيس الشركات":  Landmark,
  "الزكاة والضريبة": BarChart3,
  "الملكية الفكرية": Lightbulb,
  "الموارد البشرية":  Users,
  "التراخيص":        ShieldCheck,
  "الاستثمار":       TrendingUp,
  "الاستشارات":      MessageSquare,
};

const CAT_COLORS: Record<string, { bg: string; color: string; dot: string; border: string }> = {
  "السجل التجاري":   { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6", border: "#bfdbfe" },
  "تأسيس الشركات":  { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e", border: "#bbf7d0" },
  "الزكاة والضريبة": { bg: "#fff7ed", color: "#c2410c", dot: "#f97316", border: "#fed7aa" },
  "الملكية الفكرية": { bg: "#f0f7ff", color: "#073766", dot: "#0875dc", border: "#bfdbfe" },
  "الموارد البشرية":  { bg: "#fff1f2", color: "#be123c", dot: "#f43f5e", border: "#fecdd3" },
  "التراخيص":        { bg: "#f0fdfa", color: "#0f766e", dot: "#14b8a6", border: "#99f6e4" },
  "الاستثمار":       { bg: "#fefce8", color: "#a16207", dot: "#eab308", border: "#fde68a" },
};

const CONSULTATION_METHODS = [
  { value: "phone",     label: "مكالمة هاتفية", icon: Phone,    desc: "نتصل بك في الموعد المحدد" },
  { value: "zoom",      label: "اتصال مرئي",    icon: Video,    desc: "عبر Zoom أو Google Meet" },
  { value: "in_person", label: "حضوري",         icon: MapPin,   desc: "في أحد مكاتبنا" },
  { value: "written",   label: "كتابياً",        icon: PenLine,  desc: "رد مفصّل عبر المحادثة" },
];

function CatIcon({ cat, size = 16, color }: { cat: string; size?: number; color?: string }) {
  const Icon = CAT_ICONS[cat] ?? Pin;
  return <Icon size={size} color={color} strokeWidth={2} />;
}

const IS_CONSULTATION = (cat: string) => cat === "الاستشارات";

export default function ClientServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"services" | "consultations">("services");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Order flow
  const [orderModal, setOrderModal] = useState<Service | null>(null);
  const [orderNote, setOrderNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<{ ref: string } | null>(null);

  // Consultation flow
  const [consultModal, setConsultModal] = useState<Service | null>(null);
  const [consultMethod, setConsultMethod] = useState("phone");
  const [consultTopic, setConsultTopic] = useState("");
  const [consultDesc, setConsultDesc] = useState("");
  const [consultDate, setConsultDate] = useState("");
  const [consulting, setConsulting] = useState(false);
  const [consultDone, setConsultDone] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/services")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setServices(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const regularServices = services.filter(s => !IS_CONSULTATION(s.category));
  const consultationServices = services.filter(s => IS_CONSULTATION(s.category));

  const regularCategories = ["الكل", ...Array.from(new Set(regularServices.map(s => s.category)))];

  const visibleRegular = regularServices.filter(s => {
    const matchCat = activeCategory === "الكل" || s.category === activeCategory;
    const matchQ = !query || s.name.includes(query) || s.category.includes(query) || (s.description ?? "").includes(query);
    return matchCat && matchQ;
  });

  const visibleConsultations = consultationServices.filter(s =>
    !query || s.name.includes(query) || (s.description ?? "").includes(query)
  );

  const groupedRegular = visibleRegular.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  async function placeOrder(service: Service) {
    setOrdering(true);
    try {
      const res = await fetch("/api/client/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service_id: service.id, notes: orderNote || undefined }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setOrderResult({ ref: json.data.reference_no });
      } else {
        alert(json.error || "حدث خطأ، حاول مرة أخرى");
        setOrderModal(null);
      }
    } catch {
      alert("حدث خطأ في الاتصال");
      setOrderModal(null);
    } finally {
      setOrdering(false);
    }
  }

  async function bookConsultation(service: Service) {
    if (!consultTopic.trim()) return;
    setConsulting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "consultation",
          title: consultTopic.trim(),
          description: consultDesc.trim() || `استشارة بخصوص: ${service.name}`,
          category: service.category,
          priority: "normal",
          consultation_method: consultMethod,
          consultation_scheduled_at: fromDateTimeLocalValue(consultDate),
        }),
      });
      if (res.ok) setConsultDone(true);
      else { const j = await res.json(); alert(j.error || "حدث خطأ"); }
    } catch {
      alert("حدث خطأ في الاتصال");
    } finally {
      setConsulting(false);
    }
  }

  function closeOrder() { setOrderModal(null); setOrderNote(""); setOrderResult(null); }
  function closeConsult() { setConsultModal(null); setConsultTopic(""); setConsultDesc(""); setConsultDate(""); setConsultMethod("phone"); setConsultDone(false); }

  if (loading) return <PageLoader text="جاري تحميل الخدمات..." />;

  return (
    <div className="client-dash-page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: ".7rem", color: "#8b9dad", margin: "0 0 4px" }}>لوحة التحكم</p>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0b1e36", margin: "0 0 4px" }}>خدماتنا</h1>
        <p style={{ fontSize: ".75rem", color: "#8b9dad", margin: 0 }}>اطلع على جميع خدماتنا وتقدم بطلبك مباشرة</p>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e8edf5", marginBottom: 22 }}>
        {[
          { key: "services",       label: "الخدمات",    icon: Grid3X3,    count: regularServices.length },
          { key: "consultations",  label: "الاستشارات", icon: MessageSquare, count: consultationServices.length },
        ].map(tab => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button key={tab.key}
              onClick={() => { setActiveTab(tab.key as "services" | "consultations"); setQuery(""); setActiveCategory("الكل"); }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "none", border: "none", borderBottom: active ? "2px solid #073766" : "2px solid transparent", marginBottom: -2, cursor: "pointer", font: "inherit", fontSize: ".78rem", fontWeight: active ? 800 : 500, color: active ? "#073766" : "#8b9dad", transition: "all .15s" }}>
              <Icon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background: active ? "#073766" : "#e8edf5", color: active ? "#fff" : "#6b829b", borderRadius: 20, padding: "1px 7px", fontSize: ".58rem", fontWeight: 800 }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <Search size={15} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#8b9dad" }} />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder={activeTab === "services" ? "ابحث عن خدمة..." : "ابحث في الاستشارات..."}
          style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 12, padding: "11px 42px 11px 14px", font: "inherit", fontSize: ".78rem", color: "#344d69", boxSizing: "border-box", outline: "none", background: "#fff" }} />
      </div>

      {/* ══════════════════ SERVICES TAB ══════════════════ */}
      {activeTab === "services" && (
        <>
          {/* Category tabs */}
          {regularServices.length > 0 && (
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 24, overflowX: "auto", scrollbarWidth: "none", flexWrap: "wrap" }}>
              {regularCategories.map(cat => {
                const cs = CAT_COLORS[cat];
                const isActive = activeCategory === cat;
                const count = cat === "الكل" ? regularServices.length : regularServices.filter(s => s.category === cat).length;
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer", font: "inherit", whiteSpace: "nowrap", flexShrink: 0, transition: "all .2s", background: isActive ? "#fff" : "transparent", color: isActive ? (cs?.color ?? "#073766") : "#64748b", boxShadow: isActive ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
                    {cat}
                    <span style={{ fontSize: 11, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8, display: "grid", placeItems: "center", padding: "0 4px", background: isActive ? (cs?.color ?? "#073766") : "#e5eaf0", color: isActive ? "#fff" : "#6b7280" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty — no services configured */}
          {regularServices.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "#eaf4ff", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
                <Store size={32} color="#0875dc" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: ".95rem", color: "#073766", fontWeight: 800 }}>خدماتنا قادمة قريباً</h3>
              <p style={{ fontSize: ".73rem", color: "#8b9dad", margin: "0 0 20px", maxWidth: 320, marginInline: "auto", lineHeight: 1.7 }}>
                يعمل فريق أتمم على إعداد قائمة الخدمات. تواصل معنا مباشرة لمعرفة ما يمكننا تقديمه لمنشأتك.
              </p>
              <button onClick={() => router.push("/dashboard/tickets/new")}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#073766", color: "#fff", border: 0, borderRadius: 11, padding: "11px 24px", font: "inherit", fontSize: ".73rem", fontWeight: 700, cursor: "pointer" }}>
                <MessageSquare size={15} /> تواصل مع فريقنا
              </button>
            </div>
          )}

          {/* No search results */}
          {regularServices.length > 0 && visibleRegular.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Search size={36} color="#d1d9e0" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 700, margin: "0 0 6px", color: "#526983" }}>لا توجد خدمات مطابقة</p>
              <p style={{ fontSize: ".75rem", color: "#8b9dad", margin: 0 }}>جرب البحث بكلمة أخرى</p>
            </div>
          )}

          {/* Grouped service cards */}
          {Object.entries(groupedRegular).map(([cat, items]) => {
            const cs = CAT_COLORS[cat] ?? { bg: "#f8fafc", color: "#334155", dot: "#64748b", border: "#e2e8f0" };
            return (
              <div key={cat} style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: cs.bg, border: `1.5px solid ${cs.border}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <CatIcon cat={cat} size={17} color={cs.dot} />
                  </div>
                  <h2 style={{ fontSize: ".85rem", fontWeight: 800, color: "#0b1e36", margin: 0 }}>{cat}</h2>
                  <span style={{ fontSize: ".58rem", background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{items.length} خدمة</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {items.map(service => (
                    <ServiceCard key={service.id} service={service} cs={cs} expanded={expanded} setExpanded={setExpanded}
                      onOrder={() => { setOrderModal(service); setOrderNote(""); setOrderResult(null); }} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ══════════════════ CONSULTATIONS TAB ══════════════════ */}
      {activeTab === "consultations" && (
        <>
          {/* Info banner */}
          <div style={{ background: "#f0f7ff", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: "16px 20px", marginBottom: 22, display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#dbeafe", border: "1.5px solid #bfdbfe", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <MessageSquare size={18} color="#1d4ed8" />
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: ".78rem", color: "#1e3a5f" }}>سعر الاستشارة يُحدد بعد التواصل</p>
              <p style={{ margin: 0, fontSize: ".68rem", color: "#344d69", lineHeight: 1.6 }}>
                تتفاوت أسعار الاستشارات بحسب الموضوع والوقت المطلوب. اختر نوع الاستشارة وسيتواصل معك أحد مستشارينا لتحديد السعر المناسب وجدولة الموعد.
              </p>
            </div>
          </div>

          {/* Empty */}
          {consultationServices.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "#eaf4ff", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
                <MessageSquare size={32} color="#0875dc" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: ".95rem", color: "#073766", fontWeight: 800 }}>لا توجد استشارات متاحة بعد</h3>
              <p style={{ fontSize: ".73rem", color: "#8b9dad", margin: 0 }}>سيتم إضافة أنواع الاستشارات قريباً</p>
            </div>
          )}

          {/* No search results */}
          {consultationServices.length > 0 && visibleConsultations.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Search size={36} color="#d1d9e0" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 700, margin: "0 0 6px", color: "#526983" }}>لا توجد نتائج مطابقة</p>
              <p style={{ fontSize: ".75rem", color: "#8b9dad", margin: 0 }}>جرب البحث بكلمة أخرى</p>
            </div>
          )}

          {/* Consultation cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {visibleConsultations.map(service => (
              <ConsultCard key={service.id} service={service}
                onBook={() => { setConsultModal(service); setConsultTopic(service.name); setConsultDone(false); }} />
            ))}
          </div>
        </>
      )}

      {/* ═══ ORDER MODAL ═══ */}
      {orderModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !ordering && closeOrder()}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}
            onClick={e => e.stopPropagation()}>
            {orderResult ? (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                  <CheckCircle size={28} color="#16a34a" />
                </div>
                <h3 style={{ margin: "0 0 8px", color: "#0b1e36", fontSize: "1rem" }}>تم إنشاء الطلب بنجاح!</h3>
                <p style={{ fontSize: ".72rem", color: "#8b9dad", margin: "0 0 6px" }}>رقم الطلب</p>
                <div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 10, padding: "10px 20px", display: "inline-block", marginBottom: 20 }}>
                  <span style={{ fontWeight: 900, fontSize: ".95rem", color: "#0369a1", letterSpacing: 1 }}>{orderResult.ref}</span>
                </div>
                <p style={{ fontSize: ".72rem", color: "#526983", margin: "0 0 20px", lineHeight: 1.6 }}>
                  سيراجع فريقنا طلبك ويتواصل معك لتأكيده. يمكنك متابعة حالة الطلب من صفحة <strong>طلباتي</strong>.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={closeOrder} style={{ flex: 1, padding: "10px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", cursor: "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 600 }}>إغلاق</button>
                  <button onClick={() => router.push("/dashboard/orders")}
                    style={{ flex: 2, padding: "10px", background: "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Package size={14} /> متابعة الطلبات
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: ".9rem", color: "#0b1e36" }}>تأكيد طلب الخدمة</h3>
                    <p style={{ margin: 0, fontSize: ".72rem", color: "#8b9dad" }}>{orderModal.name}</p>
                  </div>
                  <button onClick={closeOrder} style={{ background: "none", border: 0, cursor: "pointer", color: "#8b9dad", padding: 4 }}><X size={18} /></button>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {orderModal.price != null && (
                    <div>
                      <div style={{ fontSize: ".58rem", color: "#8b9dad", marginBottom: 2 }}>السعر</div>
                      <div style={{ fontWeight: 900, color: "#073766", fontSize: ".88rem" }}>{orderModal.price.toLocaleString("ar-SA")} ر.س</div>
                      <div style={{ fontSize: ".55rem", color: "#94a3b8" }}>+ 15% ضريبة</div>
                    </div>
                  )}
                  {orderModal.default_duration_days && (
                    <div>
                      <div style={{ fontSize: ".58rem", color: "#8b9dad", marginBottom: 2 }}>المدة المتوقعة</div>
                      <div style={{ fontWeight: 800, color: "#073766", fontSize: ".82rem" }}>{orderModal.default_duration_days} يوم عمل</div>
                    </div>
                  )}
                  {orderModal.agencies?.name && (
                    <div>
                      <div style={{ fontSize: ".58rem", color: "#8b9dad", marginBottom: 2 }}>الجهة المختصة</div>
                      <div style={{ fontWeight: 700, color: "#073766", fontSize: ".72rem" }}>{orderModal.agencies.name}</div>
                    </div>
                  )}
                </div>
                {orderModal.required_documents && orderModal.required_documents.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: ".65rem", fontWeight: 700, color: "#344d69", margin: "0 0 8px" }}>المستندات المطلوبة:</p>
                    {orderModal.required_documents.map((doc, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: ".62rem", color: "#526983" }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#073766", flexShrink: 0 }} />
                        {doc}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#344d69", marginBottom: 6 }}>ملاحظة (اختياري)</label>
                  <textarea value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="أضف أي تفاصيل أو متطلبات خاصة..." rows={3}
                    style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 12px", font: "inherit", fontSize: ".72rem", color: "#344d69", resize: "none", outline: "none", boxSizing: "border-box", background: "#fafbfd" }} />
                </div>
                <p style={{ fontSize: ".68rem", color: "#8b9dad", margin: "0 0 16px", lineHeight: 1.6 }}>
                  سيتم إنشاء طلب وسيتواصل معك فريقنا لتأكيد الطلب وإرشادك للخطوات التالية وإصدار الفاتورة.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={closeOrder} disabled={ordering}
                    style={{ flex: 1, padding: "11px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", cursor: "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 600 }}>إلغاء</button>
                  <button onClick={() => placeOrder(orderModal)} disabled={ordering}
                    style={{ flex: 2, padding: "11px", background: ordering ? "#8b9dad" : "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: ordering ? "not-allowed" : "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ShoppingCart size={14} /> {ordering ? "جاري الإرسال..." : "تقديم الطلب"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ CONSULTATION MODAL ═══ */}
      {consultModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !consulting && closeConsult()}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.18)", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            {consultDone ? (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f0f7ff", border: "2px solid #bfdbfe", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                  <CheckCircle size={28} color="#1d4ed8" />
                </div>
                <h3 style={{ margin: "0 0 8px", color: "#0b1e36", fontSize: "1rem" }}>تم إرسال طلب الاستشارة!</h3>
                <p style={{ fontSize: ".72rem", color: "#8b9dad", margin: "0 0 20px", lineHeight: 1.6 }}>
                  سيراجع أحد مستشارينا طلبك ويتواصل معك لتحديد السعر المناسب وجدولة الموعد.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={closeConsult} style={{ flex: 1, padding: "10px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", cursor: "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 600 }}>إغلاق</button>
                  <button onClick={() => router.push("/dashboard/tickets")}
                    style={{ flex: 2, padding: "10px", background: "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <MessageSquare size={14} /> متابعة الاستشارات
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: ".9rem", color: "#0b1e36" }}>جدولة استشارة</h3>
                    <p style={{ margin: 0, fontSize: ".72rem", color: "#8b9dad" }}>{consultModal.name}</p>
                  </div>
                  <button onClick={closeConsult} style={{ background: "none", border: 0, cursor: "pointer", color: "#8b9dad", padding: 4 }}><X size={18} /></button>
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#344d69", marginBottom: 8 }}>طريقة التواصل</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {CONSULTATION_METHODS.map(m => {
                      const Icon = m.icon;
                      const active = consultMethod === m.value;
                      return (
                        <button key={m.value} onClick={() => setConsultMethod(m.value)}
                          style={{ padding: "10px 12px", border: `1.5px solid ${active ? "#073766" : "#e5eaf0"}`, borderRadius: 10, background: active ? "#f0f7ff" : "#fff", cursor: "pointer", font: "inherit", textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? "#dbeafe" : "#f1f5f9", display: "grid", placeItems: "center", flexShrink: 0 }}>
                            <Icon size={14} color={active ? "#073766" : "#94a3b8"} />
                          </div>
                          <div>
                            <div style={{ fontSize: ".65rem", fontWeight: 700, color: active ? "#073766" : "#344d69" }}>{m.label}</div>
                            <div style={{ fontSize: ".55rem", color: "#94a3b8" }}>{m.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#344d69", marginBottom: 6 }}>موضوع الاستشارة <span style={{ color: "#dc2626" }}>*</span></label>
                  <input value={consultTopic} onChange={e => setConsultTopic(e.target.value)} placeholder="اذكر موضوع الاستشارة بشكل مختصر..."
                    style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 12px", font: "inherit", fontSize: ".72rem", color: "#344d69", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#344d69", marginBottom: 6 }}>تفاصيل إضافية (اختياري)</label>
                  <textarea value={consultDesc} onChange={e => setConsultDesc(e.target.value)} placeholder="أضف أي تفاصيل تساعد المستشار على فهم احتياجاتك..." rows={3}
                    style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 12px", font: "inherit", fontSize: ".72rem", color: "#344d69", resize: "none", outline: "none", boxSizing: "border-box", background: "#fafbfd" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: ".62rem", fontWeight: 700, color: "#344d69", marginBottom: 6 }}>الوقت المفضل (اختياري)</label>
                  <input type="datetime-local" value={consultDate} onChange={e => setConsultDate(e.target.value)}
                    style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 10, padding: "10px 12px", font: "inherit", fontSize: ".72rem", color: "#344d69", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={closeConsult} disabled={consulting}
                    style={{ flex: 1, padding: "11px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", cursor: "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 600 }}>إلغاء</button>
                  <button onClick={() => bookConsultation(consultModal)} disabled={consulting || !consultTopic.trim()}
                    style={{ flex: 2, padding: "11px", background: consulting || !consultTopic.trim() ? "#93b4d4" : "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: !consultTopic.trim() || consulting ? "not-allowed" : "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <CalendarDays size={14} /> {consulting ? "جاري الإرسال..." : "إرسال طلب الاستشارة"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Service Card ─── */
function ServiceCard({ service, cs, expanded, setExpanded, onOrder }: {
  service: Service;
  cs: { bg: string; color: string; dot: string; border: string };
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onOrder: () => void;
}) {
  const isExp = expanded === service.id;
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e5eaf0", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow .2s, border-color .2s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(7,55,102,.08)"; e.currentTarget.style.borderColor = "#c8d8eb"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e5eaf0"; }}>
      <div style={{ padding: "16px 16px 12px", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: ".78rem", fontWeight: 800, color: "#0b1e36", margin: 0, lineHeight: 1.4 }}>{service.name}</h3>
          {service.price != null ? (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ background: cs.bg, color: cs.color, fontSize: ".62rem", fontWeight: 900, padding: "3px 10px", borderRadius: 20, border: `1px solid ${cs.border}`, whiteSpace: "nowrap" }}>
                {service.price.toLocaleString("ar-SA")} ر.س
              </div>
              <div style={{ fontSize: ".5rem", color: "#94a3b8", marginTop: 1 }}>+ 15% VAT</div>
            </div>
          ) : (
            <span style={{ background: "#f0fdf4", color: "#15803d", fontSize: ".6rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid #bbf7d0", whiteSpace: "nowrap", flexShrink: 0 }}>تواصل للسعر</span>
          )}
        </div>
        {service.description && (
          <p style={{ fontSize: ".65rem", color: "#6b829b", margin: "0 0 10px", lineHeight: 1.5 }}>{service.description}</p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {service.agencies?.name && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".58rem", color: "#6b829b", background: "#f8fafc", padding: "2px 7px", borderRadius: 8 }}>
              <Building2 size={9} /> {service.agencies.name}
            </span>
          )}
          {service.default_duration_days && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".58rem", color: "#6b829b", background: "#f8fafc", padding: "2px 7px", borderRadius: 8 }}>
              <Clock size={9} /> {service.default_duration_days} يوم
            </span>
          )}
          {(service.required_documents?.length ?? 0) > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".58rem", color: "#6b829b", background: "#f8fafc", padding: "2px 7px", borderRadius: 8 }}>
              <FileText size={9} /> {service.required_documents!.length} مستندات
            </span>
          )}
        </div>
      </div>
      {(service.required_documents?.length ?? 0) > 0 && (
        <div style={{ borderTop: "1px solid #f0f4f8" }}>
          <button onClick={() => setExpanded(isExp ? null : service.id)}
            style={{ width: "100%", padding: "7px 16px", background: "none", border: 0, cursor: "pointer", font: "inherit", fontSize: ".6rem", color: "#6b829b", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600 }}>
            <span>المستندات المطلوبة</span>
            {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {isExp && (
            <div style={{ padding: "4px 16px 10px" }}>
              {service.required_documents!.map((doc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: ".6rem", color: "#526983" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#073766", flexShrink: 0 }} />
                  {doc}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: "10px 12px", background: "#fafbfd", borderTop: "1px solid #f0f4f8" }}>
        <button onClick={onOrder}
          style={{ width: "100%", padding: "9px", background: "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", font: "inherit", fontSize: ".68rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background .15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#0e4a8a")}
          onMouseLeave={e => (e.currentTarget.style.background = "#073766")}>
          <ShoppingCart size={13} /> اطلب الآن
        </button>
      </div>
    </div>
  );
}

/* ─── Consultation Card ─── */
function ConsultCard({ service, onBook }: { service: Service; onBook: () => void }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e5eaf0", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow .2s, border-color .2s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(7,55,102,.08)"; e.currentTarget.style.borderColor = "#c8d8eb"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e5eaf0"; }}>
      <div style={{ padding: "16px 16px 12px", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: ".78rem", fontWeight: 800, color: "#0b1e36", margin: 0, lineHeight: 1.4 }}>{service.name}</h3>
          <span style={{ background: "#f0f7ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: ".6rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>حسب الحجم</span>
        </div>
        {service.description && (
          <p style={{ fontSize: ".65rem", color: "#6b829b", margin: "0 0 10px", lineHeight: 1.5 }}>{service.description}</p>
        )}
        {service.default_duration_days && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".58rem", color: "#6b829b", background: "#f8fafc", padding: "2px 7px", borderRadius: 8 }}>
            <Clock size={9} /> {service.default_duration_days} يوم
          </span>
        )}
      </div>
      <div style={{ padding: "10px 12px", background: "#fafbfd", borderTop: "1px solid #f0f4f8" }}>
        <button onClick={onBook}
          style={{ width: "100%", padding: "9px", background: "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", font: "inherit", fontSize: ".68rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background .15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#0e4a8a")}
          onMouseLeave={e => (e.currentTarget.style.background = "#073766")}>
          <CalendarDays size={13} /> جدولة استشارة
        </button>
      </div>
    </div>
  );
}
