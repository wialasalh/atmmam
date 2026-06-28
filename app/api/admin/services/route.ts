import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminService, listAdminServices, updateAdminService } from "@/lib/data/admin-services";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/data/admin-team";

export const dynamic="force-dynamic";
function failure(error:unknown){if(error instanceof ZodError)return NextResponse.json({error:"validation_error",issues:error.issues},{status:400});return NextResponse.json({error:error instanceof Error?error.message:"unknown_error"},{status:500})}
export async function GET(){if(!isSupabaseConfigured())return NextResponse.json({error:"database_not_configured"},{status:503});try{await requireRole("manager");return NextResponse.json({data:await listAdminServices()})}catch(error){return failure(error)}}
export async function POST(request:Request){if(!isSupabaseConfigured())return NextResponse.json({error:"database_not_configured"},{status:503});try{await requireRole("manager");return NextResponse.json({data:await createAdminService(await request.json())},{status:201})}catch(error){return failure(error)}}
export async function PATCH(request:Request){if(!isSupabaseConfigured())return NextResponse.json({error:"database_not_configured"},{status:503});try{await requireRole("manager");return NextResponse.json({data:await updateAdminService(await request.json())})}catch(error){return failure(error)}}
