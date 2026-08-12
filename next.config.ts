import type { NextConfig } from "next";
import path from "path";

const isMobile = process.env.MOBILE === "1";

const nextConfig: NextConfig = {
  // Keep Turbopack rooted on this app. A parent lockfile was making Next
  // resolve packages from D:\M-001-PJS\expense-tracker instead of this folder.
  turbopack: {
    root: path.join(__dirname),
  },
  ...(isMobile
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        async redirects() {
          return [
            {
              source: "/guide",
              destination: "/documentation",
              permanent: true,
            },
            {
              source: "/guide/:slug",
              destination: "/documentation/:slug",
              permanent: true,
            },
          ];
        },
      }),
};

export default nextConfig;
