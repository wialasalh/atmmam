/**
 * One-time migration: backfill `profiles` rows for existing client users
 * who registered before the registration route was updated to create profiles.
 *
 * Usage:
 *   npx tsx scripts/backfill-client-profiles.ts
 *
 * This script requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
 * to be set in the environment or .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {
  // .env.local might not exist, rely on process.env
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Fetch all auth users (paginated)
  const allUsers: any[] = [];
  let page = 0;
  const perPage = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page: page + 1,
      perPage,
    });
    if (error) {
      console.error("Error listing users:", error.message);
      process.exit(1);
    }
    const users = data?.users || [];
    allUsers.push(...users);
    hasMore = users.length === perPage;
    page++;
  }

  console.log(`Total auth users: ${allUsers.length}`);

  // Filter to client users
  const clientUsers = allUsers.filter((u) => u.user_metadata?.role === "client");
  console.log(`Client users found: ${clientUsers.length}`);

  // Get existing profiles
  const { data: existingProfiles, error: profileError } = await serviceClient
    .from("profiles")
    .select("id");

  if (profileError) {
    console.error("Error fetching profiles:", profileError.message);
    process.exit(1);
  }

  const existingIds = new Set(existingProfiles?.map((p: any) => p.id) || []);

  // Find clients missing profiles
  const missing = clientUsers.filter((u) => !existingIds.has(u.id));
  console.log(`Client users missing profiles: ${missing.length}`);

  if (missing.length === 0) {
    console.log("All client users already have profiles. Nothing to do.");
    return;
  }

  // Create missing profiles
  let created = 0;
  let errors = 0;

  for (const user of missing) {
    const meta = user.user_metadata || {};
    const { error: insertError } = await serviceClient.from("profiles").upsert(
      {
        id: user.id,
        email: user.email || "",
        full_name: meta.full_name || user.email?.split("@")[0] || "عميل",
        phone: meta.phone || "",
        role: "client",
        avatar_url: meta.avatar_url || null,
        created_at: user.created_at || new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (insertError) {
      console.error(`  Error inserting profile for ${user.email}: ${insertError.message}`);
      errors++;
    } else {
      console.log(`  Created profile for ${user.email} (${user.id.slice(0, 8)}...)`);
      created++;
    }
  }

  console.log(`\nDone: ${created} profiles created, ${errors} errors.`);
}

main().catch(console.error);
