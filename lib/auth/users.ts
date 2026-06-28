import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

type AuthUser = { id: string; email?: string; user_metadata?: { full_name?: string } };

let _serviceClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _serviceClient;
}

const _getAllAuthUsersImpl = cache(async (): Promise<AuthUser[]> => {
  const client = getClient();
  const all: AuthUser[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) break;
    if (!data?.users?.length) break;
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  return all;
});

export const getAllAuthUsers = _getAllAuthUsersImpl;

export function buildUserMap(users: AuthUser[]): Record<string, { full_name: string; email: string }> {
  const map: Record<string, { full_name: string; email: string }> = {};
  for (const u of users) {
    map[u.id] = {
      full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "مستخدم",
      email: u.email || "",
    };
  }
  return map;
}
