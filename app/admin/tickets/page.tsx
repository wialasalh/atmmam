
"use client";
import { useEffect, useState, useRef } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";

type Ticket = {
  id: string; title: string; body: string; status: string; priority: string;
  category: string; created_at: string; updated_at: string;
  client_id: string; assigned_to: string | null;
  clients: { id: string; name: string; phone: string; email: string; commercial_number: string; company_activity: string; city: string; company_status: string; entity_size: string; employee_count: number } | null;
};

type Message = {
  id: string; body: string; created_at: string; is_internal: boolean; message_type: string; user_id: string;
  sender: { full_name: string; role: string };
};

const STATUS_OPTIONS = ["جديدة","قيد المراجعة","بانتظار العميل","تم الحل","مغلقة"];

const STATUS_COLOR: Record<string,string> = {
  "جديدة":"#0875dc","قيد المراجعة":"#b45309","بانتظار العميل":"#7c3aed","تم الحل":"#15803d","مغلقة":"#6b7280"
};
const STATUS_BG: Record<string,string> = {
  "جديدة":"#eaf4ff","قيد المراجعة":"#fef9ee","بانتظار العميل":"#f5f3ff","تم الحل":"#f0fdf4","مغلقة":"#f3f4f6"
};
const PRIORITY_COLOR: Record<string,string> = {"عاجلة":"#dc2626","مرتفعة":"#ea580c","عادية":"#6b7280"};

