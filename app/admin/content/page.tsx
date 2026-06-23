"use client";

import { useState } from "react";
import { AdminOpsHeader } from "@/components/admin-ops-header";

const sections = [["الواجهة الرئيسية","العنوان الرئيسي، التعريف، وأزرار البدء","محدث","/"],["خدماتنا","الخدمات المعروضة وترتيب ظهورها","محدث","/#services"],["الباقات","الباقات والأسعار والمزايا","يحتاج مراجعة","/packages"],["آراء العملاء","الشهادات المنشورة في الرئيسية","محدث","/#testimonials"],["الأسئلة الشائعة","الأسئلة والأجوبة المنشورة","محدث","/faq"],["دليل الأعمال","محتوى الأدلة والمقالات","محدث","/business-guide"]];

export default function ContentPage() {
  const [query,setQuery] = useState("");
  return <main className="ops-shell" dir="rtl"><AdminOpsHeader active="content" /><section className="content-page"><div className="secondary-heading"><div><p>إدارة الموقع</p><h1>المحتوى</h1><span>فهرس أقسام الموقع وحالة مراجعتها قبل ربط نظام النشر.</span></div><a href="/" target="_blank" rel="noreferrer">معاينة الموقع ↗</a></div><label className="content-search">⌕<input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="ابحث في أقسام المحتوى..." /></label><div className="content-list">{sections.filter((item)=>item.join(" ").includes(query)).map((section,index)=><article key={section[0]}><span>{String(index+1).padStart(2,"0")}</span><div><h2>{section[0]}</h2><p>{section[1]}</p></div><em className={section[2] === "محدث" ? "ready" : "review"}>{section[2]}</em><small>آخر مراجعة: 22 يونيو 2026</small><a className="client-open" href={section[3]} target="_blank" rel="noreferrer">فتح القسم ↗</a></article>)}</div></section></main>;
}
