import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import type { CupResult } from "@/lib/sim/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TeamAgg {
  id: string;
  label: string;
  creator?: string;
  entered: number;
  won: number;
  finals: number; // reached the final (incl. wins)
  gf: number;
  gd: number;
  scorers: Record<string, number>;
}

function aggregate(cups: CupResult[]): TeamAgg[] {
  const byTeam = new Map<string, TeamAgg>();
  const ensure = (id: string, label: string, creator?: string): TeamAgg => {
    let a = byTeam.get(id);
    if (!a) {
      a = { id, label, creator, entered: 0, won: 0, finals: 0, gf: 0, gd: 0, scorers: {} };
      byTeam.set(id, a);
    }
    return a;
  };

  for (const cup of cups) {
    if (!cup?.standings) continue;
    for (const s of cup.standings) {
      const a = ensure(s.id, s.label, s.creator);
      a.entered++;
      if (s.stageReached === "champion") a.won++;
      if (s.stageReached === "champion" || s.stageReached === "final") a.finals++;
      a.gf += s.record.gf;
      a.gd += s.record.gf - s.record.ga;
    }
    // Per-team scorers (only for entrant teams, not historical fillers).
    for (const m of cup.matches ?? []) {
      for (const e of m.events) {
        const scoringId = e.side === "home" ? m.home.id : m.away.id;
        const a = byTeam.get(scoringId);
        if (a) a.scorers[e.scorerName] = (a.scorers[e.scorerName] ?? 0) + 1;
      }
    }
  }

  return [...byTeam.values()].sort(
    (x, y) => y.won - x.won || y.gd - x.gd || y.gf - x.gf || y.entered - x.entered,
  );
}

function topScorer(a: TeamAgg): { name: string; goals: number } | null {
  let best: { name: string; goals: number } | null = null;
  for (const [name, g] of Object.entries(a.scorers)) {
    if (!best || g > best.goals) best = { name, goals: g };
  }
  return best;
}

export default async function Leaderboard() {
  let teams: TeamAgg[] = [];

  if (isDbConfigured()) {
    const rows = await db()
      .select({ result: tournaments.result })
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt))
      .limit(200);
    teams = aggregate(rows.map((r) => r.result as CupResult));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl uppercase tracking-tight">Leaderboard</h1>
      <p className="mt-2 text-white/60">
        Every team that’s played a World Cup — ranked by cups won, then goal difference, then goals scored.
      </p>

      {teams.length === 0 ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
          No cups have been played yet.{" "}
          <Link href="/teams" className="text-emerald-400 hover:underline">Run the first →</Link>
        </div>
      ) : (
        <ol className="mt-6 space-y-2">
          {teams.map((a, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            const scorer = topScorer(a);
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 sm:px-4 py-3"
              >
                <span className="w-7 text-center font-bold text-white/50 text-lg">{medal ?? i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold truncate block">
                    {a.label}
                    {a.creator && <span className="ml-2 text-xs font-normal text-white/40">by {a.creator}</span>}
                  </span>
                  {scorer && (
                    <span className="text-xs text-white/45">
                      Top scorer: <span className="text-emerald-300">{scorer.name}</span> ⚽ {scorer.goals}
                    </span>
                  )}
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-bold text-yellow-300">
                    {a.won} 🏆
                  </span>
                  <span className="block text-xs text-white/45 tabular-nums">
                    {a.entered} cup{a.entered === 1 ? "" : "s"} · {a.gd > 0 ? `+${a.gd}` : a.gd} GD
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
