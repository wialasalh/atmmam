"use client";
import PageLoader from "@/components/page-loader";
import { useEffect, useState, useMemo } from "react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { Download, TrendingUp, Ticket, Clock, CheckCircle, AlertTriangle, Star, Users, BarChart3 } from "lucide-react";

type TicketRow = { id:string; status:string; priority:string; category:string; created_at:string; updated_at:string; rating?:number|null; assigned_to?:string|null; profiles?:{full_name:string}|null };

function fmtH(h:number){ return h<24?`${Math.round(h)}س`:`${Math.round(h/24)}ي`; }

export default function ReportsPage() {
  const { loading: authLoading } = useRoleGuard("viewer");
  const [tickets, setTickets]   = useState<TicketRow[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string,string>>({});
  const [loading, setLoading]   = useState(true);
  const [range,   setRange]     = useState<"7"|"30"|"90">("30");

  useEffect(()=>{
    setLoading(true);
    fetch("/api/tickets").then(r=>r.json()).then(d=>{ setTickets(Array.isArray(d.data)?d.data:[]); }).catch(()=>{}).finally(()=>setLoading(false));
    fetch("/api/admin/team").then(r=>r.ok?r.json():null).then(d=>{
      if(d?.members) setAgentNames(Object.fromEntries(d.members.map((m:{id:string;full_name:string})=>[m.id,m.full_name])));
    }).catch(()=>{});
  },[]);

  const now = Date.now();
  const rangeMs = Number(range)*24*3600*1000;

  const inRange = useMemo(()=>tickets.filter(t=>now-new Date(t.created_at).getTime()<rangeMs),[tickets,range]);

  const stats = useMemo(()=>{
    const total     = inRange.length;
    const resolved  = inRange.filter(t=>["تم الحل","مغلقة","مغلقة من العميل"].includes(t.status)).length;
    const open      = inRange.filter(t=>["جديدة","قيد المراجعة","بانتظار العميل"].includes(t.status)).length;
    const urgent    = inRange.filter(t=>t.priority==="عاجلة").length;
    const rated     = inRange.filter(t=>t.rating);
    const avgRating = rated.length ? rated.reduce((s,t)=>s+(t.rating||0),0)/rated.length : 0;
    const withTime  = inRange.filter(t=>resolved&&t.updated_at&&t.created_at);
    const avgResolve= withTime.length ? withTime.reduce((s,t)=>{
      return s+(new Date(t.updated_at).getTime()-new Date(t.created_at).getTime())/3600000;
    },0)/withTime.length : 0;
    const slaBreached= inRange.filter(t=>{
      if(["تم الحل","مغلقة"].includes(t.status)) return false;
      const h=(Date.now()-new Date(t.created_at).getTime())/3600000;
      const target=t.priority==="عاجلة"?4:t.priority==="مرتفعة"?24:72;
      return h>target;
    }).length;
    return {total,resolved,open,urgent,avgRating,avgResolve,slaBreached};
  },[inRange]);

  const byStatus = useMemo(()=>{
    const map:Record<string,number>={};
    inRange.forEach(t=>{ map[t.status]=(map[t.status]||0)+1; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[inRange]);

  const byCategory = useMemo(()=>{
    const map:Record<string,number>={};
    inRange.forEach(t=>{ if(t.category) map[t.category]=(map[t.category]||0)+1; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
  },[inRange]);

  const byAgent = useMemo(()=>{
    const map:Record<string,{name:string;count:number;resolved:number}>={};
    inRange.forEach(t=>{
      if(!t.assigned_to) return;
      const k=t.assigned_to;
      if(!map[k]) map[k]={ name: agentNames[k]||t.profiles?.full_name||"موظف", count:0, resolved:0 };
      map[k].count++;
      if(["تم الحل","مغلقة"].includes(t.status)) map[k].resolved++;
    });
    return Object.values(map).sort((a,b)=>b.count-a.count).slice(0,6);
  },[inRange,agentNames]);

  // Daily distribution
  const daily = useMemo(()=>{
    const days = Number(range);
    const arr:number[] = Array(Math.min(days,30)).fill(0);
    inRange.forEach(t=>{
      const daysAgo = Math.floor((now-new Date(t.created_at).getTime())/86400000);
      const idx = Math.min(days,30)-1-daysAgo;
      if(idx>=0 && idx<arr.length) arr[idx]++;
    });
    return arr;
  },[inRange,range]);

  const maxDay = Math.max(...daily,1);

  function exportCSV(){
    const rows=[["رقم التذكرة","الحالة","الأولوية","التصنيف","تاريخ الإنشاء","آخر تحديث"],
      ...tickets.map(t=>[t.id,t.status,t.priority,t.category,t.created_at,t.updated_at])];
    const csv=`﻿${rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")}`;
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    a.download=`tickets-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if(authLoading||loading) return <PageLoader text="جاري تحميل التقارير..."/>;

  const KPIs=[
    {icon:<Ticket size={18}/>,  label:"إجمالي التذاكر",  val:stats.total,          color:"#073766", bg:"#eaf4ff"},
    {icon:<CheckCircle size={18}/>,label:"تم الحل",       val:stats.resolved,       color:"#15803d", bg:"#f0fdf4"},
    {icon:<Clock size={18}/>,   label:"مفتوحة",            val:stats.open,           color:"#0875dc", bg:"#eff6ff"},
    {icon:<AlertTriangle size={18}/>,label:"عاجلة",       val:stats.urgent,         color:"#dc2626", bg:"#fef2f2"},
    {icon:<Star size={18}/>,    label:"متوسط التقييم",   val:stats.avgRating.toFixed(1)+"★", color:"#b45309", bg:"#fefce8"},
    {icon:<TrendingUp size={18}/>,label:"متوسط وقت الحل",val:fmtH(stats.avgResolve),color:"#0f766e",bg:"#f0fdfa"},
    {icon:<BarChart3 size={18}/>,label:"تجاوز SLA",      val:stats.slaBreached,    color:"#dc2626", bg:"#fef2f2"},
    {icon:<Users size={18}/>,   label:"معدل الإنجاز",    val:stats.total?Math.round(stats.resolved/stats.total*100)+"%":"—", color:"#15803d", bg:"#f0fdf4"},
  ];

  return (
    <div dir="rtl" style={{minHeight:"calc(100vh - 60px)",background:"#f4f7fb",padding:"20px 24px"}}>
      <style>{`
        .rp-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px;gap:16px}
        .rp-title{font-size:1.5rem;font-weight:900;color:#073766;margin:0 0 3px}
        .rp-sub{font-size:.7rem;color:#7f8e9f;margin:0}
        .rp-acts{display:flex;gap:8px;align-items:center}
        .rp-btn{height:36px;border:1px solid #d7e3ed;border-radius:9px;background:#fff;color:#526983;font:inherit;font-size:.65rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:7px;padding:0 14px}
        .rp-btn:hover{background:#f4f7fb}
        .rp-range{display:flex;gap:4px;background:#fff;border:1px solid #dfe8f1;border-radius:10px;padding:3px}
        .rp-range button{border:none;border-radius:8px;background:transparent;font:inherit;font-size:.65rem;font-weight:700;color:#526983;cursor:pointer;padding:5px 14px;transition:all .15s}
        .rp-range button.on{background:#073766;color:#fff}
        .rp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
        .rp-kpi{background:#fff;border:1px solid #dfe8f1;border-radius:13px;padding:14px 16px;display:flex;align-items:center;gap:12px}
        .rp-kpi i{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;flex-shrink:0}
        .rp-kpi small{display:block;font-size:.58rem;color:#7f8e9f;font-weight:700;margin-bottom:3px}
        .rp-kpi strong{display:block;font-size:1.4rem;font-weight:900;line-height:1}
        .rp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
        .rp-card{background:#fff;border:1px solid #dfe8f1;border-radius:14px;overflow:hidden}
        .rp-card-head{padding:12px 16px;border-bottom:1px solid #f0f4f8;font-size:.75rem;font-weight:800;color:#0b1e36;display:flex;align-items:center;gap:6px}
        .rp-card-body{padding:14px 16px}
        .rp-bar-wrap{display:flex;align-items:flex-end;gap:3px;height:80px;margin-bottom:4px}
        .rp-bar{flex:1;background:#0875dc;border-radius:4px 4px 0 0;min-height:3px;transition:height .3s}
        .rp-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f5f7fa;font-size:.67rem}
        .rp-row:last-child{border-bottom:none}
        .rp-fill-wrap{flex:1;height:7px;background:#f0f4f8;border-radius:4px;overflow:hidden}
        .rp-fill{height:100%;border-radius:4px;background:#0875dc;transition:width .4s}
        .rp-num{font-size:.75rem;font-weight:800;color:#073766;min-width:28px;text-align:left}
        .rp-agent-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f5f7fa;font-size:.67rem}
        .rp-agent-row:last-child{border-bottom:none}
        .rp-avatar{width:28px;height:28px;border-radius:50%;background:#e8f0fb;color:#073766;display:grid;place-items:center;font-size:.6rem;font-weight:800;flex-shrink:0}
        .rp-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
      `}</style>

      <div className="rp-head">
        <div>
          <p style={{margin:"0 0 3px",color:"#0f766e",fontSize:".63rem",fontWeight:900,letterSpacing:".04em"}}>التحليل واتخاذ القرار</p>
          <h1 className="rp-title">تقارير التذاكر</h1>
          <p className="rp-sub">قراءة شاملة لأداء فريق الدعم وجودة الخدمة</p>
        </div>
        <div className="rp-acts">
          <div className="rp-range">
            {(["7","30","90"] as const).map(r=>(
              <button key={r} className={range===r?"on":""} onClick={()=>setRange(r)}>{r} يوم</button>
            ))}
          </div>
          <button className="rp-btn" onClick={exportCSV}><Download size={13}/> تصدير CSV</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="rp-kpis">
        {KPIs.map(k=>(
          <div key={k.label} className="rp-kpi">
            <i style={{background:k.bg,color:k.color}}>{k.icon}</i>
            <div>
              <small>{k.label}</small>
              <strong style={{color:k.color}}>{k.val}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="rp-grid">
        {/* Daily chart */}
        <div className="rp-card">
          <div className="rp-card-head"><TrendingUp size={15} color="#0875dc"/> حركة التذاكر (آخر {Math.min(Number(range),30)} يوم)</div>
          <div className="rp-card-body">
            <div className="rp-bar-wrap">
              {daily.map((v,i)=>(
                <div key={i} className="rp-bar" style={{height:`${Math.max(3,(v/maxDay)*80)}px`,background:v>0?"#0875dc":"#e2e8f0"}} title={`${v} تذكرة`}/>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:".54rem",color:"#a0adb8"}}>
              <span>منذ {Math.min(Number(range),30)} يوم</span>
              <span>اليوم</span>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="rp-card">
          <div className="rp-card-head"><BarChart3 size={15} color="#0875dc"/> توزيع الحالات</div>
          <div className="rp-card-body">
            {byStatus.map(([s,n])=>{
              const cfg:Record<string,string>={
                "جديدة":"#0875dc","قيد المراجعة":"#b45309","بانتظار العميل":"#0f766e",
                "تم الحل":"#15803d","مغلقة":"#6b7280","مغلقة من العميل":"#0f766e"
              };
              const c=cfg[s]||"#526983";
              return (
                <div key={s} className="rp-row">
                  <span className="rp-status-dot" style={{background:c}}/>
                  <span style={{flex:1,color:"#1a2d40",fontWeight:600}}>{s}</span>
                  <div className="rp-fill-wrap"><div className="rp-fill" style={{width:`${(n/Math.max(...byStatus.map(([,v])=>v),1))*100}%`,background:c}}/></div>
                  <span className="rp-num">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="rp-card">
          <div className="rp-card-head"><Ticket size={15} color="#0875dc"/> توزيع التصنيفات</div>
          <div className="rp-card-body">
            {byCategory.map(([c,n])=>(
              <div key={c} className="rp-row">
                <span style={{flex:1,color:"#1a2d40",fontWeight:600,fontSize:".64rem"}}>{c||"غير مصنف"}</span>
                <div className="rp-fill-wrap"><div className="rp-fill" style={{width:`${(n/Math.max(...byCategory.map(([,v])=>v),1))*100}%`}}/></div>
                <span className="rp-num">{n}</span>
              </div>
            ))}
            {byCategory.length===0&&<div style={{textAlign:"center",color:"#c4cdd6",fontSize:".66rem",padding:"12px 0"}}>لا بيانات</div>}
          </div>
        </div>

        {/* Agent performance */}
        <div className="rp-card">
          <div className="rp-card-head"><Users size={15} color="#0875dc"/> أداء الفريق</div>
          <div className="rp-card-body">
            {byAgent.map(a=>(
              <div key={a.name} className="rp-agent-row">
                <div className="rp-avatar">{a.name.charAt(0)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:"#1a2d40",fontSize:".66rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}</div>
                  <div style={{fontSize:".58rem",color:"#8b9dad"}}>{a.count} تذكرة · {a.count?Math.round(a.resolved/a.count*100):0}% إنجاز</div>
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:".75rem",fontWeight:900,color:"#073766"}}>{a.resolved}</div>
                  <div style={{fontSize:".55rem",color:"#8b9dad"}}>محلول</div>
                </div>
              </div>
            ))}
            {byAgent.length===0&&<div style={{textAlign:"center",color:"#c4cdd6",fontSize:".66rem",padding:"12px 0"}}>لا بيانات</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
