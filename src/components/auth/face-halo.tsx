"use client";

import { useEffect, useRef } from "react";

export function FaceHalo({
  tone,
}: {
  tone: "rainbow" | "green";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;
    const draw = () => {
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const dots = 168;
      for (let i = 0; i < dots; i += 1) {
        const t = i / dots;
        const spin = frame * 0.008;
        const angle = t * Math.PI * 2 + spin;
        const wobble = Math.sin(frame * 0.03 + i * 0.45) * (size * 0.012);
        const radius = size * 0.4 + wobble;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const hue =
          tone === "green"
            ? 138 + (i % 9) * 3
            : (t * 300 + frame * 0.35) % 360;
        ctx.fillStyle = `hsla(${hue}, 95%, 62%, 0.95)`;
        ctx.beginPath();
        ctx.arc(x, y, size * (0.006 + (i % 3) * 0.0025), 0, Math.PI * 2);
        ctx.fill();
      }
      frame += 1;
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [tone]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={640}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
