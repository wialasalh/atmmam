import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminClient, listAdminClients } from "@/lib/data/admin-clients";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export async function GET() { if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 }); try { return NextResponse.json({ data: await listAdminClients() }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 }); } }
export async function POST(request: Request) { if (!isSupabaseConfigured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 }); try { return NextResponse.json({ data: await createAdminClient(await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "validation_error", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 }); } }
