"use client";

import { useEffect } from "react";
import { platedLogoSrc } from "@/lib/brand";
import { useTheme } from "@/lib/theme-context";
import { themeScheme } from "@/lib/themes/apply";

export function ThemeFavicon() {
  const { activeTheme } = useTheme();

  useEffect(() => {
    if (!activeTheme) return;
    const href = platedLogoSrc(
      activeTheme.id,
      themeScheme(activeTheme.tokens),
    );
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [activeTheme]);

  return null;
}
