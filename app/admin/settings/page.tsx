"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  CheckCircle, Lock, ShieldCheck, Trash2,
  UserPlus, UserMinus, KeyRound, UserCog, Mail,
  ShieldAlert, RefreshCw, LogIn, LogOut, Eye,
} from "lucide-react";


type Role = "admin" | "manager" | "operator" | "viewer";
type TeamMember = { id?: string; full_name: string; contact: string; role: Role; active: boolean; avatar_url?: string | null };
type AuditLog = { id: number; entity_type: string; entity_id: string; action: string; created_at: string; metadata?: Record<string, unknown> | null; profiles?: { full_name?: string } | null };

type AuditConfig = { label: string; color: string; bg: string; Icon: React.ComponentType<{size?:number;color?:string}> };
const AUDIT_CONFIG: Record<string, AuditConfig> = {
  user_created:         { label: "إنشاء حساب جديد",       color: "#15803d", bg: "#f0fdf4", Icon: UserPlus },
  user_invited:         { label: "إرسال دعوة",             color: "#0875dc", bg: "#eff6ff", Icon: Mail },
  invitation_cancelled: { label: "إلغاء دعوة",             color: "#d97706", bg: "#fffbeb", Icon: Mail },
  password_changed:     { label: "تغيير كلمة المرور",      color: "#7c3aed", bg: "#f5f3ff", Icon: KeyRound },
  profile_updated:      { label: "تعديل بيانات العضو",     color: "#0875dc", bg: "#eff6ff", Icon: UserCog },
  user_deleted:         { label: "حذف حساب",               color: "#dc2626", bg: "#fef2f2", Icon: UserMinus },
  role_changed:         { label: "تغيير الصلاحية",         color: "#d97706", bg: "#fffbeb", Icon: ShieldAlert },
  account_suspended:    { label: "إيقاف الحساب",           color: "#dc2626", bg: "#fef2f2", Icon: UserMinus },
  account_activated:    { label: "تفعيل الحساب",           color: "#15803d", bg: "#f0fdf4", Icon: UserPlus },
  login:                { label: "تسجيل دخول",             color: "#0875dc", bg: "#eff6ff", Icon: LogIn },
  logout:               { label: "تسجيل خروج",             color: "#526983", bg: "#f8fafc", Icon: LogOut },
};
const AUDIT_DEFAULT: AuditConfig = { label: "حدث في النظام", color: "#526983", bg: "#f8fafc", Icon: Eye };

function buildAuditDetails(log: AuditLog): string[] {
  const meta = log.metadata;
  const details: string[] = [];
  if (!meta) return details;

  const name = (meta.full_name || meta.fullName) as string | undefined;
  const email = meta.email as string | undefined;
  const role = meta.role as Role | undefined;
  const phone = meta.phone as string | undefined;

  if (name)  details.push(`العضو: ${name}`);
  if (email) details.push(`البريد: ${email}`);
  if (role)  details.push(`الصلاحية: ${roleLabels[role] ?? role}`);
  if (phone) details.push(`الجوال: ${phone}`);
  if (meta.avatar_url) details.push("تم تحديث الصورة الشخصية");
  if (meta.active === true  && !details.length) details.push("الحالة: نشط");
  if (meta.active === false && !details.length) details.push("الحالة: موقوف");
  return details;
}

function resolveAuditConfig(log: AuditLog): AuditConfig {
  if (AUDIT_CONFIG[log.action]) return AUDIT_CONFIG[log.action];
  const meta = log.metadata;
  if (log.action === "profile_updated" && meta) {
    if (meta.active === false) return AUDIT_CONFIG.account_suspended;
    if (meta.active === true)  return AUDIT_CONFIG.account_activated;
    if (meta.role)             return AUDIT_CONFIG.role_changed;
  }
  return AUDIT_DEFAULT;
}
type CurrentUser = { id: string; full_name: string; email: string; phone: string; role: string; avatar_url?: string };

const roleLabels: Record<Role, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف عمليات", viewer: "مشاهد" };
const fallbackTeam: TeamMember[] = [{ full_name: "admin", contact: "admin@atmmam.com.sa", role: "admin", active: true }];

