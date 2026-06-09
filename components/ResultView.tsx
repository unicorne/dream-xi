"use client";

import { useState } from "react";
import type { Formation } from "@/lib/draft/formations";
import type { RollPlayer } from "@/lib/clientTypes";
import type { LineQuality } from "@/lib/teamQuality";
import type { MatchResult, SimResult } from "@/lib/sim/types";
import { STAGE_LABEL } from "@/lib/sim";
import MatchDetail from "./MatchDetail";
import TournamentPanel from "./TournamentPanel";
import Awards from "./Awards";
import SquadStats from "./SquadStats";

const USER = "USER";
type Tab = "run" | "squad" | "awards" | "tournament";

const TABS: { id: Tab; label: string }[] = [
  { id: "run", label: "Your run" },
  { id: "squad", label: "My squad" },
  { id: "awards", label: "Awards" },
  { id: "tournament", label: "Tournament" },
];

export default function ResultView({
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
  const total = userMatches.length;

  const [tab, setTab] = useState<Tab>("run");
  const [revealed, setRevealed] = useState(0);
  const [animateIndex, setAnimateIndex] = useState(-1);
  const [animatingDone, setAnimatingDone] = useState(true);
  const [skip, setSkip] = useState(0);

  const done = revealed >= total;
  const showResults = done && animatingDone;

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

  const u = result.userOutcome;
  const champion = result.champion.id === USER;
  const showBar = tab === "run" && !showResults;

  return (
    <div className={showBar ? "pb-28" : "pb-6"}>
      {/* Outcome header */}
      <div className="text-center">
        <div className="text-5xl sm:text-6xl mb-2">
          {showResults ? (champion ? "🏆" : u.stageReached === "final" ? "🥈" : "⚽") : "⚽"}
        </div>
        <h1 className="font-display text-3xl sm:text-5xl uppercase tracking-tight">
          {showResults ? (champion ? "World Champions!" : STAGE_LABEL[u.stageReached]) : "Your tournament"}
        </h1>
        {showResults && (
          <>
            <p className="mt-3 text-base sm:text-lg text-white/80">
              {u.record.w}W · {u.record.d}D · {u.record.l}L · {u.record.gf}–{u.record.ga}
            </p>
            <p className="mt-1 text-sm text-white/50">
              Won by <strong className="text-white/80">{result.champion.label}</strong>
              {!champion && <> · runner-up {result.runnerUp.label}</>}
            </p>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="mt-6 sticky top-16 z-20 -mx-4 px-4 py-2 bg-[#0a0e1c]/80 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                tab === t.id
                  ? "bg-emerald-400 text-black"
                  : "bg-white/8 text-white/70 hover:bg-white/15"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {tab === "run" && (
          <div className="space-y-3 max-w-2xl">
            {userMatches.slice(0, revealed).map((m, i) => (
              <UserMatchCard
                key={i}
                m={m}
                index={i}
                animate={i === animateIndex}
                skipSignal={i === animateIndex ? skip : 0}
                onDone={() => setAnimatingDone(true)}
              />
            ))}
            {revealed === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 p-8 sm:p-10 text-center text-white/55 text-base sm:text-lg">
                Hit <strong className="text-emerald-300">Kick off</strong> to watch it unfold, match by match.
              </div>
            )}
          </div>
        )}

        {tab === "squad" && (
          <SquadStats result={result} formation={formation} placements={placements} quality={quality} />
        )}

        {tab === "awards" && (
          showResults ? (
            <Awards awards={result.awards} />
          ) : (
            <LockedHint label="Finish your run to reveal the tournament awards." onGo={() => setTab("run")} />
          )
        )}

        {tab === "tournament" && <TournamentPanel result={result} alwaysOpen />}
      </div>

      {/* Sticky control bar — only during the live run */}
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

function LockedHint({ label, onGo }: { label: string; onGo: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/55">
      <p>{label}</p>
      <button onClick={onGo} className="mt-4 rounded-xl bg-emerald-400 px-5 py-2.5 font-bold text-black hover:bg-emerald-300">
        Go to your run →
      </button>
    </div>
  );
}

function roundLabel(m: MatchResult): string {
  return m.round.startsWith("Group") ? `Group stage · ${m.round}` : m.round;
}

function UserMatchCard({
  m, index, animate, skipSignal, onDone,
}: {
  m: MatchResult; index: number; animate: boolean; skipSignal: number; onDone: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 overflow-hidden">
      <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300 border-b border-emerald-400/20">
        Match {index + 1} · {roundLabel(m)}
      </div>
      <MatchDetail m={m} highlightId={USER} animate={animate} skipSignal={skipSignal} onDone={onDone} />
    </div>
  );
}
