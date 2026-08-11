import type { Metadata } from "next";
import Script from "next/script";
import { StoreProvider } from "@/lib/store/provider";
import { ToastViewport } from "@/components/ui/toast";
import { ExitConfirmHost } from "@/components/native/exit-confirm-host";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import { getThemeBootstrapScript } from "@/lib/themes/bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
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
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }}
        />
      </head>
      <body
        className="min-h-full font-sans text-[var(--ds-gray-1000)]"
        suppressHydrationWarning
      >
        <StoreProvider>
          {children}
          <ToastViewport />
          <ExitConfirmHost />
        </StoreProvider>
      </body>
    </html>
  );
}
