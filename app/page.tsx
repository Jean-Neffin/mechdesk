"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import ContactModal from "@/components/ContactModal";

export default function Home() {
  const [activeSection, setActiveSection] = useState("");
  const [showContact, setShowContact] = useState(false);

  // Scroll animations
  useEffect(() => {
    const els = document.querySelectorAll(".fade-up");
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Active nav on scroll
  useEffect(() => {
    const handler = () => {
      const sections = ["tools", "about"];
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 100) { setActiveSection(id); return; }
      }
      setActiveSection("");
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root {
          --bg: #F8F9FC;
          --surface: #FFFFFF;
          --surface-2: #F1F3F9;
          --border: #E2E6F0;
          --border-strong: #C8CFE0;
          --blue-700: #1D4ED8;
          --blue-600: #2563EB;
          --blue-500: #3B82F6;
          --blue-300: #93C5FD;
          --blue-soft: rgba(29,78,216,0.08);
          --success: #059669;
          --success-soft: rgba(5,150,105,0.10);
          --text-100: #0F172A;
          --text-200: #1E293B;
          --text-300: #475569;
          --text-400: #94A3B8;
          --serif: 'IBM Plex Serif', Georgia, serif;
          --sans: 'IBM Plex Sans', system-ui, sans-serif;
          --mono: 'IBM Plex Mono', monospace;
          --container: 1280px;
          --gutter: 40px;
        }
        html { scroll-behavior: smooth; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--sans); background: var(--bg); color: var(--text-200); font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        a { color: inherit; text-decoration: none; }
        ul { list-style: none; }
        .md-container { max-width: var(--container); margin: 0 auto; padding: 0 var(--gutter); }

        /* TOP BAR */
        .top-bar { background: var(--surface-2); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-400); }
        .top-bar-inner { display: flex; align-items: center; justify-content: space-between; height: 36px; }
        .top-bar-inner strong { color: var(--text-200); font-weight: 500; }
        .top-bar-right { display: flex; align-items: center; gap: 20px; }
        .top-bar-divider { width: 1px; height: 14px; background: var(--border-strong); }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); display: inline-block; box-shadow: 0 0 0 3px rgba(5,150,105,0.2); }

        /* NAV */
        .md-nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 4px rgba(15,23,42,0.06); }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 68px; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand-mark { width: 38px; height: 38px; border-radius: 8px; background: linear-gradient(160deg, var(--blue-600), #1635A4); display: grid; place-items: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(29,78,216,0.25); }
        .brand-mark svg { width: 20px; height: 20px; color: #fff; }
        .brand-name { font-family: var(--serif); font-size: 21px; color: var(--text-100); font-weight: 500; letter-spacing: -0.01em; }
        .brand-sub { font-size: 11px; color: var(--text-400); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; align-items: center; gap: 4px; }
        .nav-link { padding: 8px 14px; border-radius: 6px; font-size: 14px; color: var(--text-300); transition: all 120ms ease; }
        .nav-link:hover { color: var(--text-100); background: var(--surface-2); }

        /* HERO */
        @keyframes gridMove { from { background-position: 0 0; } to { background-position: 28px 28px; } }
        .hero { padding: 64px 0 56px; border-bottom: 1px solid var(--border); background: var(--surface); position: relative; overflow: hidden; }
        .hero::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(99,102,241,0.07) 1px, transparent 1px); background-size: 28px 28px; animation: gridMove 8s linear infinite; pointer-events: none; mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 80%); -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 80%); }
        .hero-inner { position: relative; z-index: 1; }
        .hero-inner { max-width: 760px; }
        .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blue-600); padding: 5px 12px 5px 8px; background: var(--blue-soft); border: 1px solid rgba(37,99,235,0.2); border-radius: 100px; margin-bottom: 20px; }
        .eyebrow-tick { display: inline-grid; place-items: center; width: 15px; height: 15px; border-radius: 50%; background: var(--blue-600); color: #fff; font-size: 9px; }
        .hero-title { font-family: var(--serif); font-size: clamp(32px, 3.2vw, 44px); line-height: 1.08; color: var(--text-100); letter-spacing: -0.02em; font-weight: 400; text-wrap: balance; }
        .hero-title em { font-style: italic; color: var(--blue-600); }
        .accent-bar { display: inline-block; width: 32px; height: 3px; background: var(--blue-500); vertical-align: middle; margin-right: 12px; margin-bottom: 7px; border-radius: 2px; }

        /* TOOLS */
        .section { padding: 48px 0 80px; }
        .tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

        .tcard { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px 24px 20px; position: relative; overflow: hidden; display: flex; flex-direction: column; transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease; box-shadow: 0 1px 4px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04); }
        .tcard.is-live::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); }
        .tcard.is-live:hover { border-color: rgba(37,99,235,0.5); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(37,99,235,0.15), 0 2px 8px rgba(15,23,42,0.08); }

        .tcard-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .tcard-icon { width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(160deg, var(--blue-600), #1635A4); display: grid; place-items: center; box-shadow: 0 4px 12px rgba(29,78,216,0.25); }
        .tcard-icon svg { width: 22px; height: 22px; color: #fff; }

        .pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 7px; border-radius: 100px; font-size: 10.5px; font-weight: 500; font-family: var(--mono); letter-spacing: 0.06em; text-transform: uppercase; }
        .pill-live { background: var(--success-soft); color: var(--success); border: 1px solid rgba(5,150,105,0.2); }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(5,150,105,0.15); } 50% { box-shadow: 0 0 0 5px rgba(5,150,105,0.06); } }
        .pill-live .status-dot { background: var(--success); box-shadow: 0 0 0 3px rgba(5,150,105,0.15); animation: pulse 1.8s ease-in-out infinite; }

        .tcard-name { font-family: var(--serif); font-size: 26px; color: var(--text-100); letter-spacing: -0.015em; font-weight: 500; line-height: 1; margin-bottom: 6px; }
        .tcard-tag { font-size: 13.5px; color: var(--text-300); margin-bottom: 14px; }
        .tcard-desc { font-size: 13px; color: var(--text-300); line-height: 1.6; margin-bottom: 18px; flex: 0 0 auto; }
        .tcard-features { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; margin-top: auto; }
        .tcard-features li { font-family: var(--mono); font-size: 10.5px; color: var(--blue-600); padding: 3px 9px; border: 1px solid rgba(37,99,235,0.2); border-radius: 100px; background: var(--blue-soft); letter-spacing: 0.02em; white-space: nowrap; }
        .tcard-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border); }
        .tcard-meta { font-family: var(--mono); font-size: 10.5px; color: var(--text-400); }

        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 6px; font-size: 13.5px; font-weight: 500; transition: all 140ms ease; white-space: nowrap; border: 1px solid transparent; }
        .btn-primary { background: var(--blue-700); color: #fff; border-color: var(--blue-600); box-shadow: 0 1px 3px rgba(29,78,216,0.3); }
        .btn-primary:hover { background: var(--blue-600); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(29,78,216,0.35); }
        .btn-sm { padding: 7px 14px; font-size: 12.5px; border-radius: 6px; }
        .btn-arrow { font-size: 14px; transition: transform 150ms ease; }
        .btn:hover .btn-arrow { transform: translateX(2px); }

        /* MORE CARD */
        .tcard-more { background: transparent; border: 1px dashed var(--border-strong); box-shadow: none; transition: border-color 200ms ease, background 200ms ease; min-height: 260px; background-image: radial-gradient(var(--border) 1px, transparent 1px); background-size: 16px 16px; }
        .tcard-more:hover { border-color: rgba(37,99,235,0.4); background: var(--blue-soft); }
        .tcard-more-inner { padding: 28px 26px; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; height: 100%; }
        .tcard-more-glyph { width: 36px; height: 36px; border-radius: 9px; border: 1px dashed var(--border-strong); display: grid; place-items: center; color: var(--text-400); margin-bottom: 4px; }
        .tcard-more-glyph svg { width: 18px; height: 18px; }
        .tcard-more-title { font-family: var(--serif); font-size: 22px; color: var(--text-200); font-weight: 500; line-height: 1.2; }
        .tcard-more-text { font-size: 13px; color: var(--text-400); line-height: 1.6; }
        .tcard-more-link { margin-top: auto; font-family: var(--mono); font-size: 11.5px; color: var(--blue-600); letter-spacing: 0.04em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; border-bottom: 1px dashed transparent; transition: border-color 150ms ease; }
        .tcard-more-link:hover { border-bottom-color: var(--blue-500); }

        /* ABOUT */
        .about { padding: 72px 0 88px; border-top: 1px solid var(--border); background: var(--surface); }
        .about::before { content: ''; display: block; width: 60px; height: 2px; background: var(--blue-500); margin-bottom: -1px; position: relative; top: -72px; left: 50%; transform: translateX(-50%); }
        .about-inner { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.4fr); gap: 80px; align-items: start; }
        .about-left { position: sticky; top: 80px; }
        .about-kicker { display: inline-block; font-family: var(--mono); font-size: 11px; color: var(--blue-500); letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 16px; }
        .about-title { font-family: var(--serif); font-size: 34px; color: var(--text-100); letter-spacing: -0.02em; font-weight: 400; line-height: 1.15; }
        .about-right { display: flex; flex-direction: column; gap: 16px; }
        .about-p { font-size: 15.5px; line-height: 1.7; color: var(--text-200); }
        .about-p.about-quiet { margin-top: 12px; padding-top: 20px; border-top: 1px solid var(--border); font-size: 14px; color: var(--text-400); font-style: italic; }

        /* FOOTER */
        .md-footer { background: #F1F3F9; border-top: 1px solid var(--border); color: var(--text-300); padding-top: 52px; }
        .footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 44px; }
        .footer-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .footer-brand-name { font-family: var(--serif); font-size: 20px; color: var(--text-100); font-weight: 500; }
        .footer-about { font-size: 13px; color: var(--text-400); line-height: 1.65; margin-bottom: 0; max-width: 300px; }
        .footer-col-title { font-size: 11px; color: var(--text-200); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; margin-bottom: 16px; }
        .footer-list { display: flex; flex-direction: column; gap: 10px; }
        .footer-list a { font-size: 13px; color: var(--text-300); transition: color 120ms ease; }
        .footer-list a:hover { color: var(--blue-600); }
        .pill-soft { background: var(--surface-2); color: var(--text-400); border: 1px solid var(--border); padding: 2px 6px; border-radius: 100px; font-size: 9px; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.06em; }
        .footer-bar { border-top: 1px solid var(--border); padding: 18px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--text-400); }
        .footer-bar-left { display: flex; align-items: center; gap: 14px; }
        .made-by { font-style: italic; opacity: 0.7; transition: opacity 200ms ease; }
        .made-by:hover { opacity: 1; }
        .made-by b { color: var(--blue-600); font-style: normal; font-weight: 500; font-family: var(--mono); font-size: 11px; padding: 1px 4px; border-radius: 3px; background: var(--blue-soft); }

        /* DARK MODE */
        [data-theme="dark"] { --bg: #0F1120; --surface: #141828; --surface-2: #1A2035; --border: #252D42; --border-strong: #2E3A52; --text-100: #F0F4FF; --text-200: #C8D3EA; --text-300: #7A8AAA; --text-400: #4A5670; --blue-soft: rgba(37,99,235,0.15); }
        [data-theme="dark"] .md-nav { background: rgba(14,17,32,0.92); }
        [data-theme="dark"] .hero { background: var(--surface); }
        [data-theme="dark"] .about { background: var(--surface); }
        [data-theme="dark"] .md-footer { background: #0A0D1A; }
        [data-theme="dark"] .top-bar { background: #070A14; }

        /* TOGGLE */
        .theme-toggle { background: var(--surface-2); border: 1px solid var(--border); border-radius: 20px; width: 60px; height: 30px; cursor: pointer; position: relative; display: flex; align-items: center; padding: 0 5px; justify-content: space-between; font-size: 13px; flex-shrink: 0; transition: background 300ms ease; }
        .theme-toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; background: var(--blue-600); border-radius: 50%; transition: transform 300ms ease; }
        [data-theme="dark"] .theme-toggle::after { transform: translateX(30px); }

        /* SCROLL ANIMATIONS */
        .fade-up { opacity: 0; transform: translateY(24px); transition: opacity 600ms ease, transform 600ms ease; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        /* ACTIVE NAV */
        .nav-link.active { color: var(--text-100); background: var(--blue-soft); }

        @media (max-width: 1080px) { .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; } }
        @media (max-width: 720px) { .nav-links { display: none; } .hero { padding: 44px 0 40px; } .about-inner { grid-template-columns: 1fr; gap: 28px; } .about-left { position: static; } .footer-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Top bar */}
      <div className="top-bar">
        <div className="md-container top-bar-inner">
          <span><strong>Department of Mechanical Engineering</strong> · Rajagiri School of Engineering &amp; Technology, Kochi</span>
          <div className="top-bar-right">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="status-dot" /> All systems operational
            </span>
            <span className="top-bar-divider" />
            <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>v2.0</span>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <header className="md-nav">
        <div className="md-container nav-inner">
          <a href="#" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            <span>
              <div className="brand-name">MechDesk</div>
              <div className="brand-sub">For RSET ME faculty · student-built</div>
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <nav className="nav-links">
              <a href="#tools" className={`nav-link${activeSection === "tools" ? " active" : ""}`}>Tools</a>
              <a href="#about" className={`nav-link${activeSection === "about" ? " active" : ""}`}>About</a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="md-container hero-inner">
          <span className="eyebrow">
            <span className="eyebrow-tick">✓</span>
            Internal faculty tools · RSET Mechanical Engineering
          </span>
          <h1 className="hero-title">
            <span className="accent-bar" />Browser-based tools for <em>ME faculty</em> at RSET.
          </h1>
        </div>
      </section>

      {/* Tools */}
      <section className="section fade-up" id="tools">
        <div className="md-container">
          <div className="tools-grid">
            <article className="tcard is-live">
              <div className="tcard-top">
                <div className="tcard-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="20" x2="4" y2="14"/><line x1="10" y1="20" x2="10" y2="10"/>
                    <line x1="16" y1="20" x2="16" y2="6"/><line x1="22" y1="20" x2="2" y2="20"/>
                  </svg>
                </div>
                <span className="pill pill-live"><span className="status-dot" />live</span>
              </div>
              <h3 className="tcard-name">Sortd</h3>
              <p className="tcard-tag">CGPA-balanced project group generator.</p>
              <p className="tcard-desc">Drop in your class list, set a group size, get groups where the CGPAs even out. Friends who already paired up stay together. Drag people around if it needs it. Export and you're done.</p>
              <ul className="tcard-features">
                <li>CGPA-balanced</li><li>Pre-formed teams</li><li>Drag &amp; drop</li><li>PDF · Excel · CSV</li>
              </ul>
              <footer className="tcard-foot">
                <span className="tcard-meta">v2.1.3 · upd 09 May</span>
                <Link href="/sortd" className="btn btn-primary btn-sm">Launch <span className="btn-arrow">→</span></Link>
              </footer>
            </article>

            <article className="tcard tcard-more">
              <div className="tcard-more-inner">
                <div className="tcard-more-glyph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <h3 className="tcard-more-title">More tools coming.</h3>
                <p className="tcard-more-text">More tools are being developed. If there's a workflow your department handles manually that could be automated, reach out — new tools are added based on faculty needs.</p>
                <button onClick={() => setShowContact(true)} className="tcard-more-link" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Request a tool <span className="btn-arrow">→</span></button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="about fade-up" id="about">
        <div className="md-container about-inner">
          <div className="about-left">
            <span className="about-kicker">about</span>
            <h2 className="about-title">Purpose-built for the ME department.</h2>
          </div>
          <div className="about-right">
            <p className="about-p">MechDesk is a collection of browser-based tools built specifically for the Department of Mechanical Engineering at RSET. Each tool is designed to handle one administrative task — simply and reliably.</p>
            <p className="about-p">No installation required. No accounts, no sign-ups, no data sent to any server. Everything runs locally in your browser. Upload a file, get a result, export and done.</p>
            <p className="about-p about-quiet">Designed for faculty use within the ME department. Tools are added as needs arise — focused on reducing manual work in common academic workflows.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="md-footer">
        <div className="md-container">
          <div className="footer-grid fade-up">
            <div>
              <div className="footer-brand">
                <span className="brand-mark" style={{ width: 36, height: 36 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: "#fff" }}>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </span>
                <span className="footer-brand-name">MechDesk</span>
              </div>
              <p className="footer-about">Browser-based tools for the Department of Mechanical Engineering, RSET. No installation. No accounts. Data stays on your device.</p>
            </div>
            <div>
              <div className="footer-col-title">Tools</div>
              <ul className="footer-list">
                <li><Link href="/sortd">Sortd — Group Generator</Link></li>
                <li style={{ color: "var(--text-400)", fontSize: 13 }}>Attend <span className="pill-soft">soon</span></li>
                <li style={{ color: "var(--text-400)", fontSize: 13 }}>Markd <span className="pill-soft">soon</span></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Contact</div>
              <ul className="footer-list">
                <li><button onClick={() => setShowContact(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue-600)", fontSize: 13, padding: 0, fontFamily: "inherit", textAlign: "left" }}>Send a message →</button></li>
                <li><a href="#about">About MechDesk</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bar">
            <div className="footer-bar-left">
              <span>© 2026 MechDesk</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>internal use only</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Department of Mechanical Engineering, RSET (Autonomous)</span>
            </div>
            <span className="pill-soft" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="status-dot" style={{ width: 5, height: 5 }} />&nbsp;v2.1.3
            </span>
          </div>
        </div>
      </footer>
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </>
  );
}
