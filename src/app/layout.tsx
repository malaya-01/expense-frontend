import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { StoreProvider } from "@/lib/store/provider";
import { GlobalLoaderProvider } from "@/components/brand/global-loader";
import { ToastViewport } from "@/components/ui/toast";
import { ExitConfirmHost } from "@/components/native/exit-confirm-host";
import { ThemeFavicon } from "@/components/brand/theme-favicon";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import { getThemeBootstrapScript } from "@/lib/themes/bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: "/brand/themes/vercel-light.png",
    apple: "/brand/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme="preset:midnight"
      data-theme-scheme="dark"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full font-sans text-[var(--ds-gray-1000)]"
        suppressHydrationWarning
      >
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }}
        />
        <StoreProvider>
          <GlobalLoaderProvider>
            <ThemeFavicon />
            {children}
            <ToastViewport />
            <ExitConfirmHost />
          </GlobalLoaderProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
