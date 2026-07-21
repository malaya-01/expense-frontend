"use client";

import { useEffect, useRef } from "react";
import { animate, createTimeline, stagger } from "animejs";

type AuthMotionProps = {
  children: React.ReactNode;
};

export function AuthMotion({ children }: AuthMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const card = root.querySelector<HTMLElement>("[data-auth-card]");
    const header = root.querySelector<HTMLElement>("[data-auth-header]");
    const heroWords = root.querySelectorAll<HTMLElement>("[data-auth-hero-word]");
    const fields = root.querySelectorAll<HTMLElement>("[data-auth-field]");
    const panelBlocks = root.querySelectorAll<HTMLElement>("[data-auth-panel-block]");
    const stats = root.querySelectorAll<HTMLElement>("[data-auth-stat]");
    const orbs = root.querySelectorAll<HTMLElement>("[data-auth-orb]");
    const mesh = root.querySelector<HTMLElement>("[data-auth-mesh]");

    const tl = createTimeline({ defaults: { ease: "outExpo" } });

    if (mesh) {
      tl.add(
        mesh,
        {
          scale: [1.04, 1],
          opacity: [0, 1],
          duration: 1200,
        },
        0,
      );
    }

    if (header) {
      tl.add(
        header,
        {
          translateY: [-20, 0],
          opacity: [0, 1],
          duration: 700,
        },
        0,
      );
    }

    if (card) {
      tl.add(
        card,
        {
          scale: [0.92, 1],
          opacity: [0, 1],
          filter: ["blur(12px)", "blur(0px)"],
          duration: 900,
        },
        120,
      );
    }

    if (heroWords.length) {
      tl.add(
        heroWords,
        {
          translateY: ["120%", "0%"],
          rotateX: ["-40deg", "0deg"],
          opacity: [0, 1],
          duration: 800,
          delay: stagger(55),
        },
        280,
      );
    }

    if (fields.length) {
      tl.add(
        fields,
        {
          translateX: [-28, 0],
          opacity: [0, 1],
          duration: 650,
          delay: stagger(45, { start: 0 }),
        },
        420,
      );
    }

    if (panelBlocks.length) {
      tl.add(
        panelBlocks,
        {
          translateX: [36, 0],
          opacity: [0, 1],
          duration: 750,
          delay: stagger(90),
        },
        350,
      );
    }

    stats.forEach((stat) => {
      const target = Number(stat.dataset.authStat ?? 0);
      const suffix = stat.dataset.authStatSuffix ?? "";
      const prefix = stat.dataset.authStatPrefix ?? "";
      const decimals = Number(stat.dataset.authStatDecimals ?? 0);
      const counter = { value: 0 };
      tl.add(
        counter,
        {
          value: target,
          duration: 1400,
          ease: "outCubic",
          onUpdate: () => {
            const raw = counter.value;
            const v = decimals > 0 ? raw.toFixed(decimals) : String(Math.round(raw));
            stat.textContent = `${prefix}${v}${suffix}`;
          },
        },
        600,
      );
    });

    if (orbs.length) {
      animate(orbs, {
        translateX: [-14, 14],
        translateY: [-10, 10],
        scale: [1, 1.08],
        rotate: [-6, 6],
        duration: 7000,
        alternate: true,
        loop: true,
        ease: "inOutSine",
        delay: stagger(500),
      });
    }

    const shimmer = root.querySelector<HTMLElement>("[data-auth-shimmer]");
    if (shimmer) {
      animate(shimmer, {
        translateX: ["-120%", "220%"],
        duration: 2800,
        ease: "inOutQuad",
        loop: true,
        delay: 1600,
      });
    }
  }, []);

  return (
    <div ref={rootRef} className="contents">
      {children}
    </div>
  );
}
