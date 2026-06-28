import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://xirvdupifmwzqyyslpuf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpcnZkdXBpZm13enF5eXNscHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjEyMjM2MSwiZXhwIjoyMDk3Njk4MzYxfQ.aKZ4omFteQKdwmL1jhtq1FHzALstGqYPrVa5bNUSPvs"
);

async function main() {
  const sql = readFileSync(
    "/Users/hasanm/Desktop/atmmam/supabase/migrations/202606300001_packages_and_subscriptions.sql",
    "utf-8"
  );

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc("exec_sql", { query: stmt + ";" });
      if (error) {
        // Try direct query
        const { error: e2 } = await supabase.from("_exec_sql").select().limit(1);
        if (e2) {
          console.log("Skipping (non-fatal):", stmt.substring(0, 80));
        }
      }
    } catch (e: any) {
      console.log("Error:", e.message, "for:", stmt.substring(0, 80));
    }
  }

  // Test if tables exist
  const { data: packages, error: pErr } = await supabase
    .from("packages")
    .select("id")
    .limit(1);
  if (pErr) {
    console.log("packages table error:", pErr.message);
  } else {
    console.log("packages table OK");
  }

  const { data: subs, error: sErr } = await supabase
    .from("subscriptions")
    .select("id")
    .limit(1);
  if (sErr) {
    console.log("subscriptions table error:", sErr.message);
  } else {
    console.log("subscriptions table OK");
  }
}

main().catch(console.error);
