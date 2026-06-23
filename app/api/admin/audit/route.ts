import { NextResponse } from "next/server";
import { listAuditLogs } from "@/lib/data/admin-audit";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic="force-dynamic";
export async function GET(request:Request){if(!isSupabaseConfigured())return NextResponse.json({error:"database_not_configured"},{status:503});try{const limit=Number(new URL(request.url).searchParams.get("limit")??100);return NextResponse.json({data:await listAuditLogs(limit)})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"unknown_error"},{status:500})}}
