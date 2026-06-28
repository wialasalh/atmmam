import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/data/admin-team";
import { readFileSync } from "fs";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    await requireRole("admin");

    const sql = readFileSync(
      process.cwd() + "/supabase/migrations/202606300001_packages_and_subscriptions.sql",
      "utf-8"
    );

    // Use pg to run migration directly through Supabase pooler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const projectRef = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!projectRef) {
      return NextResponse.json({ error: "invalid supabase url" }, { status: 500 });
    }

    const pool = new Pool({
      host: "aws-0-us-east-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: projectRef,
      password: serviceKey,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    try {
      await pool.query(sql);
      return NextResponse.json({ success: true, message: "Migration applied successfully" });
    } catch (pgErr: any) {
      // Try alternative connection approach
      return NextResponse.json({
        error: `Database migration failed: ${pgErr.message}`,
        hint: "Apply the migration manually via Supabase dashboard SQL editor.",
        sqlPreview: sql.substring(0, 200) + "...",
      }, { status: 500 });
    } finally {
      await pool.end();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
