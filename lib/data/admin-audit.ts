import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listAuditLogs(limit=100){const supabase=await createSupabaseServerClient();const {data,error}=await supabase.from("audit_logs").select("id,entity_type,entity_id,action,metadata,created_at,profiles(full_name)").order("created_at",{ascending:false}).limit(Math.min(Math.max(limit,1),200));if(error)throw new Error(`Unable to list audit logs: ${error.message}`);return data}
