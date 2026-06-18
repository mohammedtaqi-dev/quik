"use client";

import { Geist, Geist_Mono, Righteous } from "next/font/google";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const brandFont = Righteous({ variable: "--font-brand", subsets: ["latin"], weight: "400" });

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <>
      <div className="ambient-orbs"><div className="orb" /><div className="orb" /><div className="orb" /><div className="orb" /></div>
      <header className="shrink-0 z-50 glass-card border-b border-[var(--card-border)] px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity">
          <svg viewBox="0 0 40 40" className="w-8 h-8" aria-label="Quik">
            <defs><linearGradient id="qg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--accent-1)" /><stop offset="100%" stopColor="var(--accent-2)" /></linearGradient></defs>
            <path d="M20 2L35 11L35 29L20 38L5 29L5 11Z" fill="url(#qg)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
            <path d="M20 10L13 21L18 21L15 32L26 18L20 18Z" fill="white" opacity="0.95" />
          </svg>
            <span className="text-lg hidden sm:inline" style={{ color: "var(--fg)", fontFamily: "var(--font-brand)" }}>Quik</span>
        </Link>
        <div className="flex items-center gap-1">
          {mounted && (
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              style={{ color: "var(--accent-1)" }}
              className="p-2 rounded-lg hover:bg-[var(--card-border)] transition-all"
              aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${brandFont.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/quik-icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="h-screen flex flex-col overflow-hidden">
        <ThemeProvider>
          <LayoutInner>{children}</LayoutInner>
        </ThemeProvider>
      </body>
    </html>
  );
}
