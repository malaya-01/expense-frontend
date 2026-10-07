import type { Metadata, Viewport } from "next";
import Script from "next/script";
import {
  DM_Sans,
  Fraunces,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  JetBrains_Mono,
  Manrope,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
import { StoreProvider } from "@/lib/store/provider";
import { GlobalLoaderProvider } from "@/components/brand/global-loader";
import { ToastViewport } from "@/components/ui/toast";
import { ExitConfirmHost } from "@/components/native/exit-confirm-host";
import { ThemeFavicon } from "@/components/brand/theme-favicon";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import { getThemeBootstrapScript } from "@/lib/themes/bootstrap";
import "./globals.css";

/*
 * Theme fonts. Every face is downloaded at build time and self-hosted from
 * /_next/static/media (no runtime request to Google), so text renders
 * offline inside the Android APK. Each exposes a CSS variable that
 * src/lib/themes/fonts.ts maps to theme font ids; the active theme points
 * --font-app-sans / --font-app-heading / --font-geist-mono at them.
 *
 * Only the default theme's pairing (Plus Jakarta Sans + JetBrains Mono) is
 * preloaded; the rest are fetched on demand when a theme uses them. Variable
 * fonts ship one file per subset; IBM Plex Mono is static, so only the
 * weights the UI uses are included.
 */
const fontJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-face-jakarta",
});

const fontJetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-face-jetbrains-mono",
});

const fontGeist = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-geist",
});

const fontGeistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-geist-mono",
});

const fontManrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-manrope",
});

const fontDmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-dm-sans",
});

const fontPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-plex-sans",
});

const fontSpaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-space-grotesk",
});

const fontFraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-fraunces",
});

const fontPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-face-plex-mono",
});

const fontVariables = [
  fontJakarta,
  fontJetBrainsMono,
  fontGeist,
  fontGeistMono,
  fontManrope,
  fontDmSans,
  fontPlexSans,
  fontSpaceGrotesk,
  fontFraunces,
  fontPlexMono,
]
  .map((font) => font.variable)
  .join(" ");

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
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
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
