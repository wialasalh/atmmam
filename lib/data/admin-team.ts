import "server-only";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { updateProfileRoleSchema } from "@/lib/validation/admin";

const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceClient = serviceRole && supabaseUrl
  ? createClient(supabaseUrl, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

export async function listAdminTeam() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,phone,avatar_url,active,super_admin,created_at,updated_at")
    .neq("role", "client")
    .order("full_name");
  if (error) throw new Error(`Unable to list team: ${error.message}`);

  const { data: { user } } = await supabase.auth.getUser();

  if (serviceClient) {
    const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers();
    if (!authError && authUsers?.users) {
      const emailMap = new Map(authUsers.users.map((u: { id: string; email?: string }) => [u.id, u.email || ""]));
      return {
        currentUserId: user?.id || "",
        members: data.map((profile: { id: string }) => ({
          ...profile,
          email: emailMap.get(profile.id) || "",
        })),
      };
    }
  }
  return { currentUserId: user?.id || "", members: data };
}

export async function createTeamMember(input: { email: string; password: string; fullName: string; role: string; phone?: string }) {
  if (!serviceClient) throw new Error("service_role_not_configured");

  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: input.role, phone: input.phone || "" },
  });
  if (authError) throw new Error(authError.message);

  const supabase = await createSupabaseServerClient();
  const { data: { user: actor } } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    actor_id: actor?.id || null,
    entity_type: "profile",
    entity_id: authUser.user.id,
    action: "user_created",
    metadata: { email: input.email, role: input.role, full_name: input.fullName },
  });

  revalidatePath("/admin/team");
  return authUser.user;
}

export async function inviteTeamMember(input: { email: string; role: string; invitedBy: string }) {
  if (!serviceClient) throw new Error("service_role_not_configured");

  const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(input.email, {
    data: { role: input.role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/overview`,
  });
  if (error) throw new Error(error.message);

  const token = crypto.randomUUID();
  const supabase = await createSupabaseServerClient();
  await supabase.from("team_invitations").insert({
    email: input.email,
    role: input.role,
    invited_by: input.invitedBy,
    token,
  });

  const { data: { user: actor2 } } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    actor_id: actor2?.id || null,
    entity_type: "team_invitation",
    entity_id: data.user?.id || input.email,
    action: "user_invited",
    metadata: { email: input.email, role: input.role },
  });

  revalidatePath("/admin/team");
  return { user: data.user, token };
}

export async function changeTeamMemberPassword(input: { profileId: string; newPassword: string }) {
  if (!serviceClient) throw new Error("service_role_not_configured");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  // Check if target is super_admin and requester is not the same user
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("super_admin")
    .eq("id", input.profileId)
    .single();
  if (targetError) throw new Error("target_not_found");
  if (target.super_admin && user.id !== input.profileId) {
    throw new Error("لا يمكن تغيير كلمة مرور المشرف الرئيسي إلا بواسطته");
  }

  const { data, error } = await serviceClient.auth.admin.updateUserById(input.profileId, {
    password: input.newPassword,
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    entity_type: "profile",
    entity_id: input.profileId,
    action: "password_changed",
    metadata: {},
  });

  revalidatePath("/admin/team");
  return data.user;
}

export async function updateTeamMember(input: { profileId: string; role?: string; active?: boolean; fullName?: string; phone?: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  // Prevent changing super_admin role or deactivating them
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("super_admin")
    .eq("id", input.profileId)
    .single();
  if (targetError) throw new Error("target_not_found");
  if (target.super_admin && user.id !== input.profileId) {
    throw new Error("لا يمكن تعديل المشرف الرئيسي إلا بواسطته");
  }

  const changes: Record<string, unknown> = {};
  if (input.role) changes.role = input.role;
  if (input.active !== undefined) changes.active = input.active;
  if (input.fullName) changes.full_name = input.fullName;
  if (input.phone !== undefined) changes.phone = input.phone;

  const { data, error } = await supabase
    .from("profiles")
    .update(changes)
    .eq("id", input.profileId)
    .select()
    .single();
  if (error) throw new Error(`Unable to update team member: ${error.message}`);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    entity_type: "profile",
    entity_id: input.profileId,
    action: "profile_updated",
    metadata: changes,
  });

  revalidatePath("/admin/team");
  return data;
}

export async function deleteTeamMember(profileId: string) {
  if (!serviceClient) throw new Error("service_role_not_configured");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  // Get target member's role
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("role, super_admin")
    .eq("id", profileId)
    .single();
  if (targetError) throw new Error("target_not_found");

  // Get requester's super_admin status
  const { data: requester, error: requesterError } = await supabase
    .from("profiles")
    .select("super_admin")
    .eq("id", user.id)
    .single();
  if (requesterError) throw new Error("requester_not_found");

  // Only super_admin can delete admin accounts
  if (target.role === "admin" && !requester.super_admin) {
    throw new Error("لا يمكن حذف مدير النظام إلا بواسطة المشرف الرئيسي");
  }

  // Cannot delete the main super admin
  if (target.super_admin) {
    throw new Error("لا يمكن حذف المشرف الرئيسي");
  }

  const { error: authError } = await serviceClient.auth.admin.deleteUser(profileId);
  if (authError) throw new Error(authError.message);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    entity_type: "profile",
    entity_id: profileId,
    action: "user_deleted",
    metadata: {},
  });

  revalidatePath("/admin/team");
  return { success: true };
}

export async function listInvitations() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("team_invitations")
    .select("*, invited_profile:invited_by(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to list invitations: ${error.message}`);
  return data;
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("team_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId)
    .select()
    .single();
  if (error) throw new Error(`Unable to cancel invitation: ${error.message}`);

  await supabase.from("audit_logs").insert({
    actor_id: user?.id || null,
    entity_type: "team_invitation",
    entity_id: invitationId,
    action: "invitation_cancelled",
    metadata: {},
  });

  revalidatePath("/admin/team");
  return data;
}
