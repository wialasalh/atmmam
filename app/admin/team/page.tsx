"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, ShieldCheck, ShieldAlert, Users, Search, Circle,
  Pencil, KeyRound, CheckCircle, PauseCircle, PlayCircle,
  Trash2, Crown, X, Mail, UserPlus, Star, Lock, UserCog,
  Settings, Check, SlidersHorizontal, UserCheck, UserX,
} from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, defaultPermissions, type PermissionKey } from "@/lib/auth/permissions";

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
  permissions?: string[];
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
  admin: "صلاحية كاملة على جميع أقسام النظام. يمكنه إضافة وإزالة الأعضاء، تغيير الصلاحيات، وحذف أي محتوى.",
  manager: "يدير العمليات اليومية والطلبات والعملاء. يمكنه تعديل وإضافة الخدمات ولكن لا يمكنه إدارة الفريق.",
  operator: "ينفذ الطلبات ويرفع المستندات ويضيف متابعات. صلاحية محدودة على العملاء والطلبات فقط.",
  viewer: "مشاهدة فقط — يمكنه الاطلاع على لوحة التحكم والتقارير دون إجراء أي تعديلات.",
};

const roleIcons: Record<Role, React.ComponentType<any>> = {
  admin: ShieldAlert,
  manager: Shield,
  operator: ShieldCheck,
  viewer: Lock,
};

