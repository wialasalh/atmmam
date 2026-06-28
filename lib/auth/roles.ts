const STAFF_ROLES = ["admin", "manager", "operator", "viewer"] as const;

export function isStaffRole(role: string | undefined | null): boolean {
  return STAFF_ROLES.includes(role as any);
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin";
}
