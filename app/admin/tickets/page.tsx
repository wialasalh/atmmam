"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Search, MessageSquare, Check, Send, Loader, Filter,
  Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Building2, FileText, Download, ExternalLink, ChevronDown, ChevronUp,
  Briefcase, Users, Lock, X, Zap, Phone, Mail,
  Paperclip, FileCheck, CreditCard, UserCircle,
  MessageCircle, FolderOpen, LayoutGrid, List, Star,
  Tag, Timer, GitMerge, CheckSquare, Square, Trash2, UserCheck,
} from "lucide-react";
import { useRoleGuard } from "@/lib/auth/use-role-guard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseTicketDetails } from "@/lib/ticket-details";
import { formatAppDate, formatAppDateTime } from "@/lib/date-format";
// CSS loaded via app/admin/layout.tsx

type TicketTag = { id: string; name: string; color: string };
type TimeLog   = { id: string; minutes: number; note?: string; logged_at: string; profiles?: { full_name: string } };

type AdminTicket = {
  id: string; title: string; body?: string; description?: string; category: string; priority: string; status: string;
  created_at: string; updated_at: string; sla_due_at?: string | null; user_id: string; rating?: number | null;
  client_id?: string | null; assigned_to?: string | null; files?: string[] | null; archived_at?: string | null;
  merged_into?: string | null;
  ticket_tags?: { tags: TicketTag }[];
  profiles?: { full_name: string; email: string; avatar_url?: string } | null;
  clients?: {
    id: string; name: string; client_type: string;
    tax_number?: string | null; commercial_number?: string | null;
    company_activity?: string | null; company_address?: string | null; city?: string | null;
    entity_size?: string | null; employee_count?: number | null;
    company_scope?: string | null; company_status?: string | null;
    phone?: string | null; email?: string | null;
    commercial_register_doc?: string | null; company_license_doc?: string | null;
    national_id_doc?: string | null; zakat_tax_doc?: string | null; national_address_doc?: string | null;
  } | null;
};

type TicketMessage = {
  id: string; ticket_id: string; user_id: string; body: string;
  created_at: string; is_internal?: boolean; message_type?: string;
  sender?: { full_name: string; role: string; avatar_url?: string } | null;
};

type TeamMember        = { id: string; full_name: string; role: string };
type SignedUrl          = { path: string; url: string; label: string };
type RelatedOrder       = { id: string; reference_no?: string; status: string; service?: string };
type ActiveSubscription = {
  id: string; client_id: string; package_id: string; status: string;
  employee_count: number; base_price: number; total_price: number;
  billing_cycle: string; start_date: string; end_date: string | null;
  packages: { id: string; title_ar: string; tier_ar: string; category: string; billing_cycle: string; price: number; features: string[] } | null;
};

type DetailTab = "replies" | "client" | "sub" | "docs" | "orders";

const STATUS_OPTIONS = ["جديدة","قيد المراجعة","بانتظار العميل","تم الحل","مغلقة"];

const STATUS_CFG: Record<string,{color:string;bg:string;border:string;icon:React.ReactNode}> = {
  "جديدة":          {color:"#0875dc",bg:"#eaf4ff",border:"#bddcff",icon:<Clock size={12}/>},
  "قيد المراجعة":   {color:"#b45309",bg:"#fef9ee",border:"#fde68a",icon:<RefreshCw size={12}/>},
  "بانتظار العميل": {color:"#0f766e",bg:"#f0fdfa",border:"#99f6e4",icon:<AlertTriangle size={12}/>},
  "تم الحل":        {color:"#15803d",bg:"#f0fdf4",border:"#bbf7d0",icon:<CheckCircle size={12}/>},
  "مغلقة":            {color:"#6b7280",bg:"#f3f4f6",border:"#d1d5db",icon:<XCircle size={12}/>},
  "مغلقة من العميل": {color:"#0f766e",bg:"#f0fdfa",border:"#99f6e4",icon:<XCircle size={12}/>},
};

const PRI_MAP: Record<string,string> = {
  urgent:"عاجلة", high:"مرتفعة", normal:"عادية", low:"عادية",
  عاجلة:"عاجلة", مرتفعة:"مرتفعة", عادية:"عادية",
};
const PRI_CFG: Record<string,{color:string;bg:string}> = {
  "عاجلة":  {color:"#dc2626",bg:"#fef2f2"},
  "مرتفعة": {color:"#ea580c",bg:"#fff7ed"},
  "عادية":  {color:"#64748b",bg:"#f1f5f9"},
};
function normPri(p:string){ return PRI_MAP[p]||PRI_MAP[p?.toLowerCase()]||"عادية"; }
function extractPrice(body?:string):string|null{
  if(!body) return null;
  const m=body.match(/(\d[\d,٠-٩]*(?:\.\d+)?)\s*(?:ر\.س|ريال|SAR)/);
  return m?m[1]:null;
}

const ENTITY_SIZE_LABELS: Record<string,string> = {micro:"متناهي الصغر",small:"صغير",medium:"متوسط",large:"كبير"};
const SCOPE_LABELS:       Record<string,string> = {platinum:"البلاتيني",high_green:"الأخضر العالي",medium_green:"الأخضر المتوسط",low_green:"الأخضر المنخفض",red:"الأحمر"};
const CO_STATUS_LABELS:   Record<string,string> = {active:"نشطة",suspended:"معلقة",struck_off:"مشطوبة"};
const ORDER_STATUS_AR:    Record<string,string> = {new:"جديد",waiting_documents:"بانتظار مستندات",in_progress:"قيد التنفيذ",completed:"مكتمل",cancelled:"ملغي",blocked:"معلق"};

const DOC_FIELDS = [
  {field:"commercial_register_doc",label:"السجل التجاري"},
  {field:"company_license_doc",    label:"رخصة المنشأة"},
  {field:"national_id_doc",        label:"بطاقة الهوية"},
  {field:"zakat_tax_doc",          label:"وثيقة الزكاة"},
  {field:"national_address_doc",   label:"العنوان الوطني"},
];

const SLA_TARGET: Record<string, number> = { عاجلة: 4, مرتفعة: 24, عادية: 72 };

function getSLADot(t: AdminTicket) {
  if (["تم الحل","مغلقة","مغلقة من العميل"].includes(t.status)) return "#16a34a";
  const due = t.sla_due_at ? new Date(t.sla_due_at).getTime() : new Date(t.created_at).getTime() + (SLA_TARGET[normPri(t.priority)] || 72) * 3600000;
  const remaining = (due - Date.now()) / 3600000;
  return remaining < 0 ? "#dc2626" : remaining < 2 ? "#ea580c" : "#16a34a";
}

function getSLAPanel(t: AdminTicket) {
  const target = SLA_TARGET[normPri(t.priority)] || 72;
  const due    = t.sla_due_at ? new Date(t.sla_due_at).getTime() : new Date(t.created_at).getTime() + target * 3600000;
  const elapsed = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
  const pct     = Math.min(100, (elapsed / target) * 100);
  const remaining = Math.max(0, (due - Date.now()) / 3600000);
  const color = pct >= 100 ? "#dc2626" : pct >= 75 ? "#ea580c" : "#16a34a";
  const rLabel = pct >= 100 ? "تجاوز SLA" : remaining < 1 ? "< ساعة" : `${Math.round(remaining)}س متبقية`;
  return { pct, color, rLabel, overdue: pct >= 100 };
}

function formatAge(d: string) {
  const h=(Date.now()-new Date(d).getTime())/3600000;
  if(h<1) return "< ساعة";
  if(h<24) return `${Math.floor(h)} ساعة`;
  return `${Math.floor(h/24)} يوم`;
}

function isToday(d: string) {
  const a=new Date(d),b=new Date();
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}

function fmtTime(d: string) {
  return formatAppDateTime(d);
}

function formatDateLabel(d: string) {
  const date=new Date(d),today=new Date(),yesterday=new Date(today);
  yesterday.setDate(yesterday.getDate()-1);
  if(date.toDateString()===today.toDateString()) return "اليوم";
  if(date.toDateString()===yesterday.toDateString()) return "أمس";
  return formatAppDate(date);
}

function isStaffRoleCheck(role?: string) { return ["admin","manager","operator"].includes(role||""); }

const AV_COLORS=[
  ["#dbeafe","#1d4ed8"],["#dcfce7","#15803d"],["#fef9c3","#92400e"],
  ["#fce7f3","#9d174d"],["#e0f7f4","#5b21b6"],["#ffedd5","#c2410c"],
  ["#ccfbf1","#0f766e"],["#e0f2fe","#0369a1"],
];
function avatarStyle(name?: string): React.CSSProperties {
  if(!name) return {};
  let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffff;
  const [bg,color]=AV_COLORS[h%AV_COLORS.length];
  return {background:bg,color};
}

