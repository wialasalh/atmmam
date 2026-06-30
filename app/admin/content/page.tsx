"use client";
import PageLoader from "@/components/page-loader";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  RefreshCw, Save, ExternalLink, CheckCircle, AlertCircle,
  ChevronLeft, Layout, Quote, Plus, Trash2,
  HelpCircle, Megaphone,
} from "lucide-react";

/* ── types ── */
type HeroData = {
  eyebrow: string; body: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  assurances: string[];
  badges: { value: string; label: string }[];
};
type Testimonial = { quote: string; name: string; role: string };
type FaqItem     = { question: string; answer: string };
type BannerData  = {
  enabled: boolean; text: string; link: string; linkLabel: string;
  type: "info" | "success" | "warning" | "promo";
};

type SectionKey = "hero" | "testimonials" | "faq" | "banner";

/* ── field helpers ── */
const FIELD: React.CSSProperties = {
  width: "100%", border: "1.5px solid #dfe8f1", borderRadius: 9,
  padding: "8px 12px", font: "inherit", fontSize: ".73rem",
  color: "#1a2d40", background: "#fff", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s",
};
function Inp({ value, onChange, placeholder, multiline, rows }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; rows?: number;
}) {
  if (multiline)
    return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      rows={rows || 3} style={{ ...FIELD, resize: "vertical", lineHeight: 1.6 }} />;
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...FIELD, height: 38 }} />;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: ".6rem", fontWeight: 700, color: "#425c76", marginBottom: 4 }}>{children}</div>;
}
function FG({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12, ...style }}>{children}</div>;
}

const BANNER_COLORS: Record<string, { bg: string; border: string; color: string; label: string }> = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", label: "معلوماتي (أزرق)" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", label: "إيجابي (أخضر)" },
  warning: { bg: "#fff7ed", border: "#fed7aa", color: "#b45309", label: "تنبيه (برتقالي)" },
  promo:   { bg: "#073766", border: "#073766", color: "#fff",    label: "عرض مميز (نيفي)" },
};

const SECTIONS: { key: SectionKey; label: string; sub: string; Icon: React.ComponentType<{size?:number;color?:string}> }[] = [
  { key: "banner",       label: "البانر التنبيهي",    sub: "شريط إعلاني أعلى الموقع",      Icon: Megaphone  },
  { key: "hero",         label: "الواجهة الرئيسية",  sub: "العنوان والنص والأرقام",          Icon: Layout     },
  { key: "faq",          label: "الأسئلة الشائعة",   sub: "الأسئلة المعروضة في الرئيسية",  Icon: HelpCircle },
  { key: "testimonials", label: "آراء العملاء",       sub: "الشهادات المعروضة",               Icon: Quote      },
];

