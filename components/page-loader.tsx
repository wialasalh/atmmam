"use client";

import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  text?: string;
}

export default function PageLoader({ text = "جاري التحميل..." }: PageLoaderProps) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "grid",
        placeItems: "center",
        background: "#f4f7fb",
        padding: 24,
      }}
    >
      <div style={{
        minWidth: 200,
        border: "1px solid #dfe8f1",
        borderRadius: 14,
        background: "#fff",
        boxShadow: "0 10px 30px rgba(7,55,102,.08)",
        padding: "22px 28px",
        display: "grid",
        justifyItems: "center",
        gap: 10,
        fontSize: ".74rem",
        fontWeight: 800,
        color: "#61748a",
      }}>
        <Loader2 size={24} color="#0875dc" style={{ animation: "spin .7s linear infinite" }} />
        <span>{text}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
