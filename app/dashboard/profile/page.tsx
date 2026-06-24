"use client";
import { useEffect, useState, useRef } from "react";
import { User, Save, Building2, Camera } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Profile = { id:string; full_name:string; email:string; phone:string; avatar_url?:string };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile|null>(null);
  const [form, setForm] = useState({ full_name:"", phone:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setProfile({ id:data.id, full_name:data.full_name||"", email:user.email||"", phone:data.phone||"" });
          setForm({ full_name:data.full_name||"", phone:data.phone||"" });
        }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { setMsg("⚠️ الملف كبير جداً. الحد الأقصى 2MB"); setTimeout(() => setMsg(""), 3000); return; }
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", profile.id);
      const res = await fetch("/api/account/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setMsg("❌ " + (data.error || "فشل رفع الصورة")); }
      else {
        setProfile(p => p ? { ...p, avatar_url: data.url } : p);
        setMsg("✅ تم تغيير الصورة");
      }
    } catch { setMsg("❌ حدث خطأ في الاتصال"); }
    setAvatarUploading(false);
    setTimeout(() => setMsg(""), 3000);
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
          <div onClick={() => fileRef.current?.click()} style={{width:56,height:56,borderRadius:16,background:"#073766",display:"grid",placeItems:"center",flexShrink:0,cursor:"pointer",position:"relative",overflow:"hidden"}}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} />
            ) : (
              <span style={{fontSize:"1.4rem",fontWeight:800,color:"#fff"}}>{profile.full_name?.charAt(0)||"؟"}</span>
            )}
            {avatarUploading && <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",display:"grid",placeItems:"center"}}><div style={{width:16,height:16,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%",animation:"spin .6s linear infinite"}} /></div>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:".9rem",color:"#073766"}}>{profile.full_name}</div>
            <div style={{fontSize:".72rem",color:"#8b9dad",marginTop:2}}>{profile.email}</div>
            <button onClick={() => fileRef.current?.click()} style={{background:"none",border:"none",color:"#0875dc",fontSize:".6rem",cursor:"pointer",padding:0,marginTop:4,display:"inline-flex",alignItems:"center",gap:4}}>
              <Camera size={11}/> تغيير الصورة
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:"none"}} />
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
    </div>
  );
}