export default function SettingsPage() {
  const { loading: authLoading } = useRoleGuard("viewer");
  const [tab, setTab] = useState("الملف الشخصي");
  const [team, setTeam] = useState(fallbackTeam);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [databaseMode, setDatabaseMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [currentUserRole, setCurrentUserRole] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const tabs = ["الملف الشخصي", "الأمان وسجل الدخول"];
  if (currentUserRole === "admin") tabs.push("الفريق والصلاحيات");

  async function loadTeam() {
    const [teamRes, meRes] = await Promise.all([
      fetch("/api/admin/team"),
      fetch("/api/auth/me"),
    ]);
    if (!teamRes.ok) return false;
    const payload = await teamRes.json();
    const meData = meRes.ok ? (await meRes.json())?.data : null;
    const list: any[] = Array.isArray(payload?.members) ? payload.members : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    if (!list.length) return false;
    const uid: string | null = payload?.currentUserId ?? null;
    const me = list.find((m) => m.id === uid) ?? list[0];
    const email = meData?.email || me?.email || "";
    if (me) {
      setCurrentUser({ id: me.id, full_name: me.full_name || "", email, phone: me.phone || "", role: me.role || "admin", avatar_url: me.avatar_url || "" });
      setProfileForm({ full_name: me.full_name || "", phone: me.phone || "" });
      setCurrentUserRole(me.role || "");
    }
    setTeam(list.map((member) => ({ id: member.id, full_name: member.full_name || "admin", contact: member.email || member.phone || "", role: member.role || "admin", active: member.active !== false, avatar_url: member.avatar_url })));
    setDatabaseMode(true);
    return true;
  }

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setCurrentUser({ id: "", full_name: "admin", email: "admin@atmmam.com.sa", phone: "", role: "admin", avatar_url: "" });
      setProfileForm({ full_name: "admin", phone: "" });
      setCurrentUserRole("admin");
      setTeam([{ full_name: "admin", contact: "admin@atmmam.com.sa", role: "admin", active: true }]);
      return;
    }
    void loadTeam().then((ok) => {
      if (!ok) {
        fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => {
          if (d?.data) {
            const u = d.data;
            setCurrentUser({ id: u.id || "", full_name: u.full_name || u.email?.split("@")[0] || "", email: u.email || "", phone: u.phone || "", role: u.role || "admin", avatar_url: u.avatar_url || "" });
            setProfileForm({ full_name: u.full_name || u.email?.split("@")[0] || "", phone: u.phone || "" });
            setCurrentUserRole(u.role || "admin");
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    if (tab === "الأمان وسجل الدخول" && databaseMode) {
      void fetch("/api/admin/audit?limit=50").then(async (r) => {
        if (r.ok) { const payload = (await r.json()) as { data: AuditLog[] }; setAuditLogs(payload.data); }
      });
    }
  }, [tab, databaseMode]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSavingProfile(true);
    const response = await fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: currentUser.id, fullName: profileForm.full_name, phone: profileForm.phone }) });
    setSavingProfile(false);
    if (!response.ok) { let msg = "تعذر حفظ الملف الشخصي"; try { const err = await response.json(); if (err.error) msg = err.error; } catch {} setNotice(msg); return; }
    setCurrentUser(prev => prev ? { ...prev, full_name: profileForm.full_name, phone: profileForm.phone } : null);
    setNotice("تم حفظ التغييرات بنجاح");
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/admin/team/avatar", { method: "POST", body: formData });
    setUploadingAvatar(false);
    if (!response.ok) { const err = await response.json(); setNotice(`تعذر رفع الصورة: ${err.error}`); return; }
    const { avatar_url } = await response.json();
    setCurrentUser(prev => prev ? { ...prev, avatar_url } : null);
    setNotice("تم تحديث الصورة بنجاح");
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function changeRole(member: TeamMember, role: Role) {
    if (!databaseMode || !member.id) { setTeam((c) => c.map((i) => (i === member ? { ...i, role } : i))); return; }
    const response = await fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: member.id, role }) });
    if (!response.ok) { setNotice("تعذر تحديث الصلاحية"); return; }
    await loadTeam();
    setNotice("تم تحديث الصلاحية");
    window.setTimeout(() => setNotice(""), 2200);
  }

  async function deleteMember(member: TeamMember) {
    if (!member.id) return;
    if (!confirm(`حذف ${member.full_name} نهائياً؟ لا يمكن التراجع.`)) return;
    const res = await fetch("/api/admin/team/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: member.id }) });
    const data = await res.json();
    if (!res.ok) { setNotice(data.error || "فشل الحذف"); setTimeout(() => setNotice(""), 3000); return; }
    setNotice("تم حذف العضو");
    setTimeout(() => setNotice(""), 2500);
    await loadTeam();
  }


  const [pwForm, setPwForm] = useState({ new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.new !== pwForm.confirm) { setPwError("كلمتا المرور غير متطابقتين"); return; }
    if (pwForm.new.length < 6) { setPwError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setPwSaving(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: pwForm.new });
      if (error) throw new Error(error.message);
      setNotice("تم تغيير كلمة المرور بنجاح");
      setPwForm({ new: "", confirm: "" });
    } catch (err: any) {
      setPwError(err.message || "فشل تغيير كلمة المرور");
    } finally {
      setPwSaving(false);
    }
  }

  let panel: React.ReactNode;
  if (tab === "الملف الشخصي") {
    panel = currentUser ? (
      <>
        <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ width: "88px", height: "88px", borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", border: "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "#94a3b8" }}>
              {currentUser.avatar_url
                ? <img src={currentUser.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { const img = e.currentTarget; img.style.display = "none"; img.parentElement!.textContent = currentUser.full_name?.charAt(0) || "م"; }} />
                : currentUser.full_name?.charAt(0) || "م"}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} style={{ background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.4rem 1rem", fontSize: "0.85rem", fontWeight: 500, cursor: uploadingAvatar ? "not-allowed" : "pointer", opacity: uploadingAvatar ? 0.7 : 1 }}>
              {uploadingAvatar ? "جارٍ الرفع..." : "تغيير الصورة"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>الاسم الكامل</span>
              <input value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.95rem", direction: "rtl" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>البريد الإلكتروني</span>
              <input value={currentUser.email} disabled style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.95rem", direction: "ltr", background: "#f8fafc", color: "#94a3b8" }} />
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "-0.3rem" }}>لتغيير البريد، تواصل مع المشرف الرئيسي</span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>رقم الجوال</span>
              <input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} placeholder="05XXXXXXXX" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.95rem", direction: "ltr" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>الصلاحية</span>
              <input value={roleLabels[currentUser.role as Role] ?? currentUser.role} disabled style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.95rem", background: "#f8fafc", color: "#94a3b8" }} />
            </label>
          </div>
          <button type="submit" disabled={savingProfile} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", padding: "0.65rem 1.5rem", fontWeight: 600, cursor: savingProfile ? "not-allowed" : "pointer", opacity: savingProfile ? 0.7 : 1, fontSize: "0.95rem", alignSelf: "flex-start" }}>
            {savingProfile ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </form>
        <div style={{background:"#fff",border:"1px solid #e5ecf3",borderRadius:16,padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,.04)",marginTop:24}}>
          <h3 style={{margin:"0 0 16px",fontSize:".82rem",color:"#073766",display:"flex",alignItems:"center",gap:8}}><ShieldCheck size={15} strokeWidth={2.2} /> تغيير كلمة المرور</h3>
          <form onSubmit={handlePasswordChange}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div>
                <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>كلمة المرور الجديدة</label>
                <input type="password" value={pwForm.new} onChange={e=>setPwForm(f=>({...f,new:e.target.value}))} required minLength={6}
                  style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#344d69",boxSizing:"border-box",outline:"none"}}/>
              </div>
              <div>
                <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>تأكيد كلمة المرور</label>
                <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))} required minLength={6}
                  style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#344d69",boxSizing:"border-box",outline:"none"}}/>
              </div>
            </div>
            <div style={{fontSize:".6rem",color:"#aab5c3",marginTop:8}}>يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.</div>
            {pwError && <div style={{marginTop:10,padding:"10px 14px",borderRadius:8,background:"#fef2f2",color:"#dc2626",fontSize:".72rem",fontWeight:600}}>{pwError}</div>}
            <div style={{marginTop:16}}>
              <button type="submit" disabled={pwSaving}
                style={{display:"flex",alignItems:"center",gap:6,height:40,padding:"0 18px",border:0,borderRadius:10,background:pwSaving||!pwForm.new||!pwForm.confirm?"#e5eaf0":"#073766",color:pwSaving||!pwForm.new||!pwForm.confirm?"#aab5c3":"#fff",cursor:pwSaving||!pwForm.new||!pwForm.confirm?"not-allowed":"pointer",font:"inherit",fontSize:".7rem",fontWeight:700,transition:"all .15s"}}>
                <Lock size={13} strokeWidth={2.5}/> {pwSaving?"جاري التغيير...":"تغيير كلمة المرور"}
              </button>
            </div>
          </form>
        </div>
      </>
    ) : <div className="follow-empty">جارٍ تحميل بيانات الحساب...</div>;
  } else if (tab === "الفريق والصلاحيات") {
    panel = team.map((member) => (
      <div className="team-settings-row" key={member.id ?? member.contact}>
        <i style={{ position: "relative", overflow: "hidden" }}>{member.avatar_url ? <img src={member.avatar_url} alt={member.full_name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : member.full_name?.charAt(0) || "م"}</i>
        <div><strong>{member.full_name}</strong><small>{member.contact}</small></div>
        <select value={member.role} onChange={(e) => void changeRole(member, e.target.value as Role)}>
          {(Object.keys(roleLabels) as Role[]).map((r) => <option value={r} key={r}>{roleLabels[r]}</option>)}
        </select>
        <span>{member.active ? "نشط" : "موقوف"}</span>
        {member.role !== "admin" && (
          <button onClick={() => void deleteMember(member)} title="حذف العضو"
            style={{ background: "none", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 8px", cursor: "pointer", color: "#dc2626", display: "flex", alignItems: "center" }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
    ));
  } else if (tab === "الأمان وسجل الدخول") {
    panel = databaseMode ? (
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {auditLogs.map((log) => {
          const cfg = resolveAuditConfig(log);
          const details = buildAuditDetails(log);
          const actor = log.profiles?.full_name ?? "النظام";
          const dt = new Date(log.created_at);
          const dateStr = dt.toLocaleDateString("ar-SA", { calendar:"gregory", day:"numeric", month:"short", year:"numeric" });
          const timeStr = dt.toLocaleTimeString("ar-SA", { hour:"2-digit", minute:"2-digit" });
          return (
            <div key={log.id} style={{ background:"#fff", border:"1.5px solid #f0f4f8", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"flex-start", gap:12, transition:"box-shadow .15s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow="0 2px 12px rgba(7,55,102,.07)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
              <div style={{ width:36, height:36, borderRadius:10, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <cfg.Icon size={16} color={cfg.color} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontSize:".75rem", fontWeight:800, color:"#0b1e36" }}>{cfg.label}</span>
                  <span style={{ fontSize:".58rem", fontWeight:700, padding:"2px 8px", borderRadius:20, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                </div>
                {details.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 14px", marginBottom:4 }}>
                    {details.map((d, i) => (
                      <span key={i} style={{ fontSize:".65rem", color:"#526983" }}>· {d}</span>
                    ))}
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:2 }}>
                  <span style={{ fontSize:".6rem", color:"#8b9dad", display:"flex", alignItems:"center", gap:4 }}>
                    <ShieldCheck size={11} /> بواسطة: <strong style={{ color:"#344d69" }}>{actor}</strong>
                  </span>
                  <span style={{ fontSize:".58rem", color:"#aab5c3" }}>{dateStr} · {timeStr}</span>
                </div>
              </div>
            </div>
          );
        })}
        {!auditLogs.length && <div className="follow-empty">لا توجد أحداث مسجلة بعد.</div>}
      </div>
    ) : <div className="follow-empty">سيظهر سجل التدقيق بعد ربط Supabase.</div>;
  } else {
    panel = <div className="follow-empty">تدار التنبيهات من المتابعات والمواعيد.</div>;
  }

  if (authLoading) return <div className="follow-empty">جاري التحميل...</div>;
  return (
      <><section className="settings-page">
        <div className="settings-heading">
          <p>إدارة النظام</p><h1>الإعدادات</h1>
          <span>إدارة الفريق والصلاحيات والتنبيهات وبيانات الحساب.</span>
        </div>
        <div className="settings-grid">
          <nav className="settings-nav">
            {tabs.map((item) => (
              <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>
            ))}
          </nav>
          <section className="settings-panel">
            <h2>{tab}</h2>
            <p>{tab === "الملف الشخصي" ? "بيانات حسابك الشخصي في النظام" : tab === "الفريق والصلاحيات" ? "الصلاحية تطبق على الخادم وقاعدة البيانات." : databaseMode ? "هذه الإعدادات متصلة بملف النظام." : "ستتصل هذه الإعدادات بملف النظام عند ربط Supabase."}</p>
            {panel}
          </section>
        </div>
      </section>
      {notice ? <div className="ops-toast"><CheckCircle size={14} /> {notice}</div> : null}
  </>);
}
