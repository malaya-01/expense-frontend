import type { Metadata, Viewport } from "next";
import Script from "next/script";
import {
  Archivo,
  Atkinson_Hyperlegible_Next,
  Azeret_Mono,
  Bodoni_Moda,
  Cormorant_Garamond,
  Cutive_Mono,
  DM_Mono,
  DM_Sans,
  Fira_Code,
  Fraunces,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Inconsolata,
  Inter,
  JetBrains_Mono,
  Lora,
  Manrope,
  Martian_Mono,
  Merriweather,
  Newsreader,
  Outfit,
  Oxygen_Mono,
  PT_Mono,
  Plus_Jakarta_Sans,
  Red_Hat_Mono,
  Roboto_Mono,
  Sora,
  Source_Code_Pro,
  Space_Grotesk,
  Space_Mono,
  Ubuntu_Mono,
  Victor_Mono,
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
 * Only the default theme's pairing (Space Grotesk + JetBrains Mono) is
 * preloaded; the rest are fetched on demand when a theme uses them. Variable
 * fonts ship one file per subset; static faces (IBM Plex Mono, DM Mono…)
 * include only the weights they offer / the UI uses.
 */
const fontJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-jakarta",
});

const fontGeist = Geist({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-geist",
});

const fontInter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-inter",
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
  variable: "--font-face-space-grotesk",
});

const fontOutfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-outfit",
});

const fontSora = Sora({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-sora",
});

const fontAtkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-atkinson",
});

const fontArchivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-archivo",
});

const fontFraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-fraunces",
});

const fontNewsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-newsreader",
});

const fontLora = Lora({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-lora",
});

const fontMerriweather = Merriweather({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-merriweather",
});

const fontBodoni = Bodoni_Moda({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-bodoni",
});

const fontCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-cormorant",
});

const fontJetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-face-jetbrains-mono",
});

const fontGeistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-geist-mono",
});

const fontPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-face-plex-mono",
});

const fontDmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
  variable: "--font-face-dm-mono",
});

const fontInconsolata = Inconsolata({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-inconsolata",
});

const fontRobotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-roboto-mono",
});

const fontFiraCode = Fira_Code({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-fira-code",
});

const fontAzeretMono = Azeret_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-azeret-mono",
});

const fontSourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-source-code-pro",
});

const fontUbuntuMono = Ubuntu_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-face-ubuntu-mono",
});

const fontPtMono = PT_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--font-face-pt-mono",
});

const fontRedHatMono = Red_Hat_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-red-hat-mono",
});

const fontSpaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-face-space-mono",
});

const fontVictorMono = Victor_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-victor-mono",
});

const fontMartianMono = Martian_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-face-martian-mono",
});

const fontCutiveMono = Cutive_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--font-face-cutive-mono",
});

const fontOxygenMono = Oxygen_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--font-face-oxygen-mono",
});

const fontVariables = [
  fontJakarta,
  fontGeist,
  fontInter,
  fontManrope,
  fontDmSans,
  fontPlexSans,
  fontSpaceGrotesk,
  fontOutfit,
  fontSora,
  fontAtkinson,
  fontArchivo,
  fontFraunces,
  fontNewsreader,
  fontLora,
  fontMerriweather,
  fontBodoni,
  fontCormorant,
  fontJetbrainsMono,
  fontGeistMono,
  fontPlexMono,
  fontDmMono,
  fontInconsolata,
  fontRobotoMono,
  fontFiraCode,
  fontAzeretMono,
  fontSourceCodePro,
  fontUbuntuMono,
  fontPtMono,
  fontRedHatMono,
  fontSpaceMono,
  fontVictorMono,
  fontMartianMono,
  fontCutiveMono,
  fontOxygenMono,
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
