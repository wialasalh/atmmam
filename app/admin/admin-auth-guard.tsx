"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setAuthed(true);
      return;
    }

    const check = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const staffRoles = ["admin", "manager", "operator", "viewer"];
      if (!profile || !staffRoles.includes(profile.role)) {
        router.replace("/dashboard");
        return;
      }
      setAuthed(true);
    };
    check();
  }, [pathname, router]);

  if (!authed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f8fc" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #e5eaf0", borderTopColor: "#0875dc", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return children;
}
