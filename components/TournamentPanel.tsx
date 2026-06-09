"use client";
import { useState } from "react";
import type { MatchResult, SimResult } from "@/lib/sim/types";
import MatchDetail from "./MatchDetail";

const USER = "USER";

function ScoreRow({ m, onClick, open, hi }: { m: MatchResult; onClick: () => void; open: boolean; hi: (id: string) => boolean }) {
  const involved = hi(m.home.id) || hi(m.away.id);
  const homeWon = m.winner?.id === m.home.id;
  const awayWon = m.winner?.id === m.away.id;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 text-sm px-2 py-1 rounded ${
        involved ? "bg-emerald-400/15 ring-1 ring-emerald-400/40" : "hover:bg-white/5"
      }`}
    >
      <span className={`flex-1 text-right truncate ${homeWon ? "font-bold" : "text-white/60"}`}>{m.home.label}</span>
      <span className="px-2 font-mono text-xs tabular-nums whitespace-nowrap">
        {m.homeGoals}-{m.awayGoals}
        {m.penalties ? ` (${m.penalties.home}-${m.penalties.away}p)` : ""}
      </span>
      <span className={`flex-1 truncate ${awayWon ? "font-bold" : "text-white/60"}`}>{m.away.label}</span>
      <span className="text-white/30 text-xs">{open ? "▲" : "▾"}</span>
    </button>
  );
}

export default function TournamentPanel({
  result, defaultOpen, alwaysOpen, highlightIds,
}: {
  result: { groups: SimResult["groups"]; knockouts: SimResult["knockouts"] };
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  highlightIds?: Set<string>;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (key: string) => setExpanded((e) => (e === key ? null : key));
  const isOpen = alwaysOpen || open;
  const hi = (id: string) => (highlightIds ? highlightIds.has(id) : id === USER);

  return (
    <div className={alwaysOpen ? "" : "rounded-2xl border border-white/10 bg-white/5"}>
      {!alwaysOpen && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 font-bold"
        >
          <span>Full tournament</span>
          <span className="text-white/40">{open ? "Hide ▲" : "Show ▾"}</span>
        </button>
      )}

      {isOpen && (
        <div className={alwaysOpen ? "space-y-6" : "px-4 pb-4 space-y-6"}>
          {/* Knockouts first (most interesting) */}
          <div>
            <h3 className="text-sm font-bold text-emerald-300 mb-2">Knockout stage</h3>
            <div className="space-y-4">
              {result.knockouts.map((round) => (
                <div key={round.name}>
                  <div className="text-xs uppercase tracking-wide text-white/50 mb-1">{round.name}</div>
                  <div className="space-y-1">
                    {round.matches.map((m, i) => {
                      const key = `${round.name}-${i}`;
                      return (
                        <div key={key}>
                          <ScoreRow m={m} open={expanded === key} onClick={() => toggle(key)} hi={hi} />
                          {expanded === key && (
                            <div className="rounded-lg border border-white/10 bg-black/20 mt-1">
                              <MatchDetail m={m} highlightIds={highlightIds} highlightId={highlightIds ? undefined : USER} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group standings */}
          <div>
            <h3 className="text-sm font-bold text-emerald-300 mb-2">Group stage</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {result.groups.map((g) => (
                <div key={g.name} className="rounded-lg border border-white/10 p-2">
                  <div className="text-xs font-semibold mb-1">{g.name}</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {g.standings.map((s, i) => (
                        <tr
                          key={s.team.id}
                          className={hi(s.team.id) ? "text-emerald-300 font-semibold" : i < 2 ? "" : "text-white/40"}
                        >
                          <td className="py-0.5">{i + 1}.</td>
                          <td className="truncate">{s.team.label}</td>
                          <td className="text-right tabular-nums">{s.pts}</td>
                          <td className="text-right tabular-nums text-white/40">
                            {s.gf}:{s.ga}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
