import type { Metadata } from "next";
import { Anton, Figtree } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Dream XI",
  description: "Draft a dream XI from every World Cup squad (1950–2026) and simulate the tournament.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${figtree.variable}`}>
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 border-b border-white/8 bg-[#06080e]/80 backdrop-blur-xl">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <Link href="/" className="font-display text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-400/15 border border-emerald-400/30 text-sm">⚽</span>
                <span className="hidden sm:inline text-white/65">Dream</span>
                <span className="text-emerald-400 text-glow">XI</span>
              </Link>
              <nav className="flex items-center gap-0.5 sm:gap-1 min-w-0 text-sm font-semibold overflow-x-auto no-scrollbar">
                <Link href="/play" className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition">
                  Build
                </Link>
                <Link href="/players" className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition">
                  Players
                </Link>
                <Link href="/teams" className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition">
                  Teams
                </Link>
                <Link href="/cups" className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition">
                  Cups
                </Link>
                <Link href="/leaderboard" className="shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition">
                  Leaderboard
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/8 py-5 text-center text-xs text-white/30">
            Inspired by 7a0.com.br · a daft little football draft game
          </footer>
        </div>
      </body>
    </html>
  );
}
