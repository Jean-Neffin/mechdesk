"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function SortdPage() {
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const check = () => setDark(localStorage.getItem("md-theme") === "dark");
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  const bg = dark ? "#141828" : "#FFFFFF";
  const border = dark ? "#252D42" : "#E5E7EB";
  const text = dark ? "#F0F4FF" : "#1E1B4B";
  const muted = dark ? "#252D42" : "#E5E7EB";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ background: bg, borderBottom: `1px solid ${border}`, height: 48, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0, zIndex: 10, transition: "background 300ms ease" }}>
        <Link href="/" style={{ fontSize: 13, color: "#6366F1", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          ← MechDesk
        </Link>
        <span style={{ color: muted }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: text }}>Sortd — Project Group Generator</span>
        <ThemeToggle />
      </header>

      {/* Loading overlay */}
      {!loaded && (
        <div style={{
          position: "absolute", top: 48, left: 0, right: 0, bottom: 0,
          background: dark ? "#0F1120" : "#F5F4FF",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 16, zIndex: 5,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "3px solid #EEF2FF",
            borderTop: "3px solid #6366F1",
            animation: "spin 700ms linear infinite",
          }} />
          <span style={{ fontSize: 13, color: "#6B7280" }}>Loading Sortd...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <iframe
        src="/sortd-app/index.html"
        style={{ flex: 1, border: "none", width: "100%", opacity: loaded ? 1 : 0, transition: "opacity 300ms ease" }}
        title="Sortd"
        onLoad={(e) => {
          setLoaded(true);
          try {
            const doc = (e.target as HTMLIFrameElement).contentDocument;
            if (doc) {
              const style = doc.createElement('style');
              style.textContent = '#theme-toggle { display: none !important; }';
              doc.head.appendChild(style);
            }
          } catch {}
        }}
      />
    </div>
  );
}
