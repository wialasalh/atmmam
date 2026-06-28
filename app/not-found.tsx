export default function NotFound() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f8fc",
        color: "#073766",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1 style={{ fontSize: "3rem", fontWeight: 800, margin: "0 0 12px" }}>
        الصفحة غير موجودة
      </h1>
      <p style={{ fontSize: "1rem", color: "#7a8fa6", margin: "0 0 24px", maxWidth: 400 }}>
        عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 24px",
          borderRadius: 8,
          background: "#0875dc",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: ".9rem",
        }}
      >
        ← العودة إلى الرئيسية
      </a>
    </main>
  );
}
