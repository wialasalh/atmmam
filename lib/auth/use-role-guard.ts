"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  operator: 1,
  manager: 2,
  admin: 3,
};

export function useRoleGuard(minRole: "viewer" | "operator" | "manager" | "admin") {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me").then(async (r) => {
      if (cancelled) return;
      if (r.ok) {
        const { data } = await r.json();
        const userRole = data?.role;
        setRole(userRole);
        setUserName(data?.full_name || "");
        setUserEmail(data?.email || "");
        setUserAvatar(data?.avatar_url || "");
        const isStaff = userRole && ROLE_HIERARCHY[userRole] !== undefined;
        if (!isStaff) {
          routerRef.current.replace("/dashboard");
          return;
        }
        if ((ROLE_HIERARCHY[userRole] ?? -1) < (ROLE_HIERARCHY[minRole] ?? 0)) {
          routerRef.current.replace("/admin");
        }
      } else {
        routerRef.current.replace("/admin/login");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [minRole]);

  return {
    role,
    loading,
    userName,
    userEmail,
    userAvatar,
    isStaff: role && ROLE_HIERARCHY[role] !== undefined && ROLE_HIERARCHY[role] >= 0,
  };
}
