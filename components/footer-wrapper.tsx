"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

export function FooterWrapper() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;
  return <Footer />;
}
