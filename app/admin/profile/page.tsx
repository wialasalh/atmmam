"use client";
import PageLoader from "@/components/page-loader";
import { useEffect, useRef, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  User, KeyRound, Shield, Save, CheckCircle, AlertCircle,
  Camera, Eye, EyeOff, LogIn, LogOut, UserPlus, UserMinus,
  UserCog, ShieldAlert, Pencil, RefreshCw,
} from "lucide-react";
import { formatAppDateTime } from "@/lib/date-format";

type Profile = { id: string; full_name: string; email?: string; phone?: string | null; role: string; avatar_url?: string | null };
type AuditLog = { id: number; action: string; created_at: string; metadata?: Record<string,unknown> | null; profiles?: { full_name?: string } | null };
type Tab = "profile" | "password" | "audit";

const AUDIT_CFG: Record<string,{label:string;color:string;bg:string;Icon:React.ComponentType<{size?:number;color?:string}>}> = {
  user_created:         { label:"إنشاء حساب",         color:"#15803d", bg:"#f0fdf4", Icon:UserPlus  },
  user_invited:         { label:"إرسال دعوة",          color:"#0875dc", bg:"#eff6ff", Icon:UserCog   },
  invitation_cancelled: { label:"إلغاء دعوة",          color:"#b45309", bg:"#fff7ed", Icon:UserCog   },
  password_changed:     { label:"تغيير كلمة المرور",   color:"#0f766e", bg:"#f0fdfa", Icon:KeyRound  },
  profile_updated:      { label:"تعديل بيانات عضو",   color:"#0875dc", bg:"#eff6ff", Icon:Pencil    },
  user_deleted:         { label:"حذف حساب",            color:"#dc2626", bg:"#fef2f2", Icon:UserMinus },
  role_changed:         { label:"تغيير الصلاحية",      color:"#b45309", bg:"#fff7ed", Icon:ShieldAlert},
  account_suspended:    { label:"إيقاف حساب",          color:"#dc2626", bg:"#fef2f2", Icon:UserMinus },
  account_activated:    { label:"تفعيل حساب",          color:"#15803d", bg:"#f0fdf4", Icon:UserPlus  },
  login:                { label:"تسجيل دخول",          color:"#0875dc", bg:"#eff6ff", Icon:LogIn     },
  logout:               { label:"تسجيل خروج",          color:"#526983", bg:"#f8fafc", Icon:LogOut    },
};
const AUDIT_DEF = { label:"حدث في النظام", color:"#526983", bg:"#f8fafc", Icon:Shield };

const FIELD: React.CSSProperties = {
  width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",
  font:"inherit",fontSize:".73rem",color:"#1a2d40",background:"#fff",outline:"none",boxSizing:"border-box",height:38,
};
const ROLE_LABEL: Record<string,string> = { admin:"مدير النظام", manager:"مدير عمليات", operator:"موظف عمليات", viewer:"مشاهد" };

