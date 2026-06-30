"use client";
import PageLoader from "@/components/page-loader";
import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  Save, RefreshCw, CheckCircle, AlertCircle,
  Globe, Mail, MessageSquare,
  Settings2, ExternalLink, MailPlus,
} from "lucide-react";

/* ── social SVG icons (monochrome) ── */
const IC = "#526983";
const SOCIAL_PLATFORMS = [
  {
    key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/atmmam",
    logo: `<svg width="15" height="15" viewBox="0 0 24 24" fill="${IC}"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg>`,
  },
  {
    key: "instagram", label: "Instagram", placeholder: "https://instagram.com/atmmam",
    logo: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${IC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  },
  {
    key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/atmmam",
    logo: `<svg width="15" height="15" viewBox="0 0 24 24" fill="${IC}"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  },
  {
    key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@atmmam",
    logo: `<svg width="15" height="15" viewBox="0 0 24 24" fill="${IC}"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  },
  {
    key: "snapchat", label: "Snapchat", placeholder: "https://snapchat.com/add/atmmam",
    logo: `<svg width="15" height="15" viewBox="0 0 24 24" fill="${IC}"><path d="M12.166.001c.18 0 1.834.047 2.987 1.321.778.872.988 1.989 1.043 2.83.02.327.014.647.012.836l.004.19c.554.288 1.33.23 1.81.168a.5.5 0 0 1 .067-.005c.185 0 .378.11.44.31.07.227-.07.47-.396.611-.046.02-1.124.476-1.124 1.302 0 .104.012.207.037.31.48 1.924 1.928 3.206 3.218 3.776.17.075.253.262.2.44-.031.104-.12.196-.25.232-.656.183-1.376.284-2.142.3-.036.196-.043.42-.09.652-.085.423-.372.667-.727.667-.157 0-.327-.046-.503-.14-1.01-.55-1.948-.83-2.834-.83-.52 0-1.016.105-1.48.306l-.003.003c-.484.211-.938.318-1.35.318-.963 0-1.614-.545-1.726-1.099-.043-.21-.053-.436-.088-.65-.77-.016-1.49-.117-2.146-.3-.13-.036-.218-.128-.25-.232-.053-.178.03-.365.2-.44 1.29-.57 2.737-1.852 3.218-3.776a1.22 1.22 0 0 0 .037-.31c0-.832-1.085-1.289-1.128-1.307-.32-.138-.457-.38-.39-.607.063-.2.257-.312.44-.312a.51.51 0 0 1 .07.005c.48.063 1.257.12 1.812-.168l.004-.19c-.002-.189-.009-.509.011-.836.056-.841.266-1.958 1.043-2.83C10.335.047 11.987.001 12.166.001Z"/></svg>`,
  },
  {
    key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@atmmam",
    logo: `<svg width="15" height="15" viewBox="0 0 24 24" fill="${IC}"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>`,
  },
];

/* ── types ── */
type GeneralSettings = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  defaultLang: "ar" | "en";
  maintenanceMode: boolean;
};
type ContactSettings = {
  email: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  workingHours: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  snapchat: string;
  tiktok: string;
};
type SeoSettings = {
  siteDescription: string;
  keywords: string;
  ogImage: string;
  googleAnalytics: string;
  googleTagManager: string;
};

type TabKey = "general" | "contact" | "seo" | "emails";
type EmailTemplate = { id: string; trigger_event: string; label_ar: string; subject_ar: string; body_ar: string; enabled: boolean; updated_at: string };

const TABS: { key: TabKey; label: string; sub: string; Icon: React.ComponentType<{size?:number}> }[] = [
  { key: "general", label: "الإعدادات العامة",  sub: "اسم الموقع، اللغة، الصيانة", Icon: Settings2 },
  { key: "contact", label: "بيانات التواصل",    sub: "البريد، الجوال، السوشيال",   Icon: Mail     },
  { key: "seo",     label: "SEO والتحليلات",    sub: "الوصف، الكلمات، Google",     Icon: Globe    },
  { key: "emails",  label: "قوالب البريد",      sub: "رسائل إشعارات العملاء التلقائية", Icon: MailPlus },
];

