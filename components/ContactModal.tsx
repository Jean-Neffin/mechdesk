"use client";
import { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";

// ── Plug in your EmailJS credentials ──
const SERVICE_ID  = "service_42z2w9l";
const TEMPLATE_ID = "template_3s40hpp";
const PUBLIC_KEY  = "R45AILF-pljkPUml6";

interface Props {
  onClose: () => void;
}

export default function ContactModal({ onClose }: Props) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus]   = useState<"idle"|"sending"|"sent"|"error">("idle");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const send = async () => {
    if (!name.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        from_name: name,
        email,
        message,
        to_email: "jeanneffin2003@gmail.com",
      }, PUBLIC_KEY);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px",
    background: "var(--surface-2, #F1F3F9)",
    border: "1px solid var(--border, #E2E6F0)",
    borderRadius: 8, fontSize: 14,
    color: "var(--text-100, #0F172A)",
    fontFamily: "inherit", outline: "none",
    transition: "border-color 150ms ease",
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200,
        animation: "fadeIn 150ms ease",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #E2E6F0)",
        borderRadius: 16,
        padding: 32,
        width: "100%", maxWidth: 440,
        margin: "0 16px",
        boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
        animation: "slideUp 180ms ease",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--blue-500, #3B82F6)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
              Get in touch
            </div>
            <h2 style={{ fontFamily: "var(--serif, serif)", fontSize: 24, color: "var(--text-100, #0F172A)", fontWeight: 400 }}>
              Contact Jean
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-400, #94A3B8)", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, color: "var(--text-100, #0F172A)", fontWeight: 500, marginBottom: 6 }}>Message sent!</div>
            <div style={{ fontSize: 13, color: "var(--text-400, #94A3B8)" }}>I'll get back to you at your earliest convenience.</div>
            <button onClick={onClose} style={{ marginTop: 20, padding: "9px 24px", background: "#1D4ED8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>Close</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-300, #475569)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Your name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Mathew Thomas"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#3B82F6"}
                onBlur={e => e.target.style.borderColor = "var(--border, #E2E6F0)"}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-300, #475569)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Your email</label>
              <input
                type="email"
                placeholder="e.g. mathew@rajagiritech.edu.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#3B82F6"}
                onBlur={e => e.target.style.borderColor = "var(--border, #E2E6F0)"}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-300, #475569)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Message</label>
              <textarea
                placeholder="Tool request, bug report, feedback..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
                onFocus={e => e.target.style.borderColor = "#3B82F6"}
                onBlur={e => e.target.style.borderColor = "var(--border, #E2E6F0)"}
              />
            </div>

            {status === "error" && (
              <div style={{ fontSize: 13, color: "#EF4444", background: "#FEF2F2", padding: "8px 12px", borderRadius: 6 }}>
                Something went wrong. Try emailing directly at jeanneffin2003@gmail.com
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "var(--surface-2, #F1F3F9)", border: "1px solid var(--border, #E2E6F0)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "var(--text-300, #475569)", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button
                onClick={send}
                disabled={status === "sending" || !name.trim() || !email.trim() || !message.trim()}
                style={{ flex: 2, padding: "10px", background: "#1D4ED8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "inherit", opacity: (!name.trim() || !email.trim() || !message.trim()) ? 0.5 : 1, transition: "opacity 150ms ease" }}
              >
                {status === "sending" ? "Sending..." : "Send Message →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
