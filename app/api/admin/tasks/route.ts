import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminTask, listAdminTasks, updateAdminTask } from "@/lib/data/admin-tasks";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic="force-dynamic";
function failure(error:unknown){if(error instanceof ZodError)return NextResponse.json({error:"validation_error",issues:error.issues},{status:400});return NextResponse.json({error:error instanceof Error?error.message:"unknown_error"},{status:500})}
export async function GET(){if(!isSupabaseConfigured())return NextResponse.json({error:"database_not_configured"},{status:503});try{return NextResponse.json({data:await listAdminTasks()})}catch(error){return failure(error)}}
export async function POST(request:Request){if(!isSupabaseConfigured())return NextResponse.json({error:"database_not_configured"},{status:503});try{return NextResponse.json({data:await createAdminTask(await request.json())},{status:201})}catch(error){return failure(error)}}
export async function PATCH(request:Request){if(!isSupabaseConfigured())return NextResponse.json({error:"database_not_configured"},{status:503});try{return NextResponse.json({data:await updateAdminTask(await request.json())})}catch(error){return failure(error)}}
