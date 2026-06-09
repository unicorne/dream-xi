import Link from "next/link";
import { SQUADS } from "@/lib/data";

const STEPS = [
  ["①", "Pick a shape", "Your formation decides which positions you're hunting for."],
  ["②", "Roll & draft", "One player per roll. Just 3 rerolls — choose your moments."],
  ["③", "Simulate", "Your XI vs 31 historical sides. Groups → the final."],
] as const;

export default function Home() {
  const years = new Set(SQUADS.map((s) => s.year));
  return (
    <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-28 text-center overflow-hidden">
      {/* Focal stadium-light glow behind hero */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 w-[700px] h-[420px] rounded-full bg-emerald-500/8 blur-[90px]" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/8 px-4 py-1.5 text-sm font-semibold text-emerald-300/90">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {SQUADS.length} squads · {[...years].length} World Cups · 1950–2026
        </div>

        <h1 className="mt-6 font-display text-6xl sm:text-8xl uppercase leading-[0.9] tracking-tight">
          Draft your
          <br />
          <span className="text-emerald-400 text-glow">all-time XI</span>
        </h1>

        <p className="mx-auto mt-7 max-w-md text-lg text-white/50 leading-relaxed">
          Draft legends from football history into your XI, then simulate a 32-nation World Cup.
        </p>

        <div className="mt-10">
          <Link
            href="/play"
            className="group inline-flex items-center gap-2.5 rounded-2xl bg-emerald-400 px-10 py-4 font-display text-2xl uppercase tracking-wide text-black shadow-xl emerald-glow hover:bg-emerald-300 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Start a game
            <span className="group-hover:translate-x-0.5 transition-transform duration-200 inline-block">→</span>
          </Link>
        </div>
      </div>

      <div className="relative mt-16 grid gap-3 sm:grid-cols-3 text-left">
        {STEPS.map(([n, t, d], i) => (
          <div
            key={t}
            className="group rounded-2xl border border-white/8 bg-white/3 p-5 hover:border-emerald-400/30 hover:bg-white/5 transition-all duration-300"
            style={{ animation: `slideUp 0.45s ease-out ${i * 75}ms both` }}
          >
            <div className="font-display text-4xl text-emerald-400 group-hover:text-emerald-300 transition-colors">{n}</div>
            <div className="mt-2.5 font-bold text-base">{t}</div>
            <div className="mt-1 text-sm text-white/50 leading-relaxed">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
