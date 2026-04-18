"use client";

// npm install animejs
// (animejs v4 ships its own types; don't install @types/animejs)

import React, { useEffect, useRef } from "react";
import { animate, createTimeline, stagger } from "animejs";

export default function AuthLayout({
  children,
  title,
  subtitle,
  rightContent,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  rightContent: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animInitialized = useRef(false);

  const barData = [38, 52, 45, 61, 55, 72, 68, 80, 74, 88, 82, 95];
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const maxVal = Math.max(...barData);

  // Animated number counter (RAF-based, no deps)
  const animCounter = (el: HTMLElement, target: number, duration = 1800) => {
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = "$" + Math.round(ease * target).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ── Particle canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,179,237,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      rafId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // ── anime.js animations (runs once after mount) ──────────────────────────
  useEffect(() => {
    if (animInitialized.current) return;
    animInitialized.current = true;

    // Staggered entrance
    const tl = createTimeline({ defaults: { ease: "outExpo" } });
    tl
      .add("#al-badge", { opacity: [0, 1], translateY: [20, 0], duration: 600 })
      .add("#al-title", { opacity: [0, 1], translateY: [30, 0], duration: 700 }, "-=300")
      .add("#al-subtitle", { opacity: [0, 1], translateY: [20, 0], duration: 600 }, "-=400")
      .add("#al-stat-cards", { opacity: [0, 1], translateY: [20, 0], duration: 600 }, "-=300")
      .add(
        ".al-stat-card",
        {
          scale: [0.95, 1],
          opacity: [0, 1],
          delay: stagger(80),
          duration: 400,
          ease: "outBack",
        },
        "-=500",
      )
      .add("#al-chart-wrap", { opacity: [0, 1], translateY: [10, 0], duration: 500 }, "-=300")
      .add("#al-floating-tags", { opacity: [0, 1], translateY: [10, 0], duration: 500 }, "-=200")
      .add("#al-children", { opacity: [0, 1], translateY: [10, 0], duration: 500 }, "-=200")
      .add({
        duration: 100,
        onBegin: () => {
          // Animate bars
          document.querySelectorAll<HTMLElement>(".al-bar").forEach((b, i) => {
            setTimeout(() => {
              b.style.height = (b.dataset.target ?? "0") + "%";
            }, i * 50);
          });
          // Counters
          const elPortfolio = document.getElementById("al-counter-portfolio");
          const elSavings = document.getElementById("al-counter-savings");
          if (elPortfolio) animCounter(elPortfolio, 142580);
          if (elSavings) animCounter(elSavings, 38420);
          setTimeout(() => {
            const t1 = document.getElementById("al-trend1");
            const t2 = document.getElementById("al-trend2");
            if (t1) t1.textContent = "↑ +12.4%";
            if (t2) t2.textContent = "↑ +8.7%";
          }, 1900);
        },
      }, "-=400");

    // Breathing orbs
    animate("#al-orb1", { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7], duration: 4000, loop: true, ease: "inOutSine" });
    animate("#al-orb2", { scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5], duration: 5000, loop: true, ease: "inOutSine", delay: 1000 });

    // Tag hover
    document.querySelectorAll<HTMLElement>(".al-tag").forEach((t) => {
      t.addEventListener("mouseenter", () => animate(t, { translateY: -4, scale: 1.05, duration: 200, ease: "outQuad" }));
      t.addEventListener("mouseleave", () => animate(t, { translateY: 0, scale: 1, duration: 200, ease: "outQuad" }));
    });

    // Stat-card hover
    document.querySelectorAll<HTMLElement>(".al-stat-card").forEach((c) => {
      c.addEventListener("mouseenter", () => animate(c, { translateY: -4, scale: 1.02, duration: 200, ease: "outQuad" }));
      c.addEventListener("mouseleave", () => animate(c, { translateY: 0, scale: 1, duration: 200, ease: "outQuad" }));
    });
  }, []);

  // ── Ticker data ──────────────────────────────────────────────────────────
  const tickerItems = [
    { sym: "BTC",  price: "$67,420", arrow: "↑", up: true  },
    { sym: "ETH",  price: "$3,821",  arrow: "↑", up: true  },
    { sym: "AAPL", price: "$178.32", arrow: "↓", up: false },
    { sym: "MSFT", price: "$415.12", arrow: "↑", up: true  },
    { sym: "TSLA", price: "$248.50", arrow: "↑", up: true  },
    { sym: "NVDA", price: "$875.40", arrow: "↑", up: true  },
  ];
  // Duplicate for seamless loop
  const ticker = [...tickerItems, ...tickerItems];

  return (
    <>
      <style>{`
        @keyframes al-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(0.8); }
        }
        @keyframes al-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .al-bar { transition: height 0.8s ease; }
        #al-badge, #al-title, #al-subtitle, #al-stat-cards,
        #al-chart-wrap, #al-floating-tags, #al-children { opacity: 0; }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex" }}>

        {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
        <div
          style={{
            width: "50%",
            background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 48px",
            boxSizing: "border-box",
            minHeight: "100vh",
          }}
        >
          {/* Particle canvas */}
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          />

          {/* Glowing orbs */}
          <div id="al-orb1" style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,179,237,0.15) 0%,transparent 70%)", top: -60, right: -60, pointerEvents: "none" }} />
          <div id="al-orb2" style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(154,105,245,0.12) 0%,transparent 70%)", bottom: 40, left: -40, pointerEvents: "none" }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 2 }}>

            {/* Badge */}
            <div id="al-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.3)", borderRadius: 20, padding: "6px 14px", marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#63b3ed", display: "inline-block", animation: "al-pulse-dot 1.8s ease-in-out infinite" }} />
              <span style={{ fontSize: 12, color: "#a0c4ff", letterSpacing: "1.5px", fontFamily: "monospace" }}>FINTRACK PRO</span>
            </div>

            {/* Title / subtitle (from props) */}
            <h1 id="al-title" style={{ fontSize: "2.4rem", fontWeight: 700, color: "#e8f4fd", lineHeight: 1.2, margin: "0 0 10px", fontFamily: "Georgia, serif" }}>
              {title}
            </h1>
            <p id="al-subtitle" style={{ fontSize: "1rem", color: "rgba(200,220,255,0.65)", margin: "0 0 28px", lineHeight: 1.6 }}>
              {subtitle}
            </p>

            {/* Stat cards */}
            <div id="al-stat-cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
              {[
                { label: "PORTFOLIO", counterId: "al-counter-portfolio", trendId: "al-trend1" },
                { label: "SAVINGS",   counterId: "al-counter-savings",   trendId: "al-trend2" },
              ].map(({ label, counterId, trendId }) => (
                <div key={label} className="al-stat-card" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, cursor: "default" }}>
                  <p style={{ fontSize: 11, color: "rgba(200,220,255,0.5)", margin: "0 0 4px", letterSpacing: "1px", fontFamily: "monospace" }}>{label}</p>
                  <p id={counterId} style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e8f4fd", margin: 0 }}>$0</p>
                  <p id={trendId}   style={{ fontSize: 11, color: "#68d391", margin: "4px 0 0" }}>↑ +0.00%</p>
                </div>
              ))}
            </div>

            {/* Mini bar chart */}
            <div id="al-chart-wrap" style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(200,220,255,0.5)", letterSpacing: "1px", fontFamily: "monospace" }}>MONTHLY GROWTH</span>
                <span style={{ fontSize: 11, color: "#63b3ed", fontFamily: "monospace" }}>2024</span>
              </div>
              <div style={{ height: 64, display: "flex", alignItems: "flex-end", gap: 5 }}>
                {barData.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div
                      className="al-bar"
                      data-target={String(Math.round((v / maxVal) * 100))}
                      style={{ width: "100%", height: "0%", borderRadius: "3px 3px 0 0", background: "linear-gradient(to top,#3182ce,#63b3ed)", minHeight: 2 }}
                    />
                    <span style={{ fontSize: 9, color: "rgba(200,220,255,0.4)", fontFamily: "monospace" }}>{months[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tag pills */}
            <div id="al-floating-tags" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {[
                { label: "Analytics", bg: "rgba(99,179,237,0.15)",  border: "rgba(99,179,237,0.25)",  color: "#a0c4ff", icon: "📊" },
                { label: "Payments",  bg: "rgba(154,105,245,0.15)", border: "rgba(154,105,245,0.25)", color: "#c3a1ff", icon: "💸" },
                { label: "Growth",    bg: "rgba(104,211,145,0.15)", border: "rgba(104,211,145,0.25)", color: "#9ae6b4", icon: "📈" },
                { label: "Secure",    bg: "rgba(246,173,85,0.15)",  border: "rgba(246,173,85,0.25)",  color: "#fbd38d", icon: "🔐" },
              ].map(({ label, bg, border, color, icon }) => (
                <span
                  key={label}
                  className="al-tag"
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: "5px 12px", fontSize: 11, color, fontFamily: "monospace", cursor: "default", display: "inline-block" }}
                >
                  {icon} {label}
                </span>
              ))}
            </div>

            {/* children slot — glassmorphism card */}
            <div
              id="al-children"
              style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {children}
            </div>
          </div>

          {/* Live ticker */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 0", overflow: "hidden", zIndex: 3 }}>
            <div style={{ display: "flex", gap: 40, whiteSpace: "nowrap", width: "max-content", animation: "al-ticker 22s linear infinite" }}>
              {ticker.map(({ sym, price, arrow, up }, i) => (
                <span key={i} style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(200,220,255,0.5)" }}>
                  {sym}{" "}
                  <span style={{ color: up ? "#68d391" : "#fc8181" }}>
                    {price} {arrow}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        <div
          style={{
            width: "50%",
            background: "linear-gradient(135deg,#c6f6d5,#81e6d9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            boxSizing: "border-box",
            minHeight: "100vh",
          }}
        >
          <div style={{ background: "white", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.12)", padding: 40, width: "100%", maxWidth: 380 }}>
            {rightContent}
          </div>
        </div>

      </div>
    </>
  );
}
