import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Monospace for numbers, timers, scores and code-like labels — the "tech" register.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lyric Royale",
  description: "A bilingual party game powered by live Musixmatch lyrics.",
  applicationName: "Lyric Royale",
  appleWebApp: {
    capable: true,
    title: "Lyric Royale",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-neutral-950 font-sans text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
