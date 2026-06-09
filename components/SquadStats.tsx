"use client";
import type { Formation } from "@/lib/draft/formations";
import type { RollPlayer } from "@/lib/clientTypes";
import type { LineQuality } from "@/lib/teamQuality";
import type { SimResult } from "@/lib/sim/types";
import type { Position } from "@/lib/types";
import Pitch from "./Pitch";
import TeamLines from "./TeamLines";

const USER = "USER";

function ratingColor(ovr: number): string {
  if (ovr >= 88) return "bg-yellow-400 text-black";
  if (ovr >= 82) return "bg-emerald-400 text-black";
  if (ovr >= 76) return "bg-sky-400 text-black";
  return "bg-slate-300 text-black";
}

interface Row {
  slotId: string;
  position: Position;
  player: RollPlayer;
  goals: number;
  assists: number;
}

export default function SquadStats({
  result,
  formation,
  placements,
  quality,
}: {
  result: SimResult;
  formation: Formation;
  placements: Record<string, RollPlayer>;
  quality?: LineQuality;
}) {
  const userMatches = result.matches.filter((m) => m.home.id === USER || m.away.id === USER);

  // Count goals/assists, but only for goals scored by the USER team (avoids id
  // collisions when an opponent is the same historical squad you drafted from).
  const goals: Record<string, number> = {};
  const assists: Record<string, number> = {};
  for (const m of userMatches) {
    for (const e of m.events) {
      const scoringId = e.side === "home" ? m.home.id : m.away.id;
      if (scoringId !== USER) continue;
      goals[e.scorerId] = (goals[e.scorerId] ?? 0) + 1;
      if (e.assistId) assists[e.assistId] = (assists[e.assistId] ?? 0) + 1;
    }
  }

  const rows: Row[] = Object.entries(placements)
    .map(([slotId, player]) => ({
      slotId,
      position: formation.slots.find((s) => s.id === slotId)!.position,
      player,
      goals: goals[player.id] ?? 0,
      assists: assists[player.id] ?? 0,
    }))
    .sort(
      (a, b) =>
        b.goals + b.assists - (a.goals + a.assists) || b.player.overall - a.player.overall,
    );

  const teamGoals = rows.reduce((n, r) => n + r.goals, 0);

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-4">
        <Pitch formation={formation} placements={placements} compact />
        {quality && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <TeamLines q={quality} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-display text-xl uppercase tracking-wide">Your players</h3>
          <span className="text-sm text-white/50">{teamGoals} goals scored</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
          {rows.map((r) => (
            <div key={r.slotId} className="flex items-center gap-3 px-3 py-2.5">
              <div className={`w-10 h-10 shrink-0 rounded-lg grid place-items-center font-black ${ratingColor(r.player.overall)}`}>
                {r.player.overall}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">
                  {r.player.name} {r.player.legend && <span title="Legend">⭐</span>}
                </div>
                <div className="text-xs text-white/45">{r.position} · {r.player.positions.join("/")}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {r.goals > 0 && (
                  <span className="rounded-md bg-emerald-400/15 text-emerald-300 px-2 py-0.5 font-semibold whitespace-nowrap">
                    ⚽ {r.goals}
                  </span>
                )}
                {r.assists > 0 && (
                  <span className="rounded-md bg-sky-400/15 text-sky-300 px-2 py-0.5 font-semibold whitespace-nowrap">
                    🅰️ {r.assists}
                  </span>
                )}
                {r.goals === 0 && r.assists === 0 && (
                  <span className="text-white/30 text-xs">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
