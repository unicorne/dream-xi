"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CupResult, MatchResult, Stage } from "@/lib/sim/types";
import { STAGE_LABEL } from "@/lib/sim";
import Awards from "./Awards";
import TournamentPanel from "./TournamentPanel";
import MatchDetail from "./MatchDetail";
import ShareBar from "./ShareBar";

const STAGE_BADGE: Record<Stage, string> = {
  champion: "bg-yellow-400 text-black",
  final: "bg-slate-300 text-black",
  sf: "bg-orange-400/80 text-black",
  qf: "bg-sky-400/70 text-black",
  r16: "bg-white/15 text-white/80",
  group: "bg-white/10 text-white/50",
};

function roundLabel(m: MatchResult): string {
  return m.round.startsWith("Group") ? `Group stage · ${m.round}` : m.round;
}

interface Contributor { id: string; name: string; goals: number; assists: number }

/** Goal/assist tallies for one team's players across the whole cup. */
function teamContributors(matches: MatchResult[], teamId: string): Contributor[] {
  const goals: Record<string, number> = {};
  const assists: Record<string, number> = {};
  const names: Record<string, string> = {};
  for (const m of matches) {
    for (const e of m.events) {
      const scoringId = e.side === "home" ? m.home.id : m.away.id;
      if (scoringId !== teamId) continue;
      goals[e.scorerId] = (goals[e.scorerId] ?? 0) + 1;
      names[e.scorerId] = e.scorerName;
      if (e.assistId && e.assistName) {
        assists[e.assistId] = (assists[e.assistId] ?? 0) + 1;
        names[e.assistId] = e.assistName;
      }
    }
  }
  const ids = new Set([...Object.keys(goals), ...Object.keys(assists)]);
  return [...ids]
    .map((id) => ({ id, name: names[id], goals: goals[id] ?? 0, assists: assists[id] ?? 0 }))
    .sort((a, b) => b.goals + b.assists - (a.goals + a.assists) || b.goals - a.goals);
}

