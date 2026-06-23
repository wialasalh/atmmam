import type { Metadata } from "next";
import { Header } from "@/components/header";
import { SupportShell } from "@/components/support-shell";

export const metadata: Metadata = {
  title: "الدعم الفني",
  description: "قسم الدعم الفني ونظام التذاكر لعملاء أتمم.",
};

export default function SupportPage() {
  return (
    <>
      <Header />
      <main>
        <SupportShell />
      </main>
    </>
  );
}