const FIELD: React.CSSProperties = {
  width: "100%", border: "1.5px solid #dfe8f1", borderRadius: 9,
  padding: "8px 12px", font: "inherit", fontSize: ".73rem",
  color: "#1a2d40", background: "#fff", outline: "none", boxSizing: "border-box",
};
function Inp({ value, onChange, placeholder, type, dir }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: string;
}) {
  return <input value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} type={type} dir={dir}
    style={{ ...FIELD, height: 38 }} />;
}
function Textarea({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return <textarea value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} rows={rows || 3}
    style={{ ...FIELD, resize: "vertical", lineHeight: 1.6 }} />;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: ".6rem", fontWeight: 700, color: "#425c76", marginBottom: 4 }}>{children}</div>;
}
function FG({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 14, ...style }}>{children}</div>;
}
function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: ".59rem", color: "#a0adb8", marginTop: 4, lineHeight: 1.5 }}>{children}</div>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #dfe8f1", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid #f0f4f8", fontSize: ".72rem", fontWeight: 800, color: "#0b1e36" }}>{title}</div>
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

const DEF_GENERAL: GeneralSettings = { siteName: "أتمم", logoUrl: "", faviconUrl: "", defaultLang: "ar", maintenanceMode: false };
const DEF_CONTACT: ContactSettings = { email: "info@atmmam.com.sa", supportEmail: "support@atmmam.com.sa", phone: "", whatsapp: "", address: "", workingHours: "الأحد – الخميس، 9 ص – 6 م", twitter: "", instagram: "", linkedin: "", youtube: "", snapchat: "", tiktok: "" };
const DEF_SEO: SeoSettings = { siteDescription: "", keywords: "", ogImage: "", googleAnalytics: "", googleTagManager: "" };