export default function AdminTicketsPage() {
  const {loading:authLoading}=useRoleGuard("operator");

  const [tickets,         setTickets]         = useState<AdminTicket[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [selected,        setSelected]        = useState<AdminTicket|null>(null);
  const [messages,        setMessages]        = useState<TicketMessage[]>([]);
  const [statusFilter,    setStatusFilter]    = useState("");
  const [priorityFilter,  setPriorityFilter]  = useState("");
  const [categoryFilter,  setCategoryFilter]  = useState("");
  const [assignedFilter,  setAssignedFilter]  = useState("");
  const [dateFrom,        setDateFrom]        = useState("");
  const [dateTo,          setDateTo]          = useState("");
  const [showAdvanced,    setShowAdvanced]    = useState(false);
  const [hoveredRow,      setHoveredRow]      = useState<string|null>(null);
  const [focusedRow,      setFocusedRow]      = useState<string|null>(null);
  const [newNote,         setNewNote]         = useState("");
  const [updating,        setUpdating]        = useState(false);
  const [sending,         setSending]         = useState(false);
  const [showCanned,      setShowCanned]      = useState(false);
  const [signedUrls,      setSignedUrls]      = useState<SignedUrl[]>([]);
  const [loadingUrls,     setLoadingUrls]     = useState(false);
  const [isInternal,      setIsInternal]      = useState(false);
  const [teamMembers,     setTeamMembers]     = useState<TeamMember[]>([]);
  const [showHistory,     setShowHistory]     = useState(false);
  const [relatedOrders,   setRelatedOrders]   = useState<RelatedOrder[]>([]);
  const [subscriptions,   setSubscriptions]   = useState<ActiveSubscription[]>([]);
  const [loadingSub,      setLoadingSub]      = useState(false);
  const [detailTab,       setDetailTab]       = useState<DetailTab>("replies");
  const [adminFiles,      setAdminFiles]      = useState<File[]>([]);
  const [adminUploading,  setAdminUploading]  = useState(false);
  const [cannedResponses, setCannedResponses] = useState<{id:string;title:string;body:string}[]>([]);
  const [newCannedBody,   setNewCannedBody]   = useState("");
  const [addingCanned,    setAddingCanned]    = useState(false);
  const [unreadTickets,   setUnreadTickets]   = useState<Set<string>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showArchived,    setShowArchived]    = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState<string|null>(null);
  const [pendingStatus,   setPendingStatus]   = useState("");
  const [statusNote,      setStatusNote]      = useState("");
  const [viewMode,        setViewMode]        = useState<"list"|"kanban">("list");
  const [refreshing,      setRefreshing]      = useState(false);
  const [lastRefreshAt,   setLastRefreshAt]   = useState<string|null>(null);

  // ── New features ──
  const [bulkSelected,    setBulkSelected]    = useState<Set<string>>(new Set());
  const [bulkMode,        setBulkMode]        = useState(false);
  const [allTags,         setAllTags]         = useState<TicketTag[]>([]);
  const [ticketTags,      setTicketTags]      = useState<TicketTag[]>([]);
  const [showTagMenu,     setShowTagMenu]     = useState(false);
  const [showMergeModal,  setShowMergeModal]  = useState(false);
  const [mergeTarget,     setMergeTarget]     = useState("");
  const [merging,         setMerging]         = useState(false);
  const [timeLogs,        setTimeLogs]        = useState<TimeLog[]>([]);
  const [totalMinutes,    setTotalMinutes]    = useState(0);
  const [showTimeModal,   setShowTimeModal]   = useState(false);
  const [timeMinutes,     setTimeMinutes]     = useState("");
  const [timeNote,        setTimeNote]        = useState("");
  const [loggingTime,     setLoggingTime]     = useState(false);
  const [collidingAgents, setCollidingAgents] = useState<string[]>([]);

  const msgsEndRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastViewRef  = useRef<Record<string,number>>({});

  const categories    = useMemo(()=>[...new Set(tickets.map(t=>t.category).filter(Boolean))],[tickets]);
  const activeFilters = [priorityFilter,categoryFilter,assignedFilter,dateFrom,dateTo].filter(Boolean).length;

  const filtered = useMemo(()=>tickets.filter(t=>{
    if(showArchived) return !!t.archived_at;
    // "مغلقة من العميل" stays visible in main list (archived_at set only for auto-delete cron)
    if(t.archived_at && t.status !== "مغلقة من العميل") return false;
    const q=search.trim().toLowerCase();
    if(q&&!`${t.id.slice(0,8)} ${t.title} ${t.profiles?.full_name??""} ${t.clients?.name??""}`.toLowerCase().includes(q)) return false;
    if(statusFilter   && t.status   !==statusFilter)   return false;
    if(priorityFilter && t.priority !==priorityFilter) return false;
    if(categoryFilter && t.category !==categoryFilter) return false;
    if(assignedFilter && t.assigned_to!==assignedFilter) return false;
    if(dateFrom && new Date(t.created_at)<new Date(dateFrom)) return false;
    if(dateTo   && new Date(t.created_at)>new Date(dateTo+"T23:59:59")) return false;
    return true;
  }),[tickets,search,statusFilter,priorityFilter,categoryFilter,assignedFilter,dateFrom,dateTo,showArchived]);

  const stats = useMemo(()=>({
    total:         tickets.length,
    urgent:        tickets.filter(t=>normPri(t.priority)==="عاجلة").length,
    newCount:      tickets.filter(t=>t.status==="جديدة").length,
    resolvedToday: tickets.filter(t=>t.status==="تم الحل"&&isToday(t.updated_at)).length,
  }),[tickets]);

  const clientTickets  = useMemo(()=>selected?tickets.filter(t=>selected.client_id?t.client_id===selected.client_id:t.user_id===selected.user_id).length:0,[tickets,selected]);
  const clientResolved = useMemo(()=>selected?tickets.filter(t=>(selected.client_id?t.client_id===selected.client_id:t.user_id===selected.user_id)&&t.status==="تم الحل").length:0,[tickets,selected]);
  const detailSLA      = selected&&!["تم الحل","مغلقة"].includes(selected.status)?getSLAPanel(selected):null;
  const clientDocs     = useMemo(()=>signedUrls.filter(u=>!u.label.startsWith("مرفق:")),[signedUrls]);
  const ticketFiles    = useMemo(()=>signedUrls.filter(u=>u.label.startsWith("مرفق:")),[signedUrls]);
  const visibleMsgs    = useMemo(()=>messages.filter(m=>!m.message_type||!["rating","revision","status_change"].includes(m.message_type)),[messages]);
  const historyMsgs    = useMemo(()=>messages.filter(m=>["status_change","revision","rating"].includes(m.message_type||"")),[messages]);

  useEffect(()=>{
    if(!tickets.length) return;
    try{
      const id=new URLSearchParams(window.location.search).get("selected");
      if(id){const m=tickets.find(t=>t.id===id);if(m){setSelected(m);window.history.replaceState(null,"","/admin/tickets");}}
    }catch{}
  },[tickets]);

  useEffect(()=>{void loadTickets();},[statusFilter]);
  useEffect(()=>{void loadTeam();},[]);
  useEffect(()=>{fetch("/api/admin/canned-responses").then(async r=>{if(r.ok){const d=await r.json();setCannedResponses(d.data||[]);}});},[]);

  // Load all tags once
  useEffect(()=>{
    fetch("/api/admin/tags").then(r=>r.json()).then(d=>{ if(d.tags) setAllTags(d.tags); }).catch(()=>{});
  },[]);

  // Load ticket tags + time logs when a ticket is selected
  useEffect(()=>{
    if(!selected) return;
    // Tags
    fetch(`/api/admin/tags?ticket_id=${selected.id}`).then(r=>r.json()).then(()=>{
      const tags = (selected.ticket_tags||[]).map(tt=>tt.tags).filter(Boolean);
      setTicketTags(tags);
    }).catch(()=>{});
    const tags = (selected.ticket_tags||[]).map(tt=>tt.tags).filter(Boolean);
    setTicketTags(tags);
    // Time logs
    fetch(`/api/admin/ticket-time?ticket_id=${selected.id}`)
      .then(r=>r.json()).then(d=>{ setTimeLogs(d.logs||[]); setTotalMinutes(d.total_minutes||0); }).catch(()=>{});
    // Collision detection via Supabase Realtime presence
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`ticket-presence-${selected.id}`, { config: { presence: { key: selected.id } } });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const others = Object.values(state).flat().map((p: any) => p.name).filter(Boolean);
      setCollidingAgents(others);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const profile = teamMembers[0];
        await channel.track({ name: profile?.full_name || "موظف" });
      }
    });
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selected?.id]);
  useEffect(()=>{
    if(statusFilter) return;
    const iv=setInterval(()=>fetch("/api/admin/tickets").then(async r=>{if(r.ok){const d=await r.json();setTickets(d.data||[]);}}),15000);
    return ()=>clearInterval(iv);
  },[statusFilter]);

  useEffect(()=>{
    if(!selected?.clients?.id){setSubscriptions([]);return;}
    setLoadingSub(true);
    fetch(`/api/client/active-subscription?client_id=${selected.clients.id}`)
      .then(r=>r.ok?r.json():null)
      .then(res=>setSubscriptions(res?.subscriptions||[]))
      .catch(()=>setSubscriptions([]))
      .finally(()=>setLoadingSub(false));
  },[selected?.clients?.id]);

  useEffect(()=>{
    if(!selected) return;
    setMessages([]);setSignedUrls([]);setIsInternal(false);setShowHistory(false);
    loadSelectedMessages(selected.id);generateSignedUrls(selected);
    const load=()=>loadSelectedMessages(selected.id);
    const iv=setInterval(load,5000);
    return ()=>{clearInterval(iv);};
  },[selected]);

  useEffect(()=>{
    const cid=selected?.clients?.id;
    if(!cid){setRelatedOrders([]);return;}
    fetch("/api/admin/orders").then(async r=>{
      if(!r.ok) return;
      const all=(await r.json()).data??[];
      setRelatedOrders(all.filter((o:{clients?:{id:string}|null})=>o.clients?.id===cid).slice(0,10).map((o:{id:string;reference_no?:string;status:string;services?:{name?:string}|null})=>({id:o.id,reference_no:o.reference_no,status:o.status,service:o.services?.name})));
    });
  },[selected?.clients?.id]);

  useEffect(()=>{msgsEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  async function loadTickets(options?: { silent?: boolean }) {
    if(!options?.silent) setLoading(true);
    try{
      const url=statusFilter?`/api/admin/tickets?status=${statusFilter}`:"/api/admin/tickets";
      const res=await fetch(url);
      if(res.ok){
        const {data}=await res.json();
        const td=(data||[]) as AdminTicket[];
        setTickets(td);
        if(selected){
          const updatedSelected=td.find(t=>t.id===selected.id);
          if(updatedSelected) setSelected(updatedSelected);
        }
        setUnreadTickets(prev=>{
          const next=new Set(prev);
          for(const t of td){
            if(t.id===selected?.id) continue;
            const lv=lastViewRef.current[t.id];
            if(lv&&new Date(t.updated_at).getTime()>lv) next.add(t.id);
          }
          return next;
        });
        setLastRefreshAt(new Date().toISOString());
      }
    }catch{}
    if(!options?.silent) setLoading(false);
  }

  async function loadSelectedMessages(ticketId: string) {
    try{
      const response=await fetch(`/api/tickets/${ticketId}/messages`);
      if(response.ok) setMessages((await response.json()).data||[]);
    }catch{}
  }

  async function refreshTickets() {
    if(refreshing) return;
    setRefreshing(true);
    await loadTickets({silent:true});
    if(selected){
      await loadSelectedMessages(selected.id);
      generateSignedUrls(selected);
    }
    setRefreshing(false);
  }

  function selectTicket(t: AdminTicket) {
    lastViewRef.current[t.id]=Date.now();
    setUnreadTickets(prev=>{const next=new Set(prev);next.delete(t.id);return next;});
    setSelected(t);
    setDetailTab("replies");
  }

  async function loadTeam() {
    try{const res=await fetch("/api/admin/team");if(res.ok){const d=await res.json();setTeamMembers(d.members||[]);}}catch{}
  }

  async function assignTicket(assignedTo: string|null) {
    if(!selected) return;
    try{
      await fetch("/api/admin/tickets",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticketId:selected.id,assignedTo})});
      setSelected(p=>p?{...p,assigned_to:assignedTo}:null);
    }catch{}
  }

  async function generateSignedUrls(ticket: AdminTicket) {
    const supabase=createSupabaseBrowserClient();
    setLoadingUrls(true);
    const results: SignedUrl[]=[];
    if(ticket.clients){
      for(const {field,label} of DOC_FIELDS){
        const path=ticket.clients[field as keyof typeof ticket.clients] as string|null;
        if(path){const {data}=await supabase.storage.from("client-documents").createSignedUrl(path,3600);if(data?.signedUrl)results.push({path,url:data.signedUrl,label});}
      }
    }
    const {data:cdocs}=await supabase.from("client_documents").select("*").eq("client_id",ticket.client_id);
    if(cdocs){for(const doc of cdocs){const {data}=await supabase.storage.from("client-documents").createSignedUrl(doc.storage_path,3600);if(data?.signedUrl)results.push({path:doc.storage_path,url:data.signedUrl,label:doc.filename});}}
    if(ticket.files?.length){for(const path of ticket.files){const fn=path.split("/").pop()||path;const {data}=await supabase.storage.from("ticket-attachments").createSignedUrl(path,3600);if(data?.signedUrl)results.push({path,url:data.signedUrl,label:`مرفق: ${fn}`});}}
    setSignedUrls(results);setLoadingUrls(false);
  }

  async function updateStatus(ticketId: string, status: string, note="") {
    setUpdating(true);
    try{
      await fetch("/api/admin/tickets",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticketId,status,note})});
      await loadTickets();
      if(selected?.id===ticketId) setSelected(p=>p?{...p,status}:null);
    }catch{}
    setUpdating(false);
  }

  async function archiveTicket(ticketId: string, archive: boolean) {
    await fetch("/api/admin/tickets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId, archive }) });
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, archived_at: archive ? new Date().toISOString() : null } : t));
    if (archive) setSelected(null);
  }

  async function deleteTicket(ticketId: string) {
    await fetch("/api/admin/tickets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId }) });
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setSelected(null);
    setConfirmDelete(null);
  }

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    if((!newNote.trim()&&adminFiles.length===0)||!selected) return;
    setSending(true);
    const supabase=createSupabaseBrowserClient();
    const uploaded: string[]=[];
    try{
      if(adminFiles.length){
        setAdminUploading(true);
        for(const file of adminFiles){
          const ext=file.name.split(".").pop();
          const path=`tickets/${selected.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const {error:ue}=await supabase.storage.from("ticket-attachments").upload(path,file);
          if(!ue) uploaded.push(path);
        }
        setAdminUploading(false);
      }
      await fetch(`/api/tickets/${selected.id}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:newNote.trim(),is_internal:isInternal,message_type:"admin_reply"})});
      if(uploaded.length) await fetch("/api/admin/tickets",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticketId:selected.id,files:uploaded})});
      setNewNote("");setIsInternal(false);setShowCanned(false);setAdminFiles([]);
      const res=await fetch(`/api/tickets/${selected.id}/messages`);
      if(res.ok){const {data}=await res.json();setMessages(data||[]);}
      if(uploaded.length) await loadTickets();
    }catch{}
    setSending(false);setAdminUploading(false);
  }

  function clearFilters(){setSearch("");setPriorityFilter("");setCategoryFilter("");setAssignedFilter("");setDateFrom("");setDateTo("");setStatusFilter("");}

  // ── Bulk actions ──
  function toggleBulk(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setBulkSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  async function bulkStatusChange(status: string) {
    const ids = [...bulkSelected];
    await Promise.all(ids.map(id => fetch("/api/admin/tickets", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ticketId: id, status }) })));
    setTickets(prev => prev.map(t => bulkSelected.has(t.id) ? { ...t, status } : t));
    setBulkSelected(new Set()); setBulkMode(false);
  }

  // ── Tags ──
  async function toggleTag(tagId: string) {
    if (!selected) return;
    const has = ticketTags.some(t => t.id === tagId);
    const res = await fetch("/api/admin/tags", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ticketId: selected.id, tagId, action: has ? "remove" : "add" }) });
    const d = await res.json();
    if (d.tags) setTicketTags(d.tags);
  }

  // ── Merge ──
  async function doMerge() {
    if (!selected || !mergeTarget.trim()) return;
    setMerging(true);
    await fetch("/api/admin/ticket-merge", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ source_id: mergeTarget.trim(), target_id: selected.id }) });
    setMerging(false); setShowMergeModal(false); setMergeTarget("");
    void loadTickets();
  }

  // ── Time tracking ──
  async function logTime() {
    if (!selected || !timeMinutes) return;
    setLoggingTime(true);
    await fetch("/api/admin/ticket-time", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ ticket_id: selected.id, minutes: Number(timeMinutes), note: timeNote }) });
    const d = await fetch(`/api/admin/ticket-time?ticket_id=${selected.id}`).then(r=>r.json());
    setTimeLogs(d.logs||[]); setTotalMinutes(d.total_minutes||0);
    setTimeMinutes(""); setTimeNote(""); setShowTimeModal(false); setLoggingTime(false);
  }

  function fmtMins(m: number) { return m >= 60 ? `${Math.floor(m/60)}س ${m%60}د` : `${m}د`; }

  async function addCannedResponse(){
    if(!newCannedBody.trim()) return;
    setAddingCanned(true);
    try{
      const title=newCannedBody.trim().slice(0,40)+(newCannedBody.trim().length>40?"...":"");
      const res=await fetch("/api/admin/canned-responses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,body:newCannedBody.trim()})});
      if(res.ok){setNewCannedBody("");const d=await fetch("/api/admin/canned-responses").then(r=>r.ok?r.json():{data:[]});setCannedResponses(d.data||[]);}
    }catch{}
    setAddingCanned(false);
  }

  async function deleteCannedResponse(id: string){
    if(id.startsWith("def-")){setCannedResponses(p=>p.filter(r=>r.id!==id));return;}
    await fetch(`/api/admin/canned-responses?id=${id}`,{method:"DELETE"});
    setCannedResponses(p=>p.filter(r=>r.id!==id));
  }

  if(authLoading) return (
    <div style={{display:"grid",placeItems:"center",height:"calc(100vh - 76px)"}}>
      <div style={{width:32,height:32,border:"3px solid #e2e8f0",borderTopColor:"#073766",borderRadius:"50%",animation:"spin .6s linear infinite"}}/>
    </div>
  );

  const clientName    = selected?.profiles?.full_name || selected?.clients?.name || "مستخدم";
  const clientCompany = selected?.clients?.name && selected?.profiles?.full_name ? selected.clients.name : null;
  const clientInitial = clientName[0]?.toUpperCase() || "م";

  return (
    <>
    <div className="tc-shell">

      {/* ══ LIST ══ */}
      <aside className="tc-list">
        <div className="tc-list-head">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <h1 className="tc-list-title" style={{margin:0}}>
              التذاكر <span className="tc-list-title-badge">{stats.total}</span>
            </h1>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button type="button" onClick={refreshTickets} disabled={refreshing} className="tc-refresh-btn" title="تحديث التذاكر">
                <RefreshCw size={14} className={refreshing?"spin":""}/>
                <span>{refreshing?"جار التحديث":"تحديث"}</span>
              </button>
              <div style={{display:"flex",gap:4,background:"#f1f5f9",borderRadius:8,padding:3}}>
              <button onClick={()=>setViewMode("list")} title="عرض قائمة"
                style={{border:0,borderRadius:6,padding:"5px 8px",cursor:"pointer",background:viewMode==="list"?"#fff":"transparent",color:viewMode==="list"?"#0875dc":"#94a3b8",boxShadow:viewMode==="list"?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .15s"}}>
                <List size={15}/>
              </button>
              <button onClick={()=>setViewMode("kanban")} title="عرض لوحة Kanban"
                style={{border:0,borderRadius:6,padding:"5px 8px",cursor:"pointer",background:viewMode==="kanban"?"#fff":"transparent",color:viewMode==="kanban"?"#0875dc":"#94a3b8",boxShadow:viewMode==="kanban"?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .15s"}}>
                <LayoutGrid size={15}/>
              </button>
              </div>
            </div>
          </div>
          <div className="tc-refresh-meta">
            {lastRefreshAt ? `آخر تحديث ${formatAppDateTime(lastRefreshAt)}` : "يتم التحديث تلقائياً، ويمكنك التحديث يدوياً الآن"}
          </div>

          <div className="tc-stats-row">
            {[
              {label:"إجمالي",    num:stats.total,         color:"#334155"},
              {label:"عاجلة",     num:stats.urgent,        color:"#dc2626"},
              {label:"جديدة",     num:stats.newCount,      color:"#0875dc"},
              {label:"حُلّ اليوم",num:stats.resolvedToday, color:"#16a34a"},
            ].map(s=>(
              <div key={s.label} className="tc-stat-card" style={{borderTop:`3px solid ${s.color}`}}>
                <span className="tc-stat-num" style={{color:s.color}}>{s.num}</span>
                <span className="tc-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="tc-search-wrap">
            <Search size={16} color="#94a3b8"/>
            <input className="tc-search-inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالعنوان، العميل، المنشأة..."/>
            {search&&<button onClick={()=>setSearch("")} style={{border:0,background:"transparent",color:"#94a3b8",cursor:"pointer",padding:0,display:"grid",placeItems:"center"}}><X size={14}/></button>}
          </div>

          <div className="tc-filter-row">
            <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="tc-filter-sel">
              <option value="">الأولوية</option>
              <option value="عاجلة">عاجلة</option>
              <option value="مرتفعة">مرتفعة</option>
              <option value="عادية">عادية</option>
            </select>
            <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="tc-filter-sel">
              <option value="">التصنيف</option>
              {categories.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={()=>setShowAdvanced(v=>!v)} className={`tc-icon-btn${showAdvanced?" on":""}`}>
              <Filter size={14}/>
              {activeFilters>0&&<span className="tc-filter-badge">{activeFilters}</span>}
            </button>
            {(activeFilters>0||search)&&<button onClick={clearFilters} className="tc-clear-btn"><X size={14}/></button>}
          </div>

          {showAdvanced&&(
            <div className="tc-adv">
              <select value={assignedFilter} onChange={e=>setAssignedFilter(e.target.value)} className="tc-filter-sel">
                <option value="">كل المسؤولين</option>
                {teamMembers.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              <div className="tc-adv-row">
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="tc-date-inp"/>
                <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   className="tc-date-inp"/>
              </div>
            </div>
          )}
        </div>

        <div className="tc-tabs">
          {[
            {val:"",       label:"الكل"},
            {val:"جديدة",  label:"جديدة"},
            {val:"قيد المراجعة", label:"مراجعة"},
            {val:"بانتظار العميل",label:"انتظار"},
            {val:"تم الحل",label:"حُلّ"},
            {val:"مغلقة",            label:"مغلقة"},
            {val:"مغلقة من العميل", label:"أغلقها العميل"},
          ].map(s=>(
            <button key={s.val} onClick={()=>{setStatusFilter(s.val);setShowArchived(false);}} className={`tc-tab${!showArchived&&statusFilter===s.val?" on":""}`}>{s.label}</button>
          ))}
          <button onClick={()=>{setShowArchived(v=>!v);setStatusFilter("");}} className={`tc-tab${showArchived?" on":""}`}>الأرشيف</button>
        </div>

        {(activeFilters>0||search||priorityFilter)&&(
          <div className="tc-results-bar"><strong>{filtered.length}</strong> / {tickets.length} تذكرة</div>
        )}

        {/* ── KANBAN VIEW ── */}
        {viewMode==="kanban"&&!loading&&(
          <div style={{padding:"12px 8px",overflowX:"auto",display:"flex",gap:10,minHeight:0,flex:1}}>
            {["جديدة","قيد المراجعة","بانتظار العميل","تم الحل","مغلقة"].map(col=>{
              const colCfg=STATUS_CFG[col]||STATUS_CFG["جديدة"];
              const colTickets=filtered.filter(t=>t.status===col);
              return (
                <div key={col} style={{minWidth:220,flex:"0 0 220px",display:"flex",flexDirection:"column",gap:0}}>
                  {/* Column header */}
                  <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",background:colCfg.bg,borderRadius:"10px 10px 0 0",border:`1px solid ${colCfg.border}`,borderBottom:"none"}}>
                    <span style={{color:colCfg.color}}>{colCfg.icon}</span>
                    <span style={{fontSize:".68rem",fontWeight:800,color:colCfg.color,flex:1}}>{col}</span>
                    <span style={{fontSize:".6rem",fontWeight:700,color:colCfg.color,background:"#fff",padding:"1px 7px",borderRadius:20,border:`1px solid ${colCfg.border}`}}>{colTickets.length}</span>
                  </div>
                  {/* Column body */}
                  <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,padding:"8px 6px",background:"#f8fafc",border:`1px solid ${colCfg.border}`,borderTop:"none",borderRadius:"0 0 10px 10px",minHeight:120}}>
                    {colTickets.length===0&&(
                      <div style={{textAlign:"center",padding:"20px 0",color:"#c0cbd8",fontSize:".62rem"}}>لا توجد تذاكر</div>
                    )}
                    {colTickets.map(t=>{
                      const pri=normPri(t.priority);
                      const pc=PRI_CFG[pri]||PRI_CFG["عادية"];
                      const isSel=selected?.id===t.id;
                      return (
                        <div key={t.id} onClick={()=>selectTicket(t)} style={{background:"#fff",border:`1.5px solid ${isSel?"#0875dc":"#e8edf5"}`,borderRadius:10,padding:"10px 10px 8px",cursor:"pointer",transition:"all .15s",boxShadow:isSel?"0 0 0 2px #bddcff":"none"}}
                          onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 3px 12px rgba(8,117,220,.1)";e.currentTarget.style.borderColor="#bddcff";}}
                          onMouseLeave={e=>{e.currentTarget.style.boxShadow=isSel?"0 0 0 2px #bddcff":"none";e.currentTarget.style.borderColor=isSel?"#0875dc":"#e8edf5";}}>
                          {/* Priority + ID */}
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                            <span style={{fontSize:".56rem",color:"#b0bcc9",fontFamily:"monospace",fontWeight:600}}>#{t.id.slice(0,7).toUpperCase()}</span>
                            {pri!=="عادية"&&<span style={{fontSize:".55rem",fontWeight:700,color:pc.color,background:pc.bg,padding:"1px 6px",borderRadius:20}}>{pri}</span>}
                          </div>
                          {/* Title */}
                          <div style={{fontSize:".7rem",fontWeight:700,color:"#073766",lineHeight:1.4,marginBottom:7,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{t.title}</div>
                          {/* Client */}
                          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
                            <Building2 size={10} color="#8b9dad"/>
                            <span style={{fontSize:".6rem",color:"#526983",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.clients?.name||t.profiles?.full_name||"عميل"}</span>
                          </div>
                          {/* Footer: rating + age */}
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            {t.rating?(
                              <span style={{display:"inline-flex",alignItems:"center",gap:1}}>
                                {[1,2,3,4,5].map(s=><Star key={s} size={10} fill={t.rating!>=s?"#f59e0b":"#e2e8f0"} color={t.rating!>=s?"#f59e0b":"#e2e8f0"}/>)}
                              </span>
                            ):<span/>}
                            <span style={{fontSize:".56rem",color:"#b0bcc9"}}>{formatAge(t.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bulk action bar */}
        {bulkMode && (
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#073766",borderRadius:10,margin:"0 0 8px",color:"#fff",fontSize:".66rem",fontWeight:700,flexWrap:"wrap"}}>
            <span style={{marginLeft:"auto"}}>{bulkSelected.size} تذكرة محددة</span>
            {STATUS_OPTIONS.filter(s=>!["مغلقة"].includes(s)).map(s=>(
              <button key={s} onClick={()=>bulkStatusChange(s)} style={{border:"1px solid rgba(255,255,255,.3)",borderRadius:7,background:"rgba(255,255,255,.1)",color:"#fff",font:"inherit",fontSize:".62rem",fontWeight:700,cursor:"pointer",padding:"4px 10px"}}>{s}</button>
            ))}
            <button onClick={()=>{setBulkMode(false);setBulkSelected(new Set());}} style={{border:"none",background:"rgba(255,255,255,.15)",color:"#fff",font:"inherit",fontSize:".62rem",cursor:"pointer",borderRadius:7,padding:"4px 10px",marginRight:"auto"}}>إلغاء</button>
          </div>
        )}
        {!bulkMode && (
          <button onClick={()=>setBulkMode(true)} style={{display:"flex",alignItems:"center",gap:5,marginBottom:8,border:"1px solid #dfe8f1",borderRadius:8,background:"#fff",color:"#526983",font:"inherit",fontSize:".62rem",fontWeight:700,cursor:"pointer",padding:"5px 10px"}}>
            <CheckSquare size={13}/> تحديد متعدد
          </button>
        )}

        <div className="tc-cards" style={{display:viewMode==="kanban"?"none":"flex"}}>
          {loading?(
            <div className="tc-empty"><Loader size={28} className="spin"/><p>جاري التحميل...</p></div>
          ):filtered.length===0?(
            <div className="tc-empty"><MessageSquare size={34}/><p>لا توجد تذاكر</p></div>
          ):filtered.map((t,idx)=>{
            const sc   =STATUS_CFG[t.status]||STATUS_CFG["جديدة"];
            const pri  =normPri(t.priority);
            const pc   =PRI_CFG[pri]||PRI_CFG["عادية"];
            const slac =getSLADot(t);
            const isSel=selected?.id===t.id;
            const isHov=hoveredRow===t.id||focusedRow===t.id;
            const quickSt=STATUS_OPTIONS.filter(s=>s!==t.status&&s!=="مغلقة").slice(0,2);
            const price=extractPrice(t.body||t.description);
            return (
              <div key={t.id} role="button" tabIndex={0}
                onClick={()=>selectTicket(t)}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectTicket(t);}}}
                onMouseEnter={()=>setHoveredRow(t.id)} onMouseLeave={()=>setHoveredRow(null)}
                onFocus={()=>setFocusedRow(t.id)} onBlur={()=>setFocusedRow(null)}
                className={`tc-card${isSel?" on":""}${pri==="عاجلة"?" urgent":""}`}
                style={{animationDelay:`${Math.min(idx*30,240)}ms`}}>
                <div className="tc-card-header">
                  {bulkMode && (
                    <span onClick={e=>toggleBulk(t.id,e)} style={{marginLeft:6,cursor:"pointer",color:bulkSelected.has(t.id)?"#0875dc":"#c4cdd6",flexShrink:0}}>
                      {bulkSelected.has(t.id)?<CheckSquare size={16}/>:<Square size={16}/>}
                    </span>
                  )}
                  <span className="tc-card-id">
                    <span style={{fontSize:9,color:"#aab8c8",fontWeight:600,fontFamily:"inherit",letterSpacing:".02em"}}>رقم التذكرة</span>
                    <span style={{display:"block"}}>#{t.id.slice(0,7).toUpperCase()}{unreadTickets.has(t.id)&&<span className="tc-unread" style={{marginRight:4}}/>}</span>
                  </span>
                  <div className="tc-card-badges">
                    {pri!=="عادية"&&<span className="tc-pri-badge" style={{color:pc.color,background:pc.bg}}>{pri}</span>}
                    {slac==="#dc2626"&&<span style={{fontSize:9,fontWeight:800,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:5,padding:"1px 5px"}}>SLA ⚠</span>}
                    <span className="tc-sla-dot" style={{background:slac,boxShadow:slac!=="#16a34a"?`0 0 6px ${slac}88`:"none"}}/>
                  </div>
                </div>
                {/* Tag chips on card */}
                {(t.ticket_tags||[]).length > 0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:3,margin:"3px 0 2px"}}>
                    {(t.ticket_tags||[]).map(tt=>tt.tags&&(
                      <span key={tt.tags.id} style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:5,background:tt.tags.color+"18",color:tt.tags.color,border:`1px solid ${tt.tags.color}30`}}>
                        {tt.tags.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="tc-card-title">{t.title}</div>
                <div className="tc-card-meta">
                  {t.clients?.name
                    ?<span className="tc-chip-co"><Building2 size={11}/> {t.clients.name}</span>
                    :<span className="tc-chip-co" style={{color:"#475569",background:"#f1f5f9"}}>{t.profiles?.full_name||"عميل"}</span>
                  }
                  {t.category&&<span className="tc-chip-cat">{t.category}</span>}
                </div>
                <div className="tc-card-footer">
                  <span className="tc-status-badge" style={{color:sc.color,background:sc.bg,borderColor:sc.border}}>
                    {sc.icon} {t.status}
                  </span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {t.rating && (
                      <span style={{display:"inline-flex",alignItems:"center",gap:2}}>
                        {[1,2,3,4,5].map(s=>(
                          <Star key={s} size={10} fill={t.rating!>=s?"#f59e0b":"#e2e8f0"} color={t.rating!>=s?"#f59e0b":"#e2e8f0"}/>
                        ))}
                      </span>
                    )}
                    {price
                      ?<span style={{fontSize:11,fontWeight:800,color:"#0875dc",background:"#eaf4ff",padding:"2px 8px",borderRadius:6,letterSpacing:".01em"}}>{price} ر.س</span>
                      :<span className="tc-age">منذ {formatAge(t.created_at)}</span>
                    }
                  </div>
                </div>
                {isHov&&!isSel&&(
                  <div className="tc-card-quick" onClick={e=>e.stopPropagation()}>
                    <span className="tc-quick-lbl">نقل إلى:</span>
                    {quickSt.map(s=>{
                      const qsc=STATUS_CFG[s];
                      return <button key={s} onClick={e=>{e.stopPropagation();void updateStatus(t.id,s);}}
                        className="tc-quick-btn" style={{color:qsc.color,background:qsc.bg,borderColor:qsc.border}}>{s}</button>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ══ DETAIL ══ */}
      <div className="tc-chat">
        {!selected?(
          <div className="tc-chat-empty">
            <div className="tc-chat-empty-icon"><MessageSquare size={44} color="#93c5fd"/></div>
            <h2>مركز الدعم الفني</h2>
            <p>اختر تذكرة لعرض المحادثة وجميع بيانات العميل في مكان واحد</p>
            <div className="tc-empty-stats">
              {[
                {n:stats.total,         l:"إجمالي التذاكر",c:"#073766"},
                {n:stats.urgent,        l:"عاجلة",         c:"#dc2626"},
                {n:stats.newCount,      l:"جديدة",         c:"#0875dc"},
                {n:stats.resolvedToday, l:"حُلّت اليوم",  c:"#16a34a"},
              ].map(s=>(
                <div key={s.l} className="tc-empty-stat">
                  <strong style={{color:s.c}}>{s.n}</strong>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        ):(
          <>
            {/* Ticket header */}
            <div className="tc-chat-head">
              <div className="tc-chat-head-top">
                <div style={{flex:1,minWidth:0}}>
                  <div className="tc-ticket-id-row">
                    <span className="tc-ticket-id-val" style={{display:"inline-flex",flexDirection:"column",gap:1}}>
                      <span style={{fontSize:9,opacity:.55,fontWeight:600,letterSpacing:".03em"}}>رقم التذكرة</span>
                      #{selected.id.slice(0,8).toUpperCase()}
                    </span>
                    <span style={{color:"#c8d6e4"}}>·</span>
                    <span>{selected.category}</span>
                    <span style={{color:"#c8d6e4"}}>·</span>
                    <span>منذ {formatAge(selected.created_at)}</span>
                    {(()=>{const p=normPri(selected.priority);const pc=PRI_CFG[p]||PRI_CFG["عادية"];return <span style={{color:pc.color,background:pc.bg,fontSize:12,padding:"2px 10px",borderRadius:8,fontWeight:800}}>{p}</span>;})()}
                  </div>
                  <h2 className="tc-ticket-title">{selected.title}</h2>
                </div>
                <div className="tc-head-actions">
                  {selected.archived_at ? (
                    <button onClick={()=>archiveTicket(selected.id,false)} title="إلغاء الأرشفة" style={{padding:"5px 10px",border:"1px solid #d1fae5",background:"#f0fdf4",color:"#15803d",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>إلغاء الأرشفة</button>
                  ) : (
                    <button onClick={()=>archiveTicket(selected.id,true)} title="أرشفة" style={{padding:"5px 10px",border:"1px solid #e5eaf0",background:"#f5f8fc",color:"#526983",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>أرشفة</button>
                  )}
                  <button onClick={()=>setConfirmDelete(selected.id)} title="حذف نهائي" style={{padding:"5px 10px",border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>حذف</button>
                  <button onClick={()=>setSelected(null)} className="tc-close-btn"><X size={16}/></button>
                </div>
              </div>

              <div className="tc-controls">
                <div className="tc-control-group" style={{flexWrap:"wrap",gap:8}}>
                  <span className="tc-ctrl-label">الحالة:</span>
                  <div className="tc-status-pills">
                    {STATUS_OPTIONS.map(s=>{
                      const sc=STATUS_CFG[s];const isCur=s===selected.status;
                      return (
                        <button key={s}
                          onClick={()=>{if(isCur)return;setPendingStatus(s);setStatusNote("");setShowStatusModal(true);}}
                          disabled={updating}
                          className={`tc-st-pill${isCur?" cur":""}`}
                          style={isCur?{color:sc.color,background:sc.bg,borderColor:sc.border}:{}}>
                          {isCur&&<Check size={12}/>} {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="tc-controls" style={{borderTop:"1px solid #f0f4f8"}}>
                <div className="tc-control-group">
                  <Users size={15} color="#9aafbf"/>
                  <span className="tc-ctrl-label">المسؤول:</span>
                  <select value={selected.assigned_to||""} onChange={e=>assignTicket(e.target.value||null)} className="tc-assign-sel">
                    <option value="">غير معين</option>
                    {teamMembers.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>

              {detailSLA&&(
                <div className="tc-sla-bar" style={{background:detailSLA.overdue?"#fef2f2":"undefined"}}>
                  <Zap size={15} color={detailSLA.color}/>
                  <span className="tc-sla-label" style={{color:detailSLA.color}}>{detailSLA.overdue?"⚠ تجاوز SLA":"SLA نشط"}</span>
                  <div className="tc-sla-track"><div className="tc-sla-fill" style={{width:`${detailSLA.pct}%`,background:detailSLA.color}}/></div>
                  <span className="tc-sla-meta">{detailSLA.rLabel}</span>
                  <span className="tc-sla-pct" style={{color:detailSLA.color}}>{Math.round(detailSLA.pct)}%</span>
                </div>
              )}

              {/* Collision alert */}
              {collidingAgents.length > 0 && (
                <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:20,fontSize:".58rem",fontWeight:700,color:"#b45309",margin:"4px 0"}}>
                  <UserCheck size={11}/> يشاهدها أيضاً: {collidingAgents.join("، ")}
                </div>
              )}

              {/* Tags panel */}
              <div style={{padding:"8px 0 4px",borderTop:"1px solid #f0f4f8",marginTop:4}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <Tag size={13} color="#526983"/>
                  <span style={{fontSize:".6rem",fontWeight:800,color:"#526983"}}>الوسوم</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:5}}>
                  {ticketTags.map(tag=>(
                    <span key={tag.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:".62rem",fontWeight:800,padding:"3px 8px",borderRadius:7,background:tag.color+"15",color:tag.color,border:`1px solid ${tag.color}30`}}>
                      {tag.name}
                      <button onClick={()=>toggleTag(tag.id)} style={{border:"none",background:"none",cursor:"pointer",color:tag.color,padding:0,display:"grid",placeItems:"center",opacity:.7}}><X size={10}/></button>
                    </span>
                  ))}
                  <div style={{position:"relative"}}>
                    <button onClick={()=>setShowTagMenu(v=>!v)} style={{border:"1px dashed #c4cdd6",borderRadius:7,background:"transparent",color:"#8b9dad",font:"inherit",fontSize:".6rem",fontWeight:700,cursor:"pointer",padding:"3px 9px",display:"flex",alignItems:"center",gap:4}}>
                      <Tag size={10}/> إضافة وسم
                    </button>
                    {showTagMenu&&(
                      <div style={{position:"absolute",right:0,top:"calc(100% + 4px)",background:"#fff",border:"1px solid #dfe8f1",borderRadius:10,boxShadow:"0 8px 20px rgba(0,0,0,.12)",zIndex:50,minWidth:160,padding:6}}>
                        {allTags.map(tag=>(
                          <button key={tag.id} onClick={()=>{toggleTag(tag.id);setShowTagMenu(false);}}
                            style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"6px 8px",border:"none",background:ticketTags.some(t=>t.id===tag.id)?"#f0f7ff":"transparent",borderRadius:7,cursor:"pointer",font:"inherit",fontSize:".65rem",color:"#1a2d40"}}>
                            <span style={{width:8,height:8,borderRadius:"50%",background:tag.color,flexShrink:0}}/>
                            {tag.name}
                            {ticketTags.some(t=>t.id===tag.id)&&<Check size={11} style={{marginRight:"auto",color:"#0875dc"}}/>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Time tracking + Merge buttons */}
              <div style={{display:"flex",gap:6,marginTop:6,paddingTop:6,borderTop:"1px solid #f0f4f8"}}>
                <button onClick={()=>setShowTimeModal(true)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,border:"1px solid #dfe8f1",borderRadius:8,background:"#f8fafc",color:"#526983",font:"inherit",fontSize:".62rem",fontWeight:700,cursor:"pointer",padding:"7px"}}>
                  <Timer size={13}/> تسجيل وقت {totalMinutes>0&&<span style={{color:"#0875dc"}}>({fmtMins(totalMinutes)})</span>}
                </button>
                <button onClick={()=>setShowMergeModal(true)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,border:"1px solid #dfe8f1",borderRadius:8,background:"#f8fafc",color:"#526983",font:"inherit",fontSize:".62rem",fontWeight:700,cursor:"pointer",padding:"7px"}}>
                  <GitMerge size={13}/> دمج تذكرة
                </button>
              </div>
            </div>

            {/* Status modal */}
            {showStatusModal&&(
              <div className="tc-overlay" onClick={()=>setShowStatusModal(false)}>
                <div className="tc-modal" onClick={e=>e.stopPropagation()}>
                  <div className="tc-modal-head">
                    <h3>تغيير الحالة إلى «{pendingStatus}»</h3>
                    <button className="tc-modal-close" onClick={()=>setShowStatusModal(false)}><X size={16}/></button>
                  </div>
                  <div className="tc-modal-body">
                    <label style={{display:"block",fontSize:14,color:"#475569",fontWeight:700,marginBottom:10}}>ملاحظة (اختياري)</label>
                    <textarea className="tc-modal-ta" value={statusNote} onChange={e=>setStatusNote(e.target.value)} placeholder="سبب تغيير الحالة..." rows={3} autoFocus/>
                  </div>
                  <div className="tc-modal-foot">
                    <button className="tc-btn tc-btn-ghost" onClick={()=>setShowStatusModal(false)}>إلغاء</button>
                    <button className="tc-btn tc-btn-primary" onClick={async()=>{await updateStatus(selected.id,pendingStatus,statusNote);setShowStatusModal(false);}}>تأكيد التغيير</button>
                  </div>
                </div>
              </div>
            )}

            {confirmDelete&&(
              <div className="tc-overlay" onClick={()=>setConfirmDelete(null)}>
                <div className="tc-modal" onClick={e=>e.stopPropagation()}>
                  <div className="tc-modal-head">
                    <h3 style={{color:"#dc2626"}}>حذف نهائي</h3>
                    <button className="tc-modal-close" onClick={()=>setConfirmDelete(null)}><X size={16}/></button>
                  </div>
                  <div className="tc-modal-body">
                    <p style={{margin:0,fontSize:14,color:"#526983"}}>سيتم حذف التذكرة ورسائلها بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.</p>
                  </div>
                  <div className="tc-modal-foot">
                    <button className="tc-btn tc-btn-ghost" onClick={()=>setConfirmDelete(null)}>إلغاء</button>
                    <button style={{padding:"8px 18px",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}} onClick={()=>deleteTicket(confirmDelete)}>حذف نهائي</button>
                  </div>
                </div>
              </div>
            )}

            {/* Client mini-bar */}
            <div className="tc-client-bar">
              <div className="tc-client-bar-av" style={selected.clients?{}:avatarStyle(clientName)}>
                <span style={{color:"#fff",fontSize:18,fontWeight:900}}>{clientInitial}</span>
              </div>
              <div className="tc-client-bar-info">
                <div className="tc-client-bar-name">{clientName}</div>
                {clientCompany&&<div className="tc-client-bar-company"><Building2 size={13}/> {clientCompany}</div>}
              </div>
              <div className="tc-client-bar-kpis">
                <div className="tc-client-bar-kpi">
                  <strong style={{color:"#073766"}}>{clientTickets}</strong>
                  <span>تذكرة</span>
                </div>
                <div className="tc-client-bar-kpi">
                  <strong style={{color:"#16a34a"}}>{clientResolved}</strong>
                  <span>محلولة</span>
                </div>
                {subscriptions.length>0&&(
                  <div className="tc-client-bar-kpi">
                    <strong style={{color:"#0875dc"}}>{subscriptions.length}</strong>
                    <span>باقة</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detail tabs */}
            <div className="tc-detail-tabs">
              {([
                {key:"replies" as DetailTab, label:"الطلب والرد",  icon:<MessageCircle size={15}/>, badge:visibleMsgs.length},
                {key:"client" as DetailTab, label:"بيانات العميل",icon:<UserCircle    size={15}/>, badge:0},
                {key:"sub"    as DetailTab, label:"الباقات",      icon:<CreditCard    size={15}/>, badge:subscriptions.length},
                {key:"docs"   as DetailTab, label:"المستندات",    icon:<FolderOpen    size={15}/>, badge:signedUrls.length},
                {key:"orders" as DetailTab, label:"الطلبات",      icon:<Briefcase     size={15}/>, badge:relatedOrders.length},
              ] as {key:DetailTab;label:string;icon:React.ReactNode;badge:number}[]).map(tab=>(
                <button key={tab.key} onClick={()=>setDetailTab(tab.key)} className={`tc-detail-tab${detailTab===tab.key?" on":""}`}>
                  {tab.icon} {tab.label}
                  {tab.badge>0&&<span className="tc-detail-tab-badge">{tab.badge}</span>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="tc-tab-content">

              {/* ─ REPLIES ─ */}
              {detailTab==="replies"&&(
                <>
                  {/* Ticket body */}
                  {(()=>{
                    const parsed=parseTicketDetails(selected.body||selected.description);
                    if(!parsed.mainDescription&&!parsed.extraFields.length) return null;
                    return (
                      <div className="tc-desc-block" style={{paddingTop:20}}>
                        {parsed.mainDescription&&<p className="tc-desc-text">{parsed.mainDescription}</p>}
                        {parsed.extraFields.length>0&&(
                          <>
                            <div className="tc-fields-head"><FileCheck size={14}/> تفاصيل الطلب</div>
                            <div className="tc-fields-grid">
                              {parsed.extraFields.map((f,i)=>(
                                <div key={i} className="tc-field-cell">
                                  <div className="tc-field-lbl">{f.label}</div>
                                  <div className="tc-field-val">{f.value}</div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Messages as cards */}
                  <div className="tc-msgs" style={{gap:10}}>
                    {visibleMsgs.length===0?(
                      <div className="tc-msgs-empty"><MessageSquare size={36} color="#c0cbd8"/><p>لا توجد ردود بعد</p></div>
                    ):visibleMsgs.map((msg)=>{
                      const isAdmin=isStaffRoleCheck(msg.sender?.role);
                      const isInt=!!msg.is_internal;
                      const roleLabel: Record<string,string>={admin:"مدير النظام",manager:"مدير عمليات",operator:"موظف دعم",viewer:"مشاهد"};
                      const name=isAdmin?(msg.sender?.full_name||"فريق الدعم"):(msg.sender?.full_name||"العميل");
                      const roleStr=isAdmin&&msg.sender?.role?(roleLabel[msg.sender.role]||""):"";
                      return (
                        <div key={msg.id} style={{
                          border:`1px solid ${isInt?"#fde68a":isAdmin?"#bddcff":"#e5eaf0"}`,
                          borderRight:`4px solid ${isInt?"#f59e0b":isAdmin?"#0875dc":"#94a3b8"}`,
                          borderRadius:10,
                          padding:"12px 14px",
                          background:isInt?"#fefce8":isAdmin?"#f8fbff":"#fafbfc",
                        }}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <div style={{
                              width:30,height:30,borderRadius:"50%",flexShrink:0,
                              display:"grid",placeItems:"center",fontSize:13,fontWeight:800,
                              background:isAdmin?"#dbeafe":"#f1f5f9",
                              color:isAdmin?"#1d4ed8":"#475569",
                              ...(!msg.sender?.avatar_url?avatarStyle(msg.sender?.full_name):{}),
                            }}>
                              {msg.sender?.avatar_url
                                ?<img src={msg.sender.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>
                                :(msg.sender?.full_name||"م")[0].toUpperCase()}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                <strong style={{fontSize:13,color:"#073766"}}>{name}</strong>
                                {roleStr&&<span style={{fontSize:11,color:isAdmin?"#0875dc":"#64748b",background:isAdmin?"#eaf4ff":"#f1f5f9",padding:"1px 7px",borderRadius:4,fontWeight:600}}>{roleStr}</span>}
                                {isInt&&<span style={{fontSize:11,color:"#92400e",background:"#fef9c3",padding:"1px 7px",borderRadius:4,fontWeight:700,display:"inline-flex",alignItems:"center",gap:3}}><Lock size={10}/> داخلية</span>}
                              </div>
                              <div style={{fontSize:11,color:"#9aafbf",marginTop:1}}>{fmtTime(msg.created_at)}</div>
                            </div>
                          </div>
                          <div style={{fontSize:13.5,color:"#344d69",lineHeight:1.75,whiteSpace:"pre-wrap",paddingRight:38}}>{msg.body}</div>
                        </div>
                      );
                    })}

                    <div style={{marginTop:4}}>
                      <button className="tc-history-toggle" onClick={()=>setShowHistory(v=>!v)}>
                        <Clock size={14}/> سجل التذكرة {showHistory?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
                      </button>
                      {showHistory&&(
                        <div className="tc-history-body">
                          <div className="tc-hist-row"><span className="tc-hist-dot" style={{background:"#0875dc"}}/><div><div className="tc-hist-ev">تم إنشاء التذكرة</div><div className="tc-hist-t">{formatAppDateTime(selected.created_at)}</div></div></div>
                          {historyMsgs.map(m=>{
                            let dot="#0f766e",body=m.body;
                            if(m.message_type==="revision") dot="#b45309";
                            if(m.message_type==="rating"){dot="#f59e0b";try{const p=JSON.parse(m.body);body=`⭐ تقييم ${p.rating}/5 للمشرف ${p.staff_name}${p.comment?`: ${p.comment}`:""}`;} catch{}}
                            return <div key={m.id} className="tc-hist-row"><span className="tc-hist-dot" style={{background:dot}}/><div><div className="tc-hist-ev">{body}</div><div className="tc-hist-t">{fmtTime(m.created_at)}</div></div></div>;
                          })}
                          <div className="tc-hist-row"><span className="tc-hist-dot" style={{background:"#15803d"}}/><div><div className="tc-hist-ev">آخر تحديث</div><div className="tc-hist-t">{formatAppDateTime(selected.updated_at)}</div></div></div>
                        </div>
                      )}
                    </div>
                    <div ref={msgsEndRef}/>
                  </div>

                  {/* Reply */}
                  <div className="tc-reply">
                    <div className="tc-reply-top">
                      <div style={{position:"relative"}}>
                        <button onClick={()=>setShowCanned(v=>!v)} className={`tc-tool-btn${showCanned?" on":""}`}>
                          <Filter size={14}/> ردود جاهزة <ChevronDown size={13}/>
                        </button>
                        {showCanned&&(
                          <div className="tc-canned-menu">
                            {cannedResponses.length===0?(
                              <div className="tc-canned-item" style={{color:"#9aafbf"}}>لا توجد ردود جاهزة</div>
                            ):cannedResponses.map(r=>(
                              <div key={r.id} style={{display:"flex",alignItems:"stretch"}}>
                                <button className="tc-canned-item" style={{flex:1,textAlign:"right"}} onClick={()=>{setNewNote(r.body);setShowCanned(false);}}>
                                  <strong style={{display:"block",fontSize:13,marginBottom:2}}>{r.title}</strong>
                                  <span style={{fontSize:12,color:"#8b9dad",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{r.body}</span>
                                </button>
                                <button onClick={()=>deleteCannedResponse(r.id)} className="tc-canned-del"><X size={12}/></button>
                              </div>
                            ))}
                            <div style={{borderTop:"1px solid #e2e8f0",padding:14,display:"flex",flexDirection:"column",gap:9}}>
                              <textarea className="tc-canned-ta" placeholder="نص الرد الجاهز..." value={newCannedBody} onChange={e=>setNewCannedBody(e.target.value)} rows={2}/>
                              <button onClick={addCannedResponse} disabled={addingCanned||!newCannedBody.trim()} className="tc-add-canned-btn">
                                {addingCanned?<Loader size={13} className="spin"/>:"+"} إضافة رد جاهز
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="tc-mode-toggle">
                        <button onClick={()=>setIsInternal(false)} className={`tc-mode-btn${!isInternal?" tc-mode-client":""}`}>رد للعميل</button>
                        <button onClick={()=>setIsInternal(true)}  className={`tc-mode-btn${isInternal?" tc-mode-internal":""}`}><Lock size={13}/> داخلية</button>
                      </div>
                    </div>
                    <div className="tc-reply-body">
                      {adminFiles.length>0&&(
                        <div className="tc-file-chips">
                          {adminFiles.map((f,i)=>(
                            <span key={i} className="tc-file-chip">
                              <FileText size={12}/> {f.name}
                              <button type="button" onClick={()=>setAdminFiles(prev=>prev.filter((_,j)=>j!==i))} style={{border:0,background:"transparent",color:"#0875dc",cursor:"pointer",padding:0}}><X size={11}/></button>
                            </span>
                          ))}
                        </div>
                      )}
                      <form onSubmit={sendNote}>
                        <div className="tc-attach-row">
                          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xlsx,.zip" style={{display:"none"}}
                            onChange={e=>{if(e.target.files?.length)setAdminFiles(prev=>[...prev,...Array.from(e.target.files!)]);e.target.value="";}}
                          />
                          <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={adminUploading} className="tc-tool-btn" style={{height:52,flexShrink:0}}>
                            <Paperclip size={15}/>
                          </button>
                          <textarea
                            value={newNote} onChange={e=>setNewNote(e.target.value)}
                            placeholder={isInternal?"اكتب ملاحظة داخلية للفريق...":"اكتب ردك للعميل هنا..."}
                            rows={2} className={`tc-textarea${isInternal?" internal":""}`}
                            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendNote(e);}}}
                          />
                          <button type="submit" disabled={(!newNote.trim()&&adminFiles.length===0)||sending||adminUploading} className="tc-send-btn">
                            {(sending||adminUploading)?<Loader size={20} className="spin"/>:<><Send size={18}/><span>إرسال</span></>}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}

              {/* ─ CLIENT ─ */}
              {detailTab==="client"&&(
                <div className="tc-client-tab-body">
                  <div className="tc-client-profile-card">
                    <div className="tc-cpc-av">{clientInitial}</div>
                    <div className="tc-cpc-info">
                    <div className="tc-cpc-name">{clientName}</div>
                    {clientCompany&&<div className="tc-cpc-company"><Building2 size={12}/> {clientCompany}</div>}
                    <div className="tc-cpc-tags">
                      {selected.clients?.client_type&&(
                        <span className="tc-cpc-tag" style={{background:"rgba(255,255,255,.15)",color:"#fff"}}>
                          {selected.clients.client_type==="company"?"شركة":"شخص طبيعي"}
                        </span>
                      )}
                      {selected.clients?.company_status&&(
                        <span className="tc-cpc-tag" style={{
                          background:selected.clients.company_status==="active"?"rgba(22,163,74,.3)":"rgba(220,38,38,.3)",
                          color:selected.clients.company_status==="active"?"#bbf7d0":"#fecaca",
                        }}>
                          {CO_STATUS_LABELS[selected.clients.company_status]||selected.clients.company_status}
                        </span>
                      )}
                      {selected.clients?.entity_size&&(
                        <span className="tc-cpc-tag" style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.85)"}}>
                          {ENTITY_SIZE_LABELS[selected.clients.entity_size]}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>

                  <div className="tc-client-kpis">
                    <div className="tc-kpi-card"><strong style={{color:"#073766"}}>{clientTickets}</strong><span>إجمالي التذاكر</span></div>
                    <div className="tc-kpi-card"><strong style={{color:"#16a34a"}}>{clientResolved}</strong><span>تم حلها</span></div>
                    <div className="tc-kpi-card"><strong style={{color:"#0875dc"}}>{subscriptions.length}</strong><span>باقات نشطة</span></div>
                  </div>

                  {(selected.clients?.phone||selected.clients?.email||selected.profiles?.email)&&(
                    <div className="tc-contacts-grid">
                      {selected.clients?.phone&&(
                        <a href={`tel:${selected.clients.phone}`} className="tc-contact-link">
                          <div className="tc-contact-icon" style={{background:"#eaf4ff"}}><Phone size={18} color="#0875dc"/></div>
                          <div><div className="tc-contact-type">هاتف</div><div className="tc-contact-val">{selected.clients.phone}</div></div>
                        </a>
                      )}
                      {(selected.clients?.email||selected.profiles?.email)&&(
                        <a href={`mailto:${selected.clients?.email||selected.profiles?.email}`} className="tc-contact-link">
                          <div className="tc-contact-icon" style={{background:"#f0fdfa"}}><Mail size={18} color="#0f766e"/></div>
                          <div><div className="tc-contact-type">البريد</div><div className="tc-contact-val">{selected.clients?.email||selected.profiles?.email}</div></div>
                        </a>
                      )}
                    </div>
                  )}

                  {selected.clients&&(
                    <div className="tc-info-section">
                      <div className="tc-info-section-head">
                        <div className="tc-info-section-icon" style={{background:"#eaf4ff"}}><Building2 size={18} color="#0875dc"/></div>
                        <div className="tc-info-section-title">بيانات المنشأة</div>
                      </div>
                      <div className="tc-info-grid">
                        {[
                          {label:"الرقم الضريبي", value:selected.clients.tax_number||"—", always:true},
                          {label:"السجل التجاري", value:selected.clients.commercial_number||"—", always:true},
                          {label:"المدينة",        value:selected.clients.city},
                          {label:"النشاط",         value:selected.clients.company_activity},
                          {label:"حجم الكيان",     value:selected.clients.entity_size?ENTITY_SIZE_LABELS[selected.clients.entity_size]:null},
                          {label:"النطاق",         value:selected.clients.company_scope?SCOPE_LABELS[selected.clients.company_scope]:null},
                          {label:"الموظفون",       value:selected.clients.employee_count!=null?String(selected.clients.employee_count):null},
                          {label:"العنوان",        value:selected.clients.company_address},
                        ].filter(r=>r.always||r.value).map(r=>(
                          <div key={r.label} className="tc-info-cell">
                            <div className="tc-info-lbl">{r.label}</div>
                            <div className="tc-info-val" style={!r.value||r.value==="—"?{color:"#b0bec5",fontStyle:"italic"}:undefined}>{r.value||"—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─ SUBSCRIPTIONS ─ */}
              {detailTab==="sub"&&(
                <div className="tc-client-tab-body">
                  {loadingSub&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,gap:12,color:"#9aafbf",paddingTop:60}}>
                      <Loader size={22} className="spin"/> جاري التحميل...
                    </div>
                  )}
                  {!loadingSub&&subscriptions.length===0&&(
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:14,color:"#9aafbf",paddingTop:60}}>
                      <CreditCard size={52} color="#c8d6e4"/>
                      <p style={{fontSize:15,margin:0}}>لا توجد باقات نشطة</p>
                    </div>
                  )}
                  {!loadingSub&&subscriptions.filter(s=>!s.end_date||s.end_date>=new Date().toISOString().slice(0,10)).length>0&&(
                    <div className="tc-sub-grid">
                      {subscriptions.filter(s=>!s.end_date||s.end_date>=new Date().toISOString().slice(0,10)).map(sub=>(
                        <div key={sub.id} className="tc-sub">
                          <div className="tc-sub-tier">{sub.packages?.tier_ar||sub.packages?.category||"باقة"}</div>
                          <div className="tc-sub-name">{sub.packages?.title_ar||"باقة نشطة"}</div>
                          <div className="tc-sub-price-box">
                            <span className="tc-sub-price">{sub.total_price.toLocaleString("ar-SA")}</span>
                            <span className="tc-sub-currency"> ر.س</span>
                          </div>
                          <div style={{textAlign:"left"}}>
                            <div className="tc-sub-cycle">{sub.billing_cycle==="monthly"?"شهرياً":sub.billing_cycle==="yearly"?"سنوياً":sub.billing_cycle}</div>
                          </div>
                          <div className="tc-sub-dates-row">
                            <span style={{fontSize:10,color:"#9aafbf"}}>من: {sub.start_date}</span>
                            {sub.end_date&&<span style={{fontSize:10,color:"#b45309",fontWeight:700}}>ينتهي: {sub.end_date}</span>}
                          </div>
                          {sub.employee_count>0&&(
                            <div style={{gridColumn:"1/-1",display:"inline-flex",alignItems:"center",gap:6,background:"#f0f7ff",color:"#1e40af",fontWeight:700,padding:"3px 10px",borderRadius:5,fontSize:11,width:"fit-content",border:"1px solid #bfdbfe"}}>
                              <Users size={11}/> {sub.employee_count} موظف
                            </div>
                          )}
                          {sub.packages?.features&&sub.packages.features.length>0&&(
                            <div className="tc-sub-feats">
                              {sub.packages.features.slice(0,5).map((f,i)=>(
                                <div key={i} className="tc-sub-feat"><CheckCircle size={11}/> {f}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─ DOCS ─ */}
              {detailTab==="docs"&&(
                <div className="tc-docs-tab-body">
                  {loadingUrls?(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,gap:12,color:"#9aafbf"}}>
                      <Loader size={22} className="spin"/> جاري تحميل المستندات...
                    </div>
                  ):signedUrls.length===0?(
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:14,color:"#9aafbf",paddingTop:60}}>
                      <FolderOpen size={52} color="#c8d6e4"/><p style={{fontSize:16,margin:0}}>لا توجد مستندات</p>
                    </div>
                  ):(
                    <>
                      {clientDocs.length>0&&(
                        <div className="tc-docs-group">
                          <div className="tc-docs-group-head">
                            <div className="tc-docs-group-head-icon" style={{background:"#f0fdfa"}}><FileText size={18} color="#0f766e"/></div>
                            <div className="tc-docs-group-title">مستندات المنشأة</div>
                            <span className="tc-docs-group-count">{clientDocs.length}</span>
                          </div>
                          {clientDocs.map((doc,i)=>(
                            <div key={i} className="tc-doc-row">
                              <div className="tc-doc-icon"><FileText size={18} color="#0f766e"/></div>
                              <div className="tc-doc-name">{doc.label}</div>
                              <div className="tc-doc-actions">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tc-doc-action" style={{color:"#0875dc",background:"#eaf4ff",borderColor:"#bddcff"}}><ExternalLink size={14}/></a>
                                <a href={doc.url} download className="tc-doc-action" style={{color:"#15803d",background:"#f0fdf4",borderColor:"#bbf7d0"}}><Download size={14}/></a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {ticketFiles.length>0&&(
                        <div className="tc-docs-group">
                          <div className="tc-docs-group-head">
                            <div className="tc-docs-group-head-icon" style={{background:"#fff7ed"}}><Paperclip size={18} color="#ea580c"/></div>
                            <div className="tc-docs-group-title">مرفقات التذكرة</div>
                            <span className="tc-docs-group-count">{ticketFiles.length}</span>
                          </div>
                          {ticketFiles.map((doc,i)=>(
                            <div key={i} className="tc-doc-row">
                              <div className="tc-doc-icon"><Paperclip size={18} color="#ea580c"/></div>
                              <div className="tc-doc-name">{doc.label.replace("مرفق: ","")}</div>
                              <div className="tc-doc-actions">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="tc-doc-action" style={{color:"#0875dc",background:"#eaf4ff",borderColor:"#bddcff"}}><ExternalLink size={14}/></a>
                                <a href={doc.url} download className="tc-doc-action" style={{color:"#15803d",background:"#f0fdf4",borderColor:"#bbf7d0"}}><Download size={14}/></a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─ ORDERS ─ */}
              {detailTab==="orders"&&(
                <div className="tc-orders-tab-body">
                  {relatedOrders.length===0?(
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:14,color:"#9aafbf",paddingTop:60}}>
                      <Briefcase size={52} color="#c8d6e4"/><p style={{fontSize:16,margin:0}}>لا توجد طلبات مرتبطة</p>
                    </div>
                  ):(<>
                    {relatedOrders.map(o=>(
                      <a key={o.id} href="/admin/orders" className="tc-order-card">
                        <div className="tc-order-icon"><Briefcase size={22} color="#ea580c"/></div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="tc-order-ref">{o.reference_no||o.id.slice(0,8).toUpperCase()}</div>
                          {o.service&&<div className="tc-order-svc">{o.service}</div>}
                        </div>
                        <span className="tc-order-status" style={{background:"#eaf4ff",color:"#0875dc"}}>{ORDER_STATUS_AR[o.status]??o.status}</span>
                      </a>
                    ))}
                    <a href="/admin/orders" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:4,fontSize:14,color:"#0875dc",fontWeight:700,textDecoration:"none"}}>
                      عرض جميع الطلبات <ExternalLink size={14}/>
                    </a>
                  </>)}
                </div>
              )}

            </div>
          </>
        )}
      </div>

    </div>

    {/* ── Time tracking modal ── */}
    {showTimeModal&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"grid",placeItems:"center"}} onClick={()=>setShowTimeModal(false)}>
        <div style={{background:"#fff",borderRadius:16,padding:24,width:340,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()} dir="rtl">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <Timer size={18} color="#073766"/><strong style={{fontSize:".9rem",color:"#073766"}}>تسجيل وقت</strong>
            {totalMinutes>0&&<span style={{marginRight:"auto",fontSize:".65rem",color:"#0875dc",fontWeight:800}}>إجمالي: {fmtMins(totalMinutes)}</span>}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:".63rem",fontWeight:700,color:"#425c76",marginBottom:4}}>الوقت (بالدقائق) *</div>
            <input value={timeMinutes} onChange={e=>setTimeMinutes(e.target.value)} type="number" min="1" placeholder="30"
              style={{width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",font:"inherit",fontSize:".73rem",boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:".63rem",fontWeight:700,color:"#425c76",marginBottom:4}}>ملاحظة (اختياري)</div>
            <input value={timeNote} onChange={e=>setTimeNote(e.target.value)} placeholder="مراجعة المستندات..."
              style={{width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",font:"inherit",fontSize:".73rem",boxSizing:"border-box"}}/>
          </div>
          {timeLogs.length>0&&(
            <div style={{background:"#f8fafc",border:"1px solid #e4ebf2",borderRadius:10,padding:"8px 10px",marginBottom:12,maxHeight:120,overflowY:"auto"}}>
              {timeLogs.map(l=>(
                <div key={l.id} style={{display:"flex",justifyContent:"space-between",fontSize:".6rem",color:"#526983",padding:"3px 0",borderBottom:"1px solid #f0f4f8"}}>
                  <span>{l.profiles?.full_name} — {l.note||"—"}</span>
                  <span style={{fontWeight:800,color:"#073766"}}>{fmtMins(l.minutes)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowTimeModal(false)} style={{flex:1,border:"1px solid #dfe8f1",borderRadius:9,background:"#f4f7fb",color:"#526983",font:"inherit",fontSize:".7rem",fontWeight:700,cursor:"pointer",padding:"9px"}}>إلغاء</button>
            <button onClick={logTime} disabled={loggingTime||!timeMinutes} style={{flex:2,border:0,borderRadius:9,background:"#073766",color:"#fff",font:"inherit",fontSize:".7rem",fontWeight:700,cursor:"pointer",padding:"9px",opacity:loggingTime||!timeMinutes?1:.5}}>
              {loggingTime?"جاري الحفظ...":"تسجيل"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Merge modal ── */}
    {showMergeModal&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"grid",placeItems:"center"}} onClick={()=>setShowMergeModal(false)}>
        <div style={{background:"#fff",borderRadius:16,padding:24,width:380,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()} dir="rtl">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <GitMerge size={18} color="#073766"/><strong style={{fontSize:".9rem",color:"#073766"}}>دمج تذكرة</strong>
          </div>
          <p style={{fontSize:".65rem",color:"#7f8e9f",marginBottom:16,lineHeight:1.6}}>
            ادخل رقم التذكرة التي تريد دمجها <strong>في</strong> هذه التذكرة (<code>#{selected?.id.slice(0,7).toUpperCase()}</code>). سيتم نقل رسائلها هنا وإغلاقها.
          </p>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:".63rem",fontWeight:700,color:"#425c76",marginBottom:4}}>رقم التذكرة المصدر *</div>
            <input value={mergeTarget} onChange={e=>setMergeTarget(e.target.value)} placeholder="xxxxxxx"
              style={{width:"100%",border:"1.5px solid #dfe8f1",borderRadius:9,padding:"8px 12px",font:"inherit",fontSize:".73rem",boxSizing:"border-box",direction:"ltr"}}/>
          </div>
          <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:9,padding:"8px 12px",fontSize:".62rem",color:"#b45309",marginBottom:16}}>
            ⚠ هذه العملية لا يمكن التراجع عنها
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowMergeModal(false)} style={{flex:1,border:"1px solid #dfe8f1",borderRadius:9,background:"#f4f7fb",color:"#526983",font:"inherit",fontSize:".7rem",fontWeight:700,cursor:"pointer",padding:"9px"}}>إلغاء</button>
            <button onClick={doMerge} disabled={merging||!mergeTarget.trim()} style={{flex:2,border:0,borderRadius:9,background:"#073766",color:"#fff",font:"inherit",fontSize:".7rem",fontWeight:700,cursor:"pointer",padding:"9px",opacity:merging||!mergeTarget.trim()?1:.5}}>
              {merging?"جاري الدمج...":"دمج الآن"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
