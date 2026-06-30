"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "./admin-sidebar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UserData = {
  role: string;
  name: string;
  email: string;
  avatarUrl: string;
  permissions?: string[];
};

export default function AdminShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userData, setUserData] = useState<UserData>({ role: "", name: "", email: "", avatarUrl: "" });
  const [notifCount, setNotifCount] = useState(0);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) { setReady(true); return; }
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) {
          setUserData({
            role: data.data.role || "",
            name: data.data.full_name || "",
            email: data.data.email || "",
            avatarUrl: data.data.avatar_url || "",
            permissions: data.data.permissions || [],
          });
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    function fetchNotifs() {
      fetch("/api/notifications")
        .then(r => r.ok && r.json())
        .then(d => { if (d) setNotifCount(d.count || 0); })
        .catch(() => {});
    }
    fetchNotifs();
    // Realtime via Supabase channel
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchNotifs())
      .subscribe();
    const interval = setInterval(fetchNotifs, 60000);
    return () => { clearInterval(interval); void supabase.removeChannel(channel); };
  }, [isLoginPage]);

  const handleLogout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }, [router]);

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f8fc" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #e5eaf0", borderTopColor: "#0875dc", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isLoginPage) return children;

  return (
    <AdminSidebar
      role={userData.role}
      name={userData.name}
      email={userData.email}
      avatarUrl={userData.avatarUrl}
      notifCount={notifCount}
      onLogout={handleLogout}
      permissions={userData.permissions}
    >
      {children}
    </AdminSidebar>
  );
}
