"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import {
  Users, Shield, Search, Circle, Pencil, KeyRound,
  PauseCircle, PlayCircle, Trash2, Crown, X,
  Mail, UserPlus, Check, Minus
} from "lucide-react";

type Role = "admin" | "manager" | "operator" | "viewer";
type TeamMember = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  role: Role;
  active: boolean;
  super_admin?: boolean;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
};
type Invitation = {
  id: string;
  email: string;
  role: Role;
  status: string;
  created_at: string;
  expires_at: string;
  invited_profile?: { full_name?: string } | null;
};
type Modal = null | "add" | "edit" | "password" | "invite" | "delete" | "permissions";

const roleLabels: Record<Role, string> = {
  admin: "مدير النظام",
  manager: "مدير عمليات",
  operator: "موظف عمليات",
  viewer: "مشاهد",
};
const roleColors: Record<Role, string> = {
  admin: "#dc3545",
  manager: "#e67e22",
  operator: "#0875dc",
  viewer: "#6c757d",
};
const roleDescriptions: Record<Role, string> = {
  admin: "صلاحية كاملة على جميع أقسام النظام. يمكنه إضافة وإزالة الأعضاء، تغيير الصلاحيات، وحذف أي محتوى. ملاحظة: فقط المشرف الرئيسي يمكنه حذف مديري النظام.",
  manager: "يدير العمليات اليومية والطلبات والعملاء. يمكنه تعديل وإضافة الخدمات ولكن لا يمكنه إدارة الفريق.",
  operator: "ينفذ الطلبات ويرفع المستندات ويضيف متابعات. صلاحية محدودة على العملاء والطلبات فقط.",
  viewer: "مشاهدة فقط — يمكنه الاطلاع على لوحة التحكم والتقارير دون إجراء أي تعديلات.",
};
const permissions: Array<{ section: string; admin: boolean; manager: boolean; operator: boolean; viewer: boolean }> = [
  { section: "إدارة الفريق (إضافة/حذف أعضاء)", admin: true, manager: false, operator: false, viewer: false },
  { section: "تعديل الصلاحيات", admin: true, manager: false, operator: false, viewer: false },
  { section: "عرض الطلبات والعملاء", admin: true, manager: true, operator: true, viewer: true },
  { section: "إنشاء وتعديل الطلبات", admin: true, manager: true, operator: true, viewer: false },
  { section: "رفع المستندات والمرفقات", admin: true, manager: true, operator: true, viewer: false },
  { section: "إدارة الخدمات والباقات", admin: true, manager: true, operator: false, viewer: false },
  { section: "إدارة المتابعات", admin: true, manager: true, operator: true, viewer: false },
  { section: "التقارير والتحليلات", admin: true, manager: true, operator: true, viewer: true },
  { section: "إدارة المحتوى", admin: true, manager: true, operator: false, viewer: false },
  { section: "الإعدادات وسجل التدقيق", admin: true, manager: true, operator: false, viewer: false },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [tab, setTab] = useState<"members" | "permissions">("members");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [notice, setNotice] = useState("");
  const [databaseMode, setDatabaseMode] = useState(false);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2500);
  }, []);

  async function loadTeam() {
    try {
      const res = await fetch("/api/admin/team");
      if (!res.ok) { setLoading(false); return false; }
      const payload = await res.json() as { currentUserId: string; members: Array<{ id: string; full_name: string; email?: string; phone?: string | null; role: Role; active: boolean; super_admin?: boolean; avatar_url?: string | null; created_at?: string; updated_at?: string }> };
      setMembers(payload.members);
      setCurrentUserId(payload.currentUserId);
      setDatabaseMode(true);
      return true;
    } catch { return false; }
  }

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      void (async () => {
        await loadTeam();
        await loadInvitations();
        setLoading(false);
      })();
    } else { setLoading(false); }
  }, []);

  const currentUser = members.find((m) => m.id === currentUserId) || null;

  const filtered = members.filter((m) => {
    const matchesSearch = m.full_name.includes(search) || (m.email || "").includes(search) || (m.phone || "").includes(search);
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function handleAdd(data: { email: string; password: string; fullName: string; role: Role; phone?: string }) {
    const res = await fetch("/api/admin/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "فشل إضافة العضو"); }
    await loadTeam();
  }
  async function handleEdit(data: { profileId: string; fullName?: string; role?: Role; active?: boolean; phone?: string }) {
    const res = await fetch("/api/admin/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "فشل تحديث العضو"); }
    await loadTeam();
  }
  async function handlePassword(profileId: string, newPassword: string) {
    const res = await fetch("/api/admin/team/password", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId, newPassword }) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "فشل تغيير كلمة المرور"); }
  }
  async function handleInvite(email: string, role: Role) {
    const res = await fetch("/api/admin/team/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "فشل إرسال الدعوة"); }
    await loadInvitations();
  }
  async function handleDelete(profileId: string) {
    const res = await fetch("/api/admin/team/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId }) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "فشل حذف العضو"); }
    await loadTeam();
  }
  async function handleCancelInvitation(invitationId: string) {
    const res = await fetch("/api/admin/team/invitations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ invitationId }) });
    if (!res.ok) return;
    await loadInvitations();
    showNotice("تم إلغاء الدعوة");
  }
  async function loadInvitations() {
    try { const res = await fetch("/api/admin/team/invitations"); if (res.ok) { const payload = await res.json() as { data: Invitation[] }; setInvitations(payload.data); } } catch { }
  }

  if (loading) return <main className="ops-shell" dir="rtl"><AdminOpsHeader active="team" /><section className="team-page"><p className="follow-empty">جاري التحميل...</p></section></main>;
  if (!databaseMode) return <main className="ops-shell" dir="rtl"><AdminOpsHeader active="team" /><section className="team-page"><div className="follow-empty"><p>نظام الفريق يحتاج إلى اتصال بقاعدة البيانات.</p></div></section></main>;

  return <main className="ops-shell" dir="rtl">
    <AdminOpsHeader active="team" />
    <section className="team-page">
      <div className="team-heading">
        <div>
          <p>إدارة النظام</p>
          <h1>فريق العمل</h1>
          <span>إدارة أعضاء الفريق والصلاحيات.</span>
        </div>
        <div className="team-actions">
          <button className="ops-info" onClick={() => setModal("permissions")}><Shield size={15} /> مصفوفة الصلاحيات</button>
          <button className="ops-invite" onClick={() => setModal("invite")}><Mail size={15} /> دعوة عضو</button>
          <button className="ops-new" onClick={() => setModal("add")}><UserPlus size={15} /> إضافة عضو</button>
        </div>
      </div>

      <div className="team-kpis">
        <article><span className="kpi-icon total"><Users size={22} /></span><div><small>إجمالي الأعضاء</small><strong>{members.length}</strong></div></article>
        <article><span className="kpi-icon active"><Circle size={22} fill="#22c55e" stroke="none" /></span><div><small>نشط</small><strong>{members.filter((m) => m.active).length}</strong></div></article>
        <article><span className="kpi-icon inactive"><Circle size={22} fill="#ef4444" stroke="none" /></span><div><small>موقوف</small><strong>{members.filter((m) => !m.active).length}</strong></div></article>
      </div>

      <div className="team-tools">
        <label><Search size={16} /><input placeholder="ابحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")}>
          <option value="all">جميع الصلاحيات</option>
          {(Object.keys(roleLabels) as Role[]).map((r) => <option value={r} key={r}>{roleLabels[r]}</option>)}
        </select>
      </div>

      <div className="team-table-card">
        <div className="team-table-scroll">
          <table>
            <thead>
              <tr>
                <th>العضو</th>
                <th>جهة الاتصال</th>
                <th>الصلاحية</th>
                <th>الحالة</th>
                <th>تاريخ الانضمام</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <span className="team-avatar" style={{ background: roleColors[member.role] }}>{member.full_name.charAt(0)}</span>
                    <strong>{member.full_name}</strong>
                  </td>
                  <td><small dir="ltr">{member.email || member.phone || "—"}</small></td>
                  <td>
                    <span className="team-role-badge" style={{ background: roleColors[member.role] + "18", color: roleColors[member.role], border: `1px solid ${roleColors[member.role]}40` }} title={roleDescriptions[member.role]}>
                      {roleLabels[member.role]}{member.super_admin && <Crown size={12} color="#f59e0b" style={{ marginRight: 3 }} />}
                    </span>
                  </td>
                  <td><span className={`team-status ${member.active ? "active" : "inactive"}`}>{member.active ? "نشط" : "موقوف"}</span></td>
                  <td><time>{member.created_at ? new Date(member.created_at).toLocaleDateString("ar-SA") : "—"}</time></td>
                  <td>
                    <div className="team-row-actions">
                      <button className="team-action-btn" title="تعديل" onClick={() => { setSelected(member); setModal("edit"); }}><Pencil size={15} /></button>
                      {(!member.super_admin || member.id === currentUserId) && <button className="team-action-btn" title="تغيير كلمة المرور" onClick={() => { setSelected(member); setModal("password"); }}><KeyRound size={15} /></button>}
                      {member.id !== currentUserId && member.role !== "admin" && <button className="team-action-btn" title={member.active ? "إيقاف" : "تفعيل"} onClick={async () => {
                        if (member.active && !confirm("هل أنت متأكد من إيقاف هذا العضو؟")) return;
                        await handleEdit({ profileId: member.id, active: !member.active });
                        showNotice(member.active ? "تم إيقاف العضو" : "تم تفعيل العضو");
                      }}>{member.active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}</button>}
                      {member.id !== currentUserId && (currentUser?.super_admin || member.role !== "admin") && <button className="team-action-btn" title="حذف" onClick={() => { setSelected(member); setModal("delete"); }}><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6}><div className="follow-empty">لا يوجد أعضاء مطابقون للبحث.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {invitations.length > 0 && (
        <>
          <h2 className="team-section-title">الدعوات المرسلة</h2>
          <div className="team-table-card">
            <div className="team-table-scroll">
              <table>
                <thead><tr><th>البريد</th><th>الصلاحية</th><th>الحالة</th><th>تاريخ الإرسال</th><th>تاريخ الانتهاء</th><th>إجراءات</th></tr></thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td><strong>{inv.email}</strong></td>
                      <td><span className="team-role-badge" style={{ background: roleColors[inv.role] + "18", color: roleColors[inv.role], border: `1px solid ${roleColors[inv.role]}40` }}>{roleLabels[inv.role]}</span></td>
                      <td><span className={`team-status ${inv.status === "accepted" ? "active" : inv.status === "pending" ? "pending" : "inactive"}`}>
                        {inv.status === "pending" ? "بانتظار القبول" : inv.status === "accepted" ? "مقبولة" : inv.status === "expired" ? "منتهية" : "ملغية"}
                      </span></td>
                      <td><time>{new Date(inv.created_at).toLocaleDateString("ar-SA")}</time></td>
                      <td><time>{new Date(inv.expires_at).toLocaleDateString("ar-SA")}</time></td>
                      <td>{inv.status === "pending" && <button className="team-action-btn" title="إلغاء" onClick={() => void handleCancelInvitation(inv.id)}>❌</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>

    {modal === "add" && <AddMemberModal onClose={() => setModal(null)} onAdd={async (data) => { try { await handleAdd(data); showNotice("تمت إضافة العضو بنجاح"); setModal(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "edit" && selected && <EditMemberModal member={selected} currentUserId={currentUserId} onClose={() => { setModal(null); setSelected(null); }} onEdit={async (data) => { try { await handleEdit(data); showNotice("تم تحديث العضو"); setModal(null); setSelected(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "password" && selected && <PasswordModal member={selected} onClose={() => { setModal(null); setSelected(null); }} onChange={async (pw) => { try { await handlePassword(selected.id, pw); showNotice("تم تغيير كلمة المرور"); setModal(null); setSelected(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "invite" && <InviteModal onClose={() => setModal(null)} onInvite={async (email, role) => { try { await handleInvite(email, role); showNotice("تم إرسال الدعوة"); setModal(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "delete" && selected && <DeleteModal member={selected} onClose={() => { setModal(null); setSelected(null); }} onDelete={async () => { try { await handleDelete(selected.id); showNotice("تم حذف العضو"); setModal(null); setSelected(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "permissions" && <PermissionsModal onClose={() => setModal(null)} />}

    {notice && <div className="ops-toast">✓ {notice}</div>}
  </main>;
}

function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: { email: string; password: string; fullName: string; role: Role; phone?: string }) => Promise<void> }) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "operator" as Role, phone: "" });
  const [submitting, setSubmitting] = useState(false);
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>إضافة عضو جديد</h3><button className="modal-close" onClick={onClose}><X size={16} /></button></div>
      <form onSubmit={async (e) => { e.preventDefault(); setSubmitting(true); await onAdd(form); setSubmitting(false); }}>
        <label><span>الاسم الكامل</span><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="مثال: محمد أحمد" /></label>
        <label><span>البريد الإلكتروني</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@atmmam.com.sa" /></label>
        <label><span>كلمة المرور</span><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} /></label>
        <label><span>رقم الجوال (اختياري)</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+966" /></label>
        <label><span>الصلاحية</span>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {(Object.keys(roleLabels) as Role[]).map((r) => <option value={r} key={r}>{roleLabels[r]} — {roleDescriptions[r].split(".")[0]}</option>)}
          </select>
          <small className="modal-field-hint">{roleDescriptions[form.role]}</small>
        </label>
        <div className="modal-actions">
          <button type="submit" className="ops-new" disabled={submitting}>{submitting ? "جاري..." : "إضافة العضو"}</button>
          <button type="button" className="ops-cancel" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </div>
  </div>;
}

function EditMemberModal({ member, currentUserId, onClose, onEdit }: { member: TeamMember; currentUserId: string; onClose: () => void; onEdit: (data: { profileId: string; fullName?: string; role?: Role; active?: boolean; phone?: string }) => Promise<void> }) {
  const [form, setForm] = useState({ fullName: member.full_name, role: member.role, active: member.active, phone: member.phone || "" });
  const [submitting, setSubmitting] = useState(false);
  const isSelf = member.id === currentUserId;
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>تعديل العضو</h3><button className="modal-close" onClick={onClose}><X size={16} /></button></div>
      <form onSubmit={async (e) => { e.preventDefault(); setSubmitting(true); await onEdit({ profileId: member.id, ...form }); setSubmitting(false); }}>
        <label><span>الاسم الكامل</span><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label><span>رقم الجوال</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label><span>الصلاحية</span>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {(Object.keys(roleLabels) as Role[]).map((r) => <option value={r} key={r}>{roleLabels[r]}</option>)}
          </select>
          <small className="modal-field-hint">{roleDescriptions[form.role]}</small>
        </label>
        {!isSelf && <>
          <label className="modal-checkbox">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            <span>{form.active ? "العضو نشط" : "العضو موقوف"}</span>
          </label>
          <small className="modal-field-hint" style={{ marginTop: -8 }}>عند إيقاف العضو، لن يتمكن من تسجيل الدخول إلى النظام.</small>
        </>}
        <div className="modal-actions">
          <button type="submit" className="ops-new" disabled={submitting}>{submitting ? "جاري..." : "حفظ التغييرات"}</button>
          <button type="button" className="ops-cancel" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </div>
  </div>;
}

function PasswordModal({ member, onClose, onChange }: { member: TeamMember; onClose: () => void; onChange: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [submitting, setSubmitting] = useState(false);
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>تغيير كلمة المرور</h3><button className="modal-close" onClick={onClose}><X size={16} /></button></div>
      <p className="modal-desc">تغيير كلمة مرور <strong>{member.full_name}</strong></p>
      <form onSubmit={async (e) => { e.preventDefault(); if (password !== confirm) { alert("كلمتا المرور غير متطابقتين"); return; } if (password.length < 6) { alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; } setSubmitting(true); await onChange(password); setSubmitting(false); }}>
        <label><span>كلمة المرور الجديدة</span><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} /></label>
        <label><span>تأكيد كلمة المرور</span><input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} /></label>
        <div className="modal-actions"><button type="submit" className="ops-new" disabled={submitting}>{submitting ? "جاري..." : "تغيير كلمة المرور"}</button><button type="button" className="ops-cancel" onClick={onClose}>إلغاء</button></div>
      </form>
    </div>
  </div>;
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, role: Role) => Promise<void> }) {
  const [email, setEmail] = useState(""); const [role, setRole] = useState<Role>("operator"); const [submitting, setSubmitting] = useState(false);
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>دعوة عضو جديد</h3><button className="modal-close" onClick={onClose}><X size={16} /></button></div>
      <p className="modal-desc">سيتم إرسال دعوة عبر البريد الإلكتروني لإنشاء الحساب.</p>
      <form onSubmit={async (e) => { e.preventDefault(); setSubmitting(true); await onInvite(email, role); setSubmitting(false); }}>
        <label><span>البريد الإلكتروني</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="member@atmmam.com.sa" /></label>
        <label><span>الصلاحية</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(Object.keys(roleLabels) as Role[]).map((r) => <option value={r} key={r}>{roleLabels[r]}</option>)}
          </select>
        </label>
        <div className="modal-actions"><button type="submit" className="ops-new" disabled={submitting}>{submitting ? "جاري..." : "إرسال الدعوة"}</button><button type="button" className="ops-cancel" onClick={onClose}>إلغاء</button></div>
      </form>
    </div>
  </div>;
}

function DeleteModal({ member, onClose, onDelete }: { member: TeamMember; onClose: () => void; onDelete: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>حذف العضو</h3><button className="modal-close" onClick={onClose}><X size={16} /></button></div>
      <p className="modal-desc">هل أنت متأكد من حذف <strong>{member.full_name}</strong>؟ هذا الإجراء لا يمكن التراجع عنه.</p>
      <div className="modal-actions"><button className="ops-new" style={{ background: "#dc3545" }} onClick={async () => { setSubmitting(true); await onDelete(); setSubmitting(false); }} disabled={submitting}>{submitting ? "جاري..." : "تأكيد الحذف"}</button><button className="ops-cancel" onClick={onClose}>إلغاء</button></div>
    </div>
  </div>;
}

function PermissionsModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>مصفوفة الصلاحيات</h3><button className="modal-close" onClick={onClose}><X size={16} /></button></div>
      <p className="modal-desc">يوضح الجدول التالي صلاحيات كل دور في النظام.</p>
      <div className="perms-table-wrap">
        <table className="perms-table">
          <thead>
            <tr>
              <th>القسم / الإجراء</th>
              <th style={{ background: "#dc3545", color: "#fff" }}>مدير النظام</th>
              <th style={{ background: "#e67e22", color: "#fff" }}>مدير عمليات</th>
              <th style={{ background: "#0875dc", color: "#fff" }}>موظف عمليات</th>
              <th style={{ background: "#6c757d", color: "#fff" }}>مشاهد</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.section}>
                <td>{p.section}</td>
                <td>{p.admin ? <Check size={15} style={{ color: "#16a34a" }} /> : <Minus size={15} style={{ color: "#d1d9e2" }} />}</td>
                <td>{p.manager ? <Check size={15} style={{ color: "#16a34a" }} /> : <Minus size={15} style={{ color: "#d1d9e2" }} />}</td>
                <td>{p.operator ? <Check size={15} style={{ color: "#16a34a" }} /> : <Minus size={15} style={{ color: "#d1d9e2" }} />}</td>
                <td>{p.viewer ? <Check size={15} style={{ color: "#16a34a" }} /> : <Minus size={15} style={{ color: "#d1d9e2" }} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="perms-role-desc" style={{ background: "#fff8e1", padding: "10px 14px", borderRadius: 7, marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: ".62rem", color: "#795548", lineHeight: 1.6 }}>
          <Crown size={14} style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }} /><strong>المشرف الرئيسي</strong> هو المالك الأساسي للنظام ولا يمكن حذفه. فقط المشرف الرئيسي يمكنه حذف أعضاء من دور "مدير النظام".
        </p>
      </div>
      <hr className="perms-divider" />
      <h4 style={{ margin: "0 0 8px", fontSize: ".75rem", color: "#073766" }}>وصف الأدوار</h4>
      {(Object.keys(roleLabels) as Role[]).map((r) => (
        <div key={r} className="perms-role-desc">
          <span className="team-role-badge" style={{ background: roleColors[r] + "18", color: roleColors[r], border: `1px solid ${roleColors[r]}40` }}>{roleLabels[r]}</span>
          <p>{roleDescriptions[r]}</p>
        </div>
      ))}
      <div className="modal-actions"><button className="ops-cancel" onClick={onClose}>إغلاق</button></div>
    </div>
  </div>;
}
