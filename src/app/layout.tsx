import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store/provider";
import { ToastViewport } from "@/components/ui/toast";
import { ApiActivityIndicator } from "@/components/ui/api-activity-indicator";
import { getThemeBootstrapScript } from "@/lib/themes/bootstrap";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinOS",
  description:
    "Your Personal Financial Operating System — Digital Financial Twin.",
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
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
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
          <ApiActivityIndicator />
          <ToastViewport />
        </StoreProvider>
      </body>
    </html>
  );
}
