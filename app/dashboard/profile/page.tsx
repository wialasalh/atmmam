"use client";
import { useEffect, useState, useRef } from "react";
import { User, Save, Building2, Camera, Lock, Eye, EyeOff } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Profile = { id:string; full_name:string; email:string; phone:string; avatar_url?:string|null; };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile|null>(null);
  const [form, setForm] = useState({ full_name:"", phone:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pwForm, setPwForm] = useState({ current:"", new:"", confirm:"" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setProfile({ id:data.id, full_name:data.full_name||"", email:user.email||"", phone:data.phone||"", avatar_url:data.avatar_url });
          setForm({ full_name:data.full_name||"", phone:data.phone||"" });
        }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      if (res.ok) {
        const { avatar_url } = await res.json();
        setProfile(p => p ? {...p, avatar_url} : p);
      } else {
        setMsg("تعذّر رفع الصورة، حاول مجدداً");
      }
    } catch { setMsg("تعذّر الاتصال بالخادم"); }
    setUploading(false);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", profile.id);
      if (error) { setMsg("حدث خطأ: " + error.message); }
      else { setMsg("✅ تم حفظ التغييرات"); setProfile(p => p ? {...p, ...form} : p); }
    } catch { setMsg("حدث خطأ غير متوقع"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  if (loading) return <div className="client-dash-page"><div style={{textAlign:"center",padding:60,color:"#8b9dad"}}>جاري التحميل...</div></div>;

  return (
    <div className="client-dash-page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 className="client-dash-page-title" style={{marginBottom:2}}>الملف الشخصي</h2>
          <p className="client-dash-page-desc" style={{margin:0}}>بياناتك الشخصية لدى أتمم.</p>
        </div>
        <a href="/dashboard/companies" style={{display:"flex",alignItems:"center",gap:6,fontSize:".72rem",color:"#0875dc",textDecoration:"none",background:"#eaf4ff",padding:"8px 14px",borderRadius:8,fontWeight:600}}>
          <Building2 size={14}/> إدارة المنشآت
        </a>
      </div>

      {profile && (
        <div style={{display:"flex",alignItems:"center",gap:14,background:"#fff",border:"1px solid #e5ecf3",borderRadius:16,padding:"20px",marginBottom:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{position:"relative",width:56,height:56,flexShrink:0}}>
            <div style={{width:56,height:56,borderRadius:16,background:"#073766",display:"grid",placeItems:"center",overflow:"hidden"}}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
              ) : (
                <span style={{fontSize:"1.4rem",fontWeight:800,color:"#fff"}}>{profile.full_name?.charAt(0)||"؟"}</span>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{position:"absolute",bottom:-4,right:-4,width:26,height:26,borderRadius:"50%",border:"2px solid #fff",background:"#0875dc",color:"#fff",display:"grid",placeItems:"center",cursor:"pointer",padding:0}}>
              <Camera size={12} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarUpload} />
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:".9rem",color:"#073766"}}>{profile.full_name}</div>
            <div style={{fontSize:".72rem",color:"#8b9dad",marginTop:2}}>{profile.email}</div>
          </div>
        </div>
      )}

      <div style={{background:"#fff",border:"1px solid #e5ecf3",borderRadius:16,padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
        <h3 style={{margin:"0 0 16px",fontSize:".82rem",color:"#073766",display:"flex",alignItems:"center",gap:8}}><User size={16}/> المعلومات الأساسية</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div>
            <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>الاسم الكامل</label>
            <input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))}
              style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#344d69",boxSizing:"border-box",outline:"none"}}/>
          </div>
          <div>
            <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>البريد الإلكتروني</label>
            <input value={profile?.email||""} disabled
              style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#8b9dad",boxSizing:"border-box",background:"#f9fafb"}}/>
          </div>
          <div>
            <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>رقم الجوال</label>
            <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="05XXXXXXXX"
              style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#344d69",boxSizing:"border-box",outline:"none"}}/>
          </div>
        </div>

        {msg && <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:msg.startsWith("✅")?"#f0fdf4":"#fef2f2",color:msg.startsWith("✅")?"#15803d":"#dc2626",fontSize:".72rem",fontWeight:600}}>{msg}</div>}

        <div style={{marginTop:16,display:"flex",justifyContent:"flex-start"}}>
          <button onClick={handleSave} disabled={saving} className="client-dash-primary-btn" style={{gap:6}}>
            <Save size={14}/> {saving?"جاري الحفظ...":"حفظ التغييرات"}
          </button>
        </div>
      </div>

      {/* Password change */}
      <div style={{background:"#fff",border:"1px solid #e5ecf3",borderRadius:16,padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,.04)",marginTop:16}}>
        <h3 style={{margin:"0 0 16px",fontSize:".82rem",color:"#073766",display:"flex",alignItems:"center",gap:8}}><Lock size={16}/> تغيير كلمة المرور</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{position:"relative"}}>
            <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>كلمة المرور الحالية</label>
            <input type={showPw?"text":"password"} value={pwForm.current} onChange={e=>setPwForm(f=>({...f,current:e.target.value}))}
              style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#344d69",boxSizing:"border-box",outline:"none"}}/>
          </div>
          <div style={{position:"relative"}}>
            <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>كلمة المرور الجديدة</label>
            <input type={showPw?"text":"password"} value={pwForm.new} onChange={e=>setPwForm(f=>({...f,new:e.target.value}))}
              style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#344d69",boxSizing:"border-box",outline:"none"}}/>
          </div>
          <div>
            <label style={{fontSize:".68rem",color:"#8b9dad",fontWeight:600,display:"block",marginBottom:4}}>تأكيد كلمة المرور الجديدة</label>
            <input type={showPw?"text":"password"} value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))}
              style={{width:"100%",border:"1px solid #e5eaf0",borderRadius:10,padding:"10px 14px",font:"inherit",fontSize:".75rem",color:"#344d69",boxSizing:"border-box",outline:"none"}}/>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button onClick={()=>setShowPw(p=>!p)} style={{height:40,padding:"0 14px",border:"1px solid #e5eaf0",borderRadius:10,background:"#fafbfc",color:"#8b9dad",cursor:"pointer",display:"flex",alignItems:"center",gap:6,font:"inherit",fontSize:".65rem"}}>
              {showPw ? <EyeOff size={14}/> : <Eye size={14}/>} {showPw?"إخفاء":"إظهار"}
            </button>
          </div>
        </div>
        <div style={{fontSize:".6rem",color:"#aab5c3",marginTop:8}}>يجب أن تحتوي كلمة المرور الجديدة على 6 أحرف على الأقل.</div>

        {pwMsg && <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:pwMsg.includes("✅")?"#f0fdf4":"#fef2f2",color:pwMsg.includes("✅")?"#15803d":"#dc2626",fontSize:".72rem",fontWeight:600}}>{pwMsg}</div>}

        <div style={{marginTop:16,display:"flex",justifyContent:"flex-start"}}>
          <button onClick={handlePasswordChange} disabled={pwSaving}
            style={{display:"flex",alignItems:"center",gap:6,height:40,padding:"0 18px",border:0,borderRadius:10,background:pwSaving||!pwForm.current||!pwForm.new||!pwForm.confirm?"#e5eaf0":"#073766",color:pwSaving||!pwForm.current||!pwForm.new||!pwForm.confirm?"#aab5c3":"#fff",cursor:pwSaving||!pwForm.current||!pwForm.new||!pwForm.confirm?"not-allowed":"pointer",font:"inherit",fontSize:".7rem",fontWeight:700}}>
            <Lock size={14}/> {pwSaving?"جاري التغيير...":"تغيير كلمة المرور"}
          </button>
        </div>
      </div>
    </div>
  );

  async function handlePasswordChange() {
    if (pwForm.new.length < 6) { setPwMsg("❌ كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"); return; }
    if (pwForm.new !== pwForm.confirm) { setPwMsg("❌ كلمة المرور الجديدة وتأكيدها غير متطابقين"); return; }
    setPwSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile!.email,
        password: pwForm.current,
      });
      if (signInError) { setPwMsg("❌ كلمة المرور الحالية غير صحيحة"); setPwSaving(false); return; }

      const { error } = await supabase.auth.updateUser({ password: pwForm.new });
      if (error) { setPwMsg("❌ " + error.message); }
      else {
        setPwMsg("✅ تم تغيير كلمة المرور بنجاح");
        setPwForm({ current:"", new:"", confirm:"" });
      }
    } catch { setPwMsg("❌ حدث خطأ غير متوقع"); }
    setPwSaving(false);
    setTimeout(() => setPwMsg(""), 4000);
  }
}