export default function AdminContentPage() {
  const { loading: authLoading } = useRoleGuard("manager");
  const [loading,  setLoading]   = useState(true);
  const [saving,   setSaving]    = useState<SectionKey | null>(null);
  const [active,   setActive]    = useState<SectionKey>("banner");
  const [toast,    setToast]     = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Record<string, string>>({});

  const [hero,         setHero]         = useState<HeroData>({ eyebrow:"", body:"", primaryCta:{label:"",href:""}, secondaryCta:{label:"",href:""}, assurances:["","",""], badges:[] });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs,         setFaqs]         = useState<FaqItem[]>([]);
  const [banner,       setBanner]       = useState<BannerData>({ enabled:false, text:"", link:"", linkLabel:"اكتشف العرض", type:"promo" });

  function notify(msg: string, type: "ok"|"err" = "ok") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2800);
  }

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/content");
      const json = await res.json();
      const d    = json.data || {};
      if (d.hero)         setHero(d.hero.data);
      if (d.testimonials) setTestimonials(d.testimonials.data);
      if (d.faq)          setFaqs(d.faq.data);
      if (d.banner)       setBanner(d.banner.data);
      const ts: Record<string, string> = {};
      for (const k of Object.keys(d)) ts[k] = d[k].updated_at;
      setUpdatedAt(ts);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function save(key: SectionKey, data: unknown) {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/content", {
        method:"PATCH", headers:{"content-type":"application/json"},
        body: JSON.stringify({ key, data }),
      });
      if (!res.ok) throw new Error();
      setUpdatedAt(p => ({ ...p, [key]: new Date().toISOString() }));
      notify("تم حفظ التغييرات ✓");
    } catch { notify("تعذر الحفظ، حاول مجدداً", "err"); }
    finally { setSaving(null); }
  }

  function fmtDate(iso?: string) {
    if (!iso) return "لم يُعدَّل";
    return new Date(iso).toLocaleString("ar-SA", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
  }

  function SaveBtn({ k, data }: { k: SectionKey; data: unknown }) {
    const isSaving = saving === k;
    return (
      <button className="ct-save" onClick={() => save(k, data)} disabled={isSaving}>
        {isSaving
          ? <><span style={{ width:13,height:13,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block" }} /> جاري الحفظ...</>
          : <><Save size={13} /> حفظ التغييرات</>}
      </button>
    );
  }

  if (authLoading || loading) return <PageLoader text="جاري تحميل المحتوى..." />;

  return (
    <div className="ct-shell" dir="rtl">
      <style>{`
        .ct-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;color:#173d65;overflow:hidden}
        /* Header */
        .ct-head{padding:18px 24px 14px;border-bottom:1px solid #dfe8f1;background:linear-gradient(180deg,#fff,#f8fbff)}
        .ct-head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
        .ct-eyebrow{margin:0 0 4px;color:#0f766e;font-size:.65rem;font-weight:900;letter-spacing:.04em}
        .ct-head h1{margin:0 0 4px;font-size:1.5rem;color:#073766;line-height:1}
        .ct-head p{margin:0;color:#7f8e9f;font-size:.7rem}
        .ct-head-btns{display:flex;gap:8px}
        .ct-btn{height:38px;border:1px solid #d7e3ed;border-radius:8px;background:#fff;color:#536a82;padding:0 13px;font:inherit;font-size:.65rem;font-weight:800;display:inline-flex;align-items:center;gap:7px;cursor:pointer;transition:all .14s;text-decoration:none}
        .ct-btn:hover{background:#f4f7fb}
        /* KPIs */
        .ct-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
        .ct-kpi{border:1px solid #dfe8f1;background:#fff;border-radius:11px;padding:10px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;transition:all .12s}
        .ct-kpi:hover{border-color:#bddcff;background:#f8fbff}
        .ct-kpi.active{border-color:#bddcff;background:#eaf4ff}
        .ct-kpi i{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;background:#f4f7fb;transition:background .12s}
        .ct-kpi.active i{background:#dbeafe}
        .ct-kpi small{display:block;font-size:.54rem;color:#8190a1;font-weight:800;line-height:1.2}
        .ct-kpi strong{display:block;font-size:.6rem;line-height:1.3;margin-top:2px;color:#073766}
        /* Body */
        .ct-body{min-height:0;display:grid;grid-template-columns:240px 1fr;overflow:hidden}
        /* Sidebar */
        .ct-sidebar{border-left:1px solid #dfe8f1;background:#fff;overflow-y:auto;padding:10px 8px}
        .ct-sidebar-lbl{font-size:.56rem;font-weight:800;color:#a0adb8;padding:4px 8px 8px;letter-spacing:.06em}
        .ct-nav{display:flex;align-items:center;gap:9px;padding:9px 9px;border-radius:10px;cursor:pointer;transition:all .12s;margin-bottom:2px;border:1px solid transparent;position:relative}
        .ct-nav:hover{background:#f4f7fb}
        .ct-nav.active{background:#eaf4ff;border-color:#bddcff}
        .ct-nav-ico{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;background:#f4f7fb}
        .ct-nav.active .ct-nav-ico{background:#dbeafe}
        .ct-nav-lbl{font-size:.68rem;font-weight:700;color:#1a2d40;line-height:1.2}
        .ct-nav-sub{font-size:.56rem;color:#8b9dad;margin-top:1px}
        .ct-nav-arr{margin-right:auto;color:#c4cdd6;flex-shrink:0}
        .ct-nav.active .ct-nav-arr{color:#0875dc}
        .ct-nav-dot{position:absolute;top:8px;left:8px;width:6px;height:6px;border-radius:50%;background:#22c55e}
        /* Editor */
        .ct-editor{overflow-y:auto;padding:20px 24px}
        .ct-editor-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px}
        .ct-editor-title{font-size:1rem;font-weight:800;color:#073766;margin:0 0 3px}
        .ct-editor-meta{font-size:.59rem;color:#a0adb8}
        .ct-editor-acts{display:flex;gap:8px;flex-shrink:0;align-items:center}
        /* Card */
        .ct-card{background:#fff;border:1px solid #dfe8f1;border-radius:14px;overflow:hidden;margin-bottom:14px}
        .ct-card-head{padding:11px 16px;border-bottom:1px solid #f0f4f8;display:flex;align-items:center;justify-content:space-between}
        .ct-card-title{font-size:.72rem;font-weight:800;color:#0b1e36;display:flex;align-items:center;gap:7px}
        .ct-card-body{padding:14px 16px}
        /* Save */
        .ct-save{height:36px;border:0;border-radius:9px;background:#073766;color:#fff;font:inherit;font-size:.65rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:0 16px}
        .ct-save:hover{background:#0a4a8a}
        .ct-save:disabled{background:#c5d2de;cursor:not-allowed}
        .ct-preview{height:36px;border:1px solid #d7e3ed;border-radius:9px;background:#fff;color:#526983;font:inherit;font-size:.63rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0 12px;text-decoration:none}
        .ct-preview:hover{background:#f4f7fb}
        /* icon btn */
        .ct-ico-btn{width:28px;height:28px;border:1px solid #e4ebf2;border-radius:7px;background:#fff;cursor:pointer;display:grid;place-items:center;color:#8b9dad;transition:all .12s;flex-shrink:0}
        .ct-ico-btn:hover{background:#fef2f2;border-color:#fecaca;color:#dc2626}
        .ct-ico-btn.add:hover{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
        /* FAQ items */
        .ct-faq-item{background:#f8fafc;border:1px solid #e4ebf2;border-radius:11px;padding:12px 13px;margin-bottom:8px;position:relative}
        .ct-faq-num{position:absolute;top:10px;left:10px;width:20px;height:20px;background:#073766;color:#fff;border-radius:6px;font-size:.54rem;font-weight:800;display:grid;place-items:center}
        /* testimonial */
        .ct-t-card{background:#f8fafc;border:1px solid #e4ebf2;border-radius:11px;padding:12px 13px;margin-bottom:8px;position:relative}
        .ct-t-num{position:absolute;top:10px;left:10px;width:20px;height:20px;background:#073766;color:#fff;border-radius:6px;font-size:.54rem;font-weight:800;display:grid;place-items:center}
        /* banner preview */
        .ct-banner-preview{border-radius:10px;padding:11px 16px;display:flex;align-items:center;gap:10px;font-size:.7rem;font-weight:700;margin-bottom:14px;transition:all .3s}
        /* Toggle switch */
        .ct-toggle{display:flex;align-items:center;gap:10px}
        .ct-toggle input[type=checkbox]{display:none}
        .ct-toggle-track{width:40px;height:22px;border-radius:20px;background:#e5eaf0;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
        .ct-toggle-track.on{background:#073766}
        .ct-toggle-thumb{width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:3px;right:3px;transition:right .2s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
        .ct-toggle-track.on .ct-toggle-thumb{right:calc(100% - 19px)}
        .ct-toggle-lbl{font-size:.72rem;font-weight:700;color:#1a2d40}
        /* badge grid */
        .ct-badge-row{display:grid;grid-template-columns:110px 1fr auto;gap:8px;align-items:end;margin-bottom:8px}
        /* color types */
        .ct-type-grid{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
        .ct-type-opt{border:2px solid;border-radius:9px;padding:7px 12px;cursor:pointer;font:inherit;font-size:.62rem;font-weight:700;transition:all .12s;display:flex;align-items:center;gap:6px}
        /* toast */
        .ct-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:12px;font-size:.7rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:1000;animation:ctUp .2s;white-space:nowrap}
        .ct-toast.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
        .ct-toast.err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        .ct-hint{font-size:.6rem;color:#a0adb8;margin-top:4px;line-height:1.5}
        @keyframes ctUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="ct-head">
        <div className="ct-head-row">
          <div>
            <p className="ct-eyebrow">إدارة الموقع</p>
            <h1>محتوى الموقع</h1>
            <p>تعديل جميع النصوص والأقسام المعروضة في الصفحة الرئيسية</p>
          </div>
          <div className="ct-head-btns">
            <button className="ct-btn" onClick={() => { setLoading(true); void load(); }}><RefreshCw size={13} /> تحديث</button>
            <a className="ct-btn" href="http://localhost:3001" target="_blank" rel="noopener"><ExternalLink size={13} /> معاينة الموقع</a>
          </div>
        </div>

        <div className="ct-kpis">
          {SECTIONS.map(s => (
            <div key={s.key} className={`ct-kpi${active === s.key ? " active" : ""}`} onClick={() => setActive(s.key)}>
              <i><s.Icon size={14} color={active === s.key ? "#0875dc" : "#8b9dad"} /></i>
              <div>
                <small>{s.label}</small>
                <strong>{fmtDate(updatedAt[s.key])}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="ct-body">

        {/* Sidebar */}
        <div className="ct-sidebar">
          <div className="ct-sidebar-lbl">أقسام المحتوى</div>
          {SECTIONS.map(s => (
            <div key={s.key} className={`ct-nav${active === s.key ? " active" : ""}`} onClick={() => setActive(s.key)}>
              {s.key === "banner" && banner.enabled && <span className="ct-nav-dot" title="البانر مفعّل" />}
              <span className="ct-nav-ico"><s.Icon size={14} color={active === s.key ? "#0875dc" : "#8b9dad"} /></span>
              <div>
                <div className="ct-nav-lbl">{s.label}</div>
                <div className="ct-nav-sub">{s.sub}</div>
              </div>
              <ChevronLeft size={13} className="ct-nav-arr" />
            </div>
          ))}
        </div>

        {/* ══ EDITOR ══ */}
        <div className="ct-editor">

          {/* ─── BANNER ─── */}
          {active === "banner" && (
            <>
              <div className="ct-editor-head">
                <div>
                  <div className="ct-editor-title">البانر التنبيهي</div>
                  <div className="ct-editor-meta">شريط يظهر أعلى الموقع · آخر تعديل: {fmtDate(updatedAt.banner)}</div>
                </div>
                <div className="ct-editor-acts">
                  <a className="ct-preview" href="http://localhost:3001" target="_blank" rel="noopener"><ExternalLink size={12} /> معاينة</a>
                  <SaveBtn k="banner" data={banner} />
                </div>
              </div>

              {/* Preview */}
              {banner.text && (
                <div className="ct-banner-preview" style={{
                  background: BANNER_COLORS[banner.type].bg,
                  border: `1px solid ${BANNER_COLORS[banner.type].border}`,
                  color: BANNER_COLORS[banner.type].color,
                }}>
                  <Megaphone size={14} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{banner.text}</span>
                  {banner.linkLabel && banner.link && (
                    <span style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${BANNER_COLORS[banner.type].color}`, fontSize: ".62rem", fontWeight: 800, opacity: .85 }}>{banner.linkLabel}</span>
                  )}
                </div>
              )}

              <div className="ct-card">
                <div className="ct-card-head">
                  <span className="ct-card-title">حالة البانر</span>
                </div>
                <div className="ct-card-body">
                  <label className="ct-toggle" style={{ cursor: "pointer" }}>
                    <span className={`ct-toggle-track${banner.enabled ? " on" : ""}`} onClick={() => setBanner(b => ({ ...b, enabled: !b.enabled }))}>
                      <span className="ct-toggle-thumb" />
                    </span>
                    <span className="ct-toggle-lbl">{banner.enabled ? "البانر مفعّل ويظهر للزوار" : "البانر معطّل ومخفي"}</span>
                  </label>
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head"><span className="ct-card-title">نوع البانر</span></div>
                <div className="ct-card-body">
                  <div className="ct-type-grid">
                    {Object.entries(BANNER_COLORS).map(([k, v]) => (
                      <button key={k} className="ct-type-opt"
                        style={{ borderColor: banner.type === k ? v.color : "#e5eaf0", background: banner.type === k ? v.bg : "#fff", color: banner.type === k ? v.color : "#65788c" }}
                        onClick={() => setBanner(b => ({ ...b, type: k as BannerData["type"] }))}>
                        {banner.type === k && <CheckCircle size={11} />}
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head"><span className="ct-card-title">نص البانر والرابط</span></div>
                <div className="ct-card-body">
                  <FG>
                    <Lbl>نص البانر الرئيسي *</Lbl>
                    <Inp value={banner.text} onChange={v => setBanner(b => ({ ...b, text: v }))} placeholder="مثال: عرض خاص — خصم 20% على باقة التأسيس لهذا الأسبوع فقط" />
                  </FG>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FG>
                      <Lbl>نص زر الرابط</Lbl>
                      <Inp value={banner.linkLabel} onChange={v => setBanner(b => ({ ...b, linkLabel: v }))} placeholder="اكتشف العرض" />
                    </FG>
                    <FG>
                      <Lbl>رابط الزر</Lbl>
                      <Inp value={banner.link} onChange={v => setBanner(b => ({ ...b, link: v }))} placeholder="/packages" />
                    </FG>
                  </div>
                  <div className="ct-hint">اترك حقل الرابط فارغاً إذا لم تريد زراً في البانر.</div>
                </div>
              </div>
            </>
          )}

          {/* ─── HERO ─── */}
          {active === "hero" && (
            <>
              <div className="ct-editor-head">
                <div>
                  <div className="ct-editor-title">الواجهة الرئيسية</div>
                  <div className="ct-editor-meta">آخر تعديل: {fmtDate(updatedAt.hero)}</div>
                </div>
                <div className="ct-editor-acts">
                  <a className="ct-preview" href="http://localhost:3001" target="_blank" rel="noopener"><ExternalLink size={12} /> معاينة</a>
                  <SaveBtn k="hero" data={hero} />
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head"><span className="ct-card-title">النص الرئيسي</span></div>
                <div className="ct-card-body">
                  <FG>
                    <Lbl>النص الصغير فوق العنوان (Eyebrow)</Lbl>
                    <Inp value={hero.eyebrow} onChange={v => setHero(h => ({ ...h, eyebrow: v }))} placeholder="نرتّب إجراءات منشأتك..." />
                  </FG>
                  <FG>
                    <Lbl>النص التعريفي</Lbl>
                    <Inp value={hero.body} onChange={v => setHero(h => ({ ...h, body: v }))} multiline rows={3} placeholder="أرسل لنا وضع الطلب..." />
                  </FG>
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head"><span className="ct-card-title">أزرار الدعوة للتحرك (CTA)</span></div>
                <div className="ct-card-body">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <FG><Lbl>نص الزر الأساسي</Lbl><Inp value={hero.primaryCta.label} onChange={v => setHero(h => ({ ...h, primaryCta: { ...h.primaryCta, label: v } }))} placeholder="ابدأ تشخيص طلبك" /></FG>
                      <FG><Lbl>رابط الزر الأساسي</Lbl><Inp value={hero.primaryCta.href} onChange={v => setHero(h => ({ ...h, primaryCta: { ...h.primaryCta, href: v } }))} placeholder="/#contact" /></FG>
                    </div>
                    <div>
                      <FG><Lbl>نص الزر الثانوي</Lbl><Inp value={hero.secondaryCta.label} onChange={v => setHero(h => ({ ...h, secondaryCta: { ...h.secondaryCta, label: v } }))} placeholder="اكتشف الخدمات" /></FG>
                      <FG><Lbl>رابط الزر الثانوي</Lbl><Inp value={hero.secondaryCta.href} onChange={v => setHero(h => ({ ...h, secondaryCta: { ...h.secondaryCta, href: v } }))} placeholder="/services" /></FG>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head"><span className="ct-card-title">نقاط الطمأنينة (أسفل الأزرار)</span></div>
                <div className="ct-card-body">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {hero.assurances.map((a, i) => (
                      <FG key={i}>
                        <Lbl>النقطة {i + 1}</Lbl>
                        <Inp value={a} onChange={v => setHero(h => ({ ...h, assurances: h.assurances.map((x, j) => j === i ? v : x) }))} />
                      </FG>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head">
                  <span className="ct-card-title">الأرقام والإحصائيات</span>
                  <button className="ct-ico-btn add" title="إضافة" onClick={() => setHero(h => ({ ...h, badges: [...h.badges, { value: "", label: "" }] }))}><Plus size={13} /></button>
                </div>
                <div className="ct-card-body">
                  {hero.badges.map((b, i) => (
                    <div key={i} className="ct-badge-row">
                      <FG style={{ margin: 0 }}><Lbl>القيمة</Lbl><Inp value={b.value} onChange={v => setHero(h => ({ ...h, badges: h.badges.map((x, j) => j === i ? { ...x, value: v } : x) }))} placeholder="+300" /></FG>
                      <FG style={{ margin: 0 }}><Lbl>الوصف</Lbl><Inp value={b.label} onChange={v => setHero(h => ({ ...h, badges: h.badges.map((x, j) => j === i ? { ...x, label: v } : x) }))} placeholder="خدمة نقدمها..." /></FG>
                      <button className="ct-ico-btn" style={{ marginTop: 20 }} onClick={() => setHero(h => ({ ...h, badges: h.badges.filter((_, j) => j !== i) }))}><Trash2 size={12} /></button>
                    </div>
                  ))}
                  {hero.badges.length === 0 && <div style={{ fontSize: ".66rem", color: "#c4cdd6", textAlign: "center", padding: "12px 0" }}>لا أرقام بعد — اضغط + للإضافة</div>}
                </div>
              </div>
            </>
          )}

          {/* ─── FAQ ─── */}
          {active === "faq" && (
            <>
              <div className="ct-editor-head">
                <div>
                  <div className="ct-editor-title">الأسئلة الشائعة</div>
                  <div className="ct-editor-meta">يظهر أول 3 أسئلة في الصفحة الرئيسية · آخر تعديل: {fmtDate(updatedAt.faq)}</div>
                </div>
                <div className="ct-editor-acts">
                  <a className="ct-preview" href="http://localhost:3001/#faq" target="_blank" rel="noopener"><ExternalLink size={12} /> معاينة</a>
                  <SaveBtn k="faq" data={faqs} />
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head">
                  <span className="ct-card-title">
                    الأسئلة ({faqs.length}) <span style={{ fontSize: ".56rem", fontWeight: 400, color: "#8b9dad" }}>· أول 3 تظهر في الرئيسية</span>
                  </span>
                  <button className="ct-ico-btn add" title="إضافة سؤال" onClick={() => setFaqs(f => [...f, { question: "", answer: "" }])}><Plus size={13} /></button>
                </div>
                <div className="ct-card-body">
                  {faqs.map((f, i) => (
                    <div key={i} className="ct-faq-item">
                      <span className="ct-faq-num" style={{ background: i < 3 ? "#073766" : "#94a3b8" }}>{i + 1}</span>
                      {i < 3 && <span style={{ position: "absolute", top: 10, left: 34, fontSize: ".5rem", background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 20, fontWeight: 800 }}>رئيسية</span>}
                      <div style={{ paddingRight: i < 3 ? 60 : 30 }}>
                        <FG>
                          <Lbl>السؤال</Lbl>
                          <Inp value={f.question} onChange={v => setFaqs(fs => fs.map((x, j) => j === i ? { ...x, question: v } : x))} placeholder="اكتب السؤال هنا..." />
                        </FG>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
                          <FG style={{ margin: 0 }}>
                            <Lbl>الجواب</Lbl>
                            <Inp value={f.answer} onChange={v => setFaqs(fs => fs.map((x, j) => j === i ? { ...x, answer: v } : x))} multiline rows={2} placeholder="اكتب الجواب هنا..." />
                          </FG>
                          <button className="ct-ico-btn" style={{ marginBottom: 3 }} onClick={() => setFaqs(fs => fs.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {faqs.length === 0 && <div style={{ fontSize: ".66rem", color: "#c4cdd6", textAlign: "center", padding: "16px 0" }}>لا أسئلة بعد — اضغط + للإضافة</div>}
                </div>
              </div>
            </>
          )}

          {/* ─── TESTIMONIALS ─── */}
          {active === "testimonials" && (
            <>
              <div className="ct-editor-head">
                <div>
                  <div className="ct-editor-title">آراء العملاء</div>
                  <div className="ct-editor-meta">آخر تعديل: {fmtDate(updatedAt.testimonials)}</div>
                </div>
                <div className="ct-editor-acts">
                  <a className="ct-preview" href="http://localhost:3001/#testimonials" target="_blank" rel="noopener"><ExternalLink size={12} /> معاينة</a>
                  <SaveBtn k="testimonials" data={testimonials} />
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-head">
                  <span className="ct-card-title">الشهادات ({testimonials.length})</span>
                  <button className="ct-ico-btn add" title="إضافة شهادة" onClick={() => setTestimonials(t => [...t, { quote: "", name: "", role: "" }])}><Plus size={13} /></button>
                </div>
                <div className="ct-card-body">
                  {testimonials.map((t, i) => (
                    <div key={i} className="ct-t-card">
                      <span className="ct-t-num">{i + 1}</span>
                      <div style={{ paddingRight: 28 }}>
                        <FG>
                          <Lbl>نص الشهادة</Lbl>
                          <Inp value={t.quote} onChange={v => setTestimonials(ts => ts.map((x, j) => j === i ? { ...x, quote: v } : x))} multiline rows={2} placeholder="اكتب نص الشهادة..." />
                        </FG>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                          <FG style={{ margin: 0 }}><Lbl>اسم العميل</Lbl><Inp value={t.name} onChange={v => setTestimonials(ts => ts.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="أحمد الغامدي" /></FG>
                          <FG style={{ margin: 0 }}><Lbl>المنصب / المنشأة</Lbl><Inp value={t.role} onChange={v => setTestimonials(ts => ts.map((x, j) => j === i ? { ...x, role: v } : x))} placeholder="مدير عام، شركة..." /></FG>
                          <button className="ct-ico-btn" style={{ marginBottom: 3 }} onClick={() => setTestimonials(ts => ts.filter((_, j) => j !== i))}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {testimonials.length === 0 && <div style={{ fontSize: ".66rem", color: "#c4cdd6", textAlign: "center", padding: "16px 0" }}>لا شهادات بعد — اضغط + للإضافة</div>}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {toast && (
        <div className={`ct-toast ${toast.type}`}>
          {toast.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
