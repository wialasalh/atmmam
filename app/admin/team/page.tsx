"use client";
import PageLoader from "@/components/page-loader";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, ShieldCheck, ShieldAlert, Users, Search,
  Pencil, KeyRound, CheckCircle, PauseCircle, PlayCircle,
  Trash2, Crown, X, Mail, UserPlus, Star, Lock, UserCog,
  SlidersHorizontal, Check, ChevronLeft, RefreshCw,
  Phone, Calendar, Activity, AlertCircle,
} from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, defaultPermissions, type PermissionKey } from "@/lib/auth/permissions";
import { formatAppDate, formatAppDateTime } from "@/lib/date-format";

type Role = "admin" | "manager" | "operator" | "viewer";
type TeamMember = {
  id: string; full_name: string; email?: string; phone?: string | null;
  role: Role; active: boolean; super_admin?: boolean; avatar_url?: string | null;
  created_at?: string; updated_at?: string; permissions?: string[];
};
type Invitation = {
  id: string; email: string; role: Role; status: string;
  created_at: string; expires_at: string;
};
type Modal = null | "add" | "edit" | "password" | "invite" | "delete";
type RatingStat = { avg_rating: number; total_ratings: number; positive: number; negative: number; resolved_tickets: number; recent_ratings: { rating: number; comment: string; date: string; client_name: string; ticket_id: string }[] };

const ROLE_LABEL: Record<Role, string> = { admin: "مدير النظام", manager: "مدير عمليات", operator: "موظف عمليات", viewer: "مشاهد" };
const ROLE_COLOR: Record<Role, string> = { admin: "#dc2626", manager: "#b45309", operator: "#0875dc", viewer: "#526983" };
const ROLE_BG:    Record<Role, string> = { admin: "#fef2f2", manager: "#fff7ed", operator: "#eff6ff", viewer: "#f8fafc" };
const ROLE_DESC:  Record<Role, string> = {
  admin:    "صلاحية كاملة على جميع أقسام النظام، إضافة وإزالة الأعضاء وتغيير الصلاحيات.",
  manager:  "يدير العمليات اليومية والطلبات والعملاء، لا يمكنه إدارة الفريق.",
  operator: "ينفذ الطلبات ويرفع المستندات، صلاحية محدودة على العملاء والطلبات.",
  viewer:   "مشاهدة فقط — يطلع على لوحة التحكم والتقارير دون تعديلات.",
};
const ROLE_ICON: Record<Role, React.ComponentType<{size?:number;color?:string}>> = {
  admin: ShieldAlert, manager: Shield, operator: ShieldCheck, viewer: Lock
};

const FIELD: React.CSSProperties = {
  width:"100%", border:"1.5px solid #dfe8f1", borderRadius:9, padding:"8px 12px",
  font:"inherit", fontSize:".73rem", color:"#1a2d40", background:"#fff", outline:"none", boxSizing:"border-box",
};

