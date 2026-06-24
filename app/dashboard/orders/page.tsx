"use client";
import { useEffect, useState } from "react";
import { ClipboardList, Search, Clock, CheckCircle, AlertCircle, XCircle, RefreshCw, Plus } from "lucide-react";
import Link from "next/link";

type Order = { id:string; reference_no:string; service_name:string; status:string; priority:string; created_at:string; notes:string|null; };

const STATUS_CONFIG: Record<string,{label:string;color:string;bg:string}> = {
  new:{label:"جديد",color:"#0875dc",bg:"#eaf4ff"},
  in_progress:{label:"قيد التنفيذ",color:"#b45309",bg:"#fef9ee"},
  waiting_documents:{label:"بانتظار المستندات",color:"#7c3aed",bg:"#f5f3ff"},
  completed:{label:"مكتمل",color:"#15803d",bg:"#f0fdf4"},
  cancelled:{label:"ملغي",color:"#6b7280",bg:"#f3f4f6"},
  blocked:{label:"معلق",color:"#e67e22",bg:"#fffbeb"},
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/client/orders");
        const j = await r.json();
        setOrders(j.data ?? []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = orders.filter(o =>
    `${o.reference_no} ${o.service_name||""}`.toLowerCase().includes(search.toLowerCase()) &&
    (!filter || o.status === filter)
  );

  function fmt(d:string){return new Date(d).toLocaleDateString("ar-SA",{year:"numeric",month:"short",day:"numeric"});}

  return (
    <div className="client-dash-page">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 className="client-dash-page-title" style={{marginBottom:2}}>طلباتي</h2>
          <p className="client-dash-page-desc" style={{margin:0}}>قائمة بطلباتك المقدمة لفريق أتمم.</p>
        </div>
        <Link href="/services" className="client-dash-primary-btn"><Plus size={15}/> طلب جديد</Link>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          {label:"إجمالي",value:orders.length,c:"#073766"},
          {label:"نشطة",value:orders.filter(o=>["new","in_progress","waiting_documents"].includes(o.status)).length,c:"#0875dc"},
          {label:"انتظار مستندات",value:orders.filter(o=>o.status==="waiting_documents").length,c:"#7c3aed"},
          {label:"مكتملة",value:orders.filter(o=>o.status==="completed").length,c:"#15803d"}
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",border:"1px solid #e5ecf3",borderRadius:12,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:"1.5rem",fontWeight:800,color:s.c}}>{s.value}</div>
            <div style={{fontSize:".65rem",color:"#8b9dad",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:180}}>
          <Search size={13} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#8b9dad"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث برقم الطلب..." style={{width:"100%",border:"1px solid #e5ecf3",borderRadius:8,padding:"8px 32px 8px 12px",fontSize:".72rem",outline:"none",boxSizing:"border-box"}}/>
        </div>
        {["","new","in_progress","waiting_documents","completed","cancelled","blocked"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{padding:"7px 14px",borderRadius:8,border:"1px solid",fontSize:".68rem",cursor:"pointer",fontWeight:filter===s?700:400,borderColor:filter===s?"#0875dc":"#e5ecf3",background:filter===s?"#eaf4ff":"#fff",color:filter===s?"#0875dc":"#6b7280"}}>
            {s===""?"الكل":STATUS_CONFIG[s]?.label||s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:"center",padding:60,color:"#8b9dad",fontSize:".75rem"}}>جاري التحميل...</div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:"center",padding:60,background:"#fff",borderRadius:16,border:"1px solid #e5ecf3"}}>
          <ClipboardList size={36} color="#d1d9e0" style={{marginBottom:12}}/>
          <p style={{color:"#8b9dad",fontSize:".75rem",margin:0}}>{orders.length===0?"لا توجد طلبات بعد — اضغط طلب جديد للبدء":"لا توجد نتائج"}</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(order=>{
            const cfg=STATUS_CONFIG[order.status]||{label:order.status,color:"#6b7280",bg:"#f3f4f6"};
            return (
              <div key={order.id} style={{background:"#fff",border:"1px solid #e5ecf3",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#eaf4ff",display:"grid",placeItems:"center",flexShrink:0}}>
                  <ClipboardList size={18} color="#0875dc"/>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:".78rem",color:"#073766"}}>{order.reference_no}</span>
                    <span style={{fontSize:".65rem",padding:"2px 8px",borderRadius:20,background:cfg.bg,color:cfg.color,fontWeight:600}}>{cfg.label}</span>
                  </div>
                  <div style={{fontSize:".72rem",color:"#8b9dad"}}>{order.service_name||"خدمة"}</div>
                  {order.notes && ["cancelled","blocked"].includes(order.status) ? (
                    <div style={{fontSize:".65rem",color:order.status==="cancelled"?"#dc2626":"#e67e22",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontWeight:600}}>{order.status==="cancelled"?"سبب الإلغاء:":"سبب التعليق:"}</span>
                      {order.notes}
                    </div>
                  ) : null}
                </div>
                <div style={{fontSize:".65rem",color:"#b0bcc9",flexShrink:0}}>{fmt(order.created_at)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
