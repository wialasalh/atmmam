"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: "40px 20px", textAlign: "center", direction: "rtl" }}>
          <AlertTriangle size={32} style={{ marginBottom: 8 }} />
          <h2 style={{ fontSize: ".9rem", color: "#dc2626", margin: "0 0 6px" }}>حدث خطأ غير متوقع</h2>
          <p style={{ fontSize: ".7rem", color: "#6b7280" }}>{this.state.error?.message || ""}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ marginTop: 12, padding: "8px 20px", background: "#0875dc", color: "#fff", border: "none", borderRadius: 8, fontSize: ".75rem", cursor: "pointer" }}>
            إعادة تحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
