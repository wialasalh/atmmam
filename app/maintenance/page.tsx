import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div dir="rtl" style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #073766 0%, #0a4a8a 100%)",
      fontFamily: "inherit", padding: 24,
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, padding: "48px 40px", maxWidth: 480,
        width: "100%", textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,.25)",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: "#eff6ff",
          display: "grid", placeItems: "center", margin: "0 auto 20px",
        }}>
          <Wrench size={34} color="#0875dc" />
        </div>
        <h1 style={{ margin: "0 0 10px", fontSize: "1.6rem", fontWeight: 900, color: "#073766" }}>
          الموقع تحت الصيانة
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: ".85rem", color: "#7f8e9f", lineHeight: 1.7 }}>
          نعمل على تحسين موقعنا لنقدم لك تجربة أفضل.
          سنعود قريباً، شكراً لصبرك.
        </p>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 20px", background: "#f4f7fb", borderRadius: 12,
          fontSize: ".75rem", color: "#526983", fontWeight: 600,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#f59e0b",
            animation: "pulse 2s infinite",
          }} />
          جاري العمل على الإصلاحات...
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    </div>
  );
}
