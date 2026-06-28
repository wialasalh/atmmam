"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, FileText, Building2, ArrowLeft, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

type Service = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  default_duration_days: number | null;
  required_documents: string[] | null;
  agencies: { name: string } | null;
};

const CATEGORY_ICONS: Record<string, string> = {
  "السجل التجاري": "🏪",
  "تأسيس الشركات": "🏢",
  "الزكاة والضريبة": "📊",
  "الملكية الفكرية": "💡",
  "الموارد البشرية": "👥",
  "التراخيص": "📋",
  "الاستثمار": "📈",
  "الاستشارات": "🎯",
};

export default function ClientServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [requestModal, setRequestModal] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/services")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setServices(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ["الكل", ...Array.from(new Set(services.map(s => s.category)))];

  const visible = services.filter(s => {
    const matchCat = activeCategory === "الكل" || s.category === activeCategory;
    const matchQ = !query || s.name.includes(query) || s.category.includes(query) || s.agencies?.name?.includes(query);
    return matchCat && matchQ;
  });

  const grouped = visible.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  async function requestService(service: Service) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: `طلب خدمة: ${service.name}`,
          description: `أرغب في الاستفسار عن خدمة "${service.name}"${service.price ? ` بسعر ${service.price.toLocaleString("ar-SA")} ر.س` : ""}.`,
          category: service.category,
          priority: "normal",
        }),
      });
      if (res.ok) { setSubmitted(true); setTimeout(() => { setRequestModal(null); setSubmitted(false); router.push("/dashboard/tickets"); }, 1800); }
    } catch { /* ignore */ } finally { setSubmitting(false); }
  }

  if (loading) return (
    <div style={{ display: "grid", placeItems: "center", height: "60vh" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e5ecf3", borderTopColor: "#073766", animation: "spin .7s linear infinite" }} />
    </div>
  );

  return (
    <div className="client-dash-page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: ".7rem", color: "#8b9dad", margin: "0 0 4px" }}>لوحة التحكم</p>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0b1e36", margin: "0 0 4px" }}>خدماتنا</h1>
        <p style={{ fontSize: ".75rem", color: "#8b9dad", margin: 0 }}>اطلع على جميع خدماتنا وتقدم بطلبك مباشرة</p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={15} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#8b9dad" }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ابحث عن خدمة..."
          style={{ width: "100%", border: "1px solid #e5eaf0", borderRadius: 12, padding: "11px 42px 11px 14px", font: "inherit", fontSize: ".78rem", color: "#344d69", boxSizing: "border-box", outline: "none", background: "#fff" }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid", fontSize: ".65rem", fontWeight: 700, cursor: "pointer", font: "inherit", whiteSpace: "nowrap", transition: "all .15s",
              borderColor: activeCategory === cat ? "#073766" : "#e5eaf0",
              background: activeCategory === cat ? "#073766" : "#fff",
              color: activeCategory === cat ? "#fff" : "#526983" }}>
            {CATEGORY_ICONS[cat] || ""} {cat}
          </button>
        ))}
      </div>

      {/* Services grouped by category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: "1.1rem" }}>{CATEGORY_ICONS[cat] || "📌"}</span>
            <h2 style={{ fontSize: ".85rem", fontWeight: 800, color: "#0b1e36", margin: 0 }}>{cat}</h2>
            <span style={{ fontSize: ".6rem", background: "#f0f4f8", color: "#6b829b", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{items.length} خدمة</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {items.map(service => (
              <div key={service.id}
                style={{ background: "#fff", border: "1.5px solid #e5eaf0", borderRadius: 14, overflow: "hidden", transition: "box-shadow .2s", cursor: "default" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(7,55,102,.08)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ padding: "16px 16px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <h3 style={{ fontSize: ".78rem", fontWeight: 800, color: "#0b1e36", margin: 0, lineHeight: 1.4 }}>{service.name}</h3>
                    {service.price ? (
                      <span style={{ background: "#f0f7ff", color: "#073766", fontSize: ".62rem", fontWeight: 800, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {service.price.toLocaleString("ar-SA")} ر.س
                      </span>
                    ) : <span style={{ background: "#f0fdf4", color: "#15803d", fontSize: ".62rem", fontWeight: 800, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 }}>استشر مجاناً</span>}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {service.agencies?.name && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".6rem", color: "#6b829b" }}>
                        <Building2 size={10} /> {service.agencies.name}
                      </span>
                    )}
                    {service.default_duration_days && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".6rem", color: "#6b829b" }}>
                        <Clock size={10} /> {service.default_duration_days} يوم
                      </span>
                    )}
                    {service.required_documents?.length ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".6rem", color: "#6b829b" }}>
                        <FileText size={10} /> {service.required_documents.length} مستندات
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Expandable documents */}
                {service.required_documents?.length ? (
                  <div style={{ borderTop: "1px solid #f0f4f8" }}>
                    <button onClick={() => setExpanded(expanded === service.id ? null : service.id)}
                      style={{ width: "100%", padding: "8px 16px", background: "none", border: 0, cursor: "pointer", font: "inherit", fontSize: ".62rem", color: "#6b829b", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600 }}>
                      <span>المستندات المطلوبة</span>
                      {expanded === service.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expanded === service.id && (
                      <div style={{ padding: "4px 16px 12px" }}>
                        {service.required_documents.map((doc, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: ".62rem", color: "#526983" }}>
                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#073766", flexShrink: 0 }} />
                            {doc}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div style={{ padding: "10px 16px", background: "#fafbfd", borderTop: "1px solid #f0f4f8" }}>
                  <button onClick={() => setRequestModal(service)}
                    style={{ width: "100%", padding: "9px", background: "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: "pointer", font: "inherit", fontSize: ".68rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ShoppingCart size={13} /> اطلب الخدمة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#8b9dad" }}>
          <p style={{ fontSize: "2rem", margin: "0 0 12px" }}>🔍</p>
          <p style={{ fontWeight: 700, margin: "0 0 6px" }}>لا توجد خدمات مطابقة</p>
          <p style={{ fontSize: ".75rem" }}>جرب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً</p>
        </div>
      )}

      {/* Request Modal */}
      {requestModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !submitting && setRequestModal(null)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}
            onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#0b1e36" }}>تم إرسال طلبك!</h3>
                <p style={{ fontSize: ".75rem", color: "#8b9dad", margin: 0 }}>سيتواصل معك فريقنا قريباً</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: ".9rem", color: "#0b1e36" }}>طلب خدمة</h3>
                  <p style={{ margin: 0, fontSize: ".75rem", color: "#8b9dad" }}>{requestModal.name}</p>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", gap: 16 }}>
                  {requestModal.price && <div style={{ textAlign: "center" }}><div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 2 }}>السعر</div><div style={{ fontWeight: 800, color: "#073766", fontSize: ".82rem" }}>{requestModal.price.toLocaleString("ar-SA")} ر.س</div></div>}
                  {requestModal.default_duration_days && <div style={{ textAlign: "center" }}><div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 2 }}>المدة</div><div style={{ fontWeight: 800, color: "#073766", fontSize: ".82rem" }}>{requestModal.default_duration_days} يوم</div></div>}
                  {requestModal.agencies?.name && <div><div style={{ fontSize: ".6rem", color: "#8b9dad", marginBottom: 2 }}>الجهة</div><div style={{ fontWeight: 800, color: "#073766", fontSize: ".72rem" }}>{requestModal.agencies.name}</div></div>}
                </div>
                <p style={{ fontSize: ".72rem", color: "#526983", marginBottom: 20 }}>سيتم فتح تذكرة دعم وسيتواصل معك أحد مستشارينا لتأكيد الطلب وإرشادك للخطوات التالية.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setRequestModal(null)} disabled={submitting}
                    style={{ flex: 1, padding: "11px", border: "1px solid #e5eaf0", borderRadius: 10, background: "#fff", color: "#526983", cursor: "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 600 }}>
                    إلغاء
                  </button>
                  <button onClick={() => requestService(requestModal)} disabled={submitting}
                    style={{ flex: 2, padding: "11px", background: submitting ? "#8b9dad" : "#073766", color: "#fff", border: 0, borderRadius: 10, cursor: submitting ? "not-allowed" : "pointer", font: "inherit", fontSize: ".72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ArrowLeft size={13} /> {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
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
