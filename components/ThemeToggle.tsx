"use client";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("md-theme") === "dark";
    setDark(saved);
    document.documentElement.dataset.theme = saved ? "dark" : "light";
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const theme = next ? "dark" : "light";
    localStorage.setItem("md-theme", theme);
    document.documentElement.dataset.theme = theme;
    // Sync iframe if present
    try {
      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      if (iframe?.contentDocument)
        iframe.contentDocument.documentElement.dataset.theme = theme;
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: dark ? "#221F3A" : "#EEF0FF",
        border: `1px solid ${dark ? "#2E2B4A" : "#DDD9F7"}`,
        borderRadius: 20,
        width: 56, height: 28,
        cursor: "pointer",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 5px",
        flexShrink: 0,
        transition: "background 300ms ease",
        position: "relative",
      }}
      aria-label="Toggle theme"
    >
      <span>☀️</span>
      <span>🌙</span>
      <span style={{
        position: "absolute",
        top: 3, left: dark ? "calc(100% - 25px)" : 3,
        width: 22, height: 22,
        background: "#6366F1",
        borderRadius: "50%",
        transition: "left 300ms ease",
      }} />
    </button>
  );
}