export default function TeamPage() {
  const { loading: authLoading } = useRoleGuard("admin");
  const router = useRouter();
  const [members,       setMembers]       = useState<TeamMember[]>([]);
  const [invitations,   setInvitations]   = useState<Invitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState<Role|"all">("all");
  const [selected,      setSelected]      = useState<TeamMember|null>(null);
  const [modal,         setModal]         = useState<Modal>(null);
  const [notice,        setNotice]        = useState("");
  const [apiError,      setApiError]      = useState("");
  const [ratingStats,   setRatingStats]   = useState<Record<string,RatingStat>>({});
  const [permMember,    setPermMember]    = useState<TeamMember|null>(null);
  const [permValues,    setPermValues]    = useState<PermissionKey[]>([]);
  const [savingPerms,   setSavingPerms]   = useState(false);
  const [permError,     setPermError]     = useState("");
  const [showRatings,   setShowRatings]   = useState(false);

  const notify = useCallback((msg: string) => { setNotice(msg); setTimeout(()=>setNotice(""),2600); }, []);

  async function loadTeam() {
    try {
      const res = await fetch("/api/admin/team");
      if (!res.ok) { const e = await res.json().catch(()=>({error:"unknown"})); setApiError(e.error||"فشل"); return false; }
      const d = await res.json();
      setMembers(d.members); setCurrentUserId(d.currentUserId); return true;
    } catch(e) { setApiError(e instanceof Error?e.message:"فشل الاتصال"); return false; }
  }
  async function loadInvitations() {
    try { const r = await fetch("/api/admin/team/invitations"); if(r.ok){ const d = await r.json(); setInvitations(d.data||[]); } } catch{}
  }

  useEffect(()=>{
    fetch("/api/auth/me").then(async r=>{ if(r.ok){ const {data}=await r.json(); if(data?.role!=="admin") router.replace("/admin"); }});
  },[router]);

  useEffect(()=>{
    if(!process.env.NEXT_PUBLIC_SUPABASE_URL){ setLoading(false); return; }
    void (async()=>{
      await Promise.all([loadTeam(), loadInvitations()]);
      try {
        const r = await fetch("/api/admin/team/ratings");
        if(r.ok){ const {data}=await r.json(); const m:Record<string,RatingStat>={}; for(const x of data) m[x.staff_id]=x; setRatingStats(m); }
      } catch{}
      setLoading(false);
    })();
  },[]);

  const filtered = members.filter(m=>{
    const s = m.full_name+(m.email||"")+(m.phone||"");
    return s.includes(search) && (roleFilter==="all"||m.role===roleFilter);
  });

  async function handleAdd(data:{email:string;password:string;fullName:string;role:Role;phone?:string}) {
    const r=await fetch("/api/admin/team",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
    if(!r.ok){const e=await r.json();throw new Error(e.error||"فشل");}
    await loadTeam();
  }
  async function handleEdit(data:{profileId:string;fullName?:string;role?:Role;active?:boolean;phone?:string}) {
    const r=await fetch("/api/admin/team",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
    if(!r.ok){const e=await r.json();throw new Error(e.error||"فشل");}
    await loadTeam();
    if(selected?.id===data.profileId) setSelected(p=>p?{...p,...data}:null);
  }
  async function handlePassword(profileId:string,pw:string) {
    const r=await fetch("/api/admin/team/password",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({profileId,newPassword:pw})});
    if(!r.ok){const e=await r.json();throw new Error(e.error||"فشل");}
  }
  async function handleInvite(email:string,role:Role) {
    const r=await fetch("/api/admin/team/invite",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,role})});
    if(!r.ok){const e=await r.json();throw new Error(e.error||"فشل");}
    await loadInvitations();
  }
  async function handleDelete(profileId:string) {
    const r=await fetch("/api/admin/team/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({profileId})});
    if(!r.ok){const e=await r.json();throw new Error(e.error||"فشل");}
    await loadTeam(); setSelected(null);
  }
  async function handleCancelInvitation(id:string) {
    await fetch("/api/admin/team/invitations",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({invitationId:id})});
    await loadInvitations(); notify("تم إلغاء الدعوة");
  }

  if(authLoading||loading) return <PageLoader text="جاري تحميل الفريق..."/>;
  if(apiError) return <div dir="rtl" style={{padding:40,textAlign:"center",color:"#dc2626"}}>{apiError}</div>;

  const stats = { total:members.length, active:members.filter(m=>m.active).length, inactive:members.filter(m=>!m.active).length, admins:members.filter(m=>m.role==="admin").length };
  const rs = selected ? ratingStats[selected.id] : null;

  return (
    <div className="tm-shell" dir="rtl">
      <style>{`
        .tm-shell{height:calc(100vh - 60px);display:grid;grid-template-rows:auto 1fr;background:#f4f7fb;overflow:hidden}
        /* Header */
        .tm-head{padding:16px 24px 14px;background:linear-gradient(180deg,#fff,#f8fbff);border-bottom:1px solid #dfe8f1}
        .tm-head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
        .tm-eyebrow{margin:0 0 3px;color:#0f766e;font-size:.63rem;font-weight:900;letter-spacing:.04em}
        .tm-h1{margin:0 0 3px;font-size:1.4rem;font-weight:900;color:#073766;line-height:1}
        .tm-sub{margin:0;color:#7f8e9f;font-size:.68rem}
        .tm-acts{display:flex;gap:8px}
        .tm-btn{height:36px;border:1px solid #dfe8f1;border-radius:9px;background:#fff;color:#526983;font:inherit;font-size:.65rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:0 14px;text-decoration:none;transition:all .14s}
        .tm-btn:hover{background:#f4f7fb}
        .tm-btn.primary{background:#073766;color:#fff;border-color:#073766}
        .tm-btn.primary:hover{background:#0a4a8a}
        /* KPIs */
        .tm-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .tm-kpi{background:#fff;border:1px solid #dfe8f1;border-radius:11px;padding:10px 14px;display:flex;align-items:center;gap:10px}
        .tm-kpi i{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
        .tm-kpi small{display:block;font-size:.55rem;color:#8190a1;font-weight:800}
        .tm-kpi strong{display:block;font-size:1.3rem;font-weight:900;line-height:1.1;color:#073766}
        /* Body */
        .tm-body{min-height:0;display:grid;grid-template-columns:300px 1fr;overflow:hidden}
        /* List */
        .tm-list{border-left:1px solid #dfe8f1;background:#fff;display:flex;flex-direction:column;overflow:hidden}
        .tm-list-head{padding:10px 12px 8px;border-bottom:1px solid #f0f4f8;flex-shrink:0}
        .tm-search{display:flex;align-items:center;gap:8px;background:#f4f7fb;border:1px solid #e4ebf2;border-radius:9px;padding:0 10px;height:34px;margin-bottom:7px}
        .tm-search input{border:none;background:transparent;font:inherit;font-size:.68rem;color:#1a2d40;outline:none;flex:1;min-width:0}
        .tm-filters{display:flex;gap:4px;flex-wrap:wrap}
        .tm-pill{border:1px solid #e4ebf2;border-radius:20px;background:#fff;color:#526983;font:inherit;font-size:.58rem;font-weight:700;cursor:pointer;padding:3px 10px;transition:all .12s}
        .tm-pill.on{background:#073766;color:#fff;border-color:#073766}
        .tm-cards{flex:1;overflow-y:auto;padding:8px}
        /* Member card */
        .tm-card{border:1px solid #e8eef4;border-radius:11px;padding:10px 12px;margin-bottom:6px;cursor:pointer;transition:all .12s;background:#fff;position:relative;overflow:hidden}
        .tm-card::before{content:"";position:absolute;top:0;right:0;width:3px;height:100%;border-radius:0 11px 11px 0}
        .tm-card:hover{border-color:#c5d8ef;background:#f9fbfd}
        .tm-card.active{border-color:#bddcff;background:#eaf4ff}
        .tm-card-top{display:flex;align-items:center;gap:10px}
        .tm-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:.75rem;font-weight:800;flex-shrink:0;position:relative;overflow:hidden}
        .tm-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}
        .tm-card-name{font-size:.72rem;font-weight:800;color:#1a2d40;margin-bottom:2px;display:flex;align-items:center;gap:5px}
        .tm-card-meta{font-size:.58rem;color:#8b9dad;display:flex;align-items:center;gap:5px}
        .tm-role-chip{font-size:.55rem;font-weight:800;padding:2px 7px;border-radius:6px}
        .tm-status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .tm-card-arr{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#c4cdd6}
        .tm-card.active .tm-card-arr{color:#0875dc}
        .tm-inactive-badge{font-size:.5rem;font-weight:800;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;padding:1px 6px;border-radius:5px}
        /* Detail */
        .tm-detail{overflow-y:auto;background:#f4f7fb}
        .tm-empty{display:grid;place-items:center;height:100%;color:#a0adb8;text-align:center;gap:10px}
        .tm-empty svg{opacity:.25}
        .tm-detail-inner{padding:20px 24px}
        /* Profile card */
        .tm-profile{background:#fff;border:1px solid #dfe8f1;border-radius:16px;overflow:hidden;margin-bottom:16px}
        .tm-profile-banner{height:56px;position:relative;flex-shrink:0}
        .tm-profile-identity{display:flex;align-items:center;gap:14px;padding:0 20px;margin-top:-28px;margin-bottom:12px}
        .tm-profile-avatar{width:60px;height:60px;border-radius:50%;border:3px solid #fff;display:grid;place-items:center;font-size:1.3rem;font-weight:900;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.15);flex-shrink:0;position:relative}
        .tm-profile-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}
        .tm-profile-text{padding-top:30px}
        .tm-profile-name{font-size:1.05rem;font-weight:900;color:#073766;margin:0 0 3px;line-height:1.2;display:flex;align-items:center;gap:6px}
        .tm-profile-role{display:inline-flex;align-items:center;gap:5px;font-size:.65rem;font-weight:800;padding:4px 10px;border-radius:8px}
        .tm-profile-body{padding:0 20px 18px}
        .tm-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .tm-info-row{display:flex;align-items:center;gap:8px;font-size:.65rem;color:#526983}
        .tm-info-val{color:#1a2d40;font-weight:700}
        /* Stats */
        .tm-stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
        .tm-stat{background:#fff;border:1px solid #dfe8f1;border-radius:11px;padding:12px;text-align:center}
        .tm-stat strong{display:block;font-size:1.3rem;font-weight:900;color:#073766}
        .tm-stat small{font-size:.58rem;color:#8b9dad;font-weight:700}
        /* Section card */
        .tm-section{background:#fff;border:1px solid #dfe8f1;border-radius:13px;overflow:hidden;margin-bottom:14px}
        .tm-section-head{padding:10px 14px;border-bottom:1px solid #f0f4f8;display:flex;align-items:center;justify-content:space-between;font-size:.7rem;font-weight:800;color:#0b1e36}
        .tm-section-body{padding:12px 14px}
        /* Action buttons in detail */
        .tm-detail-acts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
        .tm-act-btn{height:34px;border:1px solid #dfe8f1;border-radius:9px;background:#fff;color:#526983;font:inherit;font-size:.62rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0 12px;transition:all .12s}
        .tm-act-btn:hover{background:#f4f7fb;border-color:#c5d8ef}
        .tm-act-btn.danger:hover{background:#fef2f2;color:#dc2626;border-color:#fecaca}
        .tm-act-btn.warn:hover{background:#fff7ed;color:#b45309;border-color:#fed7aa}
        .tm-act-btn.green:hover{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}
        /* Rating stars */
        .tm-stars{display:flex;gap:2px;align-items:center}
        .tm-rating-item{background:#f8fafc;border:1px solid #e4ebf2;border-radius:10px;padding:10px 12px;margin-bottom:7px}
        /* Perms */
        .tm-perm-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
        .tm-perm-btn{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1.5px solid #e5eaf0;border-radius:9px;background:#fff;cursor:pointer;font:inherit;font-size:.62rem;text-align:right;transition:all .13s;width:100%}
        .tm-perm-btn.on{background:#eaf4ff;border-color:#bddcff}
        .tm-perm-ico{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;flex-shrink:0;background:#f4f7fb}
        .tm-perm-btn.on .tm-perm-ico{background:#dbeafe}
        /* Modals */
        .tm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:grid;place-items:center}
        .tm-modal{background:#fff;border-radius:16px;padding:0;width:420px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2)}
        .tm-modal-wide{width:680px}
        .tm-modal-head{padding:16px 20px;border-bottom:1px solid #f0f4f8;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .tm-modal-head h3{margin:0;font-size:.9rem;color:#073766;font-weight:800}
        .tm-modal-close{border:none;background:#f4f7fb;border-radius:8px;width:30px;height:30px;display:grid;place-items:center;cursor:pointer;color:#526983;transition:all .12s}
        .tm-modal-close:hover{background:#fef2f2;color:#dc2626}
        .tm-modal-body{padding:16px 20px;overflow-y:auto;flex:1}
        .tm-modal-desc{font-size:.68rem;color:#7f8e9f;margin:0 0 14px;line-height:1.6}
        .tm-modal-lbl{font-size:.6rem;font-weight:700;color:#425c76;margin-bottom:4px}
        .tm-modal-fg{margin-bottom:12px}
        .tm-modal-footer{padding:12px 20px;border-top:1px solid #f0f4f8;display:flex;gap:8px;flex-shrink:0}
        .tm-save{height:36px;border:0;border-radius:9px;background:#073766;color:#fff;font:inherit;font-size:.65rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0 18px;transition:all .12s}
        .tm-save:hover{background:#0a4a8a}
        .tm-save:disabled{background:#c5d2de;cursor:not-allowed}
        .tm-save.danger{background:#dc2626}
        .tm-save.danger:hover{background:#b91c1c}
        .tm-cancel{height:36px;border:1px solid #dfe8f1;border-radius:9px;background:#fff;color:#526983;font:inherit;font-size:.65rem;font-weight:700;cursor:pointer;padding:0 16px}
        .tm-cancel:hover{background:#f4f7fb}
        /* Toast */
        .tm-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:12px;font-size:.7rem;font-weight:700;display:flex;align-items:center;gap:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:1000;animation:tmUp .2s;white-space:nowrap}
        /* Inv badge */
        .tm-inv-badge{font-size:.55rem;font-weight:800;padding:2px 7px;border-radius:5px}
        .tm-inv-pending{background:#eff6ff;color:#1d4ed8}
        .tm-inv-accepted{background:#f0fdf4;color:#15803d}
        .tm-inv-expired{background:#f3f4f6;color:#6b7280}
        @keyframes tmUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="tm-head">
        <div className="tm-head-row">
          <div>
            <p className="tm-eyebrow">إدارة النظام</p>
            <h1 className="tm-h1">فريق العمل</h1>
            <p className="tm-sub">إدارة الأعضاء وتحديد الصلاحيات</p>
          </div>
          <div className="tm-acts">
            <button className="tm-btn" onClick={()=>setModal("invite")}><Mail size={13}/> دعوة عبر البريد</button>
            <button className="tm-btn primary" onClick={()=>setModal("add")}><UserPlus size={13}/> إضافة عضو</button>
          </div>
        </div>
        <div className="tm-kpis">
          {[
            {label:"إجمالي الأعضاء",val:stats.total,   color:"#0875dc",bg:"#eff6ff", Icon:Users},
            {label:"نشط",           val:stats.active,  color:"#15803d",bg:"#f0fdf4", Icon:CheckCircle},
            {label:"موقوف",         val:stats.inactive,color:"#dc2626",bg:"#fef2f2", Icon:PauseCircle},
            {label:"مديرو النظام",  val:stats.admins,  color:"#b45309",bg:"#fff7ed", Icon:ShieldAlert},
          ].map(k=>(
            <div key={k.label} className="tm-kpi">
              <i style={{background:k.bg}}><k.Icon size={16} color={k.color}/></i>
              <div><small>{k.label}</small><strong style={{color:k.color}}>{k.val}</strong></div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="tm-body">

        {/* ── LIST ── */}
        <div className="tm-list">
          <div className="tm-list-head">
            <div className="tm-search">
              <Search size={14} color="#94a3b8"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد..."/>
              {search&&<button onClick={()=>setSearch("")} style={{border:0,background:"none",cursor:"pointer",color:"#94a3b8",display:"grid",placeItems:"center",padding:0}}><X size={13}/></button>}
            </div>
            <div className="tm-filters">
              {(["all","admin","manager","operator","viewer"] as const).map(r=>(
                <button key={r} className={`tm-pill${roleFilter===r?" on":""}`} onClick={()=>setRoleFilter(r)}>
                  {r==="all"?"الكل":ROLE_LABEL[r as Role].replace(" النظام","").replace(" عمليات","")}
                </button>
              ))}
            </div>
          </div>

          <div className="tm-cards">
            {filtered.length===0&&<div style={{textAlign:"center",color:"#c4cdd6",fontSize:".65rem",padding:"20px 0"}}>لا نتائج</div>}
            {filtered.map(m=>(
              <div key={m.id} className={`tm-card${selected?.id===m.id?" active":""}`}
                style={{"--stripe-color":ROLE_COLOR[m.role]} as React.CSSProperties}
                onClick={()=>{setSelected(m);setShowRatings(false);}}
              >
                <style>{`.tm-card[data-id="${m.id}"]::before{background:${ROLE_COLOR[m.role]}}`}</style>
                <div style={{position:"absolute",top:0,right:0,width:3,height:"100%",background:ROLE_COLOR[m.role],borderRadius:"0 11px 11px 0"}}/>
                <div className="tm-card-top">
                  <div className="tm-avatar" style={{background:ROLE_BG[m.role],color:ROLE_COLOR[m.role]}}>
                    {m.avatar_url&&<img src={m.avatar_url} alt="" onError={e=>(e.currentTarget.style.display="none")}/>}
                    {m.full_name.charAt(0)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="tm-card-name">
                      {m.full_name}
                      {m.super_admin&&<Crown size={11} color="#f59e0b"/>}
                      {!m.active&&<span className="tm-inactive-badge">موقوف</span>}
                    </div>
                    <div className="tm-card-meta">
                      <span className="tm-role-chip" style={{background:ROLE_BG[m.role],color:ROLE_COLOR[m.role]}}>{ROLE_LABEL[m.role]}</span>
                      {ratingStats[m.id]&&<>·<span style={{color:"#f59e0b",fontWeight:700}}>★ {ratingStats[m.id].avg_rating}</span></>}
                    </div>
                  </div>
                  <ChevronLeft size={14} className="tm-card-arr"/>
                </div>
              </div>
            ))}

            {invitations.filter(i=>i.status==="pending").length>0&&(
              <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid #f0f4f8"}}>
                <div style={{fontSize:".58rem",fontWeight:800,color:"#a0adb8",marginBottom:6,paddingRight:2}}>الدعوات المعلقة</div>
                {invitations.filter(i=>i.status==="pending").map(inv=>(
                  <div key={inv.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",border:"1px dashed #bddcff",borderRadius:9,marginBottom:5,background:"#f8fbff"}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:"#dbeafe",display:"grid",placeItems:"center",flexShrink:0}}>
                      <Mail size={13} color="#1d4ed8"/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:".65rem",fontWeight:700,color:"#1a2d40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv.email}</div>
                      <div style={{fontSize:".55rem",color:"#8b9dad"}}>{ROLE_LABEL[inv.role]} · {formatAppDate(inv.created_at)}</div>
                    </div>
                    <button onClick={()=>handleCancelInvitation(inv.id)} style={{border:"none",background:"#fef2f2",borderRadius:6,color:"#dc2626",cursor:"pointer",padding:"3px 6px",fontSize:".55rem",fontWeight:700}}>إلغاء</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── DETAIL ── */}
        <div className="tm-detail">
          {!selected?(
            <div className="tm-empty">
              <UserCog size={52} color="#c4cdd6"/>
              <div>
                <div style={{fontSize:".9rem",fontWeight:700,color:"#a0adb8",marginBottom:4}}>اختر عضواً</div>
                <div style={{fontSize:".65rem",color:"#c4cdd6"}}>لعرض بياناته وإدارة صلاحياته</div>
              </div>
            </div>
          ):(
            <div className="tm-detail-inner">

              {/* Profile card */}
              <div className="tm-profile">
                <div className="tm-profile-banner" style={{background:`linear-gradient(135deg, ${ROLE_COLOR[selected.role]}25, ${ROLE_COLOR[selected.role]}0a)`}}/>
                <div className="tm-profile-identity">
                  <div className="tm-profile-avatar" style={{background:ROLE_BG[selected.role],color:ROLE_COLOR[selected.role]}}>
                    {selected.avatar_url&&<img src={selected.avatar_url} alt="" onError={e=>(e.currentTarget.style.display="none")}/>}
                    {selected.full_name.charAt(0)}
                  </div>
                  <div className="tm-profile-text">
                    <div className="tm-profile-name">
                      {selected.full_name}
                      {selected.super_admin&&<Crown size={14} color="#f59e0b"/>}
                    </div>
                    <span className="tm-profile-role" style={{background:ROLE_BG[selected.role],color:ROLE_COLOR[selected.role]}}>
                      {React.createElement(ROLE_ICON[selected.role],{size:11})}
                      {ROLE_LABEL[selected.role]}
                      {!selected.active&&<span style={{marginRight:6,background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",padding:"1px 6px",borderRadius:5,fontSize:".5rem",fontWeight:800}}>موقوف</span>}
                    </span>
                  </div>
                </div>
                <div className="tm-profile-body">
                  <p style={{fontSize:".62rem",color:"#7f8e9f",margin:"0 0 12px",lineHeight:1.6}}>{ROLE_DESC[selected.role]}</p>
                  <div className="tm-profile-grid">
                    {selected.email&&(
                      <div className="tm-info-row"><Mail size={13}/><span className="tm-info-val" dir="ltr">{selected.email}</span></div>
                    )}
                    {selected.phone&&(
                      <div className="tm-info-row"><Phone size={13}/><span className="tm-info-val">{selected.phone}</span></div>
                    )}
                    {selected.created_at&&(
                      <div className="tm-info-row"><Calendar size={13}/><span className="tm-info-val">أُضيف {formatAppDate(selected.created_at)}</span></div>
                    )}
                    <div className="tm-info-row">
                      <Activity size={13}/>
                      <span className={`tm-info-val`} style={{color:selected.active?"#15803d":"#dc2626"}}>{selected.active?"نشط":"موقوف"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="tm-detail-acts">
                <button className="tm-act-btn" onClick={()=>setModal("edit")}><Pencil size={13}/> تعديل</button>
                {!selected.super_admin&&<button className="tm-act-btn" onClick={()=>{setPermMember(selected);setPermValues((selected.permissions||defaultPermissions(selected.role)) as PermissionKey[]);setPermError("")}}><SlidersHorizontal size={13}/> الصلاحيات</button>}
                {selected.role!=="admin"&&selected.id!==currentUserId&&<button className="tm-act-btn" onClick={()=>setModal("password")}><KeyRound size={13}/> تغيير كلمة المرور</button>}
                {selected.id!==currentUserId&&selected.role!=="admin"&&(
                  <button className={`tm-act-btn${selected.active?" warn":" green"}`}
                    onClick={async()=>{
                      if(selected.active&&!confirm("هل أنت متأكد من إيقاف هذا العضو؟"))return;
                      await handleEdit({profileId:selected.id,active:!selected.active});
                      notify(selected.active?"تم إيقاف العضو":"تم تفعيل العضو");
                    }}>
                    {selected.active?<><PauseCircle size={13}/> إيقاف</>:<><PlayCircle size={13}/> تفعيل</>}
                  </button>
                )}
                {selected.id!==currentUserId&&(
                  <button className="tm-act-btn danger" onClick={()=>setModal("delete")}><Trash2 size={13}/> حذف</button>
                )}
              </div>

              {/* Rating stats */}
              {rs&&(
                <div className="tm-stats-row">
                  <div className="tm-stat">
                    <strong style={{color:"#b45309"}}>{rs.avg_rating}</strong>
                    <small>متوسط التقييم</small>
                    <div className="tm-stars" style={{justifyContent:"center",marginTop:3}}>
                      {[1,2,3,4,5].map(s=><Star key={s} size={11} fill={s<=Math.round(rs.avg_rating)?"#f59e0b":"#e5eaf0"} color={s<=Math.round(rs.avg_rating)?"#f59e0b":"#e5eaf0"}/>)}
                    </div>
                  </div>
                  <div className="tm-stat">
                    <strong style={{color:"#15803d"}}>{rs.positive}</strong>
                    <small>تقييم إيجابي</small>
                  </div>
                  <div className="tm-stat">
                    <strong style={{color:"#073766"}}>{rs.resolved_tickets}</strong>
                    <small>تذكرة محلولة</small>
                  </div>
                </div>
              )}

              {/* Recent ratings */}
              {rs&&rs.recent_ratings.length>0&&(
                <div className="tm-section">
                  <div className="tm-section-head">
                    <span>آخر التقييمات</span>
                    <button onClick={()=>setShowRatings(v=>!v)} style={{border:"none",background:"none",cursor:"pointer",fontSize:".6rem",color:"#0875dc",fontWeight:700}}>{showRatings?"إخفاء":"عرض الكل"}</button>
                  </div>
                  <div className="tm-section-body">
                    {(showRatings?rs.recent_ratings:rs.recent_ratings.slice(0,3)).map((r,i)=>(
                      <div key={i} className="tm-rating-item">
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <strong style={{fontSize:".65rem",color:"#1a2d40"}}>{r.client_name}</strong>
                          <div className="tm-stars">{[1,2,3,4,5].map(s=><Star key={s} size={12} fill={s<=r.rating?"#f59e0b":"#e5eaf0"} color={s<=r.rating?"#f59e0b":"#e5eaf0"}/>)}</div>
                        </div>
                        {r.comment&&<p style={{margin:"0 0 4px",fontSize:".62rem",color:"#7f8e9f",lineHeight:1.5}}>"{r.comment}"</p>}
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:".55rem",color:"#aab5c3"}}>{formatAppDateTime(r.date)}</span>
                          {r.ticket_id&&<a href={`/admin/tickets?selected=${r.ticket_id}`} style={{fontSize:".55rem",color:"#0875dc",textDecoration:"none"}}>عرض التذكرة ←</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions preview */}
              {!selected.super_admin&&selected.permissions&&(
                <div className="tm-section">
                  <div className="tm-section-head">
                    <span>الصلاحيات الممنوحة ({selected.permissions.length})</span>
                    <button onClick={()=>{setPermMember(selected);setPermValues((selected.permissions||defaultPermissions(selected.role)) as PermissionKey[]);setPermError("");}} style={{border:"none",background:"none",cursor:"pointer",fontSize:".6rem",color:"#0875dc",fontWeight:700}}>تعديل</button>
                  </div>
                  <div className="tm-section-body" style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {ALL_PERMISSIONS.filter(p=>selected.permissions!.includes(p.key)).map(p=>(
                      <span key={p.key} style={{fontSize:".58rem",fontWeight:700,padding:"3px 8px",borderRadius:6,background:"#eaf4ff",color:"#0875dc"}}>{p.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══ */}
      {modal==="add"&&<AddModal onClose={()=>setModal(null)} onAdd={async d=>{try{await handleAdd(d);notify("تمت الإضافة بنجاح");setModal(null);}catch(e){notify(e instanceof Error?e.message:"فشل");}}}/>}
      {modal==="edit"&&selected&&<EditModal member={selected} currentUserId={currentUserId} onClose={()=>setModal(null)} onEdit={async d=>{try{await handleEdit(d);notify("تم التحديث");setModal(null);}catch(e){notify(e instanceof Error?e.message:"فشل");}}}/>}
      {modal==="password"&&selected&&<PasswordModal member={selected} onClose={()=>setModal(null)} onChange={async pw=>{try{await handlePassword(selected.id,pw);notify("تم تغيير كلمة المرور");setModal(null);}catch(e){notify(e instanceof Error?e.message:"فشل");}}}/>}
      {modal==="invite"&&<InviteModal onClose={()=>setModal(null)} onInvite={async(e,r)=>{try{await handleInvite(e,r);notify("تم إرسال الدعوة");setModal(null);}catch(err){notify(err instanceof Error?err.message:"فشل");}}}/>}
      {modal==="delete"&&selected&&<DeleteModal member={selected} onClose={()=>setModal(null)} onDelete={async()=>{try{await handleDelete(selected.id);notify("تم حذف العضو");setModal(null);}catch(e){notify(e instanceof Error?e.message:"فشل");}}}/>}

      {/* Permissions modal */}
      {permMember&&(
        <div className="tm-overlay" onClick={()=>setPermMember(null)}>
          <div className="tm-modal tm-modal-wide" onClick={e=>e.stopPropagation()}>
            <div className="tm-modal-head">
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:ROLE_BG[permMember.role],display:"grid",placeItems:"center"}}>
                  {React.createElement(ROLE_ICON[permMember.role],{size:16,color:ROLE_COLOR[permMember.role]})}
                </div>
                <div>
                  <h3 style={{margin:0}}>صلاحيات {permMember.full_name}</h3>
                  <span style={{fontSize:".58rem",color:"#8b9dad"}}>{ROLE_LABEL[permMember.role]}</span>
                </div>
              </div>
              <button className="tm-modal-close" onClick={()=>setPermMember(null)}><X size={15}/></button>
            </div>
            {permError&&<div style={{margin:"10px 20px 0",padding:"8px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:".62rem",color:"#dc2626"}}>{permError}</div>}
            <div className="tm-modal-body">
              {permMember.super_admin&&<div style={{padding:"8px 12px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,fontSize:".62rem",color:"#92400e",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><AlertCircle size={13}/> الحساب الرئيسي — صلاحياته ثابتة</div>}
              {(["general","orders","clients","tickets","system"] as const).map(gk=>{
                const g=PERMISSION_GROUPS[gk];
                const perms=ALL_PERMISSIONS.filter(p=>p.group===gk);
                const allOn=perms.every(p=>permValues.includes(p.key));
                return (
                  <div key={gk} style={{marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                      <div style={{width:26,height:26,borderRadius:7,background:g.color+"18",display:"grid",placeItems:"center"}}><g.icon size={13} color={g.color}/></div>
                      <strong style={{fontSize:".68rem",color:"#073766",flex:1}}>{g.label}</strong>
                      <button onClick={()=>{if(allOn)setPermValues(p=>p.filter(k=>!perms.find(x=>x.key===k)));else setPermValues(p=>[...new Set([...p,...perms.map(x=>x.key)])]);}}
                        style={{fontSize:".58rem",color:allOn?"#15803d":"#8b9dad",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{allOn?"إلغاء الكل":"تحديد الكل"}</button>
                    </div>
                    <div className="tm-perm-grid">
                      {perms.map(p=>{
                        const on=permValues.includes(p.key);
                        return (
                          <button key={p.key} className={`tm-perm-btn${on?" on":""}`} disabled={!!permMember.super_admin}
                            onClick={()=>{ if(on) setPermValues(v=>v.filter(k=>k!==p.key)); else setPermValues(v=>[...v,p.key]); }}>
                            <span className="tm-perm-ico">{on?<Check size={13} color={PERMISSION_GROUPS[p.group]?.color||"#0875dc"}/>:<p.icon size={13} color="#8b9dad"/>}</span>
                            <span style={{flex:1,minWidth:0}}>
                              <span style={{display:"block",fontSize:".62rem",fontWeight:700,color:on?"#1e3a56":"#7a8fa6"}}>{p.label}</span>
                              <span style={{display:"block",fontSize:".5rem",color:"#aab5c3",marginTop:1}}>{p.description}</span>
                            </span>
                            <span style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${on?PERMISSION_GROUPS[p.group]?.color||"#0875dc":"#d1d9e3"}`,display:"grid",placeItems:"center",flexShrink:0}}>
                              {on&&<span style={{width:8,height:8,borderRadius:"50%",background:PERMISSION_GROUPS[p.group]?.color||"#0875dc"}}/>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="tm-modal-footer">
              <button className="tm-save" disabled={savingPerms||!!permMember.super_admin} onClick={async()=>{
                if(permMember.super_admin)return;
                setSavingPerms(true);setPermError("");
                try{
                  const r=await fetch("/api/admin/team/permissions",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profileId:permMember.id,permissions:permValues})});
                  if(!r.ok){const e=await r.json();setPermError(e.error||"فشل");return;}
                  setMembers(p=>p.map(m=>m.id===permMember.id?{...m,permissions:permValues}:m));
                  if(selected?.id===permMember.id) setSelected(p=>p?{...p,permissions:permValues}:null);
                  notify(`تم تحديث صلاحيات ${permMember.full_name}`);
                  setPermMember(null);
                }catch{setPermError("خطأ في الاتصال");}
                setSavingPerms(false);
              }}>{savingPerms?<><span style={{width:12,height:12,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/> جاري الحفظ...</>:"حفظ الصلاحيات"}</button>
              <button className="tm-cancel" onClick={()=>setPermMember(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {notice&&<div className="tm-toast"><CheckCircle size={14}/> {notice}</div>}
    </div>
  );
}

/* ── Modals ── */
function Field({label,children}:{label:string;children:React.ReactNode}){
  return <div className="tm-modal-fg"><div className="tm-modal-lbl">{label}</div>{children}</div>;
}
function Inp({value,onChange,placeholder,type,required,dir}:{value:string;onChange:(v:string)=>void;placeholder?:string;type?:string;required?:boolean;dir?:string}){
  return <input required={required} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} dir={dir} style={{...{width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",font:"inherit",fontSize:".73rem",color:"#1a2d40",background:"#fff",outline:"none",boxSizing:"border-box" as const},height:38}}/>;
}

function AddModal({onClose,onAdd}:{onClose:()=>void;onAdd:(d:{email:string;password:string;fullName:string;role:Role;phone?:string})=>Promise<void>}){
  const [f,setF]=useState({email:"",password:"",fullName:"",role:"operator" as Role,phone:""});
  const [sub,setSub]=useState(false);
  return <div className="tm-overlay" onClick={onClose}><div className="tm-modal" onClick={e=>e.stopPropagation()}>
    <div className="tm-modal-head"><h3>إضافة عضو جديد</h3><button className="tm-modal-close" onClick={onClose}><X size={15}/></button></div>
    <form className="tm-modal-body" onSubmit={async e=>{e.preventDefault();setSub(true);await onAdd(f);setSub(false);}}>
      <Field label="الاسم الكامل *"><Inp required value={f.fullName} onChange={v=>setF({...f,fullName:v})} placeholder="محمد أحمد"/></Field>
      <Field label="البريد الإلكتروني *"><Inp required type="email" value={f.email} onChange={v=>setF({...f,email:v})} placeholder="member@atmmam.com.sa" dir="ltr"/></Field>
      <Field label="كلمة المرور *"><Inp required type="password" value={f.password} onChange={v=>setF({...f,password:v})} placeholder="6 أحرف على الأقل"/></Field>
      <Field label="رقم الجوال"><Inp type="tel" value={f.phone} onChange={v=>setF({...f,phone:v})} placeholder="+966"/></Field>
      <Field label="الصلاحية">
        <select value={f.role} onChange={e=>setF({...f,role:e.target.value as Role})} style={{width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",font:"inherit",fontSize:".73rem",color:"#1a2d40",height:38,background:"#fff",outline:"none"}}>
          {(Object.keys(ROLE_LABEL) as Role[]).map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <div style={{fontSize:".58rem",color:"#8b9dad",marginTop:4}}>{ROLE_DESC[f.role]}</div>
      </Field>
      <div className="tm-modal-footer" style={{borderTop:"none",padding:0,marginTop:4}}>
        <button type="submit" className="tm-save" disabled={sub}>{sub?"جاري الإضافة...":"إضافة العضو"}</button>
        <button type="button" className="tm-cancel" onClick={onClose}>إلغاء</button>
      </div>
    </form>
  </div></div>;
}

function EditModal({member,currentUserId,onClose,onEdit}:{member:TeamMember;currentUserId:string;onClose:()=>void;onEdit:(d:{profileId:string;fullName?:string;role?:Role;active?:boolean;phone?:string})=>Promise<void>}){
  const [f,setF]=useState({fullName:member.full_name,role:member.role,active:member.active,phone:member.phone||""});
  const [sub,setSub]=useState(false);
  const isSelf=member.id===currentUserId;
  return <div className="tm-overlay" onClick={onClose}><div className="tm-modal" onClick={e=>e.stopPropagation()}>
    <div className="tm-modal-head"><h3>تعديل {member.full_name}</h3><button className="tm-modal-close" onClick={onClose}><X size={15}/></button></div>
    <form className="tm-modal-body" onSubmit={async e=>{e.preventDefault();setSub(true);await onEdit({profileId:member.id,...f});setSub(false);}}>
      <Field label="الاسم الكامل *"><Inp required value={f.fullName} onChange={v=>setF({...f,fullName:v})}/></Field>
      <Field label="رقم الجوال"><Inp type="tel" value={f.phone} onChange={v=>setF({...f,phone:v})}/></Field>
      <Field label="الصلاحية">
        <select value={f.role} onChange={e=>setF({...f,role:e.target.value as Role})} style={{width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",font:"inherit",fontSize:".73rem",color:"#1a2d40",height:38,background:"#fff",outline:"none"}}>
          {(Object.keys(ROLE_LABEL) as Role[]).map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </Field>
      {!isSelf&&<Field label="حالة العضو">
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <span onClick={()=>setF(p=>({...p,active:!p.active}))} style={{width:40,height:22,borderRadius:20,background:f.active?"#073766":"#e5eaf0",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
            <span style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,right:f.active?"calc(100% - 19px)":"3px",transition:"right .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
          </span>
          <span style={{fontSize:".7rem",fontWeight:700,color:"#1a2d40"}}>{f.active?"العضو نشط":"العضو موقوف"}</span>
        </label>
      </Field>}
      <div className="tm-modal-footer" style={{borderTop:"none",padding:0,marginTop:4}}>
        <button type="submit" className="tm-save" disabled={sub}>{sub?"جاري الحفظ...":"حفظ التغييرات"}</button>
        <button type="button" className="tm-cancel" onClick={onClose}>إلغاء</button>
      </div>
    </form>
  </div></div>;
}

function PasswordModal({member,onClose,onChange}:{member:TeamMember;onClose:()=>void;onChange:(pw:string)=>Promise<void>}){
  const [pw,setPw]=useState(""); const [c,setC]=useState(""); const [sub,setSub]=useState(false); const [err,setErr]=useState("");
  return <div className="tm-overlay" onClick={onClose}><div className="tm-modal" onClick={e=>e.stopPropagation()}>
    <div className="tm-modal-head"><h3>تغيير كلمة المرور</h3><button className="tm-modal-close" onClick={onClose}><X size={15}/></button></div>
    <form className="tm-modal-body" onSubmit={async e=>{e.preventDefault();if(pw!==c){setErr("كلمتا المرور غير متطابقتين");return;}if(pw.length<6){setErr("6 أحرف على الأقل");return;}setSub(true);await onChange(pw);setSub(false);}}>
      <p className="tm-modal-desc">تغيير كلمة مرور <strong>{member.full_name}</strong></p>
      <Field label="كلمة المرور الجديدة *"><Inp required type="password" value={pw} onChange={setPw}/></Field>
      <Field label="تأكيد كلمة المرور *"><Inp required type="password" value={c} onChange={setC}/></Field>
      {err&&<div style={{fontSize:".62rem",color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"7px 10px",marginBottom:8}}>{err}</div>}
      <div className="tm-modal-footer" style={{borderTop:"none",padding:0,marginTop:4}}>
        <button type="submit" className="tm-save" disabled={sub}>{sub?"جاري التغيير...":"تغيير كلمة المرور"}</button>
        <button type="button" className="tm-cancel" onClick={onClose}>إلغاء</button>
      </div>
    </form>
  </div></div>;
}

function InviteModal({onClose,onInvite}:{onClose:()=>void;onInvite:(email:string,role:Role)=>Promise<void>}){
  const [email,setEmail]=useState(""); const [role,setRole]=useState<Role>("operator"); const [sub,setSub]=useState(false);
  return <div className="tm-overlay" onClick={onClose}><div className="tm-modal" onClick={e=>e.stopPropagation()}>
    <div className="tm-modal-head"><h3>دعوة عضو جديد</h3><button className="tm-modal-close" onClick={onClose}><X size={15}/></button></div>
    <form className="tm-modal-body" onSubmit={async e=>{e.preventDefault();setSub(true);await onInvite(email,role);setSub(false);}}>
      <p className="tm-modal-desc">سيصل إيميل دعوة للعضو لإنشاء حسابه مباشرة.</p>
      <Field label="البريد الإلكتروني *"><Inp required type="email" value={email} onChange={setEmail} placeholder="member@atmmam.com.sa" dir="ltr"/></Field>
      <Field label="الصلاحية">
        <select value={role} onChange={e=>setRole(e.target.value as Role)} style={{width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",font:"inherit",fontSize:".73rem",color:"#1a2d40",height:38,background:"#fff",outline:"none"}}>
          {(Object.keys(ROLE_LABEL) as Role[]).map(r=><option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </Field>
      <div className="tm-modal-footer" style={{borderTop:"none",padding:0,marginTop:4}}>
        <button type="submit" className="tm-save" disabled={sub}><Mail size={13}/>{sub?"جاري الإرسال...":"إرسال الدعوة"}</button>
        <button type="button" className="tm-cancel" onClick={onClose}>إلغاء</button>
      </div>
    </form>
  </div></div>;
}

function DeleteModal({member,onClose,onDelete}:{member:TeamMember;onClose:()=>void;onDelete:()=>Promise<void>}){
  const [sub,setSub]=useState(false);
  return <div className="tm-overlay" onClick={onClose}><div className="tm-modal" onClick={e=>e.stopPropagation()}>
    <div className="tm-modal-head"><h3>حذف العضو</h3><button className="tm-modal-close" onClick={onClose}><X size={15}/></button></div>
    <div className="tm-modal-body">
      <div style={{textAlign:"center",padding:"10px 0 20px"}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:"#fef2f2",display:"grid",placeItems:"center",margin:"0 auto 12px"}}><Trash2 size={22} color="#dc2626"/></div>
        <p style={{fontSize:".75rem",color:"#1a2d40",fontWeight:700,margin:"0 0 6px"}}>هل أنت متأكد من حذف {member.full_name}؟</p>
        <p style={{fontSize:".65rem",color:"#8b9dad",margin:0}}>هذا الإجراء لا يمكن التراجع عنه.</p>
      </div>
      <div className="tm-modal-footer" style={{borderTop:"none",padding:0}}>
        <button className="tm-save danger" disabled={sub} onClick={async()=>{setSub(true);await onDelete();setSub(false);}}><Trash2 size={13}/>{sub?"جاري الحذف...":"تأكيد الحذف"}</button>
        <button className="tm-cancel" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  </div></div>;
}
