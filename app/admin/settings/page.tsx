"use client";

import { useEffect, useRef, useState } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Role = "admin" | "manager" | "operator" | "viewer";
type TeamMember = { id?: string; full_name: string; contact: string; role: Role; active: boolean };
type AuditLog = { id: number; entity_type: string; entity_id: string; action: string; created_at: string; profiles?: { full_name?: string } | null };
type CurrentUser = { id: string; full_name: string; email: string; phone: string; role: string; avatar_url?: string };

const roleLabels: Record<Role, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف عمليات", viewer: "مشاهد" };
const fallbackTeam: TeamMember[] = [{ full_name: "admin", contact: "admin@atmmam.com.sa", role: "admin", active: true }];

export default function SettingsPage() {
  const [tab, setTab] = useState("الملف الشخصي");
  const [team, setTeam] = useState(fallbackTeam);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [databaseMode, setDatabaseMode] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    }
    setTeam(list.map((member) => ({ id: member.id, full_name: member.full_name || "admin", contact: member.email || member.phone || "admin@atmmam.com.sa", role: member.role || "admin", active: member.active !== false })));
    setDatabaseMode(true);
    return true;
  }

  useEffect(() => { if (process.env.NEXT_PUBLIC_SUPABASE_URL) void loadTeam(); }, []);

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
    if (!response.ok) { setNotice("تعذر حفظ الملف الشخصي"); return; }
    await loadTeam();
    setNotice("تم حفظ التغييرات بنجاح");
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    setUploadingAvatar(true);
    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage.from("avatars").upload(`${currentUser.id}.jpg`, file, { upsert: true, contentType: file.type });
    if (uploadError) { setNotice("تعذر رفع الصورة"); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`${currentUser.id}.jpg`);
    const response = await fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: currentUser.id, avatarUrl: publicUrl }) });
    setUploadingAvatar(false);
    if (!response.ok) { setNotice("تعذر حفظ الصورة"); return; }
    await loadTeam();
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

  let panel: React.ReactNode;
  if (tab === "الملف الشخصي") {
    panel = currentUser ? (
      <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ width: "88px", height: "88px", borderRadius: "50%", overflow: "hidden", background: "#e2e8f0", border: "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "#94a3b8" }}>
            {currentUser.avatar_url
              ? <img src={currentUser.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : currentUser.full_name.charAt(0)}
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
    ) : <div className="follow-empty">جارٍ تحميل بيانات الحساب...</div>;
  } else if (tab === "الفريق والصلاحيات") {
    panel = team.map((member) => (
      <div className="team-settings-row" key={member.id ?? member.contact}>
        <i>{member.full_name.charAt(0)}</i>
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
        {auditLogs.map((log) => <article key={log.id}><div><strong>{log.action}</strong><small>{log.entity_type} · {log.entity_id}</small></div><span>{log.profiles?.full_name ?? "النظام"}</span><time>{new Date(log.created_at).toLocaleString("ar-SA")}</time></article>)}
        {!auditLogs.length ? <div className="follow-empty">لا توجد أحداث مسجلة بعد.</div> : null}
      </div>
    ) : <div className="follow-empty">سيظهر سجل التدقيق بعد ربط Supabase.</div>;
  } else {
    panel = <div className="follow-empty">تدار التنبيهات من المتابعات والمواعيد.</div>;
  }

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="settings" />
      <section className="settings-page">
        <div className="settings-heading">
          <p>إدارة النظام</p><h1>الإعدادات</h1>
          <span>إدارة الفريق والصلاحيات والتنبيهات وبيانات الحساب.</span>
        </div>
        <div className="settings-grid">
          <nav className="settings-nav">
            {["الملف الشخصي", "الفريق والصلاحيات", "التنبيهات", "الأمان وسجل الدخول"].map((item) => (
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
      {notice ? <div className="ops-toast">✓ {notice}</div> : null}
    </main>
  );
}
