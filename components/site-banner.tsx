"use client";

import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type BannerData = {
  enabled: boolean; text: string; link: string; linkLabel: string;
  type: "info" | "success" | "warning" | "promo";
};

const COLORS = {
  info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
  warning: { bg: "#fff7ed", border: "#fed7aa", color: "#b45309" },
  promo:   { bg: "#073766", border: "#073766", color: "#fff"    },
};

export function SiteBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content")
      .then(r => r.json())
      .then(j => { if (j.data?.banner?.data?.enabled) setBanner(j.data.banner.data); })
      .catch(() => {});
  }, []);

  if (!banner || closed || !banner.text) return null;

  const c = COLORS[banner.type] ?? COLORS.info;

  return (
    <div dir="rtl" style={{
      background: c.bg,
      borderBottom: `1px solid ${c.border}`,
      color: c.color,
      padding: "9px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: ".75rem",
      fontWeight: 700,
      lineHeight: 1.4,
      position: "relative",
    }}>
      <Megaphone size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{banner.text}</span>
      {banner.link && banner.linkLabel && (
        <a href={banner.link} style={{
          padding: "3px 12px",
          borderRadius: 8,
          border: `1.5px solid ${c.color}`,
          color: c.color,
          textDecoration: "none",
          fontSize: ".65rem",
          fontWeight: 800,
          whiteSpace: "nowrap",
          opacity: .9,
          flexShrink: 0,
        }}>{banner.linkLabel}</a>
      )}
      <button onClick={() => setClosed(true)} style={{
        border: "none", background: "none", cursor: "pointer",
        color: c.color, opacity: .6, display: "grid", placeItems: "center",
        padding: 2, borderRadius: 4, flexShrink: 0,
      }} title="إغلاق"><X size={14} /></button>
    </div>
  );
}