export default function AdminProfilePage() {
  const { loading: authLoading } = useRoleGuard("viewer");
  const [tab,      setTab]      = useState<Tab>("profile");
  const [profile,  setProfile]  = useState<Profile|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{msg:string;type:"ok"|"err"}|null>(null);
  const [saving,   setSaving]   = useState(false);
  const [auditLogs,setAuditLogs]= useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [phone,    setPhone]    = useState("");
  const [avatar,   setAvatar]   = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);

  function notify(msg:string, type:"ok"|"err"="ok") {
    setToast({msg,type}); setTimeout(()=>setToast(null),2800);
  }

  useEffect(()=>{
    fetch("/api/auth/me").then(r=>r.json()).then(d=>{
      if(d.data){ setProfile(d.data); setFullName(d.data.full_name||""); setPhone(d.data.phone||""); setAvatar(d.data.avatar_url||null); }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  async function loadAudit(){
    setAuditLoading(true);
    const r = await fetch("/api/admin/audit?limit=60");
    const d = await r.json();
    setAuditLogs(d.data||[]);
    setAuditLoading(false);
  }

  useEffect(()=>{ if(tab==="audit") void loadAudit(); },[tab]);

  async function saveProfile(e:React.FormEvent){
    e.preventDefault(); setSaving(true);
    try {
      const r = await fetch("/api/admin/team",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({profileId:profile?.id,fullName,phone})});
      if(!r.ok){const d=await r.json();throw new Error(d.error||"فشل");}
      setProfile(p=>p?{...p,full_name:fullName,phone}:null);
      notify("تم حفظ البيانات ✓");
    } catch(e){notify(e instanceof Error?e.message:"فشل الحفظ","err");}
    setSaving(false);
  }

  async function savePassword(e:React.FormEvent){
    e.preventDefault();
    if(newPw!==confirmPw){notify("كلمتا المرور غير متطابقتين","err");return;}
    if(newPw.length<6){notify("6 أحرف على الأقل","err");return;}
    setSaving(true);
    try {
      const r = await fetch("/api/admin/team/password",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({profileId:profile?.id,newPassword:newPw})});
      if(!r.ok){const d=await r.json();throw new Error(d.error||"فشل");}
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      notify("تم تغيير كلمة المرور ✓");
    } catch(e){notify(e instanceof Error?e.message:"فشل","err");}
    setSaving(false);
  }

  async function uploadAvatar(file:File){
    setUploading(true);
    try {
      const fd=new FormData(); fd.append("file",file);
      const r=await fetch("/api/admin/team/avatar",{method:"POST",body:fd});
      if(!r.ok){const d=await r.json();throw new Error(d.error||"فشل رفع الصورة");}
      const d=await r.json(); setAvatar(d.avatar_url); setProfile(p=>p?{...p,avatar_url:d.avatar_url}:null);
      notify("تم تحديث الصورة ✓");
    } catch(e){notify(e instanceof Error?e.message:"فشل الرفع","err");}
    setUploading(false);
  }

  if(authLoading||loading) return <PageLoader text="جاري تحميل الملف الشخصي..."/>;

  const TABS: {key:Tab;label:string;Icon:React.ComponentType<{size?:number;color?:string}>}[] = [
    {key:"profile",  label:"الملف الشخصي",    Icon:User},
    {key:"password", label:"كلمة المرور",      Icon:KeyRound},
    {key:"audit",    label:"سجل الأحداث",      Icon:Shield},
  ];

  const initial = (profile?.full_name||"م").charAt(0).toUpperCase();

  return (
    <div dir="rtl" style={{height:"calc(100vh - 60px)",display:"grid",gridTemplateRows:"auto 1fr",background:"#f4f7fb",overflow:"hidden"}}>
      <style>{`
        .pf-head{padding:18px 24px 0;background:linear-gradient(180deg,#fff,#f8fbff);border-bottom:1px solid #dfe8f1}
        .pf-eyebrow{margin:0 0 3px;color:#0f766e;font-size:.63rem;font-weight:900;letter-spacing:.04em}
        .pf-h1{margin:0 0 12px;font-size:1.4rem;font-weight:900;color:#073766;line-height:1}
        .pf-tabs{display:flex;gap:2px;border-top:1px solid #f0f4f8}
        .pf-tab{display:flex;align-items:center;gap:8px;padding:12px 20px;border:none;background:none;font:inherit;font-size:.7rem;font-weight:700;color:#7f8e9f;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;white-space:nowrap}
        .pf-tab:hover{color:#073766}
        .pf-tab.active{color:#073766;border-bottom-color:#073766}
        .pf-body{overflow-y:auto;padding:28px 24px}
        .pf-card{background:#fff;border:1px solid #dfe8f1;border-radius:16px;width:100%;max-width:680px;margin:0 auto}
        .pf-card-head{padding:14px 20px;border-bottom:1px solid #f0f4f8;font-size:.78rem;font-weight:800;color:#0b1e36;display:flex;align-items:center;gap:8px}
        .pf-card-body{padding:20px}
        .pf-fg{margin-bottom:14px}
        .pf-lbl{font-size:.6rem;font-weight:700;color:#425c76;margin-bottom:4px}
        .pf-save{height:38px;border:0;border-radius:9px;background:#073766;color:#fff;font:inherit;font-size:.68rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;padding:0 20px;transition:all .12s}
        .pf-save:hover{background:#0a4a8a}
        .pf-save:disabled{background:#c5d2de;cursor:not-allowed}
        /* Avatar */
        .pf-avatar-wrap{display:flex;align-items:center;gap:20px;margin-bottom:20px}
        .pf-avatar{width:72px;height:72px;border-radius:50%;background:#dbeafe;color:#073766;display:grid;place-items:center;font-size:1.6rem;font-weight:900;flex-shrink:0;position:relative;overflow:hidden;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.1)}
        .pf-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .pf-avatar-btn{border:1px solid #dfe8f1;border-radius:9px;background:#f4f7fb;color:#526983;font:inherit;font-size:.63rem;font-weight:700;cursor:pointer;padding:7px 14px;display:inline-flex;align-items:center;gap:6px;transition:all .12s}
        .pf-avatar-btn:hover{background:#e8f0fa;border-color:#c5d8ef}
        /* Audit */
        .pf-audit-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #f5f7fa}
        .pf-audit-item:last-child{border-bottom:none}
        .pf-audit-ico{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
        /* Toast */
        .pf-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:12px;font-size:.7rem;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:1000;animation:pfUp .2s;white-space:nowrap}
        .pf-toast.ok{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
        .pf-toast.err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}
        @keyframes pfUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div className="pf-head">
        <p className="pf-eyebrow">حسابي</p>
        <h1 className="pf-h1">الملف الشخصي</h1>
        <div className="pf-tabs">
          {TABS.map(t=>(
            <button key={t.key} className={`pf-tab${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>
              <t.Icon size={14}/> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="pf-body">

        {/* ── Profile ── */}
        {tab==="profile"&&(
          <div className="pf-card">
            <div className="pf-card-head"><User size={15} color="#0875dc"/> البيانات الشخصية</div>
            <div className="pf-card-body">
              {/* Avatar */}
              <div className="pf-avatar-wrap">
                <div className="pf-avatar">
                  {avatar&&<img src={avatar} alt="" onError={e=>(e.currentTarget.style.display="none")}/>}
                  {initial}
                </div>
                <div>
                  <div style={{fontSize:".75rem",fontWeight:800,color:"#1a2d40",marginBottom:3}}>{profile?.full_name}</div>
                  <div style={{fontSize:".63rem",color:"#8b9dad",marginBottom:10}}>{ROLE_LABEL[profile?.role||""]||profile?.role}</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files?.[0]; if(f) void uploadAvatar(f); }}/>
                  <button className="pf-avatar-btn" onClick={()=>fileRef.current?.click()} disabled={uploading}>
                    {uploading?<><span style={{width:12,height:12,border:"2px solid rgba(0,0,0,.2)",borderTopColor:"#073766",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/> جاري الرفع...</>:<><Camera size={13}/> تغيير الصورة</>}
                  </button>
                </div>
              </div>

              <form onSubmit={saveProfile}>
                <div className="pf-fg"><div className="pf-lbl">الاسم الكامل *</div>
                  <input value={fullName} onChange={e=>setFullName(e.target.value)} required style={FIELD}/>
                </div>
                <div className="pf-fg"><div className="pf-lbl">البريد الإلكتروني</div>
                  <input value={profile?.email||""} readOnly style={{...FIELD,background:"#f8fafc",color:"#8b9dad",cursor:"not-allowed"}} dir="ltr"/>
                  <div style={{fontSize:".58rem",color:"#a0adb8",marginTop:4}}>البريد الإلكتروني لا يمكن تغييره من هنا</div>
                </div>
                <div className="pf-fg"><div className="pf-lbl">رقم الجوال</div>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" style={FIELD}/>
                </div>
                <button type="submit" className="pf-save" disabled={saving}>
                  {saving?<><span style={{width:12,height:12,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/> جاري الحفظ...</>:<><Save size={13}/> حفظ التغييرات</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Password ── */}
        {tab==="password"&&(
          <div className="pf-card">
            <div className="pf-card-head"><KeyRound size={15} color="#0875dc"/> تغيير كلمة المرور</div>
            <div className="pf-card-body">
              <div style={{background:"#f8fafc",border:"1px solid #e4ebf2",borderRadius:10,padding:"10px 14px",marginBottom:18,fontSize:".63rem",color:"#526983",lineHeight:1.6}}>
                اختر كلمة مرور قوية تتضمن أحرفاً كبيرة وصغيرة وأرقاماً ورموزاً. الحد الأدنى 6 أحرف.
              </div>
              <form onSubmit={savePassword}>
                <div className="pf-fg"><div className="pf-lbl">كلمة المرور الجديدة *</div>
                  <div style={{position:"relative"}}>
                    <input value={newPw} onChange={e=>setNewPw(e.target.value)} type={showPw?"text":"password"} required minLength={6} style={{...FIELD,paddingLeft:36}}/>
                    <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",color:"#8b9dad",display:"grid",placeItems:"center"}}>
                      {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                  {newPw&&(
                    <div style={{display:"flex",gap:6,marginTop:6}}>
                      {[{label:"6+",ok:newPw.length>=6},{label:"A-Z",ok:/[A-Z]/.test(newPw)},{label:"0-9",ok:/[0-9]/.test(newPw)},{label:"!@#",ok:/[^A-Za-z0-9]/.test(newPw)}].map(c=>(
                        <span key={c.label} style={{fontSize:".56rem",fontWeight:800,padding:"2px 7px",borderRadius:5,background:c.ok?"#f0fdf4":"#f3f4f6",color:c.ok?"#15803d":"#9ca3af"}}>{c.label} {c.ok?"✓":"○"}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="pf-fg"><div className="pf-lbl">تأكيد كلمة المرور *</div>
                  <input value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} type={showPw?"text":"password"} required style={{...FIELD,borderColor:confirmPw&&confirmPw!==newPw?"#dc2626":"#dfe8f1"}}/>
                  {confirmPw&&confirmPw!==newPw&&<div style={{fontSize:".6rem",color:"#dc2626",marginTop:4}}>كلمتا المرور غير متطابقتين</div>}
                </div>
                <button type="submit" className="pf-save" disabled={saving||!newPw||newPw!==confirmPw}>
                  {saving?<><span style={{width:12,height:12,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",display:"inline-block"}}/> جاري التغيير...</>:<><KeyRound size={13}/> تغيير كلمة المرور</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Audit ── */}
        {tab==="audit"&&(
          <div className="pf-card">
            <div className="pf-card-head">
              <Shield size={15} color="#0875dc"/> سجل الأحداث
              <button onClick={()=>void loadAudit()} style={{marginRight:"auto",border:"1px solid #dfe8f1",borderRadius:7,background:"#f4f7fb",color:"#526983",font:"inherit",fontSize:".6rem",fontWeight:700,cursor:"pointer",padding:"4px 10px",display:"inline-flex",alignItems:"center",gap:5}}>
                <RefreshCw size={11}/> تحديث
              </button>
            </div>
            <div className="pf-card-body" style={{padding:0}}>
              {auditLoading?(
                <div style={{textAlign:"center",padding:"30px 0",color:"#a0adb8",fontSize:".65rem"}}>جاري التحميل...</div>
              ):auditLogs.length===0?(
                <div style={{textAlign:"center",padding:"30px 0",color:"#a0adb8",fontSize:".65rem"}}>لا أحداث مسجلة</div>
              ):(
                <div style={{maxHeight:"calc(100vh - 280px)",overflowY:"auto",padding:"6px 16px"}}>
                  {auditLogs.map((log,i)=>{
                    const cfg=AUDIT_CFG[log.action]||AUDIT_DEF;
                    const actor = log.profiles?.full_name||"النظام";
                    const meta = log.metadata as Record<string,unknown>|null;
                    const details = [meta?.full_name&&`العضو: ${meta.full_name}`,meta?.email&&`البريد: ${meta.email}`,meta?.role&&`الصلاحية: ${meta.role}`].filter(Boolean).join(" · ");
                    return (
                      <div key={log.id||i} className="pf-audit-item">
                        <div className="pf-audit-ico" style={{background:cfg.bg}}><cfg.Icon size={14} color={cfg.color}/></div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                            <span style={{fontSize:".68rem",fontWeight:800,color:"#1a2d40"}}>{cfg.label}</span>
                            <span style={{fontSize:".58rem",color:"#8b9dad"}}>بواسطة {actor}</span>
                          </div>
                          {details&&<div style={{fontSize:".6rem",color:"#7f8e9f",marginBottom:2}}>{details}</div>}
                          <div style={{fontSize:".56rem",color:"#aab5c3"}}>{formatAppDateTime(log.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {toast&&(
        <div className={`pf-toast ${toast.type}`}>
          {toast.type==="ok"?<CheckCircle size={14}/>:<AlertCircle size={14}/>}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
