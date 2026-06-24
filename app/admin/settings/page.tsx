"use client";

import { useEffect, useState, useRef } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import {
  User, Camera, Save, KeyRound, Activity, Bell,
  CheckCircle, AlertTriangle, X, Search
} from "lucide-react";

const TABS = [
  { key: "profile", label: "الملف الشخصي", icon: User },
  { key: "audit", label: "سجل النشاطات", icon: Activity },
  { key: "notifs", label: "الإشعارات", icon: Bell },
];

const inputStyle = {
  width: "100%", padding: "8px 12px", border: "1px solid #dce3eb",
  borderRadius: 8, fontSize: ".7rem", outline: "none", boxSizing: "border-box" as const,
  background: "#fff",
};

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);

  // --- Profile ---
  const [pAvatar, setPAvatar] = useState("");
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pRole, setPRole] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingProf, setSavingProf] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Password ---
  const [passVal, setPassVal] = useState("");
  const [passBusy, setPassBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // --- Audit ---
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditQ, setAuditQ] = useState("");

  // --- Load profile from team API ---
  async function loadProfile() {
    try {
      const r = await fetch("/api/admin/team");
      if (!r.ok) { setLoading(false); return; }
      const p = await r.json();
      const list: any[] = (p?.members || []);
      const cid = p?.currentUserId || "";
      setCurrentId(cid);
      const me = cid ? list.find((m: any) => m.id === cid) : list[0];
      if (me) {
        setPName(me.full_name || "");
        setPEmail(me.email || "");
        setPPhone(me.phone || "");
        setPAvatar(me.avatar_url || "");
        setPRole(me.role || "");
      }
      setLoading(false);
    } catch { setLoading(false); }
  }
  useEffect(() => { loadProfile(); }, []);

  // --- Load audit ---
  useEffect(() => {
    if (tab === "audit") {
      fetch("/api/admin/audit?limit=50").then(async (r) => {
        if (r.ok) { const p = await r.json(); setAuditRows(p.data || []); }
      });
    }
  }, [tab]);

  function flash(msg: string, type: "success" | "error" = "success") {
    setNotice(msg); setNoticeType(type);
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function saveProfile() {
    if (!pName.trim()) { flash("الاسم مطلوب", "error"); return; }
    setSavingProf(true);
    try {
      const r = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: currentId, fullName: pName.trim(), phone: pPhone }),
      });
      if (r.ok) flash("تم حفظ الملف الشخصي");
      else flash("تعذر الحفظ", "error");
    } catch { flash("خطأ في الاتصال", "error"); }
    setSavingProf(false);
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { flash("الملف كبير جداً (حد 2MB)", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("userId", currentId);
      const r = await fetch("/api/account/avatar", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) { setPAvatar(d.url); flash("تم تغيير الصورة"); }
      else flash(d.error || "فشل الرفع", "error");
    } catch { flash("خطأ في الاتصال", "error"); }
    setUploading(false);
  }

  async function handlePassChange() {
    if (passVal.length < 6) { flash("كلمة المرور 6 أحرف على الأقل", "error"); return; }
    setPassBusy(true);
    try {
      const r = await fetch("/api/admin/team/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: currentId, newPassword: passVal }),
      });
      if (r.ok) { flash("تم تغيير كلمة المرور"); setShowPass(false); setPassVal(""); }
      else { const d = await r.json(); flash(d.error || "فشل", "error"); }
    } catch { flash("خطأ", "error"); }
    setPassBusy(false);
  }

  const roleLabels: Record<string, string> = {
    admin: "مدير النظام", manager: "مدير عمليات",
    operator: "موظف عمليات", viewer: "مشاهد",
  };

  const actionLabels: Record<string, string> = {
    profile_updated: "تحديث الملف الشخصي",
    password_changed: "تغيير كلمة المرور",
    password_changed_by_admin: "تغيير كلمة المرور بواسطة المدير",
    user_created: "إنشاء مستخدم جديد",
    user_invited: "دعوة مستخدم",
    user_deleted: "حذف مستخدم",
    invitation_cancelled: "إلغاء دعوة",
    status_changed: "تغيير حالة الطلب",
    data_seeded: "بذر البيانات الأولية",
  };

  const entityLabels: Record<string, string> = {
    profile: "ملف شخصي",
    client: "عميل",
    order: "طلب",
    system: "نظام",
    team_invitation: "دعوة فريق",
  };

  const actionColors: Record<string, string> = {
    profile_updated: "#0875dc",
    password_changed: "#7c3aed",
    password_changed_by_admin: "#dc2626",
    user_created: "#15803d",
    user_invited: "#0d9488",
    user_deleted: "#dc2626",
    invitation_cancelled: "#ea580c",
    status_changed: "#ca8a04",
    data_seeded: "#6b7280",
  };

  const filteredAudit = auditQ.trim()
    ? auditRows.filter((r) =>
        `${r.action} ${r.entity_type} ${r.entity_id} ${r.profiles?.full_name || ""}`
          .toLowerCase().includes(auditQ.toLowerCase())
      )
    : auditRows;

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="settings" />
      <section className="settings-page">
        <div className="settings-heading">
          <p>إدارة النظام</p>
          <h1>الإعدادات</h1>
        </div>

        <div className="settings-grid" style={{ gridTemplateColumns: "200px 1fr" }}>
          <nav className="settings-nav" style={{ position: "sticky", top: 20 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={tab === t.key ? "active" : ""}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", height: 42, border: 0, background: "transparent",
                  borderRadius: 7, textAlign: "right", padding: "0 12px",
                  color: tab === t.key ? "#0875dc" : "#60748a",
                  font: "inherit", fontSize: ".65rem", fontWeight: tab === t.key ? 900 : 400,
                  cursor: "pointer",
                }}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </nav>

          <section className="settings-panel" style={{ minHeight: 420 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#8b9dad" }}>
                  <div style={{ width: 28, height: 28, border: "3px solid #e5ecf3", borderTopColor: "#0875dc", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                  <span style={{ fontSize: ".7rem" }}>جاري تحميل البيانات...</span>
                </div>
              </div>
            ) : (<>
            {notice && (
              <div style={{
                padding: "8px 14px", borderRadius: 8, fontSize: ".68rem", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                background: noticeType === "success" ? "#f0fdf4" : "#fef2f2",
                color: noticeType === "success" ? "#15803d" : "#dc2626",
                border: `1px solid ${noticeType === "success" ? "#bbf7d0" : "#fecaca"}`,
              }}>
                {noticeType === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {notice}
              </div>
            )}

            {/* ========== PROFILE ========== */}
            {tab === "profile" && (
              <div>
                <h2 style={{ fontSize: ".9rem", margin: "0 0 4px", color: "#073766" }}>الملف الشخصي</h2>
                <p style={{ fontSize: ".6rem", color: "#8996a5", margin: "0 0 18px" }}>
                  بيانات حسابك الشخصي في النظام
                </p>

                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <label htmlFor="avatar-input" style={{
                      width: 88, height: 88, borderRadius: "50%", cursor: "pointer",
                      position: "relative", overflow: "hidden", flexShrink: 0,
                      background: "#eaf4ff", display: "grid", placeItems: "center",
                      border: "3px solid #dce8f2",
                    }}>
                      {pAvatar ? (
                        <img src={pAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                      ) : (
                        <User size={32} color="#0875dc" />
                      )}
                      <div style={{
                        position: "absolute", inset: 0, background: "rgba(0,0,0,.35)",
                        display: "grid", placeItems: "center", opacity: 0, transition: "opacity .15s",
                      }}
                        onMouseEnter={e => { if (!uploading) e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={e => { if (!uploading) e.currentTarget.style.opacity = "0"; }}
                      >
                        {uploading ? (
                          <div style={{ width: 18, height: 18, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
                        ) : (
                          <Camera size={20} color="#fff" />
                        )}
                      </div>
                      <input ref={fileRef} id="avatar-input" type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
                    </label>
                    <button onClick={() => fileRef.current?.click()} style={{
                      background: "none", border: "none", color: "#0875dc", fontSize: ".6rem",
                      cursor: "pointer", fontWeight: 600, padding: 0,
                    }}>
                      تغيير الصورة
                    </button>
                  </div>

                  <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: ".6rem", color: "#6b7d93", fontWeight: 600, display: "block", marginBottom: 4 }}>الاسم الكامل</label>
                        <input value={pName} onChange={e => setPName(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: ".6rem", color: "#6b7d93", fontWeight: 600, display: "block", marginBottom: 4 }}>البريد الإلكتروني</label>
                        <input value={pEmail} disabled style={{ ...inputStyle, background: "#f9fafb", color: "#8b9dad" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: ".6rem", color: "#6b7d93", fontWeight: 600, display: "block", marginBottom: 4 }}>رقم الجوال</label>
                        <input value={pPhone} onChange={e => setPPhone(e.target.value)} style={inputStyle} placeholder="05XXXXXXXX" />
                      </div>
                      <div>
                        <label style={{ fontSize: ".6rem", color: "#6b7d93", fontWeight: 600, display: "block", marginBottom: 4 }}>الصلاحية</label>
                        <input value={roleLabels[pRole] || pRole} disabled style={{ ...inputStyle, background: "#f9fafb", color: "#073766", fontWeight: 600 }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={saveProfile} disabled={savingProf} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#073766", color: "#fff", border: "none", borderRadius: 8,
                        padding: "9px 18px", fontSize: ".7rem", fontWeight: 700, cursor: "pointer",
                        opacity: savingProf ? 0.6 : 1,
                      }}>
                        <Save size={14} /> {savingProf ? "جاري الحفظ..." : "حفظ التغييرات"}
                      </button>
                    </div>

                    <div style={{ marginTop: 8, paddingTop: 14, borderTop: "1px solid #f0f4f8" }}>
                      <h4 style={{ fontSize: ".7rem", color: "#073766", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                        <KeyRound size={13} /> تغيير كلمة المرور
                      </h4>
                      {showPass ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="password" autoFocus value={passVal}
                            onChange={e => setPassVal(e.target.value)}
                            placeholder="كلمة المرور الجديدة"
                            style={{ ...inputStyle, maxWidth: 240, fontSize: ".65rem" }}
                          />
                          <button onClick={handlePassChange} disabled={passBusy || passVal.length < 6} style={{
                            background: passBusy ? "#b0bcc9" : "#15803d", color: "#fff", border: "none",
                            borderRadius: 8, padding: "8px 16px", fontSize: ".65rem", fontWeight: 700, cursor: "pointer",
                          }}>
                            {passBusy ? "..." : "حفظ"}
                          </button>
                          <button onClick={() => { setShowPass(false); setPassVal(""); }} style={{
                            background: "#f0f4f8", color: "#5a6b7d", border: "none",
                            borderRadius: 8, padding: "8px 12px", fontSize: ".65rem", cursor: "pointer",
                          }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setShowPass(true)} style={{
                          background: "#f5f3ff", color: "#7c3aed", border: "none",
                          borderRadius: 8, padding: "8px 16px", fontSize: ".65rem", fontWeight: 600, cursor: "pointer",
                        }}>
                          تغيير كلمة المرور
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========== AUDIT ========== */}
            {tab === "audit" && (
              <div>
                <h2 style={{ fontSize: ".9rem", margin: "0 0 4px", color: "#073766" }}>سجل النشاطات</h2>
                <p style={{ fontSize: ".6rem", color: "#8996a5", margin: "0 0 18px" }}>
                  جميع العمليات والإجراءات في النظام
                </p>

                <label style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  border: "1px solid #dce3eb", borderRadius: 8, marginBottom: 14, background: "#fff",
                }}>
                  <Search size={14} color="#8b9dad" style={{ flexShrink: 0 }} />
                  <input value={auditQ} onChange={e => setAuditQ(e.target.value)}
                    placeholder="ابحث في السجل..."
                    style={{ border: "none", outline: "none", flex: 1, fontSize: ".68rem", background: "transparent" }} />
                </label>

                {filteredAudit.length === 0 ? (
                  <div className="follow-empty" style={{ padding: "30px 0", textAlign: "center" }}>
                    لا توجد أحداث مسجلة
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {filteredAudit.map((row: any) => (
                      <div key={row.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 8, fontSize: ".6rem",
                        background: "#fafbfc", borderBottom: "1px solid #f0f4f8",
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: actionColors[row.action] || "#8b9dad",
                        }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: "#344d69", fontSize: ".62rem" }}>{actionLabels[row.action] || row.action}</strong>
                        </div>
                        <span style={{ color: "#5a6b7d", fontSize: ".55rem" }}>
                          {row.profiles?.full_name || "النظام"}
                        </span>
                        <time style={{ color: "#8b9dad", fontSize: ".52rem", whiteSpace: "nowrap" }}>
                          {new Date(row.created_at).toLocaleString("ar-SA")}
                        </time>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========== NOTIFS ========== */}
            {tab === "notifs" && (
              <div>
                <h2 style={{ fontSize: ".9rem", margin: "0 0 4px", color: "#073766" }}>الإشعارات</h2>
                <p style={{ fontSize: ".6rem", color: "#8996a5", margin: "0 0 18px" }}>
                  إعدادات التنبيهات والإشعارات
                </p>
                <div className="follow-empty" style={{ padding: "30px 0", textAlign: "center", color: "#8b9dad" }}>
                  <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ fontSize: ".68rem" }}>قريباً</p>
                </div>
              </div>
            )}
            </>)}
          </section>
        </div>
      </section>
    </main>
  );
}
