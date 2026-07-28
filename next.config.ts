import type { NextConfig } from "next";

const isMobile = process.env.MOBILE === "1";

const nextConfig: NextConfig = {
  ...(isMobile
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