export default function TeamPage() {
  const { loading: authLoading } = useRoleGuard("admin");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [notice, setNotice] = useState("");
  const [apiError, setApiError] = useState("");
  const [ratingStats, setRatingStats] = useState<Record<string, { avg_rating: number; total_ratings: number; positive: number; negative: number; resolved_tickets: number; recent_ratings: { rating: number; comment: string; date: string; client_name: string; ticket_id: string }[] }>>({});
  const [showRatingModal, setShowRatingModal] = useState<string | null>(null);
  const [permMember, setPermMember] = useState<TeamMember | null>(null);
  const [permValues, setPermValues] = useState<PermissionKey[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permError, setPermError] = useState("");
  const router = useRouter();

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2500);
  }, []);

  async function loadTeam() {
    try {
      const res = await fetch("/api/admin/team");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        setApiError(err.error || `HTTP ${res.status}`);
        return false;
      }
      const payload = await res.json() as { currentUserId: string; members: Array<{ id: string; full_name: string; email?: string; phone?: string | null; role: Role; active: boolean; super_admin?: boolean; avatar_url?: string | null; created_at?: string; updated_at?: string; permissions?: string[] }> };
      setMembers(payload.members);
      setCurrentUserId(payload.currentUserId);
      return true;
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "فشل الاتصال");
      return false;
    }
  }

  useEffect(() => {
    void fetch("/api/auth/me").then(async r => {
      if (r.ok) { const { data } = await r.json(); if (data?.role !== "admin") router.replace("/admin"); }
    });
  }, [router]);

  useEffect(() => {
    // Mark ratings as seen when visiting the team page
    try { localStorage.setItem("lastRatingSeen", new Date().toISOString()); } catch {}
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      void (async () => {
        await loadTeam();
        await loadInvitations();
        // Fetch rating stats
        try {
          const res = await fetch("/api/admin/team/ratings");
          if (res.ok) {
            const { data } = await res.json();
            const map: Record<string, { avg_rating: number; total_ratings: number; positive: number; negative: number; resolved_tickets: number; recent_ratings: { rating: number; comment: string; date: string; client_name: string; ticket_id: string }[] }> = {};
            for (const item of data) map[item.staff_id] = item;
            setRatingStats(map);
          }
        } catch {}
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

  if (authLoading) return <section className="team-page"><p className="follow-empty">جاري التحميل...</p></section>;
  if (loading) return <section className="team-page"><p className="follow-empty">جاري التحميل...</p></section>;
  if (apiError) return <section className="team-page"><div className="follow-empty"><p>{apiError}</p><button className="ops-new" style={{ marginTop: 12 }} onClick={() => { setApiError(""); setLoading(true); fetch("/api/admin/team").then(async res => { if (res.ok) { const p = await res.json(); setMembers(p.members); setCurrentUserId(p.currentUserId); setApiError(""); } else { setApiError("فشل تحميل الفريق"); } }).catch(() => setApiError("فشل الاتصال")).finally(() => setLoading(false)); }}>إعادة المحاولة</button></div></section>;

  return <>
    <section className="team-page">
      <div className="team-heading">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#dc3545,#b91c1c)", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(220,53,69,.25)" }}>
            <Shield size={24} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: ".7rem", color: "#8b9dad", margin: "0 0 2px" }}>إدارة النظام</p>
            <h1 style={{ fontSize: "1.35rem", margin: 0, color: "#073766", fontWeight: 800 }}>فريق العمل</h1>
            <span style={{ fontSize: ".68rem", color: "#7a8fa6" }}>إدارة أعضاء الفريق وتحديد الصلاحيات بدقة.</span>
          </div>
        </div>
        <div className="team-actions">
          <button className="ops-invite" onClick={() => setModal("invite")}><Mail size={15} /> دعوة عبر البريد</button>
          <button className="ops-new" onClick={() => setModal("add")}><UserPlus size={15} /> إضافة عضو</button>
        </div>
      </div>

      <div className="team-kpis">
        <article><span className="kpi-icon total" style={{ background: "linear-gradient(135deg,#0875dc,#065fb8)" }}><Users size={22} color="#fff" /></span><div><small>إجمالي الأعضاء</small><strong>{members.length}</strong></div></article>
        <article><span className="kpi-icon active" style={{ background: "linear-gradient(135deg,#15803d,#166534)" }}><UserCheck size={22} color="#fff" /></span><div><small>نشط</small><strong>{members.filter(m => m.active).length}</strong></div></article>
        <article><span className="kpi-icon inactive" style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}><UserX size={22} color="#fff" /></span><div><small>موقوف</small><strong>{members.filter(m => !m.active).length}</strong></div></article>
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
                    <th>الاسم</th>
                    <th>البريد / الجوال</th>
                    <th>الصلاحية</th>
                    <th>التقييمات</th>
                    <th>الحالة</th>
                    <th>تاريخ الإضافة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
            <tbody>
                {filtered.map((member) => {
                  const rs = ratingStats[member.id];
                  return (
                <tr key={member.id}>
                  <td>
                    <span className="team-avatar" style={{ background: roleColors[member.role], position: "relative", overflow: "hidden" }}>
                      {member.avatar_url ? <img src={member.avatar_url} alt={member.full_name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : member.full_name?.charAt(0) || "م"}
                    </span>
                    <strong>{member.full_name}</strong>
                  </td>
                  <td><small dir="ltr">{member.email || member.phone || "—"}</small></td>
                  <td>
                    <span className="team-role-badge" style={{ background: roleColors[member.role] + "18", color: roleColors[member.role], border: `1px solid ${roleColors[member.role]}40` }} title={roleDescriptions[member.role]}>
                      {roleLabels[member.role]}{member.super_admin && <Crown size={12} color="#f59e0b" style={{ marginRight: 3 }} />}
                    </span>
                  </td>
                  <td>
                    {rs ? (
                      <div onClick={() => setShowRatingModal(member.id)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} title="عرض التفاصيل">
                          <div style={{ display: "flex", gap: 2 }}>
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={14} strokeWidth={1.5} fill={s <= Math.round(rs.avg_rating) ? "#f59e0b" : "#e5eaf0"} color={s <= Math.round(rs.avg_rating) ? "#f59e0b" : "#e5eaf0"} />
                            ))}
                          </div>
                        <span style={{ fontSize: ".6rem", fontWeight: 700, color: rs.avg_rating >= 4 ? "#15803d" : rs.avg_rating >= 3 ? "#b45309" : "#dc2626" }}>{rs.avg_rating}</span>
                        <span style={{ fontSize: ".55rem", color: "#aab5c3" }}>({rs.total_ratings})</span>
                        <span style={{ fontSize: ".5rem", color: rs.positive >= rs.negative ? "#15803d" : "#dc2626", background: rs.positive >= rs.negative ? "#f0fdf4" : "#fef2f2", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                          {rs.positive}-{rs.negative}
                        </span>
                        <span style={{ fontSize: ".5rem", color: "#8b9dad", background: "#f5f8fc", padding: "1px 5px", borderRadius: 4 }}><CheckCircle size={12} />{rs.resolved_tickets}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: ".55rem", color: "#aab5c3" }}>لا توجد تقييمات</span>
                    )}
                  </td>
                  <td><span className={`team-status ${member.active ? "active" : "inactive"}`}>{member.active ? "نشط" : "موقوف"}</span></td>
                  <td><time>{member.created_at ? new Date(member.created_at).toLocaleDateString("ar-SA", {calendar:"gregory"}) : "—"}</time></td>
                    <td>
                    <div className="team-row-actions">
                      {!member.super_admin && <button className="team-action-btn" title="الصلاحيات" onClick={() => { setPermMember(member); setPermValues((member.permissions || defaultPermissions(member.role)) as PermissionKey[]); setPermError(""); }}><SlidersHorizontal size={15} /></button>}
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
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7}><div className="follow-empty">لا يوجد أعضاء مطابقون للبحث.</div></td></tr>}
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
                      <td><time>{new Date(inv.created_at).toLocaleDateString("ar-SA", {calendar:"gregory"})}</time></td>
                      <td><time>{new Date(inv.expires_at).toLocaleDateString("ar-SA", {calendar:"gregory"})}</time></td>
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

    {/* ── Permissions Modal ── */}
    {permMember && (
      <div className="modal-overlay" onClick={() => setPermMember(null)}>
        <div className="modal-content modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
          <div className="modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: roleColors[permMember.role] + "20", display: "grid", placeItems: "center" }}>
                {React.createElement(roleIcons[permMember.role], { size: 18, color: roleColors[permMember.role] })}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: ".85rem", color: "#073766" }}>صلاحيات {permMember.full_name}</h3>
                <span style={{ fontSize: ".6rem", color: "#8b9dad" }}>{roleLabels[permMember.role]} · {permMember.email || permMember.phone || ""}</span>
              </div>
            </div>
            <button className="modal-close" onClick={() => setPermMember(null)}><X size={16} /></button>
          </div>

          {permError && (
            <div style={{ margin: "0 18px", padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: ".62rem", color: "#dc2626", fontWeight: 600 }}>
              {permError}
            </div>
          )}

          <div style={{ padding: "14px 18px", maxHeight: 420, overflowY: "auto" }}>
            {(["general", "orders", "clients", "tickets", "system"] as const).map(groupKey => {
              const group = PERMISSION_GROUPS[groupKey];
              const Icon = group.icon;
              const perms = ALL_PERMISSIONS.filter(p => p.group === groupKey);
              const allChecked = perms.every(p => permValues.includes(p.key));
              return (
                <div key={groupKey} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: group.color + "18", display: "grid", placeItems: "center" }}>
                      <Icon size={14} color={group.color} />
                    </div>
                    <strong style={{ fontSize: ".68rem", color: "#073766", flex: 1 }}>{group.label}</strong>
                    <button
                      onClick={() => {
                        if (allChecked) setPermValues(prev => prev.filter(k => !perms.find(p => p.key === k)));
                        else setPermValues(prev => [...new Set([...prev, ...perms.map(p => p.key)])]);
                      }}
                      style={{ fontSize: ".58rem", color: allChecked ? "#15803d" : "#8b9dad", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}
                    >
                      {allChecked ? "إلغاء الكل" : "تحديد الكل"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                    {perms.map(p => {
                      const PIcon = p.icon;
                      const enabled = permValues.includes(p.key);
                      return (
                        <button
                          key={p.key}
                          onClick={() => {
                            if (enabled) setPermValues(prev => prev.filter(k => k !== p.key));
                            else setPermValues(prev => [...prev, p.key]);
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                            border: `1.5px solid ${enabled ? p.group === "general" ? "#0875dc" : PERMISSION_GROUPS[p.group]?.color || "#e5eaf0" : "#e5eaf0"}`,
                            borderRadius: 10, background: enabled ? (p.group === "general" ? "#f0f8ff" : `${PERMISSION_GROUPS[p.group]?.color}10`) : "#fff",
                            cursor: "pointer", textAlign: "right", transition: "all .15s", fontFamily: "inherit", width: "100%",
                            opacity: permMember.super_admin ? .6 : 1,
                          }}
                          disabled={permMember.super_admin}
                        >
                          <div style={{
                            width: 30, height: 30, borderRadius: 8,
                            background: enabled ? (PERMISSION_GROUPS[p.group]?.color || "#0875dc") + "20" : "#f5f8fc",
                            display: "grid", placeItems: "center", flexShrink: 0,
                            transition: "all .15s",
                          }}>
                            {enabled ? <Check size={14} color={PERMISSION_GROUPS[p.group]?.color || "#0875dc"} /> : <PIcon size={14} color="#8b9dad" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: ".65rem", fontWeight: 700, color: enabled ? "#1e3a56" : "#7a8fa6" }}>{p.label}</div>
                            <div style={{ fontSize: ".5rem", color: "#aab5c3", marginTop: 1 }}>{p.description}</div>
                          </div>
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                            border: `2px solid ${enabled ? (PERMISSION_GROUPS[p.group]?.color || "#0875dc") : "#d1d9e3"}`,
                            display: "grid", placeItems: "center", transition: "all .15s",
                          }}>
                            {enabled && <div style={{ width: 10, height: 10, borderRadius: "50%", background: PERMISSION_GROUPS[p.group]?.color || "#0875dc" }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {permMember.super_admin && (
              <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: ".6rem", color: "#92400e", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldAlert size={14} color="#d97706" /> الحساب الرئيسي — صلاحياته ثابتة ولا يمكن تعديلها.
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ borderTop: "1px solid #f0f3f8", padding: "12px 18px" }}>
            <button
              className="ops-new"
              disabled={savingPerms || permMember.super_admin}
              onClick={async () => {
                if (permMember.super_admin) return;
                setSavingPerms(true);
                setPermError("");
                try {
                  const res = await fetch("/api/admin/team/permissions", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileId: permMember.id, permissions: permValues }),
                  });
                  if (!res.ok) { const err = await res.json(); setPermError(err.error || "فشل الحفظ"); return; }
                  setMembers(prev => prev.map(m => m.id === permMember.id ? { ...m, permissions: permValues } : m));
                  showNotice(`تم تحديث صلاحيات ${permMember.full_name}`);
                  setPermMember(null);
                } catch { setPermError("حدث خطأ في الاتصال"); }
                setSavingPerms(false);
              }}
            >
              {savingPerms ? "جاري الحفظ..." : "حفظ الصلاحيات"}
            </button>
            <button className="ops-cancel" onClick={() => setPermMember(null)}>إلغاء</button>
          </div>
        </div>
      </div>
    )}

    {/* Rating detail modal */}
    {showRatingModal && (() => {
      const rs = ratingStats[showRatingModal];
      const member = members.find(m => m.id === showRatingModal);
      if (!rs || !member) return null;
      return (
        <div className="modal-overlay" onClick={() => setShowRatingModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>تقييمات {member.full_name}</h3>
              <button className="modal-close" onClick={() => setShowRatingModal(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: "16px 18px" }}>
              {/* Summary */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", flex: 1 }}>
                  <span style={{ fontSize: ".6rem", color: "#7a8fa6" }}>متوسط التقييم</span>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={18} strokeWidth={1.5} fill={s <= Math.round(rs.avg_rating) ? "#f59e0b" : "#e5eaf0"} color={s <= Math.round(rs.avg_rating) ? "#f59e0b" : "#e5eaf0"} />
                    ))}
                  </div>
                  <strong style={{ fontSize: ".85rem", color: "#073766" }}>{rs.avg_rating}</strong>
                  <span style={{ fontSize: ".6rem", color: "#aab5c3" }}>({rs.total_ratings} تقييم)</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: ".85rem", fontWeight: 800, color: "#15803d" }}>{rs.positive}</div>
                    <div style={{ fontSize: ".55rem", color: "#6f869b" }}>إيجابي</div>
                  </div>
                  <div style={{ background: "#fef2f2", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: ".85rem", fontWeight: 800, color: "#dc2626" }}>{rs.negative}</div>
                    <div style={{ fontSize: ".55rem", color: "#6f869b" }}>سلبي</div>
                  </div>
                  <div style={{ background: "#f5f8fc", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: ".85rem", fontWeight: 800, color: "#073766" }}>{rs.resolved_tickets}</div>
                    <div style={{ fontSize: ".55rem", color: "#6f869b" }}>تم الحل</div>
                  </div>
                </div>
              </div>

              {/* Ratings list */}
              <h4 style={{ fontSize: ".7rem", color: "#073766", margin: "0 0 10px" }}>التقييمات</h4>
              {rs.recent_ratings.length === 0 ? (
                <p style={{ fontSize: ".65rem", color: "#aab5c3" }}>لا توجد تقييمات</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 350, overflowY: "auto" }}>
                  {rs.recent_ratings.map((r, i) => {
                    const isPositive = r.rating >= 3;
                    return (
                      <div key={i} style={{ background: isPositive ? "#f0fdf4" : "#fef2f2", border: `1px solid ${isPositive ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <strong style={{ fontSize: ".65rem", color: "#1e3a56" }}>{r.client_name}</strong>
                          <div style={{ display: "flex", gap: 2 }}>
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={14} strokeWidth={1.5} fill={s <= r.rating ? "#f59e0b" : "#d1d9e3"} color={s <= r.rating ? "#f59e0b" : "#d1d9e3"} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p style={{ margin: "4px 0 0", fontSize: ".62rem", color: "#6f869b", lineHeight: 1.5 }}>"{r.comment}"</p>}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <div style={{ fontSize: ".5rem", color: "#aab5c3" }}>{new Date(r.date).toLocaleDateString("ar-SA", {calendar:"gregory",  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                          {r.ticket_id && <a href={`/admin/tickets?selected=${r.ticket_id}`} style={{ fontSize: ".5rem", color: "#0875dc", textDecoration: "none" }}>عرض التذكرة ←</a>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {notice && <div className="ops-toast"><CheckCircle size={14} /> {notice}</div>}
  </>;
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
  return null; // Replaced by per-user permissions modal
}
