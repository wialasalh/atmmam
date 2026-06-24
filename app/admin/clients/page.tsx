"use client";

import { useEffect, useState, useMemo } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";
import { Search, FileText, ExternalLink, Eye, Edit2, Trash2, UserCheck, UserX, AlertTriangle, Users, Building2, UserCog, Activity, X, Phone, Mail, CreditCard, User, FileCheck, Clock, Save, Ban, CheckCircle, MoreHorizontal } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ClientRecord = {
  id: string;
  name: string;
  client_type: string;
  phone: string;
  email: string | null;
  commercial_number: string | null;
  national_id: string | null;
  unified_register_number: string | null;
  company_address: string | null;
  company_activity: string | null;
  notes: string | null;
  commercial_register_doc: string | null;
  company_license_doc: string | null;
  national_id_doc: string | null;
  user_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  profiles: { id: string; full_name: string } | null;
};

const typeColors: Record<string, { bg: string; text: string }> = {
  company: { bg: "#eaf4ff", text: "#073766" },
  person: { bg: "#f0fdf4", text: "#15803d" },
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  inactive: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #dce3eb",
  borderRadius: 8,
  fontSize: ".75rem",
  background: "#fff",
  outline: "none",
  transition: "border-color .15s",
} as React.CSSProperties;

const focusStyle = { borderColor: "#0875dc", boxShadow: "0 0 0 2px rgba(8,117,220,.12)" };

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        const { data } = await res.json();
        if (data) setClients(data as ClientRecord[]);
      }
    } catch {}
    setLoading(false);
  }

  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg);
    setNoticeType(type);
    window.setTimeout(() => setNotice(""), 2800);
  }

  async function toggleActive(client: ClientRecord) {
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ toggle_active: true }),
      });
      if (!res.ok) { showNotice("تعذر تغيير الحالة", "error"); return; }
      await loadClients();
      showNotice(client.active ? "تم إيقاف العميل" : "تم تفعيل العميل");
    } catch { showNotice("حدث خطأ في الاتصال", "error"); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) { showNotice("تعذر حفظ التعديلات", "error"); return; }
      await loadClients();
      const updated = clients.find(c => c.id === editing.id) || null;
      setSelected(updated);
      setEditing(null);
      showNotice("تم حفظ التعديلات");
    } catch { showNotice("حدث خطأ", "error"); }
  }

  async function handleDelete(clientId: string) {
    try {
      const res = await fetch("/api/admin/clients", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: clientId, permanent: false }),
      });
      if (!res.ok) { showNotice("تعذر حذف العميل", "error"); return; }
      await loadClients();
      setConfirmDelete(null);
      if (selected?.id === clientId) setSelected(null);
      showNotice("تم حذف العميل");
    } catch { showNotice("حدث خطأ", "error"); }
  }

  const accountClients = useMemo(() =>
    clients.filter(c => c.user_id === selected?.user_id),
    [clients, selected?.user_id]
  );

  const userGroupCounts = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach(c => {
      if (c.user_id) map.set(c.user_id, (map.get(c.user_id) || 0) + 1);
    });
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("ar");
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.name} ${c.phone} ${c.email || ""} ${c.commercial_number || ""} ${c.national_id || ""} ${c.profiles?.full_name || ""}`
        .toLocaleLowerCase("ar").includes(q)
    );
  }, [clients, search]);

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.active).length,
    inactive: clients.filter(c => !c.active).length,
    companies: clients.filter(c => c.client_type === "company").length,
    sharedAccounts: [...userGroupCounts.values()].filter(n => n > 1).length,
  }), [clients, userGroupCounts]);

  const renderInput = (label: string, field: string, value: string, onChange: (v: string) => void, type = "text") => (
    <div>
      <label style={{ display: "block", fontSize: ".6rem", color: "#6b7d93", marginBottom: 4, fontWeight: 600 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocusedField(field)} onBlur={() => setFocusedField(null)}
        style={{ ...inputStyle, ...(focusedField === field ? focusStyle : {}) }} />
    </div>
  );

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="clients" />
      <div className="ops-layout">
        <div className="ops-main">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={20} color="#073766" /> العملاء
            </h1>
          </div>

          {notice && (
            <div style={{
              background: noticeType === "success" ? "#f0fdf4" : "#fef2f2",
              color: noticeType === "success" ? "#15803d" : "#dc2626",
              padding: "10px 16px", borderRadius: 10, fontSize: ".72rem", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8, border: `1px solid ${noticeType === "success" ? "#bbf7d0" : "#fecaca"}`,
            }}>
              {noticeType === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
              {notice}
            </div>
          )}

          <div className="ops-toolbar" style={{ flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <label style={{ flex: 1, minWidth: 200 }}>
              <Search size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم، الجوال، البريد..." />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 18 }}>
            {[
              { icon: Users, label: "إجمالي العملاء", value: stats.total, color: "#073766", bg: "#eaf4ff", iconBg: "rgba(7,55,102,.1)" },
              { icon: UserCheck, label: "نشط", value: stats.active, color: "#15803d", bg: "#f0fdf4", iconBg: "rgba(21,128,61,.1)" },
              { icon: UserX, label: "موقوف", value: stats.inactive, color: "#dc2626", bg: "#fef2f2", iconBg: "rgba(220,38,38,.1)" },
              { icon: Building2, label: "مؤسسات", value: stats.companies, color: "#7c3aed", bg: "#f5f3ff", iconBg: "rgba(124,58,237,.1)" },
              { icon: Users, label: "حسابات مشتركة", value: stats.sharedAccounts, color: "#b45309", bg: "#fef9ee", iconBg: "rgba(180,83,9,.1)" },
            ].map((card) => (
              <article key={card.label} style={{
                background: card.bg, borderRadius: 12, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: card.iconBg, display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <card.icon size={18} color={card.color} />
                </div>
                <div>
                  <strong style={{ fontSize: "1rem", color: card.color, display: "block" }}>{card.value}</strong>
                  <small style={{ fontSize: ".6rem", color: "#6b7d93" }}>{card.label}</small>
                </div>
              </article>
            ))}
          </div>

          {loading ? (
            <div className="ops-table-card">
              <div className="ops-table-scroll">
                <table><tbody><tr><td className="ops-empty" colSpan={6}>
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ width: 24, height: 24, border: "2px solid #e5ecf3", borderTopColor: "#073766", borderRadius: "50%", animation: "spin .6s linear infinite", margin: "0 auto 10px" }} />
                    جاري التحميل...
                  </div>
                </td></tr></tbody></table>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ops-table-card">
              <div className="ops-table-scroll">
                <table><tbody><tr><td className="ops-empty" colSpan={6}>
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#8b9dad" }}>
                    <Users size={32} style={{ marginBottom: 10, opacity: .3 }} />
                    <p>{search ? "لا توجد نتائج للبحث" : "لا يوجد عملاء مسجلون بعد"}</p>
                  </div>
                </td></tr></tbody></table>
              </div>
            </div>
          ) : (
            <div className="ops-table-card">
              <div className="ops-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>العميل</th>
                      <th>الجوال</th>
                      <th>الحالة</th>
                      <th>صاحب الحساب</th>
                      <th>السجل التجاري</th>
                      <th>تاريخ التسجيل</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const sharedCount = c.user_id ? (userGroupCounts.get(c.user_id) || 1) : 1;
                      const isShared = sharedCount > 1;
                      return (
                      <tr key={c.id} onClick={() => { setSelected(c); setEditing(null); }}
                        style={{
                          cursor: "pointer", opacity: c.active ? 1 : .55, transition: "background .1s",
                          background: selected?.id === c.id ? "#f5f8fc" : undefined,
                          borderLeft: isShared ? "3px solid #b45309" : undefined,
                        }}
                        onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = "#fafbfc"; }}
                        onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = ""; }}>
                        <td>
                          <div className="ops-owner">
                            <i style={{ background: typeColors[c.client_type]?.bg, color: typeColors[c.client_type]?.text }}>
                              {(c.name || "?").charAt(0)}
                            </i>
                            <div>
                              <strong>{c.name}</strong>
                              <span style={{
                                display: "inline-block", fontSize: ".5rem", padding: "1px 6px", borderRadius: 4,
                                background: typeColors[c.client_type]?.bg, color: typeColors[c.client_type]?.text, marginTop: 2,
                              }}>
                                {c.client_type === "company" ? "مؤسسة" : "فرد"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: ".68rem", color: "#5a6b7d", direction: "ltr", textAlign: "right" }}>{c.phone}</td>
                        <td>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: c.active ? statusColors.active.bg : statusColors.inactive.bg,
                            color: c.active ? statusColors.active.text : statusColors.inactive.text,
                            fontSize: ".6rem", padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.active ? statusColors.active.dot : statusColors.inactive.dot }} />
                            {c.active ? "نشط" : "موقوف"}
                          </span>
                        </td>
                        <td style={{ fontSize: ".62rem" }}>
                          {c.profiles ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <span style={{ color: isShared ? "#b45309" : "#5a6b7d", fontWeight: isShared ? 600 : 400 }}>
                                {c.profiles.full_name}
                              </span>
                              {isShared && <span style={{ fontSize: ".5rem", color: "#b45309", background: "#fef9ee", padding: "1px 5px", borderRadius: 3, alignSelf: "flex-start", marginTop: 1 }}>
                                {sharedCount} عملاء
                              </span>}
                            </div>
                          ) : <span style={{ color: "#b0bcc9" }}>—</span>}
                        </td>
                        <td>
                          {c.commercial_number
                            ? <span style={{ fontSize: ".63rem", color: "#073766", background: "#eaf4ff", padding: "2px 8px", borderRadius: 4 }}>{c.commercial_number}</span>
                            : <span style={{ color: "#b0bcc9", fontSize: ".6rem" }}>—</span>}
                        </td>
                        <td style={{ fontSize: ".6rem", color: "#8b9dad", whiteSpace: "nowrap" }}>
                          {new Date(c.created_at).toLocaleDateString("ar-SA")}
                        </td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); setSelected(c); setEditing(null); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#8b9dad", padding: 4, borderRadius: 6, display: "flex" }}>
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="ops-summary" style={{ background: "#fafbfc" }}>
          {editing ? (
            <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
              <div className="ops-summary-head" style={{ borderBottom: "1px solid #f0f4f8" }}>
                <h2 style={{ fontSize: ".85rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Edit2 size={15} color="#073766" /> تعديل {editing.name}
                </h2>
                <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8b9dad", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {renderInput("الاسم", "name", editing.name, (v) => setEditing({ ...editing, name: v }))}
                {renderInput("الجوال", "phone", editing.phone, (v) => setEditing({ ...editing, phone: v }))}
                {renderInput("البريد", "email", editing.email || "", (v) => setEditing({ ...editing, email: v }), "email")}
                {renderInput("السجل التجاري", "commercial", editing.commercial_number || "", (v) => setEditing({ ...editing, commercial_number: v }))}
                {renderInput("رقم الهوية", "national", editing.national_id || "", (v) => setEditing({ ...editing, national_id: v }))}
                <div>
                  <label style={{ display: "block", fontSize: ".6rem", color: "#6b7d93", marginBottom: 4, fontWeight: 600 }}>ملاحظات</label>
                  <textarea value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })}
                    rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={saveEdit} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "#073766", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0",
                    fontSize: ".73rem", fontWeight: 700, cursor: "pointer", transition: "opacity .15s",
                  }} onMouseEnter={e => e.currentTarget.style.opacity = ".9"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    <Save size={14} /> حفظ التعديلات
                  </button>
                  <button onClick={() => setEditing(null)} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "#f0f4f8", color: "#5a6b7d", border: "none", borderRadius: 8, padding: "10px 0",
                    fontSize: ".73rem", fontWeight: 600, cursor: "pointer",
                  }}>
                    <X size={14} /> إلغاء
                  </button>
                </div>
              </div>
            </div>
          ) : selected ? (
            <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
              <div className="ops-summary-head" style={{ borderBottom: "1px solid #f0f4f8" }}>
                <h2 style={{ fontSize: ".85rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center",
                    background: typeColors[selected.client_type]?.bg, color: typeColors[selected.client_type]?.text,
                    fontSize: ".7rem", fontWeight: 800,
                  }}>
                    {(selected.name || "?").charAt(0)}
                  </div>
                  {selected.name}
                  {selected.profiles && <span style={{ fontSize: ".58rem", color: "#8b9dad", fontWeight: 400 }}>({selected.profiles.full_name})</span>}
                </h2>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8b9dad", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: "12px 16px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid #f0f4f8" }}>
                <ActionBtn icon={Edit2} label="تعديل" color="#073766" bg="#eaf4ff" onClick={() => setEditing({ ...selected })} />
                <ActionBtn icon={selected.active ? UserX : UserCheck}
                  label={selected.active ? "إيقاف" : "تفعيل"}
                  color={selected.active ? "#dc2626" : "#15803d"}
                  bg={selected.active ? "#fef2f2" : "#f0fdf4"}
                  onClick={() => toggleActive(selected)} />
                <ActionBtn icon={Trash2} label="حذف" color="#dc2626" bg="#fef2f2" onClick={() => setConfirmDelete(selected.id)} />
              </div>

              {confirmDelete === selected.id && (
                <div style={{
                  padding: "12px 16px", background: "#fef2f2", borderBottom: "1px solid #fecaca",
                  display: "flex", alignItems: "center", gap: 8, fontSize: ".68rem",
                }}>
                  <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "#991b1b", fontWeight: 600 }}>تأكيد حذف العميل؟</span>
                  <button onClick={() => handleDelete(selected.id)}
                    style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: ".65rem", fontWeight: 600, cursor: "pointer" }}>نعم، احذف</button>
                  <button onClick={() => setConfirmDelete(null)}
                    style={{ background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 12px", fontSize: ".65rem", cursor: "pointer" }}>إلغاء</button>
                </div>
              )}

              <div style={{ padding: "8px 0" }}>
                <InfoRow icon={User} label="نوع العميل" value={selected.client_type === "company" ? "مؤسسة" : "فرد"} />
                <InfoRow icon={Phone} label="الجوال" value={selected.phone} />
                {selected.email && <InfoRow icon={Mail} label="البريد" value={selected.email} />}
                {selected.national_id && <InfoRow icon={CreditCard} label="رقم الهوية" value={selected.national_id} />}
                {selected.commercial_number && <InfoRow icon={FileText} label="السجل التجاري" value={selected.commercial_number} />}
                {selected.unified_register_number && <InfoRow icon={FileText} label="الرقم الموحد" value={selected.unified_register_number} />}
                {selected.company_address && <InfoRow icon={MapPin} label="العنوان" value={selected.company_address} />}
                {selected.company_activity && <InfoRow icon={Activity} label="النشاط" value={selected.company_activity} />}
                {selected.notes && <InfoRow icon={FileCheck} label="ملاحظات" value={selected.notes} />}
                <InfoRow icon={UserCheck} label="الحالة" value={
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: selected.active ? statusColors.active.bg : statusColors.inactive.bg,
                    color: selected.active ? statusColors.active.text : statusColors.inactive.text,
                    fontSize: ".6rem", padding: "2px 10px", borderRadius: 20, fontWeight: 600,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: selected.active ? statusColors.active.dot : statusColors.inactive.dot }} />
                    {selected.active ? "نشط" : "موقوف"}
                  </span>
                } />
                <InfoRow icon={Clock} label="آخر تحديث" value={new Date(selected.updated_at).toLocaleString("ar-SA")} />
              </div>

              {accountClients.length > 1 && (
                <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f4f8" }}>
                  <h3 style={{ fontSize: ".72rem", color: "#b45309", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={14} /> عملاء الحساب ({accountClients.length})
                  </h3>
                  {accountClients.map(ac => (
                    <div key={ac.id} onClick={() => setSelected(ac)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                        background: ac.id === selected.id ? "#f5f8fc" : "transparent",
                        borderBottom: "1px solid #f0f4f8", transition: "background .1s",
                        fontSize: ".68rem",
                      }}
                      onMouseEnter={e => { if (ac.id !== selected.id) e.currentTarget.style.background = "#fafbfc"; }}
                      onMouseLeave={e => { if (ac.id !== selected.id) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center",
                        background: typeColors[ac.client_type]?.bg, color: typeColors[ac.client_type]?.text,
                        fontSize: ".55rem", fontWeight: 800, flexShrink: 0,
                      }}>
                        {(ac.name || "?").charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: ".65rem", color: "#344d69", display: "block" }}>{ac.name}</strong>
                        <span style={{ fontSize: ".55rem", color: "#8b9dad" }}>{ac.client_type === "company" ? "مؤسسة" : "فرد"} · {ac.phone}</span>
                      </div>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: ac.active ? "#22c55e" : "#ef4444", flexShrink: 0,
                      }} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f4f8" }}>
                <h3 style={{ fontSize: ".72rem", color: "#073766", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={14} /> المستندات
                </h3>
                {selected.commercial_register_doc && <DocLink label="السجل التجاري" path={selected.commercial_register_doc} />}
                {selected.company_license_doc && <DocLink label="رخصة المنشأة" path={selected.company_license_doc} />}
                {selected.national_id_doc && <DocLink label="صورة الهوية" path={selected.national_id_doc} />}
                {!selected.commercial_register_doc && !selected.company_license_doc && !selected.national_id_doc && (
                  <p style={{ color: "#b0bcc9", fontSize: ".65rem" }}>لا توجد مستندات مرفوعة</p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "#8b9dad" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: "#f0f4f8",
                display: "grid", placeItems: "center", margin: "0 auto 14px",
              }}>
                <Users size={28} style={{ opacity: .4 }} />
              </div>
              <p style={{ fontSize: ".75rem", fontWeight: 600, color: "#5a6b7d" }}>اختر عميلاً لعرض التفاصيل</p>
              <p style={{ fontSize: ".62rem", marginTop: 4 }}>اضغط على أي عميل من الجدول</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ActionBtn({ icon: Icon, label, color, bg, onClick }: { icon: any; label: string; color: string; bg: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, background: bg, color,
        border: "none", borderRadius: 8, padding: "6px 12px", fontSize: ".65rem", fontWeight: 600,
        cursor: "pointer", transition: "opacity .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = ".8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
      <Icon size={13} /> {label}
    </button>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "9px 20px", borderBottom: "1px solid #f5f8fc",
    }}>
      <div style={{ width: 20, flexShrink: 0, paddingTop: 1 }}>
        <Icon size={14} color="#8b9dad" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: ".58rem", color: "#8b9dad", marginBottom: 2 }}>{label}</span>
        <span style={{ fontSize: ".7rem", color: "#344d69", fontWeight: 500, wordBreak: "break-word" }}>{value}</span>
      </div>
    </div>
  );
}

function MapPin(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 14} height={props.size || 14} viewBox="0 0 24 24" fill="none" stroke={props.color || "#8b9dad"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function DocLink({ label, path }: { label: string; path: string }) {
  const supabase = createSupabaseBrowserClient();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.storage.from("client-documents").createSignedUrl(path, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
      setLoading(false);
    });
  }, [path]);

  return (
    <div style={{ marginBottom: 6 }}>
      {loading ? (
        <span style={{ fontSize: ".62rem", color: "#b0bcc9" }}>جاري تحميل الرابط...</span>
      ) : (
        <a href={url} target="_blank" rel="noopener"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "#0875dc", fontSize: ".65rem", textDecoration: "none",
            padding: "4px 10px", borderRadius: 6, background: "#eaf4ff",
            transition: "background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
          onMouseLeave={e => e.currentTarget.style.background = "#eaf4ff"}>
          <FileText size={13} /> {label} <ExternalLink size={10} style={{ opacity: .6 }} />
        </a>
      )}
    </div>
  );
}
