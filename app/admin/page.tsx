"use client";
import PageLoader from "@/components/page-loader";
import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import {
  ClipboardList, Zap, Clock, Ticket, AlertTriangle, CheckCircle,
  BarChart3, Users, Star, SlidersHorizontal, FileText, UserPlus,
  TrendingUp, RefreshCw, ArrowLeft, Megaphone, Shield,
  CircleDollarSign, Receipt, Package, Settings,
} from "lucide-react";

function getTodayArabic() {
  const days=["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const months=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const n=new Date();
  return `${days[n.getDay()]}، ${n.getDate()} ${months[n.getMonth()]} ${n.getFullYear()}`;
}
function getGreeting() {
  const h=new Date().getHours();
  return h<12?"صباح الخير":h<17?"مساء الخير":"مساء النور";
}

type StaffRating = { staff_id:string; avg_rating:number; total_ratings:number; positive:number; negative:number; resolved_tickets:number; staff_name?:string };

const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  "new":                {label:"جديد",             color:"#0875dc",bg:"#eff6ff"},
  "جديد":               {label:"جديد",             color:"#0875dc",bg:"#eff6ff"},
  "in_progress":        {label:"قيد التنفيذ",      color:"#b45309",bg:"#fff7ed"},
  "قيد التنفيذ":        {label:"قيد التنفيذ",      color:"#b45309",bg:"#fff7ed"},
  "waiting_documents":  {label:"بانتظار مستندات",  color:"#b45309",bg:"#fff7ed"},
  "بانتظار المستندات":  {label:"بانتظار مستندات",  color:"#b45309",bg:"#fff7ed"},
  "completed":          {label:"مكتمل",            color:"#15803d",bg:"#f0fdf4"},
  "مكتمل":              {label:"مكتمل",            color:"#15803d",bg:"#f0fdf4"},
  "cancelled":          {label:"ملغي",             color:"#526983",bg:"#f3f4f6"},
  "ملغي":               {label:"ملغي",             color:"#526983",bg:"#f3f4f6"},
  "جديدة":              {label:"جديدة",            color:"#0875dc",bg:"#eff6ff"},
  "قيد المراجعة":       {label:"قيد المراجعة",    color:"#b45309",bg:"#fff7ed"},
  "بانتظار العميل":     {label:"بانتظار العميل",  color:"#0f766e",bg:"#f0fdfa"},
  "تم الحل":            {label:"تم الحل",          color:"#15803d",bg:"#f0fdf4"},
  "مغلقة":              {label:"مغلقة",            color:"#526983",bg:"#f3f4f6"},
};

