"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import {
  UsersRound, ShieldCheck, Search, CircleDot, SquarePen, KeyRound,
  CircleSlash, CheckCircle, Trash2, Star, X,
  Mail, UserPlus, Check, Minus, Camera,
  AlertTriangle, Ban, UserCog, BadgeCheck,
  BadgeX, Hash, UserCheck, UserX
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
const permissionSections = [
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
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [notice, setNotice] = useState("");
  const [databaseMode, setDatabaseMode] = useState(false);

  // Panel & modals
  const [panelMember, setPanelMember] = useState<TeamMember | null>(null);
  const [modal, setModal] = useState<null | "add" | "edit" | "password" | "invite" | "delete" | "permissions">(null);
  const [selected, setSelected] = useState<TeamMember | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2500);
  }, []);

  async function loadTeam() {
    try {
      const res = await fetch("/api/admin/team");
      if (!res.ok) { setLoading(false); return false; }
      const payload = await res.json() as { currentUserId: string; members: TeamMember[] };
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
    const q = search.toLowerCase();
    return (m.full_name.includes(q) || (m.email || "").includes(q) || (m.phone || "").includes(q))
      && (roleFilter === "all" || m.role === roleFilter);
  });

  // Stats
  const roleCounts: Record<string, number> = {};
  for (const m of members) roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
  const maxRoleCount = Math.max(...Object.values(roleCounts), 1);

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

  // --- Render ---
  if (loading) return <main className="ops-shell" dir="rtl"><AdminOpsHeader active="team" /><section className="team-page" style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 40 }}>
    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="team-skeleton" style={{ height: 50 }} />)}
  </section></main>;
  if (!databaseMode) return <main className="ops-shell" dir="rtl"><AdminOpsHeader active="team" /><section className="team-page"><div className="team-empty"><AlertTriangle size={32} /><p>نظام الفريق يحتاج إلى اتصال بقاعدة البيانات.</p></div></section></main>;

  return <main className="ops-shell" dir="rtl">
    <AdminOpsHeader active="team" />
    <section className="team-page">
      {/* Heading */}
      <div className="team-heading">
        <div>
          <p>إدارة النظام</p>
          <h1>فريق العمل</h1>
          <span>إدارة أعضاء الفريق والصلاحيات.</span>
        </div>
        <div className="team-actions">
          <button className="ops-info" onClick={() => setModal("permissions")}><ShieldCheck size={15} /> مصفوفة الصلاحيات</button>
          <button className="ops-invite" onClick={() => setModal("invite")}><Mail size={15} /> دعوة عضو</button>
          <button className="ops-new" onClick={() => setModal("add")}><UserPlus size={15} /> إضافة عضو</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="team-kpis">
        <article><span className="kpi-icon total"><UsersRound size={22} /></span><div><small>إجمالي الأعضاء</small><strong>{members.length}</strong></div></article>
        <article><span className="kpi-icon active"><BadgeCheck size={22} /></span><div><small>نشط</small><strong>{members.filter((m) => m.active).length}</strong></div></article>
        <article><span className="kpi-icon inactive"><BadgeX size={22} /></span><div><small>موقوف</small><strong>{members.filter((m) => !m.active).length}</strong></div></article>
        <article>
          <span className="kpi-icon pending"><Mail size={22} /></span>
          <div>
            <small>الدعوات المعلقة</small>
            <strong>{invitations.filter((i) => i.status === "pending").length}</strong>
          </div>
        </article>
      </div>

      {/* Role Distribution */}
      {members.length > 0 && (
        <div style={{ display: "flex", gap: 14, marginBottom: 16, background: "#fff", border: "1px solid #e5ecf3", borderRadius: 12, padding: "14px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          <div style={{ fontSize: ".65rem", color: "#6f869b", fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            <UserCog size={14} /> توزيع الصلاحيات
          </div>
          {(Object.keys(roleLabels) as Role[]).map((r) => {
            const count = roleCounts[r] || 0;
            const pct = Math.round((count / maxRoleCount) * 100);
            return (
              <div key={r} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".55rem", color: "#8b9dad", marginBottom: 4 }}>
                  <span>{roleLabels[r]}</span>
                  <span style={{ fontWeight: 700, color: roleColors[r] }}>{count}</span>
                </div>
                <div style={{ height: 4, background: "#f0f4f8", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: roleColors[r], borderRadius: 4, transition: "width .6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tools */}
      <div className="team-tools">
        <label><Search size={16} /><input placeholder="ابحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")}>
          <option value="all">جميع الصلاحيات</option>
          {(Object.keys(roleLabels) as Role[]).map((r) => <option value={r} key={r}>{roleLabels[r]}</option>)}
        </select>
      </div>

      {/* Members Table */}
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
                <tr key={member.id} className="team-row-clickable" onClick={() => setPanelMember(member)}>
                  <td>
                    <div className="team-member-cell">
                      <div className="team-avatar-wrap">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" />
                        ) : (
                          <div className="team-avatar-initial" style={{ background: roleColors[member.role] }}>{member.full_name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="team-member-info">
                        <strong>{member.full_name} {member.super_admin && <Star size={11} color="#f59e0b" style={{ display: "inline", verticalAlign: "middle", fill: "#f59e0b" }} />}</strong>
                        <small>{roleLabels[member.role]}</small>
                      </div>
                    </div>
                  </td>
                  <td><small dir="ltr" style={{ fontSize: ".62rem", color: "#6f869b" }}>{member.email || member.phone || "—"}</small></td>
                  <td>
                    <span className="team-role-badge" style={{ background: roleColors[member.role] + "18", color: roleColors[member.role], border: `1px solid ${roleColors[member.role]}40` }}>
                      {roleLabels[member.role]}
                    </span>
                  </td>
                  <td><span className={`team-status ${member.active ? "active" : "inactive"}`}>{member.active ? "نشط" : "موقوف"}</span></td>
                  <td><time style={{ fontSize: ".62rem", color: "#8b9dad" }}>{member.created_at ? new Date(member.created_at).toLocaleDateString("ar-SA") : "—"}</time></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="team-row-actions">
                      <button className="team-action-btn" title="تعديل" onClick={() => { setSelected(member); setModal("edit"); }}><SquarePen size={15} /></button>
                      {(!member.super_admin || member.id === currentUserId) && <button className="team-action-btn" title="تغيير كلمة المرور" onClick={() => { setSelected(member); setModal("password"); }}><KeyRound size={15} /></button>}
                      {member.id !== currentUserId && member.role !== "admin" && <button className="team-action-btn" title={member.active ? "إيقاف" : "تفعيل"} onClick={async () => {
                        if (member.active && !confirm("هل أنت متأكد من إيقاف هذا العضو؟")) return;
                        await handleEdit({ profileId: member.id, active: !member.active });
                        showNotice(member.active ? "تم إيقاف العضو" : "تم تفعيل العضو");
                      }}>{member.active ? <CircleSlash size={15} /> : <CheckCircle size={15} />}</button>}
                      {member.id !== currentUserId && (currentUser?.super_admin || member.role !== "admin") && <button className="team-action-btn danger" title="حذف" onClick={() => { setSelected(member); setModal("delete"); }}><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6}><div className="team-empty"><UserX size={28} /><p>لا يوجد أعضاء مطابقون للبحث.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <>
          <h3 className="team-section-title"><UserPlus size={16} /> الدعوات المرسلة</h3>
          <div className="team-invite-grid">
            {invitations.map((inv) => {
              const isExpiring = inv.status === "pending" && new Date(inv.expires_at).getTime() - Date.now() < 86400000 * 2;
              return (
                <div key={inv.id} className="team-invite-card">
                  <div className="team-invite-icon"><Mail size={18} /></div>
                  <div className="team-invite-body">
                    <strong>{inv.email}</strong>
                    <small>
                      {roleLabels[inv.role]} · {inv.status === "pending" ? "بانتظار القبول" : inv.status === "accepted" ? "مقبولة" : inv.status === "expired" ? "منتهية" : "ملغية"}
                      {isExpiring && " · 🔴 تنتهي قريباً"}
                    </small>
                  </div>
                  <div className="team-invite-actions">
                    {inv.status === "pending" && (
                      <button className="team-action-btn" title="إلغاء الدعوة" onClick={() => void handleCancelInvitation(inv.id)}>
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {invitations.length === 0 && members.length > 0 && (
        <div className="team-empty" style={{ padding: "20px 0" }}>
          <p style={{ fontSize: ".65rem", color: "#b0bcc9" }}>لا توجد دعوات مرسلة</p>
        </div>
      )}
    </section>

    {/* Side Panel */}
    {panelMember && <MemberPanel member={panelMember} currentUser={currentUser} roleColors={roleColors} roleLabels={roleLabels} onClose={() => setPanelMember(null)} onEdit={() => { const m = panelMember; setPanelMember(null); setSelected(m); setModal("edit"); }} onPassword={() => { const m = panelMember; setPanelMember(null); setSelected(m); setModal("password"); }} onDelete={() => { const m = panelMember; setPanelMember(null); setSelected(m); setModal("delete"); }} onToggleActive={async () => { await handleEdit({ profileId: panelMember.id, active: !panelMember.active }); setPanelMember(null); showNotice(panelMember.active ? "تم إيقاف العضو" : "تم تفعيل العضو"); }} />}

    {/* Modals */}
    {modal === "add" && <AddMemberModal onClose={() => setModal(null)} onAdd={async (data) => { try { await handleAdd(data); showNotice("تمت إضافة العضو بنجاح"); setModal(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "edit" && selected && <EditMemberModal member={selected} currentUserId={currentUserId} onClose={() => { setModal(null); setSelected(null); }} onEdit={async (data) => { try { await handleEdit(data); showNotice("تم تحديث العضو"); setModal(null); setSelected(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "password" && selected && <PasswordModal member={selected} onClose={() => { setModal(null); setSelected(null); }} onChange={async (pw) => { try { await handlePassword(selected.id, pw); showNotice("تم تغيير كلمة المرور"); setModal(null); setSelected(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "invite" && <InviteModal onClose={() => setModal(null)} onInvite={async (email, role) => { try { await handleInvite(email, role); showNotice("تم إرسال الدعوة"); setModal(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "delete" && selected && <DeleteModal member={selected} onClose={() => { setModal(null); setSelected(null); }} onDelete={async () => { try { await handleDelete(selected.id); showNotice("تم حذف العضو"); setModal(null); setSelected(null); } catch (e) { showNotice(e instanceof Error ? e.message : "فشل"); } }} />}
    {modal === "permissions" && <PermissionsModal onClose={() => setModal(null)} />}

    {notice && <div className="ops-toast">✓ {notice}</div>}
  </main>;
}

/* ── Side Panel ── */
function MemberPanel({ member, currentUser, roleColors, roleLabels, onClose, onEdit, onPassword, onDelete, onToggleActive }: {
  member: TeamMember; currentUser: TeamMember | null; roleColors: Record<string, string>; roleLabels: Record<string, string>;
  onClose: () => void; onEdit: () => void; onPassword: () => void; onDelete: () => void; onToggleActive: () => void;
}) {
  const isSelf = member.id === currentUser?.id;
  const [uploading, setUploading] = useState(false);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("userId", member.id);
      const r = await fetch("/api/account/avatar", { method: "POST", body: fd });
      if (r.ok) { window.location.reload(); }
    } catch {}
    setUploading(false);
  }

  return (<>
    <div className="team-panel-overlay" onClick={onClose} />
    <div className="team-side-panel">
      <div className="team-panel-header">
        <h2>ملف العضو</h2>
        <button className="team-panel-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="team-panel-scroll">
        <div className="team-panel-avatar-section">
          <div className="team-panel-avatar-wrap">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" />
            ) : (
              <span className="team-panel-avatar-initial" style={{ color: roleColors[member.role] }}>{member.full_name.charAt(0)}</span>
            )}
            <label className="team-panel-avatar-upload" style={{ display: "grid", placeItems: "center" }}>
              {uploading ? <div style={{ width: 20, height: 20, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .6s linear infinite" }} /> : <Camera size={20} />}
              <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
            </label>
          </div>
          <p className="team-panel-name">{member.full_name} {member.super_admin && <Star size={14} color="#f59e0b" style={{ display: "inline", verticalAlign: "middle", fill: "#f59e0b" }} />}</p>
          <p className="team-panel-email">{member.email || "بريد غير متاح"}</p>
          <div className="team-panel-badges">
            <span className="team-role-badge" style={{ background: roleColors[member.role] + "18", color: roleColors[member.role], border: `1px solid ${roleColors[member.role]}40` }}>{roleLabels[member.role]}</span>
            <span className={`team-status ${member.active ? "active" : "inactive"}`}>{member.active ? "نشط" : "موقوف"}</span>
          </div>
        </div>

        <div className="team-panel-section">
          <h3>معلومات الحساب</h3>
          <div className="team-panel-field"><span>رقم الجوال</span><span>{member.phone || "—"}</span></div>
          <div className="team-panel-field"><span>تاريخ الانضمام</span><span>{member.created_at ? new Date(member.created_at).toLocaleDateString("ar-SA") : "—"}</span></div>
          <div className="team-panel-field"><span>آخر تحديث</span><span>{member.updated_at ? new Date(member.updated_at).toLocaleString("ar-SA") : "—"}</span></div>
        </div>

        <div className="team-panel-section">
          <h3>الصلاحية</h3>
          <p style={{ fontSize: ".64rem", color: "#60748a", lineHeight: 1.6, margin: 0 }}>{roleDescriptions[member.role]}</p>
        </div>

        <div className="team-panel-actions">
          <button className="team-panel-primary" onClick={() => { onEdit(); }}><SquarePen size={15} /> تعديل البيانات</button>
          {(!member.super_admin || isSelf) && <button onClick={() => { onPassword(); }}><KeyRound size={15} /> تغيير كلمة المرور</button>}
          {!isSelf && member.role !== "admin" && (
            <button onClick={onToggleActive}>{member.active ? <CircleSlash size={15} /> : <CheckCircle size={15} />} {member.active ? "إيقاف العضو" : "تفعيل العضو"}</button>
          )}
          {!isSelf && ((currentUser?.super_admin) || member.role !== "admin") && (
            <button className="team-panel-danger" onClick={() => { onDelete(); }}><Trash2 size={15} /> حذف العضو</button>
          )}
        </div>
      </div>
    </div>
  </>);
}

/* ── Add Member Modal ── */
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

/* ── Edit Member Modal ── */
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

/* ── Password Modal ── */
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

/* ── Invite Modal ── */
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

/* ── Delete Modal ── */
function DeleteModal({ member, onClose, onDelete }: { member: TeamMember; onClose: () => void; onDelete: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  return <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h3>حذف العضو</h3><button className="modal-close" onClick={onClose}><X size={16} /></button></div>
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "#dc2626" }}>
          <AlertTriangle size={28} />
        </div>
        <p className="modal-desc" style={{ fontSize: ".72rem" }}>هل أنت متأكد من حذف <strong>{member.full_name}</strong>؟</p>
        <p style={{ fontSize: ".62rem", color: "#dc2626", margin: "0 0 16px" }}>هذا الإجراء لا يمكن التراجع عنه.</p>
      </div>
      <div className="modal-actions" style={{ justifyContent: "center" }}>
        <button className="ops-cancel" onClick={onClose}>إلغاء</button>
        <button style={{ height: 43, border: 0, borderRadius: 10, background: "#dc2626", color: "#fff", padding: "0 24px", font: "inherit", fontSize: ".72rem", fontWeight: 700, cursor: "pointer" }} onClick={async () => { setSubmitting(true); await onDelete(); setSubmitting(false); }} disabled={submitting}>{submitting ? "جاري..." : "تأكيد الحذف"}</button>
      </div>
    </div>
  </div>;
}

/* ── Permissions Modal ── */
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
            {permissionSections.map((p) => (
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
          <Star size={14} style={{ display: "inline", verticalAlign: "middle", marginLeft: 4, fill: "#f59e0b", color: "#f59e0b" }} /><strong>المشرف الرئيسي</strong> هو المالك الأساسي للنظام ولا يمكن حذفه. فقط المشرف الرئيسي يمكنه حذف أعضاء من دور "مدير النظام".
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