export default function CupView({ result, cupName, slug }: { result: CupResult; cupName?: string | null; slug?: string }) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";

  const highlightIds = new Set(result.standings.map((s) => s.id));
  const championEntrant = result.standings.find((s) => s.id === result.champion.id);

  // Playback spine: every match involving an entered team, in chronological order.
  const entrantMatches = result.matches.filter(
    (m) => highlightIds.has(m.home.id) || highlightIds.has(m.away.id),
  );
  const total = entrantMatches.length;

  // When revisiting from history (no ?new=1), skip straight to results.
  const [revealed, setRevealed] = useState(() => isNew ? 0 : total);
  const [animateIndex, setAnimateIndex] = useState(-1);
  const [animatingDone, setAnimatingDone] = useState(!isNew);
  const [skip, setSkip] = useState(0);
  const [openTeam, setOpenTeam] = useState<string | null>(null);

  const done = revealed >= total;
  const showResults = done && animatingDone;
  const showBar = !showResults && total > 0;

  function playNext() {
    const cur = revealed;
    setAnimateIndex(cur);
    setRevealed(cur + 1);
    setAnimatingDone(false);
  }
  function revealAll() {
    setAnimateIndex(-1);
    setRevealed(total);
    setAnimatingDone(true);
  }

  return (
    <div className={showBar ? "pb-28" : "pb-8"}>
      <div className="text-center">
        <div className="text-6xl mb-2">{showResults ? "🏆" : "⚽"}</div>
        {cupName && <div className="text-sm uppercase tracking-widest text-white/40">{cupName}</div>}
        <h1 className="font-display text-3xl sm:text-5xl uppercase tracking-tight">
          {showResults ? result.champion.label : "Cup in progress"}
        </h1>
        {showResults ? (
          <>
            <p className="mt-2 text-white/60">
              World Champions
              {championEntrant?.creator && (
                <> · built by <strong className="text-emerald-300">{championEntrant.creator}</strong></>
              )}
              {!championEntrant && <> · a historical wildcard side</>}
            </p>
            <p className="mt-1 text-sm text-white/40">Runner-up {result.runnerUp.label}</p>
          </>
        ) : (
          <p className="mt-2 text-white/55">
            Watch your teams play through the tournament — goal by goal.
          </p>
        )}
      </div>

      {/* Live playback spine */}
      <div className="mt-8 max-w-2xl mx-auto">
        <div className="space-y-3">
          {entrantMatches.slice(0, revealed).map((m, i) => (
            <div key={i} className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 overflow-hidden">
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300 border-b border-emerald-400/20">
                {roundLabel(m)}
              </div>
              <MatchDetail
                m={m}
                highlightIds={highlightIds}
                animate={i === animateIndex}
                skipSignal={i === animateIndex ? skip : 0}
                onDone={() => setAnimatingDone(true)}
              />
            </div>
          ))}
          {revealed === 0 && (
            <div className="rounded-2xl border border-dashed border-white/20 p-8 sm:p-10 text-center text-white/55 text-base sm:text-lg">
              Hit <strong className="text-emerald-300">Kick off</strong> below to follow every match
              your teams play — live goals, assists and shootouts.
            </div>
          )}
        </div>
      </div>

      {showResults && (
        <>
          <div className="mt-12">
            <h2 className="font-display text-2xl uppercase tracking-wide mb-3">How the teams finished</h2>
            <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
              {result.standings.map((s, i) => {
                const open = openTeam === s.id;
                const contributors = open ? teamContributors(result.matches, s.id) : [];
                return (
                  <div key={s.id}>
                    <button
                      onClick={() => setOpenTeam(open ? null : s.id)}
                      className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left hover:bg-white/5 transition"
                    >
                      <span className="w-6 text-center font-bold text-white/40">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{s.label}</div>
                        {s.creator && <div className="text-xs text-white/45">by {s.creator}</div>}
                      </div>
                      <div className="text-xs text-white/50 tabular-nums hidden sm:block">
                        {s.record.w}W {s.record.d}D {s.record.l}L · {s.record.gf}–{s.record.ga}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold ${STAGE_BADGE[s.stageReached]}`}>
                        {s.stageReached === "champion" ? "🏆" : STAGE_LABEL[s.stageReached]}
                      </span>
                      <span className="text-white/30 text-xs w-3">{open ? "▲" : "▾"}</span>
                    </button>
                    {open && (
                      <div className="px-3 sm:px-4 pb-3">
                        <div className="rounded-xl bg-black/20 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">
                            Goals &amp; assists · {s.record.gf} scored
                          </div>
                          {contributors.length === 0 ? (
                            <div className="text-sm text-white/40">No goals scored in this tournament.</div>
                          ) : (
                            <div className="space-y-1">
                              {contributors.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 text-sm">
                                  <span className="flex-1 truncate">{c.name}</span>
                                  {c.goals > 0 && (
                                    <span className="rounded bg-emerald-400/15 text-emerald-300 px-1.5 py-0.5 text-xs font-semibold">
                                      ⚽ {c.goals}
                                    </span>
                                  )}
                                  {c.assists > 0 && (
                                    <span className="rounded bg-sky-400/15 text-sky-300 px-1.5 py-0.5 text-xs font-semibold">
                                      🅰️ {c.assists}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-white/40">
              Tap a team to see its scorers. The bracket is filled to 32 with random historical sides;
              only your entered teams are listed here.
            </p>
          </div>

          <div className="mt-10">
            <Awards awards={result.awards} />
          </div>

          <div className="mt-10">
            <h2 className="font-display text-2xl uppercase tracking-wide mb-3">Full tournament</h2>
            <TournamentPanel result={result} alwaysOpen highlightIds={highlightIds} />
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            {slug && <ShareBar path={`/cup/${slug}`} label="Copy cup link" />}
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/teams" className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-black hover:bg-emerald-300">
                Run another cup →
              </Link>
              <Link href="/cups" className="rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/10">
                Cup history
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Sticky control bar */}
      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:p-4 pointer-events-none">
          <div className="mx-auto max-w-md pointer-events-auto rounded-2xl border border-white/15 bg-[#11162b]/90 backdrop-blur shadow-2xl shadow-black/50 p-3 flex items-center gap-3">
            <span className="text-sm text-white/55 tabular-nums whitespace-nowrap pl-1">
              {Math.min(revealed, total)}/{total}
            </span>
            {!animatingDone ? (
              <button
                onClick={() => setSkip((s) => s + 1)}
                className="flex-1 rounded-xl bg-white/15 py-3 font-bold text-lg hover:bg-white/25 transition"
              >
                Skip
              </button>
            ) : (
              <button
                onClick={playNext}
                className="flex-1 rounded-xl bg-emerald-400 py-3 font-bold text-lg text-black hover:bg-emerald-300 transition"
              >
                {revealed === 0 ? "Kick off" : "Next match"}
              </button>
            )}
            {revealed < total && (
              <button
                onClick={revealAll}
                className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition whitespace-nowrap"
              >
                Skip all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