export default function AdminDashboardPage() {
  const { role, userName, userAvatar, loading } = useRoleGuard("viewer");
  const isAdmin = role === "admin";
  const isStaff = ["admin","manager","operator"].includes(role||"");
  const [data,    setData]    = useState<any>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(()=>{
    async function load(){
      const [ordersRes, ticketsRes, notifRes, ratingsRes, teamRes] = await Promise.all([
        fetch("/api/admin/orders").then(r=>r.ok?r.json():{data:[]}),
        fetch("/api/admin/tickets").then(r=>r.ok?r.json():{data:[]}),
        fetch("/api/admin/notifications").then(r=>r.ok?r.json():{}),
        isAdmin ? fetch("/api/admin/team/ratings").then(r=>r.ok?r.json():{data:[]}) : Promise.resolve({data:[]}),
        isAdmin ? fetch("/api/admin/team").then(r=>r.ok?r.json():null) : Promise.resolve(null),
      ]);

      const orders: any[] = ordersRes?.data||[];
      const tickets: any[] = ticketsRes?.data||[];
      const notif: any = notifRes||{};
      const ratings: StaffRating[] = ratingsRes?.data||[];
      const teamMembers: any[] = teamRes?.members||[];
      const nameMap: Record<string,string> = {};
      for(const m of teamMembers) if(m.id) nameMap[m.id]=m.full_name||"";

      const ordStats = {
        total: orders.length,
        new: orders.filter((o:any)=>["new","جديد"].includes(o.status)).length,
        active: orders.filter((o:any)=>["in_progress","قيد التنفيذ"].includes(o.status)).length,
        waiting: orders.filter((o:any)=>["waiting_documents","بانتظار المستندات"].includes(o.status)).length,
        done: orders.filter((o:any)=>["completed","مكتمل"].includes(o.status)).length,
        cancelled: orders.filter((o:any)=>["cancelled","ملغي"].includes(o.status)).length,
      };

      const tktStats = {
        open: tickets.filter((t:any)=>!["مغلقة","closed"].includes(t.status)).length,
        urgent: tickets.filter((t:any)=>t.priority==="عاجلة"&&!["مغلقة","closed"].includes(t.status)).length,
        resolved: tickets.filter((t:any)=>["تم الحل","مغلقة"].includes(t.status)).length,
      };

      const avgRating = ratings.length ? (ratings.reduce((a:number,r:StaffRating)=>a+r.avg_rating,0)/ratings.length).toFixed(1) : null;

      setData({
        ordStats, tktStats, avgRating,
        recentOrders: orders.slice(0,5),
        openTickets: tickets.filter((t:any)=>!["مغلقة","closed"].includes(t.status)).slice(0,5),
        urgentItems: notif.urgent||[],
        overdueTasks: notif.overdue||0,
        ratings: ratings.map((r:StaffRating)=>({...r,staff_name:nameMap[r.staff_id]||""})),
        teamCount: teamMembers.length,
        expiredRegs: notif.expiredRegs||[],
        soonRegs: notif.soonRegs||[],
        activeCount: teamMembers.filter((m:any)=>m.active).length,
      });
    }
    void load();
  },[isAdmin, refresh]);

  if(loading||!data) return <PageLoader text="جاري تحميل لوحة التحكم..."/>;

  const { ordStats, tktStats, avgRating, recentOrders, openTickets, urgentItems, overdueTasks, ratings, teamCount, expiredRegs, soonRegs, activeCount } = data;
  const donePct = ordStats.total>0 ? Math.round(ordStats.done/ordStats.total*100) : 0;
  const initial = (userName||"م").charAt(0).toUpperCase();

  if(role==="viewer") return (
    <div dir="rtl" style={{padding:"32px 24px"}}>
      <div style={{background:"#f0f7ff",border:"1px solid #bddcff",borderRadius:14,padding:28,maxWidth:480}}>
        <h2 style={{margin:"0 0 8px",color:"#073766",fontSize:"1rem"}}>مرحباً في لوحة التحكم</h2>
        <p style={{margin:"0 0 16px",color:"#526983",fontSize:".8rem",lineHeight:1.7}}>صلاحيتك تتيح لك عرض التقارير فقط.</p>
        <a href="/admin/reports" style={{display:"inline-flex",alignItems:"center",gap:7,height:36,padding:"0 16px",borderRadius:9,background:"#073766",color:"#fff",textDecoration:"none",fontSize:".68rem",fontWeight:700}}>
          <BarChart3 size={14}/> فتح التقارير
        </a>
      </div>
    </div>
  );

  return (
    <div className="db-shell" dir="rtl">
      <style>{`
        .db-shell{min-height:calc(100vh - 60px);background:#f4f7fb;padding:0;overflow-y:auto}
        /* Header */
        .db-head{padding:20px 24px 18px;background:linear-gradient(135deg,#073766 0%,#0a4a8a 100%);color:#fff;position:relative;overflow:hidden}
        .db-head::after{content:"";position:absolute;top:-60px;left:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.04)}
        .db-head::before{content:"";position:absolute;bottom:-40px;right:20%;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.03)}
        .db-head-row{display:flex;align-items:center;justify-content:space-between;gap:16px;position:relative;z-index:1}
        .db-head-left{display:flex;align-items:center;gap:14px}
        .db-avatar{width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,.3);display:grid;place-items:center;font-size:1.1rem;font-weight:900;flex-shrink:0;background:rgba(255,255,255,.15);overflow:hidden;position:relative}
        .db-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%}
        .db-date{font-size:.6rem;color:rgba(255,255,255,.6);margin:0 0 2px}
        .db-greeting{font-size:1.25rem;font-weight:900;margin:0 0 2px;line-height:1.2;color:#fff}
        .db-sub{font-size:.65rem;color:rgba(255,255,255,.65);margin:0}
        .db-head-acts{display:flex;gap:8px;position:relative;z-index:1}
        .db-head-btn{height:34px;border:1px solid rgba(255,255,255,.25);border-radius:9px;background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:.62rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0 12px;text-decoration:none;transition:all .15s}
        .db-head-btn:hover{background:rgba(255,255,255,.2)}
        .db-head-btn.primary{background:#fff;color:#073766;border-color:#fff}
        .db-head-btn.primary:hover{background:#f0f7ff}
        /* Content */
        .db-content{padding:20px 24px 32px}
        /* KPIs */
        .db-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
        .db-kpi{background:#fff;border:1px solid #dfe8f1;border-radius:13px;padding:14px 16px;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden;transition:all .15s}
        .db-kpi:hover{border-color:#bddcff;box-shadow:0 4px 16px rgba(8,117,220,.08)}
        .db-kpi-ico{width:42px;height:42px;border-radius:11px;display:grid;place-items:center;flex-shrink:0}
        .db-kpi small{display:block;font-size:.57rem;color:#8190a1;font-weight:800;margin-bottom:3px}
        .db-kpi strong{display:block;font-size:1.6rem;font-weight:900;line-height:1}
        .db-kpi-trend{position:absolute;bottom:10px;left:14px;font-size:.55rem;font-weight:700}
        /* Grid */
        .db-grid{display:grid;grid-template-columns:1fr 340px;gap:16px}
        /* Panel */
        .db-panel{background:#fff;border:1px solid #dfe8f1;border-radius:14px;overflow:hidden;margin-bottom:14px}
        .db-panel:last-child{margin-bottom:0}
        .db-panel-head{padding:12px 16px;border-bottom:1px solid #f0f4f8;display:flex;align-items:center;justify-content:space-between}
        .db-panel-title{font-size:.75rem;font-weight:800;color:#0b1e36;display:flex;align-items:center;gap:7px}
        .db-panel-link{font-size:.6rem;color:#0875dc;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
        .db-panel-link:hover{text-decoration:underline}
        /* Table */
        .db-table{width:100%;border-collapse:collapse;font-size:.65rem}
        .db-table th{text-align:right;font-size:.58rem;color:#8190a1;font-weight:700;padding:8px 14px;border-bottom:1px solid #f0f4f8;white-space:nowrap}
        .db-table td{padding:9px 14px;color:#1a2d40;border-bottom:1px solid #f8fafc}
        .db-table tr:last-child td{border-bottom:none}
        .db-table tr:hover td{background:#fafcff}
        .db-badge{font-size:.55rem;font-weight:800;padding:2px 8px;border-radius:20px;white-space:nowrap}
        .db-code{font-family:inherit;background:#f0f4f8;padding:2px 6px;border-radius:5px;font-size:.58rem;color:#073766;font-weight:700}
        /* Quick actions */
        .db-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
        .db-qa{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border:1px solid #dfe8f1;border-radius:12px;text-decoration:none;transition:all .14s;color:#1a2d40}
        .db-qa:hover{border-color:#bddcff;background:#f8fbff;box-shadow:0 4px 12px rgba(8,117,220,.08)}
        .db-qa-ico{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
        .db-qa-lbl{font-size:.66rem;font-weight:800;color:#1a2d40;margin-bottom:2px}
        .db-qa-sub{font-size:.55rem;color:#8b9dad}
        /* Pipeline */
        .db-pipe-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f8fafc}
        .db-pipe-row:last-child{border-bottom:none}
        .db-pipe-track{flex:1;height:6px;background:#f0f4f8;border-radius:4px;overflow:hidden}
        .db-pipe-fill{height:100%;border-radius:4px;transition:width .5s}
        /* Urgent */
        .db-urgent{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #fef2f2}
        .db-urgent:last-child{border-bottom:none}
        /* Staff ratings mini */
        .db-staff-row{display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid #f8fafc}
        .db-staff-row:last-child{border-bottom:none}
        .db-staff-av{width:30px;height:30px;border-radius:50%;background:#dbeafe;color:#073766;display:grid;place-items:center;font-size:.65rem;font-weight:800;flex-shrink:0}
        /* Alert strip */
        .db-alert{padding:8px 16px;display:flex;align-items:center;gap:10px;font-size:.63rem;font-weight:700}
        .db-alert a{font-size:.58rem;font-weight:800;padding:2px 8px;border-radius:5px;text-decoration:none;margin-right:auto;flex-shrink:0}
        /* Ring */
        .db-ring-card{background:#fff;border:1px solid #dfe8f1;border-radius:13px;padding:16px;margin-bottom:14px;display:flex;align-items:center;gap:16px}
        /* Empty */
        .db-empty{text-align:center;padding:20px;color:#c4cdd6;font-size:.65rem}
        /* Perm card */
        .db-perm{background:linear-gradient(135deg,#073766,#0a4a8a);border-radius:14px;padding:16px;margin-bottom:14px;color:#fff}
        .db-perm h3{margin:0 0 6px;font-size:.8rem;font-weight:800}
        .db-perm p{margin:0 0 12px;font-size:.63rem;color:rgba(255,255,255,.75);line-height:1.6}
        .db-perm a{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:8px;background:#fff;color:#073766;text-decoration:none;font-size:.63rem;font-weight:800;transition:all .12s}
        .db-perm a:hover{background:#f0f7ff}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="db-head">
        <div className="db-head-row">
          <div className="db-head-left">
            <div className="db-avatar">
              {userAvatar&&<img src={userAvatar} alt="" onError={e=>(e.currentTarget.style.display="none")}/>}
              {initial}
            </div>
            <div>
              <p className="db-date">{getTodayArabic()}</p>
              <h1 className="db-greeting">{getGreeting()}، {userName||"مدير النظام"} 👋</h1>
              <p className="db-sub">ملخص الأداء والمؤشرات الرئيسية للمنصة</p>
            </div>
          </div>
          <div className="db-head-acts">
            <button className="db-head-btn" onClick={()=>setRefresh(r=>r+1)}><RefreshCw size={13}/> تحديث</button>
            <a href="/admin/reports" className="db-head-btn"><BarChart3 size={13}/> التقارير</a>
            <a href="/admin/orders" className="db-head-btn primary"><ClipboardList size={13}/> طلب جديد</a>
          </div>
        </div>
      </div>

      <div className="db-content">
        {/* ══ KPIs ══ */}
        <div className="db-kpis">
          {[
            {label:"إجمالي الطلبات",   val:ordStats.total,      color:"#0875dc",bg:"#eff6ff",  Icon:ClipboardList,   trend:ordStats.new>0?`${ordStats.new} جديد`:null},
            {label:"قيد التنفيذ",      val:ordStats.active,     color:"#b45309",bg:"#fff7ed",  Icon:Zap,             trend:null},
            {label:"تذاكر مفتوحة",     val:tktStats.open,       color:"#0f766e",bg:"#f0fdfa",  Icon:Ticket,          trend:tktStats.urgent>0?`${tktStats.urgent} عاجلة`:null},
            {label:"مهام متأخرة",      val:overdueTasks,        color:"#dc2626",bg:"#fef2f2",  Icon:AlertTriangle,   trend:null},
            {label:"معدل الإنجاز",     val:`${donePct}%`,       color:"#15803d",bg:"#f0fdf4",  Icon:TrendingUp,      trend:null},
            {label:"بانتظار مستندات",  val:ordStats.waiting,    color:"#b45309",bg:"#fff7ed",  Icon:Clock,           trend:null},
            {label:"أعضاء الفريق",     val:teamCount||"—",      color:"#073766",bg:"#eaf4ff",  Icon:Users,           trend:activeCount?`${activeCount} نشط`:null},
            {label:"متوسط التقييم",    val:avgRating||"—",      color:"#b45309",bg:"#fefce8",  Icon:Star,            trend:null},
          ].map(k=>(
            <div key={k.label} className="db-kpi">
              <div className="db-kpi-ico" style={{background:k.bg}}><k.Icon size={18} color={k.color}/></div>
              <div>
                <small>{k.label}</small>
                <strong style={{color:k.color}}>{k.val}</strong>
              </div>
              {k.trend&&<span className="db-kpi-trend" style={{color:k.color,background:k.bg,padding:"1px 6px",borderRadius:5}}>{k.trend}</span>}
            </div>
          ))}
        </div>

        {/* ══ GRID ══ */}
        <div className="db-grid">

          {/* ── LEFT ── */}
          <div>
            {/* Urgent alerts */}
            {(urgentItems.length>0||expiredRegs.length>0||soonRegs.length>0)&&(
              <div className="db-panel" style={{marginBottom:14}}>
                <div className="db-panel-head">
                  <span className="db-panel-title"><AlertTriangle size={14} color="#dc2626"/> تنبيهات تحتاج انتباهك</span>
                </div>
                {urgentItems.map((t:any)=>(
                  <div key={t.id} className="db-urgent">
                    <span style={{width:8,height:8,borderRadius:"50%",background:"#dc2626",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:".66rem",fontWeight:700,color:"#1a2d40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                      <div style={{fontSize:".57rem",color:"#8b9dad"}}>{t.client}</div>
                    </div>
                    <span style={{fontSize:".55rem",fontWeight:700,padding:"2px 8px",borderRadius:20,background:t.isLate?"#fef2f2":"#fff7ed",color:t.isLate?"#dc2626":"#b45309"}}>{t.isLate?"متأخر":"اليوم"}</span>
                  </div>
                ))}
                {expiredRegs.map((r:any)=>(
                  <div key={r.clientId} className="db-alert" style={{background:"#fef2f2",color:"#dc2626"}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:"#dc2626",flexShrink:0}}/>
                    <span>{r.clientName} — سجل تجاري منتهي منذ {r.daysExpired} يوم</span>
                    <a href="/admin/clients" style={{background:"#dc2626",color:"#fff"}}>تجديد</a>
                  </div>
                ))}
                {soonRegs.map((r:any)=>(
                  <div key={r.clientId} className="db-alert" style={{background:"#fff7ed",color:"#b45309"}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:"#b45309",flexShrink:0}}/>
                    <span>{r.clientName} — سجل تجاري ينتهي بعد {r.daysLeft} يوم</span>
                    <a href="/admin/clients" style={{background:"#b45309",color:"#fff"}}>تذكير</a>
                  </div>
                ))}
              </div>
            )}

            {/* Recent orders */}
            <div className="db-panel">
              <div className="db-panel-head">
                <span className="db-panel-title"><ClipboardList size={14} color="#0875dc"/> آخر الطلبات</span>
                <a href="/admin/orders" className="db-panel-link">عرض الكل <ArrowLeft size={11}/></a>
              </div>
              {recentOrders.length===0
                ? <div className="db-empty">لا توجد طلبات بعد</div>
                : <table className="db-table">
                    <thead><tr>
                      <th>المرجع</th><th>العميل</th><th>الخدمة</th><th>الحالة</th><th>المسؤول</th>
                    </tr></thead>
                    <tbody>{recentOrders.map((o:any)=>{
                      const cfg=STATUS_CFG[o.status]||{label:o.status,color:"#526983",bg:"#f3f4f6"};
                      return <tr key={o.id}>
                        <td><span className="db-code">{o.reference_no||o.id.slice(0,7).toUpperCase()}</span></td>
                        <td style={{fontWeight:700}}>{o.clients?.name||"—"}</td>
                        <td style={{color:"#7f8e9f",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.services?.name||"—"}</td>
                        <td><span className="db-badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span></td>
                        <td style={{color:"#7f8e9f"}}>{o.profiles?.full_name||"—"}</td>
                      </tr>;
                    })}</tbody>
                  </table>
              }
            </div>

            {/* Open tickets */}
            <div className="db-panel" style={{marginTop:14}}>
              <div className="db-panel-head">
                <span className="db-panel-title"><Ticket size={14} color="#0f766e"/> التذاكر المفتوحة</span>
                <a href="/admin/tickets" className="db-panel-link">عرض الكل <ArrowLeft size={11}/></a>
              </div>
              {openTickets.length===0
                ? <div className="db-empty">لا توجد تذاكر مفتوحة ✓</div>
                : <table className="db-table">
                    <thead><tr><th>رقم التذكرة</th><th>العميل</th><th>العنوان</th><th>الحالة</th><th>الأولوية</th></tr></thead>
                    <tbody>{openTickets.map((t:any)=>{
                      const cfg=STATUS_CFG[t.status]||{label:t.status,color:"#526983",bg:"#f3f4f6"};
                      const priColor=t.priority==="عاجلة"?"#dc2626":t.priority==="مرتفعة"?"#b45309":"#8b9dad";
                      return <tr key={t.id}>
                        <td><span className="db-code">#{t.id.slice(0,7).toUpperCase()}</span></td>
                        <td style={{fontWeight:700}}>{t.client?.name||t.clients?.name||t.profiles?.full_name||"—"}</td>
                        <td style={{color:"#7f8e9f",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</td>
                        <td><span className="db-badge" style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span></td>
                        <td style={{color:priColor,fontWeight:700,fontSize:".6rem"}}>{t.priority||"عادية"}</td>
                      </tr>;
                    })}</tbody>
                  </table>
              }
            </div>

            {/* Staff ratings */}
            {isAdmin&&ratings.length>0&&(
              <div className="db-panel" style={{marginTop:14}}>
                <div className="db-panel-head">
                  <span className="db-panel-title"><Star size={14} color="#b45309"/> تقييمات الفريق</span>
                  <a href="/admin/team" className="db-panel-link">التفاصيل <ArrowLeft size={11}/></a>
                </div>
                {ratings.map((r:StaffRating)=>(
                  <div key={r.staff_id} className="db-staff-row">
                    <div className="db-staff-av">{(r.staff_name||"م").charAt(0)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:".66rem",fontWeight:700,color:"#1a2d40"}}>{r.staff_name||"—"}</div>
                      <div style={{fontSize:".55rem",color:"#8b9dad"}}>{r.total_ratings} تقييم · {r.resolved_tickets} محلول</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:3}}>
                      {[1,2,3,4,5].map(s=><Star key={s} size={11} fill={s<=Math.round(r.avg_rating)?"#f59e0b":"#e5eaf0"} color={s<=Math.round(r.avg_rating)?"#f59e0b":"#e5eaf0"}/>)}
                      <span style={{fontSize:".65rem",fontWeight:800,color:"#b45309",marginRight:4}}>{r.avg_rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT ── */}
          <div>
            {/* Progress ring */}
            <div className="db-ring-card" style={{marginBottom:14}}>
              <div style={{position:"relative",width:68,height:68,flexShrink:0}}>
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="29" fill="none" stroke="#f0f4f8" strokeWidth="6"/>
                  <circle cx="34" cy="34" r="29" fill="none" stroke={donePct>=50?"#15803d":"#0875dc"} strokeWidth="6"
                    strokeDasharray={`${donePct*1.82} 182`} transform="rotate(-90 34 34)" strokeLinecap="round"/>
                </svg>
                <span style={{position:"absolute",inset:0,display:"grid",placeItems:"center",fontSize:".85rem",fontWeight:900,color:donePct>=50?"#15803d":"#0875dc"}}>{donePct}%</span>
              </div>
              <div>
                <div style={{fontSize:".7rem",fontWeight:800,color:"#073766",marginBottom:3}}>نسبة الإنجاز الكلية</div>
                <div style={{fontSize:".8rem",color:"#1a2d40",fontWeight:700}}>{ordStats.done} من {ordStats.total} طلب</div>
                <div style={{fontSize:".6rem",color:"#8b9dad",marginTop:3}}>{ordStats.new} طلبات جديدة تنتظر المراجعة</div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="db-panel" style={{marginBottom:14}}>
              <div className="db-panel-head">
                <span className="db-panel-title"><Zap size={14} color="#0875dc"/> وصول سريع</span>
              </div>
              <div style={{padding:12}}>
                <div className="db-quick">
                  {[
                    {href:"/admin/orders",    label:"الطلبات",      sub:"إدارة طلبات العملاء",    color:"#0875dc",bg:"#eff6ff",  Icon:ClipboardList},
                    {href:"/admin/tickets",   label:"تذاكر الدعم",  sub:"متابعة التذاكر",         color:"#0f766e",bg:"#f0fdfa",  Icon:Ticket},
                    {href:"/admin/clients",   label:"العملاء",      sub:"ملفات المنشآت",           color:"#073766",bg:"#eaf4ff",  Icon:Users},
                    {href:"/admin/invoices",  label:"الفواتير",     sub:"إدارة الفواتير",         color:"#b45309",bg:"#fff7ed",  Icon:Receipt},
                    {href:"/admin/services",  label:"الخدمات",      sub:"كتالوج الخدمات",         color:"#15803d",bg:"#f0fdf4",  Icon:Package},
                    {href:"/admin/content",   label:"المحتوى",      sub:"محتوى الموقع",           color:"#7c3aed",bg:"#f5f3ff",  Icon:FileText},
                    {href:"/admin/team",      label:"الفريق",       sub:"الأعضاء والصلاحيات",    color:"#dc2626",bg:"#fef2f2",  Icon:UserPlus},
                    {href:"/admin/settings",  label:"الإعدادات",   sub:"إعدادات الموقع",         color:"#526983",bg:"#f3f4f6",  Icon:Settings},
                  ].map(a=>(
                    <a key={a.href} href={a.href} className="db-qa">
                      <div className="db-qa-ico" style={{background:a.bg}}><a.Icon size={15} color={a.color}/></div>
                      <div>
                        <div className="db-qa-lbl">{a.label}</div>
                        <div className="db-qa-sub">{a.sub}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Order pipeline */}
            <div className="db-panel" style={{marginBottom:14}}>
              <div className="db-panel-head">
                <span className="db-panel-title"><BarChart3 size={14} color="#0875dc"/> حالة الطلبات</span>
              </div>
              <div style={{padding:"10px 16px"}}>
                {[
                  {label:"قيد التنفيذ",     val:ordStats.active,   color:"#b45309"},
                  {label:"بانتظار مستندات",  val:ordStats.waiting,  color:"#0875dc"},
                  {label:"مكتمل",            val:ordStats.done,     color:"#15803d"},
                  {label:"ملغي",             val:ordStats.cancelled,color:"#8b9dad"},
                ].map(p=>{
                  const pct=ordStats.total>0?Math.round(p.val/ordStats.total*100):0;
                  return (
                    <div key={p.label} className="db-pipe-row">
                      <span style={{fontSize:".6rem",fontWeight:700,color:p.color,minWidth:100}}>{p.label}</span>
                      <div className="db-pipe-track"><div className="db-pipe-fill" style={{width:`${pct}%`,background:p.color}}/></div>
                      <span style={{fontSize:".65rem",fontWeight:800,color:"#526983",minWidth:22,textAlign:"left"}}>{p.val}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{padding:"10px 16px",borderTop:"1px solid #f0f4f8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:".63rem",color:"#8b9dad",fontWeight:700}}>معدل الإنجاز</span>
                <span style={{fontSize:".85rem",fontWeight:900,color:donePct>=50?"#15803d":"#b45309"}}>{donePct}%</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