export default function AdminSettingsPage() {
  const { loading: authLoading } = useRoleGuard("admin");
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState<TabKey | null>(null);
  const [tab,     setTab]       = useState<TabKey>("general");
  const [toast,   setToast]     = useState<{ msg: string; type: "ok"|"err" } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Record<string, string>>({});

  const [general, setGeneral] = useState<GeneralSettings>(DEF_GENERAL);
  const [contact, setContact] = useState<ContactSettings>(DEF_CONTACT);
  const [seo,     setSeo]     = useState<SeoSettings>(DEF_SEO);

  const [templates,       setTemplates]       = useState<EmailTemplate[]>([]);
  const [activeTemplate,  setActiveTemplate]  = useState<string | null>(null);
  const [savingTemplate,  setSavingTemplate]  = useState(false);

  function notify(msg: string, type: "ok"|"err" = "ok") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  }

  async function loadTemplates() {
    const res = await fetch("/api/admin/email-templates");
    const json = await res.json();
    if (json.templates) {
      setTemplates(json.templates);
      if (!activeTemplate && json.templates.length) setActiveTemplate(json.templates[0].id);
    }
  }

  async function saveTemplate(t: EmailTemplate) {
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: t.id, subject_ar: t.subject_ar, body_ar: t.body_ar, enabled: t.enabled }),
      });
      if (!res.ok) throw new Error();
      notify("تم حفظ القالب ✓");
    } catch { notify("تعذر الحفظ، حاول مجدداً", "err"); }
    finally { setSavingTemplate(false); }
  }

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/content");
      const json = await res.json();
      const d    = json.data || {};
      if (d.settings_general?.data) setGeneral(d.settings_general.data);
      if (d.settings_contact?.data) setContact(d.settings_contact.data);
      if (d.settings_seo?.data)     setSeo(d.settings_seo.data);
      const ts: Record<string, string> = {};
      for (const k of ["settings_general", "settings_contact", "settings_seo"])
        if (d[k]?.updated_at) ts[k] = d[k].updated_at;
      setUpdatedAt(ts);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); void loadTemplates(); }, []);

  async function save(key: string, data: unknown, tabKey: TabKey) {
    setSaving(tabKey);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, data }),
      });
      if (!res.ok) throw new Error();
      setUpdatedAt(p => ({ ...p, [key]: new Date().toISOString() }));
      notify("تم حفظ الإعدادات ✓");
    } catch { notify("تعذر الحفظ، حاول مجدداً", "err"); }
    finally { setSaving(null); }
  }

  function fmtDate(iso?: string) {
    if (!iso) return "لم يُعدَّل بعد";
    return new Date(iso).toLocaleString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function SaveBtn({ tabKey, dataKey, data }: { tabKey: TabKey; dataKey: string; data: unknown }) {
    const isSaving = saving === tabKey;
    return (
      <button className="sg-save" onClick={() => save(dataKey, data, tabKey)} disabled={isSaving}>
        {isSaving
          ? <><span style={{ width:13,height:13,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block" }} /> جاري الحفظ...</>
          : <><Save size={13} /> حفظ التغييرات</>}
      </button>
    );
  }

  if (authLoading || loading) return <PageLoader text="جاري تحميل الإعدادات..." />;

  const tabKeys: Record<TabKey, string> = { general: "settings_general", contact: "settings_contact", seo: "settings_seo", emails: "" };
  const tabData: Record<TabKey, unknown> = { general, contact, seo, emails: null };

  return (
    <div dir="rtl" style={{ height: "calc(100vh - 60px)", display: "grid", gridTemplateRows: "auto 1fr", background: "#f4f7fb", overflow: "hidden" }}>
      <style>{`
        .sg-head{padding:18px 24px 0;background:linear-gradient(180deg,#fff,#f8fbff);border-bottom:1px solid #dfe8f1}
        .sg-eyebrow{margin:0 0 3px;color:#0f766e;font-size:.63rem;font-weight:900;letter-spacing:.04em}
        .sg-h1{margin:0 0 12px;font-size:1.5rem;color:#073766;line-height:1}
        .sg-tabs{display:flex;gap:2px;border-top:1px solid #f0f4f8;margin-top:6px}
        .sg-tab{display:flex;align-items:center;gap:8px;padding:12px 16px;border:none;background:none;font:inherit;font-size:.7rem;font-weight:700;color:#7f8e9f;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;white-space:nowrap}
        .sg-tab:hover{color:#073766}
        .sg-tab.active{color:#073766;border-bottom-color:#073766}
        .sg-tab small{display:none}
        .sg-body{overflow-y:auto;padding:22px 24px}
        .sg-panel-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px}
        .sg-panel-title{font-size:1rem;font-weight:800;color:#073766;margin:0 0 3px}
        .sg-panel-meta{font-size:.59rem;color:#a0adb8}
        .sg-save{height:36px;border:0;border-radius:9px;background:#073766;color:#fff;font:inherit;font-size:.65rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:0 16px;flex-shrink:0}
        .sg-save:hover{background:#0a4a8a}
        .sg-save:disabled{background:#c5d2de;cursor:not-allowed}
        .sg-social-row{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:center;margin-bottom:10px}
        .sg-social-ico{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;background:#f4f7fb;color:#526983;flex-shrink:0}
        .sg-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f4f8}
        .sg-toggle-row:last-child{border-bottom:0}
        .sg-toggle-lbl{font-size:.72rem;font-weight:700;color:#1a2d40}
        .sg-toggle-sub{font-size:.6rem;color:#8b9dad;margin-top:2px}
        .sg-track{width:40px;height:22px;border-radius:20px;background:#e5eaf0;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
        .sg-track.on{background:#073766}
        .sg-thumb{width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:3px;right:3px;transition:right .2s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
        .sg-track.on .sg-thumb{right:calc(100% - 19px)}
        .sg-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:12px;font-size:.7rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:1000;animation:sgUp .2s;white-space:nowrap}
        .sg-toast.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
        .sg-toast.err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        @keyframes sgUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Header ── */}
      <div className="sg-head">
        <p className="sg-eyebrow">إعدادات النظام</p>
        <h1 className="sg-h1">الإعدادات العامة</h1>
        <div className="sg-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`sg-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
              <t.Icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="sg-body">
        <div className="sg-panel-head">
          <div>
            <div className="sg-panel-title">{TABS.find(t => t.key === tab)?.label}</div>
            <div className="sg-panel-meta">
              {tab === "emails" ? "كل قالب يُحفظ بشكل مستقل" : `آخر تعديل: ${fmtDate(updatedAt[tabKeys[tab]])}`}
            </div>
          </div>
          {tab !== "emails" && <SaveBtn tabKey={tab} dataKey={tabKeys[tab]} data={tabData[tab]} />}
        </div>

        {/* ── General ── */}
        {tab === "general" && (
          <>
            <Card title="معلومات الموقع">
              <Row>
                <FG>
                  <Lbl>اسم الموقع / الشركة</Lbl>
                  <Inp value={general.siteName} onChange={v => setGeneral(g => ({ ...g, siteName: v }))} placeholder="أتمم" />
                </FG>
                <FG>
                  <Lbl>اللغة الافتراضية</Lbl>
                  <select value={general.defaultLang} onChange={e => setGeneral(g => ({ ...g, defaultLang: e.target.value as "ar"|"en" }))}
                    style={{ ...FIELD, height: 38 }}>
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </FG>
              </Row>
              <Row>
                <FG>
                  <Lbl>رابط الشعار (Logo URL)</Lbl>
                  <Inp value={general.logoUrl} onChange={v => setGeneral(g => ({ ...g, logoUrl: v }))} placeholder="/assets/logo/logo.png" dir="ltr" />
                </FG>
                <FG>
                  <Lbl>رابط الـ Favicon</Lbl>
                  <Inp value={general.faviconUrl} onChange={v => setGeneral(g => ({ ...g, faviconUrl: v }))} placeholder="/favicon.ico" dir="ltr" />
                </FG>
              </Row>
            </Card>

            <Card title="وضع الصيانة">
              <div className="sg-toggle-row">
                <div>
                  <div className="sg-toggle-lbl">تفعيل وضع الصيانة</div>
                  <div className="sg-toggle-sub">عند التفعيل يرى الزوار صفحة صيانة بدلاً من الموقع</div>
                </div>
                <span className={`sg-track${general.maintenanceMode ? " on" : ""}`} onClick={() => setGeneral(g => ({ ...g, maintenanceMode: !g.maintenanceMode }))}>
                  <span className="sg-thumb" />
                </span>
              </div>
            </Card>
          </>
        )}

        {/* ── Contact ── */}
        {tab === "contact" && (
          <>
            <Card title="البريد الإلكتروني">
              <Row>
                <FG>
                  <Lbl>البريد الرئيسي <span style={{ color: "#dc2626" }}>*</span></Lbl>
                  <Inp value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} placeholder="info@atmmam.com.sa" type="email" dir="ltr" />
                  <Hint>هذا البريد يستقبل رسائل نموذج التواصل في الصفحة الرئيسية</Hint>
                </FG>
                <FG>
                  <Lbl>بريد الدعم الفني</Lbl>
                  <Inp value={contact.supportEmail} onChange={v => setContact(c => ({ ...c, supportEmail: v }))} placeholder="support@atmmam.com.sa" type="email" dir="ltr" />
                  <Hint>يُستخدم في إشعارات التذاكر والمساعدة التقنية</Hint>
                </FG>
              </Row>
            </Card>

            <Card title="أرقام التواصل">
              <Row>
                <FG>
                  <Lbl>رقم الهاتف</Lbl>
                  <Inp value={contact.phone} onChange={v => setContact(c => ({ ...c, phone: v }))} placeholder="+966 5x xxx xxxx" dir="ltr" />
                </FG>
                <FG>
                  <Lbl>رقم واتساب</Lbl>
                  <Inp value={contact.whatsapp} onChange={v => setContact(c => ({ ...c, whatsapp: v }))} placeholder="+966 5x xxx xxxx" dir="ltr" />
                  <Hint>يُستخدم في زر واتساب أسفل الصفحة</Hint>
                </FG>
              </Row>
              <Row>
                <FG>
                  <Lbl>ساعات العمل</Lbl>
                  <Inp value={contact.workingHours} onChange={v => setContact(c => ({ ...c, workingHours: v }))} placeholder="الأحد – الخميس، 9 ص – 6 م" />
                </FG>
                <FG>
                  <Lbl>العنوان</Lbl>
                  <Inp value={contact.address} onChange={v => setContact(c => ({ ...c, address: v }))} placeholder="الرياض، المملكة العربية السعودية" />
                </FG>
              </Row>
            </Card>

            <Card title="حسابات التواصل الاجتماعي">
              {SOCIAL_PLATFORMS.map(({ key, logo, label, placeholder }) => (
                <div key={key} className="sg-social-row">
                  <div className="sg-social-ico">
                    <span dangerouslySetInnerHTML={{ __html: logo }} />
                  </div>
                  <FG style={{ margin: 0 }}>
                    <Lbl>{label}</Lbl>
                    <Inp
                      value={(contact as Record<string, string>)[key] || ""}
                      onChange={v => setContact(c => ({ ...c, [key]: v }))}
                      placeholder={placeholder} dir="ltr"
                    />
                  </FG>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ── SEO ── */}
        {tab === "seo" && (
          <>
            <Card title="وصف الموقع">
              <FG>
                <Lbl>وصف الموقع (Meta Description)</Lbl>
                <Textarea
                  value={seo.siteDescription}
                  onChange={v => setSeo(s => ({ ...s, siteDescription: v }))}
                  placeholder="وصف مختصر يشرح ما تقدمه المنصة، يظهر في نتائج Google..."
                />
                <Hint>
                  يُنصح بين 120–160 حرفاً ·&nbsp;
                  <span style={{ fontWeight: 700, color: seo.siteDescription.length > 160 ? "#dc2626" : seo.siteDescription.length < 120 ? "#b45309" : "#15803d" }}>
                    {seo.siteDescription.length} حرف {seo.siteDescription.length > 160 ? "⚠ طويل" : seo.siteDescription.length < 120 ? "⚠ قصير" : "✓ مثالي"}
                  </span>
                </Hint>
              </FG>
              <FG>
                <Lbl>الكلمات المفتاحية (Keywords)</Lbl>
                <Inp value={seo.keywords} onChange={v => setSeo(s => ({ ...s, keywords: v }))} placeholder="تأسيس شركات، تراخيص تجارية، إجراءات حكومية..." />
                <Hint>افصل بين الكلمات بفاصلة. هذه الحقل أقل أهمية في SEO الحديث لكنه مفيد.</Hint>
              </FG>
            </Card>

            <Card title="صورة المشاركة (OG Image)">
              <FG>
                <Lbl>رابط صورة الـ OG</Lbl>
                <Inp value={seo.ogImage} onChange={v => setSeo(s => ({ ...s, ogImage: v }))} placeholder="/assets/og-image.jpg" dir="ltr" />
                <Hint>تظهر عند مشاركة الموقع على وسائل التواصل. المقاس المثالي: 1200×630 بكسل</Hint>
              </FG>
            </Card>

            <Card title="أدوات التحليل">
              <Row>
                <FG>
                  <Lbl>Google Analytics ID</Lbl>
                  <Inp value={seo.googleAnalytics} onChange={v => setSeo(s => ({ ...s, googleAnalytics: v }))} placeholder="G-XXXXXXXXXX" dir="ltr" />
                </FG>
                <FG>
                  <Lbl>Google Tag Manager ID</Lbl>
                  <Inp value={seo.googleTagManager} onChange={v => setSeo(s => ({ ...s, googleTagManager: v }))} placeholder="GTM-XXXXXXX" dir="ltr" />
                </FG>
              </Row>
            </Card>
          </>
        )}

        {/* ── Email Templates ── */}
        {tab === "emails" && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
            <div>
              {templates.map(t => (
                <div key={t.id} onClick={() => setActiveTemplate(t.id)}
                  style={{
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 6,
                    border: `1px solid ${activeTemplate === t.id ? "#bddcff" : "#e4ebf2"}`,
                    background: activeTemplate === t.id ? "#eaf4ff" : "#fff",
                  }}>
                  <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#1a2d40", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.enabled ? "#15803d" : "#c4cdd6", flexShrink: 0 }} />
                    {t.label_ar}
                  </div>
                </div>
              ))}
              {templates.length === 0 && <div style={{ fontSize: ".62rem", color: "#a0adb8", padding: "10px 0" }}>لا قوالب محمّلة</div>}
            </div>

            <div>
              {templates.filter(t => t.id === activeTemplate).map(t => (
                <div key={t.id}>
                  <Card title={t.label_ar}>
                    <div className="sg-toggle-row" style={{ marginBottom: 14 }}>
                      <div>
                        <div className="sg-toggle-lbl">تفعيل هذا القالب</div>
                        <div className="sg-toggle-sub">عند التعطيل لن يُرسل هذا الإيميل تلقائياً</div>
                      </div>
                      <span className={`sg-track${t.enabled ? " on" : ""}`}
                        onClick={() => setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x))}>
                        <span className="sg-thumb" />
                      </span>
                    </div>

                    <FG>
                      <Lbl>عنوان الرسالة (Subject)</Lbl>
                      <Inp value={t.subject_ar} onChange={v => setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, subject_ar: v } : x))} />
                    </FG>
                    <FG>
                      <Lbl>محتوى الرسالة</Lbl>
                      <Textarea value={t.body_ar} onChange={v => setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, body_ar: v } : x))} rows={10} />
                      <Hint>
                        المتغيرات المتاحة: <code>{"{{client_name}}"}</code> <code>{"{{ticket_id}}"}</code> <code>{"{{ticket_title}}"}</code> <code>{"{{priority}}"}</code> <code>{"{{new_status}}"}</code> <code>{"{{sla_hours}}"}</code> <code>{"{{reply_preview}}"}</code>
                      </Hint>
                    </FG>

                    <button className="sg-save" onClick={() => saveTemplate(t)} disabled={savingTemplate}>
                      {savingTemplate
                        ? <><span style={{ width:13,height:13,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block" }} /> جاري الحفظ...</>
                        : <><Save size={13} /> حفظ القالب</>}
                    </button>
                  </Card>
                </div>
              ))}
              {!activeTemplate && <div style={{ fontSize: ".66rem", color: "#a0adb8", textAlign: "center", padding: "40px 0" }}>اختر قالباً من القائمة</div>}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`sg-toast ${toast.type}`}>
          {toast.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
