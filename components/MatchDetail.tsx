"use client";
import { useEffect, useRef, useState } from "react";
import type { MatchResult } from "@/lib/sim/types";

const GOAL_DELAY = 1300; // ms between goals when playing live
const PEN_DELAY = 650; // ms between penalty kicks

export default function MatchDetail({
  m,
  highlightId,
  highlightIds,
  animate = false,
  skipSignal = 0,
  onDone,
}: {
  m: MatchResult;
  highlightId?: string;
  highlightIds?: Set<string>;
  animate?: boolean;
  skipSignal?: number;
  onDone?: () => void;
}) {
  const events = m.events;
  const kicks = m.penalties?.kicks ?? [];
  const totalSteps = events.length + kicks.length;

  const [step, setStep] = useState(animate ? 0 : totalSteps);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneCalled = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = () => {
    if (timer.current) clearTimeout(timer.current);
    if (!doneCalled.current) {
      doneCalled.current = true;
      onDoneRef.current?.();
    }
  };

  // Drive the live reveal on mount (only when animating).
  useEffect(() => {
    if (!animate) {
      setStep(totalSteps);
      return;
    }
    setStep(0);
    if (totalSteps === 0) {
      timer.current = setTimeout(finish, 800);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    let s = 0;
    const tick = () => {
      s++;
      setStep(s);
      if (s >= totalSteps) {
        finish();
        return;
      }
      const nextIsPen = s >= events.length;
      timer.current = setTimeout(tick, nextIsPen ? PEN_DELAY : GOAL_DELAY);
    };
    timer.current = setTimeout(tick, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skip request -> jump straight to the final state.
  useEffect(() => {
    if (skipSignal > 0) {
      setStep(totalSteps);
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipSignal]);

  const playing = animate && step < totalSteps;
  const shownEvents = events.slice(0, Math.min(step, events.length));
  const shownKicks = kicks.slice(0, Math.max(0, step - events.length));

  const homeScore = shownEvents.filter((e) => e.side === "home").length;
  const awayScore = shownEvents.filter((e) => e.side === "away").length;
  const penHome = shownKicks.filter((k) => k.side === "home" && k.scored).length;
  const penAway = shownKicks.filter((k) => k.side === "away" && k.scored).length;

  const homeWon = !playing && m.winner?.id === m.home.id;
  const awayWon = !playing && m.winner?.id === m.away.id;
  const hl = (id: string) => (id === highlightId || highlightIds?.has(id) ? "text-emerald-300" : "");

  return (
    <div className="p-3">
      <div className="flex items-center justify-center gap-3 text-lg font-bold">
        <span className={`flex-1 text-right truncate ${homeWon ? "" : "text-white/60"} ${hl(m.home.id)}`}>
          {m.home.label}
        </span>
        <span className="px-3 py-1 rounded-lg bg-black/30 tabular-nums">
          {homeScore} – {awayScore}
        </span>
        <span className={`flex-1 truncate ${awayWon ? "" : "text-white/60"} ${hl(m.away.id)}`}>
          {m.away.label}
        </span>
      </div>

      {playing && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-300">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="animate-pulse">LIVE</span>
          <span className="inline-block animate-bounce">⚽</span>
        </div>
      )}

      {!playing && (m.extraTime || m.penalties) && (
        <div className="mt-1 text-center text-[11px] text-white/50">
          {m.penalties
            ? `After extra time · ${m.penalties.home}–${m.penalties.away} on penalties`
            : "After extra time"}
        </div>
      )}

      {shownEvents.length > 0 && (
        <div className="mt-3 space-y-1">
          {shownEvents.map((e, i) => (
            <div
              key={i}
              className={`flex text-sm animate-[fadeIn_0.4s_ease-out] ${
                e.side === "away" ? "flex-row-reverse text-right" : ""
              }`}
            >
              <div className={`flex-1 ${e.side === "away" ? "text-right" : ""}`}>
                <span className="text-white/40 tabular-nums mr-1">{e.minute}'</span>
                ⚽ <span className="font-medium">{e.scorerName}</span>
                {e.assistName && <span className="text-white/50"> · assist {e.assistName}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {playing && step < events.length && (
        <div className="mt-2 text-center text-white/30 tracking-[0.4em] animate-pulse">• • •</div>
      )}

      {shownKicks.length > 0 && (
        <div className="mt-3 rounded-lg bg-black/20 p-2">
          <div className="text-[11px] uppercase tracking-wide text-white/50 mb-1">
            Penalty shootout {penHome}–{penAway}
          </div>
          <div className="grid grid-cols-2 gap-x-4 text-sm">
            <div>
              {shownKicks.filter((k) => k.side === "home").map((k, i) => (
                <div key={i} className="flex justify-between animate-[fadeIn_0.3s_ease-out]">
                  <span className="truncate">{k.takerName}</span>
                  <span>{k.scored ? "✅" : "❌"}</span>
                </div>
              ))}
            </div>
            <div>
              {shownKicks.filter((k) => k.side === "away").map((k, i) => (
                <div key={i} className="flex justify-between animate-[fadeIn_0.3s_ease-out]">
                  <span>{k.scored ? "✅" : "❌"}</span>
                  <span className="truncate">{k.takerName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
