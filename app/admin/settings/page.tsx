"use client";

import { useEffect, useState } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";

type Role="admin"|"manager"|"operator"|"viewer";
type TeamMember={id?:string;full_name:string;contact:string;role:Role;active:boolean};
type AuditLog={id:number;entity_type:string;entity_id:string;action:string;created_at:string;profiles?:{full_name?:string}|null};
const roleLabels:Record<Role,string>={admin:"مدير النظام",manager:"مدير عمليات",operator:"موظف عمليات",viewer:"مشاهد"};
const fallbackTeam:TeamMember[]=[{full_name:"admin",contact:"admin@atmmam.com.sa",role:"admin",active:true}];

export default function SettingsPage(){
  const [tab,setTab]=useState("الفريق والصلاحيات");const [team,setTeam]=useState(fallbackTeam);const [auditLogs,setAuditLogs]=useState<AuditLog[]>([]);const [databaseMode,setDatabaseMode]=useState(false);const [notice,setNotice]=useState("");
  async function loadTeam(){const response=await fetch("/api/admin/team");if(!response.ok)return false;const payload=await response.json() as {data:Array<{id:string;full_name:string;phone?:string|null;role:Role;active:boolean}>};setTeam(payload.data.map((member)=>({id:member.id,full_name:member.full_name,contact:member.phone??"لا يوجد رقم مسجل",role:member.role,active:member.active})));setDatabaseMode(true);return true}
  useEffect(()=>{if(process.env.NEXT_PUBLIC_SUPABASE_URL)void loadTeam()},[]);
  useEffect(()=>{if(tab==="الأمان وسجل الدخول"&&databaseMode)void fetch("/api/admin/audit?limit=50").then(async(response)=>{if(response.ok){const payload=await response.json() as {data:AuditLog[]};setAuditLogs(payload.data)}})},[tab,databaseMode]);
  async function changeRole(member:TeamMember,role:Role){if(!databaseMode||!member.id){setTeam((current)=>current.map((item)=>item===member?{...item,role}:item));return}const response=await fetch("/api/admin/team",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({profileId:member.id,role})});if(!response.ok){setNotice("تعذر تحديث الصلاحية؛ يلزم حساب مدير النظام");return}await loadTeam();setNotice("تم تحديث الصلاحية وتسجيلها");window.setTimeout(()=>setNotice(""),2200)}
  let panel:React.ReactNode;
  if(tab==="الفريق والصلاحيات")panel=team.map((member)=><div className="team-settings-row" key={member.id??member.contact}><i>{member.full_name.charAt(0)}</i><div><strong>{member.full_name}</strong><small>{member.contact}</small></div><select value={member.role} onChange={(event)=>void changeRole(member,event.target.value as Role)} aria-label={`صلاحية ${member.full_name}`}>{(Object.keys(roleLabels) as Role[]).map((role)=><option value={role} key={role}>{roleLabels[role]}</option>)}</select><span>{member.active?"نشط":"موقوف"}</span></div>);
  else if(tab==="بيانات الحساب")panel=<form action="/admin/logout" method="post"><p className="follow-empty">يمكنك إنهاء الجلسة الحالية بأمان من هنا.</p><button className="ops-new" type="submit">تسجيل الخروج</button></form>;
  else if(tab==="الأمان وسجل الدخول")panel=databaseMode?<div className="audit-list">{auditLogs.map((log)=><article key={log.id}><div><strong>{log.action}</strong><small>{log.entity_type} · {log.entity_id}</small></div><span>{log.profiles?.full_name??"النظام"}</span><time>{new Date(log.created_at).toLocaleString("ar-SA")}</time></article>)}{!auditLogs.length?<div className="follow-empty">لا توجد أحداث مسجلة بعد.</div>:null}</div>:<div className="follow-empty">سيظهر سجل التدقيق بعد ربط Supabase.</div>;
  else panel=<div className="follow-empty">تُدار التنبيهات من المتابعات والمواعيد حاليًا.</div>;
  return <main className="ops-shell" dir="rtl"><AdminOpsHeader active="settings"/><section className="settings-page"><div className="settings-heading"><p>إدارة النظام</p><h1>الإعدادات</h1><span>إدارة الفريق والصلاحيات والتنبيهات وبيانات الحساب.</span></div><div className="settings-grid"><nav className="settings-nav">{["الفريق والصلاحيات","بيانات الحساب","التنبيهات","الأمان وسجل الدخول"].map((item)=><button className={tab===item?"active":""} onClick={()=>setTab(item)} key={item}>{item}</button>)}</nav><section className="settings-panel"><h2>{tab}</h2><p>{tab==="الفريق والصلاحيات"?"الصلاحية تطبق على الخادم وقاعدة البيانات، وليس على إظهار الواجهة فقط.":databaseMode?"هذه الإعدادات متصلة بملف النظام المؤسسي.":"ستتصل هذه الإعدادات بملف النظام عند ربط Supabase."}</p>{panel}</section></div></section>{notice?<div className="ops-toast">✓ {notice}</div>:null}</main>
}
