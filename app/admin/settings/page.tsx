"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { CheckCircle } from "lucide-react";


type Role = "admin" | "manager" | "operator" | "viewer";
type TeamMember = { id?: string; full_name: string; contact: string; role: Role; active: boolean; avatar_url?: string | null };
type AuditLog = { id: number; entity_type: string; entity_id: string; action: string; created_at: string; metadata?: Record<string, unknown> | null; profiles?: { full_name?: string } | null };

function formatAuditLog(log: AuditLog): { title: string; detail: string } {
  const descriptions: Record<string, string> = {
    user_created: "إنشاء مستخدم جديد",
    user_invited: "دعوة مستخدم",
    password_changed: "تغيير كلمة المرور",
    profile_updated: "تحديث بيانات المستخدم",
    user_deleted: "حذف مستخدم",
    invitation_cancelled: "إلغاء دعوة",
  };
  const entityNames: Record<string, string> = {
    profile: "ملف مستخدم",
    team_invitation: "دعوة فريق",
  };
  const action = descriptions[log.action] ?? log.action;
  const entity = entityNames[log.entity_type] ?? log.entity_type;

  const meta = log.metadata;
  let detail = "";
  if (meta) {
    if (meta.full_name) {
      detail = `الاسم: ${meta.full_name}`;
      if (meta.email) detail += ` - ${meta.email}`;
      if (meta.role) detail += ` · ${roleLabels[meta.role as Role] ?? meta.role}`;
    } else if (meta.email) {
      detail = `${meta.email}`;
      if (meta.role) detail += ` · ${roleLabels[meta.role as Role] ?? meta.role}`;
    } else if (meta.fullName) {
      detail = `الاسم: ${meta.fullName}`;
      if (meta.phone) detail += ` - جوال: ${meta.phone}`;
      if (meta.role) detail += ` · ${roleLabels[meta.role as Role] ?? meta.role}`;
    } else if (meta.phone) {
      detail = `تحديث الجوال إلى ${meta.phone}`;
    } else if (meta.avatar_url) {
      detail = "تحديث الصورة الشخصية";
    } else if (meta.role) {
      detail = `تغيير الصلاحية إلى ${roleLabels[meta.role as Role] ?? meta.role}`;
    } else if (meta.active !== undefined) {
      detail = meta.active ? "تفعيل الحساب" : "إيقاف الحساب";
    }
  }
  return { title: `${action} - ${entity}`, detail };
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
    const response = await fetch("/api/admin/team");
    if (!response.ok) return false;
    const payload = await response.json();
    const list: any[] = Array.isArray(payload?.members) ? payload.members : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    if (!list.length) return false;
    const uid: string | null = payload?.currentUserId ?? null;
    const me = list.find((m) => m.id === uid) ?? list[0];
    if (me) {
      setCurrentUser({ id: me.id, full_name: me.full_name || "", email: me.email || "", phone: me.phone || "", role: me.role || "admin", avatar_url: me.avatar_url || "" });
      setProfileForm({ full_name: me.full_name || "", phone: me.phone || "" });
      setCurrentUserRole(me.role || "");
    }
    setTeam(list.map((member) => ({ id: member.id, full_name: member.full_name || "admin", contact: member.email || member.phone || "admin@atmmam.com.sa", role: member.role || "admin", active: member.active !== false, avatar_url: member.avatar_url })));
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

  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
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
      setPwForm({ current: "", new: "", confirm: "" });
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
        <hr style={{ border: "none", borderTop: "1px solid #e5ecf3", margin: "2rem 0" }} />
        <section>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>تغيير كلمة المرور</h3>
          <p style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1rem" }}>سيتم تسجيل الخروج بعد تغيير كلمة المرور.</p>
          <form onSubmit={handlePasswordChange}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", maxWidth: 600 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>كلمة المرور الحالية</span>
                <input type="password" value={pwForm.current} onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))} required minLength={6} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.95rem" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>كلمة المرور الجديدة</span>
                <input type="password" value={pwForm.new} onChange={(e) => setPwForm(f => ({ ...f, new: e.target.value }))} required minLength={6} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.95rem" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>تأكيد كلمة المرور الجديدة</span>
                <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))} required minLength={6} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.95rem" }} />
              </label>
            </div>
            <button type="submit" disabled={pwSaving} style={{ marginTop: "1rem", background: pwSaving ? "#94a3b8" : "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "0.65rem 1.5rem", fontWeight: 600, cursor: pwSaving ? "not-allowed" : "pointer", fontSize: "0.95rem" }}>
              {pwSaving ? "جاري..." : "تغيير كلمة المرور"}
            </button>
            {pwError ? <p style={{ color: "#dc2626", fontSize: "0.82rem", marginTop: "0.5rem" }}>{pwError}</p> : null}
          </form>
        </section>
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
      </div>
    ));
  } else if (tab === "الأمان وسجل الدخول") {
    panel = databaseMode ? (
      <div className="audit-list">
        {auditLogs.map((log) => { const fmt = formatAuditLog(log); return <article key={log.id}><div><strong>{fmt.title}</strong>{fmt.detail ? <small>{fmt.detail}</small> : <small>{log.entity_type === "profile" ? `${log.entity_id.slice(0, 8)}…` : log.entity_id}</small>}</div><span>{log.profiles?.full_name ?? "النظام"}</span><time>{new Date(log.created_at).toLocaleString("ar-SA")}</time></article>; })}
        {!auditLogs.length ? <div className="follow-empty">لا توجد أحداث مسجلة بعد.</div> : null}
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