function formatDate(d: string) {
  return new Date(d).toLocaleString("ar-SA",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
}

function TicketCard({ ticket, onClick, selected }: { ticket: Ticket; onClick: ()=>void; selected: boolean }) {
  return (
    <div onClick={onClick} style={{
      padding:"1rem 1.25rem", borderRadius:"12px", cursor:"pointer", marginBottom:"0.5rem",
      background: selected ? "#f0f7ff" : "#fff",
      border: selected ? "2px solid #0875dc" : "2px solid #f1f5f9",
      transition:"all 0.15s"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.5rem"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.35rem"}}>
            <span style={{fontSize:"0.72rem",color:"#94a3b8",fontFamily:"monospace"}}>
              #{ticket.id.slice(0,8).toUpperCase()}
            </span>
            <span style={{
              fontSize:"0.72rem",padding:"0.15rem 0.55rem",borderRadius:"999px",fontWeight:600,
              color: STATUS_COLOR[ticket.status] || "#64748b",
              background: STATUS_BG[ticket.status] || "#f8fafc",
            }}>{ticket.status}</span>
            <span style={{fontSize:"0.72rem",color: PRIORITY_COLOR[ticket.priority] || "#64748b",fontWeight:600}}>
              {ticket.priority}
            </span>
          </div>
          <div style={{fontWeight:600,fontSize:"0.95rem",color:"#0f172a",marginBottom:"0.25rem"}}>{ticket.title}</div>
          <div style={{fontSize:"0.8rem",color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"280px"}}>
            {ticket.body || "لا يوجد وصف"}
          </div>
        </div>
        <div style={{textAlign:"left",flexShrink:0}}>
          <div style={{fontSize:"0.78rem",color:"#0875dc",fontWeight:600}}>{ticket.clients?.name || "—"}</div>
          <div style={{fontSize:"0.72rem",color:"#94a3b8"}}>{ticket.category}</div>
          <div style={{fontSize:"0.7rem",color:"#cbd5e1",marginTop:"0.25rem"}}>{formatDate(ticket.created_at)}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notice, setNotice] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  const counts = { total: tickets.length, new: tickets.filter(t=>t.status==="جديدة").length, urgent: tickets.filter(t=>t.priority==="عاجلة").length };

  useEffect(() => { loadTickets(); }, [statusFilter]);
  useEffect(() => { if(selected) loadMessages(selected.id); }, [selected]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  async function loadTickets() {
    setLoading(true);
    const url = statusFilter ? `/api/admin/tickets?status=${statusFilter}` : "/api/admin/tickets";
    const res = await fetch(url);
    if (res.ok) { const { data } = await res.json(); setTickets(data || []); }
    setLoading(false);
  }

  async function loadMessages(id: string) {
    setMessages([]);
    const res = await fetch(`/api/tickets/${id}/messages`);
    if (res.ok) { const { data } = await res.json(); setMessages(data || []); }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selected) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${selected.id}/messages`, {
      method:"POST",
      headers:{"content-type":"application/json"},
      body: JSON.stringify({ body: newMsg.trim(), is_internal: isInternal, message_type: isInternal ? "internal_note" : "reply" })
    });
    if (res.ok) {
      setNewMsg("");
      await loadMessages(selected.id);
    }
    setSending(false);
  }

  async function updateStatus(status: string) {
    if (!selected) return;
    setUpdatingStatus(true);
    const res = await fetch(`/api/admin/tickets`, {
      method:"PATCH",
      headers:{"content-type":"application/json"},
      body: JSON.stringify({ ticketId: selected.id, status })
    });
    if (res.ok) {
      setSelected({ ...selected, status });
      setTickets(ts => ts.map(t => t.id===selected.id ? {...t,status} : t));
      setNotice("تم تحديث الحالة");
      setTimeout(()=>setNotice(""), 2000);
    }
    setUpdatingStatus(false);
  }

  const filtered = tickets.filter(t =>
    (t.title + (t.clients?.name||"") + t.category).includes(search)
  );

  return (
    <main className="ops-shell" dir="rtl">
      <AdminOpsHeader active="tickets" />

      <div style={{display:"grid",gridTemplateColumns:"380px 1fr",height:"calc(100vh - 64px)",overflow:"hidden"}}>

        {/* القائمة */}
        <div style={{borderLeft:"1px solid #f1f5f9",display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* إحصاءات */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem",padding:"1rem",borderBottom:"1px solid #f1f5f9"}}>
            {[
              {label:"الإجمالي",val:counts.total,color:"#0f172a"},
              {label:"جديدة",val:counts.new,color:"#0875dc"},
              {label:"عاجلة",val:counts.urgent,color:"#dc2626"},
            ].map(s=>(
              <div key={s.label} style={{textAlign:"center",padding:"0.5rem",background:"#f8fafc",borderRadius:"8px"}}>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:s.color}}>{s.val}</div>
                <div style={{fontSize:"0.72rem",color:"#94a3b8"}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* بحث وفلتر */}
          <div style={{padding:"0.75rem 1rem",borderBottom:"1px solid #f1f5f9",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="ابحث بالعنوان أو العميل..."
              style={{border:"1px solid #e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.85rem",width:"100%",boxSizing:"border-box"}}
            />
            <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap"}}>
              {["","جديدة","قيد المراجعة","بانتظار العميل","تم الحل","مغلقة"].map(s=>(
                <button key={s} onClick={()=>setStatusFilter(s)} style={{
                  padding:"0.2rem 0.6rem",borderRadius:"999px",fontSize:"0.72rem",border:"none",cursor:"pointer",
                  fontWeight: statusFilter===s ? 700 : 400,
                  background: statusFilter===s ? "#0f172a" : "#f1f5f9",
                  color: statusFilter===s ? "#fff" : "#64748b",
                }}>{s || "الكل"}</button>
              ))}
            </div>
          </div>

          {/* القائمة */}
          <div style={{flex:1,overflowY:"auto",padding:"0.75rem"}}>
            {loading ? (
              <div style={{textAlign:"center",color:"#94a3b8",padding:"2rem"}}>جارٍ التحميل...</div>
            ) : filtered.length === 0 ? (
              <div style={{textAlign:"center",color:"#94a3b8",padding:"2rem"}}>لا توجد تذاكر</div>
            ) : filtered.map(t => (
              <TicketCard key={t.id} ticket={t} selected={selected?.id===t.id} onClick={()=>setSelected(t)} />
            ))}
          </div>
        </div>

        {/* التفاصيل */}
        {selected ? (
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>

            {/* رأس البطاقة */}
            <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid #f1f5f9",background:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.4rem"}}>
                    <span style={{fontSize:"0.78rem",fontFamily:"monospace",color:"#94a3b8",background:"#f8fafc",padding:"0.2rem 0.6rem",borderRadius:"6px",border:"1px solid #e2e8f0"}}>
                      #{selected.id.slice(0,8).toUpperCase()}
                    </span>
                    <span style={{
                      padding:"0.25rem 0.75rem",borderRadius:"999px",fontSize:"0.78rem",fontWeight:700,
                      color: STATUS_COLOR[selected.status]||"#64748b",
                      background: STATUS_BG[selected.status]||"#f8fafc",
                    }}>{selected.status}</span>
                    <span style={{fontSize:"0.78rem",color: PRIORITY_COLOR[selected.priority]||"#64748b",fontWeight:700}}>
                      ● {selected.priority}
                    </span>
                  </div>
                  <h2 style={{margin:0,fontSize:"1.15rem",color:"#0f172a",fontWeight:700}}>{selected.title}</h2>
                  <div style={{fontSize:"0.8rem",color:"#64748b",marginTop:"0.25rem"}}>{selected.category} · {formatDate(selected.created_at)}</div>
                </div>
                <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",fontSize:"1.2rem",cursor:"pointer",color:"#94a3b8",padding:"0.25rem"}}>✕</button>
              </div>

              {/* تغيير الحالة */}
              <div style={{display:"flex",gap:"0.35rem",marginTop:"0.75rem",flexWrap:"wrap"}}>
                {STATUS_OPTIONS.filter(s=>s!==selected.status).map(s=>(
                  <button key={s} onClick={()=>updateStatus(s)} disabled={updatingStatus} style={{
                    padding:"0.3rem 0.75rem",borderRadius:"8px",fontSize:"0.78rem",border:"1px solid #e2e8f0",
                    background:"#f8fafc",cursor:"pointer",color:"#475569",fontWeight:500,
                    opacity: updatingStatus ? 0.5 : 1
                  }}>→ {s}</button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 300px",flex:1,overflow:"hidden"}}>

              {/* المحادثة */}
              <div style={{display:"flex",flexDirection:"column",overflow:"hidden",borderLeft:"1px solid #f1f5f9"}}>

                {/* نص الطلب الأصلي */}
                {selected.body && (
                  <div style={{margin:"1rem 1.25rem 0",padding:"1rem",background:"#f8fafc",borderRadius:"10px",border:"1px solid #e2e8f0"}}>
                    <div style={{fontSize:"0.72rem",color:"#94a3b8",marginBottom:"0.4rem",fontWeight:600}}>📋 موضوع الطلب</div>
                    <div style={{fontSize:"0.9rem",color:"#334155",lineHeight:"1.6"}}>{selected.body}</div>
                  </div>
                )}

                {/* الرسائل */}
                <div style={{flex:1,overflowY:"auto",padding:"1rem 1.25rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                  {messages.length === 0 ? (
                    <div style={{textAlign:"center",color:"#cbd5e1",padding:"2rem",fontSize:"0.9rem"}}>لا توجد رسائل بعد</div>
                  ) : messages.map(m => (
                    <div key={m.id} style={{
                      display:"flex",flexDirection:"column",
                      alignItems: m.sender.role==="client" ? "flex-end" : "flex-start"
                    }}>
                      <div style={{fontSize:"0.72rem",color:"#94a3b8",marginBottom:"0.2rem"}}>
                        {m.sender.full_name} · {formatDate(m.created_at)}
                        {m.is_internal && <span style={{color:"#7c3aed",marginRight:"0.4rem"}}> · ملاحظة داخلية</span>}
                      </div>
                      <div style={{
                        maxWidth:"75%",padding:"0.7rem 1rem",borderRadius:"12px",fontSize:"0.88rem",lineHeight:"1.5",
                        background: m.is_internal ? "#f5f3ff" : m.sender.role==="client" ? "#0875dc" : "#f1f5f9",
                        color: m.sender.role==="client" && !m.is_internal ? "#fff" : "#334155",
                        border: m.is_internal ? "1px solid #ddd6fe" : "none"
                      }}>
                        {m.body}
                      </div>
                    </div>
                  ))}
                  <div ref={msgEndRef} />
                </div>

                {/* إرسال رسالة */}
                <div style={{padding:"1rem 1.25rem",borderTop:"1px solid #f1f5f9",background:"#fff"}}>
                  <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.5rem"}}>
                    <button onClick={()=>setIsInternal(false)} style={{
                      padding:"0.3rem 0.75rem",borderRadius:"8px",fontSize:"0.78rem",border:"none",cursor:"pointer",
                      background: !isInternal ? "#0f172a" : "#f1f5f9",
                      color: !isInternal ? "#fff" : "#64748b"
                    }}>رد للعميل</button>
                    <button onClick={()=>setIsInternal(true)} style={{
                      padding:"0.3rem 0.75rem",borderRadius:"8px",fontSize:"0.78rem",border:"none",cursor:"pointer",
                      background: isInternal ? "#7c3aed" : "#f1f5f9",
                      color: isInternal ? "#fff" : "#64748b"
                    }}>ملاحظة داخلية</button>
                  </div>
                  <div style={{display:"flex",gap:"0.5rem"}}>
                    <textarea
                      value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter" && e.ctrlKey) { e.preventDefault(); void sendMessage(); }}}
                      placeholder={isInternal ? "اكتب ملاحظة داخلية..." : "اكتب ردك للعميل..."}
                      rows={2}
                      style={{
                        flex:1,border:`1px solid ${isInternal?"#ddd6fe":"#e2e8f0"}`,borderRadius:"8px",
                        padding:"0.6rem 0.75rem",fontSize:"0.88rem",resize:"none",
                        background: isInternal ? "#faf5ff" : "#fff"
                      }}
                    />
                    <button onClick={sendMessage} disabled={sending || !newMsg.trim()} style={{
                      padding:"0.6rem 1.25rem",background:"#0f172a",color:"#fff",border:"none",
                      borderRadius:"8px",cursor:"pointer",fontSize:"0.88rem",fontWeight:600,
                      opacity: sending || !newMsg.trim() ? 0.5 : 1
                    }}>
                      {sending ? "..." : "إرسال"}
                    </button>
                  </div>
                  <div style={{fontSize:"0.72rem",color:"#cbd5e1",marginTop:"0.3rem"}}>Ctrl+Enter للإرسال</div>
                </div>
              </div>

              {/* بيانات العميل */}
              <div style={{overflowY:"auto",padding:"1rem",background:"#fafafa"}}>
                <div style={{fontSize:"0.78rem",color:"#94a3b8",fontWeight:600,marginBottom:"0.75rem"}}>بيانات المنشأة</div>
                {selected.clients ? (
                  <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                    {[
                      {label:"الاسم",val:selected.clients.name},
                      {label:"الجوال",val:selected.clients.phone},
                      {label:"البريد",val:selected.clients.email},
                      {label:"السجل",val:selected.clients.commercial_number},
                      {label:"المدينة",val:selected.clients.city},
                      {label:"النشاط",val:selected.clients.company_activity},
                      {label:"الحالة",val:selected.clients.company_status},
                      {label:"الحجم",val:selected.clients.entity_size},
                      {label:"الموظفون",val:selected.clients.employee_count},
                    ].filter(r=>r.val).map(r=>(
                      <div key={r.label} style={{display:"flex",flexDirection:"column",gap:"0.1rem"}}>
                        <span style={{fontSize:"0.7rem",color:"#94a3b8"}}>{r.label}</span>
                        <span style={{fontSize:"0.82rem",color:"#334155",fontWeight:500}}>{String(r.val)}</span>
                      </div>
                    ))}
                  </div>
                ) : <div style={{fontSize:"0.82rem",color:"#94a3b8"}}>لا توجد بيانات</div>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",color:"#cbd5e1",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{fontSize:"2.5rem"}}>💬</div>
            <div style={{fontSize:"0.9rem"}}>اختر تذكرة لعرض التفاصيل والمحادثة</div>
          </div>
        )}
      </div>

      {notice && (
        <div style={{position:"fixed",bottom:"1.5rem",left:"50%",transform:"translateX(-50%)",background:"#0f172a",color:"#fff",padding:"0.6rem 1.5rem",borderRadius:"8px",fontSize:"0.88rem",zIndex:999}}>
          ✓ {notice}
        </div>
      )}
    </main>
  );
}
