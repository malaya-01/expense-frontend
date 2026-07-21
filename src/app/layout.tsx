import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { ThemeSync } from "@/components/theme/ThemeSync";
import { ReduxProvider } from "@/redux/provider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track expenses, budgets, and financial goals in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full font-display">
        <ThemeScript />
        <ReduxProvider>
          <ThemeSync />
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
