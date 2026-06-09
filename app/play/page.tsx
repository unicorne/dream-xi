"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FORMATIONS, type Formation } from "@/lib/draft/formations";
import { randomSeed } from "@/lib/rng";
import { useOwner } from "@/lib/useOwner";
import { teamQuality } from "@/lib/teamQuality";
import { teamChemistry } from "@/lib/sim/chemistry";
import type { Position, Player } from "@/lib/types";
import type { RollPlayer, RollResponse } from "@/lib/clientTypes";
import type { SimResult } from "@/lib/sim/types";
import Pitch from "@/components/Pitch";
import PlayerCard from "@/components/PlayerCard";
import TeamLines from "@/components/TeamLines";
import ResultView from "@/components/ResultView";

type Phase = "formation" | "drafting" | "ready" | "result";
interface Pending { player: RollPlayer; slotId: string }

export default function PlayPage() {
  const router = useRouter();
  const owner = useOwner();

  const [phase, setPhase] = useState<Phase>("formation");
  const [formation, setFormation] = useState<Formation>(FORMATIONS[0]);
  const [placements, setPlacements] = useState<Record<string, RollPlayer>>({});
  const [presented, setPresented] = useState<RollResponse | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState(3);
  const [selected, setSelected] = useState<RollPlayer | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed] = useState(() => randomSeed());
  // Anti-repeat buffer (last 6 "TEAM:YEAR" keys) + per-slot reroll counter; both
  // thread through the deterministic roll stream so draws are reproducible.
  const [recent, setRecent] = useState<string[]>([]);
  const [rerollCount, setRerollCount] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [creator, setCreator] = useState("");
  const [savingTeam, setSavingTeam] = useState(false);

  const placedCount = Object.keys(placements).length;
  const total = formation.slots.length;
  const posOf = (slotId: string): Position => formation.slots.find((s) => s.id === slotId)!.position;

  // Live team quality from committed placements + the tentative pending one.
  const displayPlacements = pending ? { ...placements, [pending.slotId]: pending.player } : placements;
  const displayEntries = Object.entries(displayPlacements);
  const quality = teamQuality(
    displayEntries.map(([slotId, p]) => ({ position: posOf(slotId), overall: p.overall })),
  );
  if (displayEntries.length > 0) {
    const xi = displayEntries.map(([slotId, p]) => ({
      slotId,
      position: posOf(slotId),
      player: { ...p, team: "", year: 0 } as unknown as Player,
    }));
    quality.chemistry = Math.round(teamChemistry(xi).score * 100);
  }

  const callRoll = useCallback(
    async (
      action: "next" | "reroll-same-team" | "reroll-same-year",
      curPlacements: Record<string, RollPlayer>,
      curPresentedId: string | null,
      curRerolls: number,
      curRecent: string[],
      curRerollNo: number,
    ) => {
      setLoading(true);
      setError(null);
      setPending(null);
      setSelected(null);
      try {
        const placementIds = Object.fromEntries(
          Object.entries(curPlacements).map(([slot, p]) => [slot, p.id]),
        );
        const res = await fetch("/api/draft/roll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formationId: formation.id,
            placements: placementIds,
            presentedSquadId: curPresentedId,
            rerollsLeft: curRerolls,
            action,
            seed: String(seed),
            // One roll per slot to fill: index by how many are already placed.
            rollIndex: Object.keys(curPlacements).length,
            rerollNo: curRerollNo,
            recent: curRecent,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Roll failed");
        const roll = data as RollResponse;
        setPresented(roll);
        setRerollsLeft(roll.rerollsLeft);
        setRecent(roll.recent ?? curRecent);
        // A fresh squad resets the per-slot reroll counter; a reroll advances it.
        setRerollCount(action === "next" ? 0 : curRerollNo + 1);
        // Auto-select the top eligible player so the spider-graph card is always
        // on screen — no appearing/disappearing layout jump between rolls (mobile).
        const first = roll.players.find((p) => p.eligibleSlots.length > 0 && !p.alreadyPlaced);
        if (first) {
          setSelected(first);
          setPending({ player: first, slotId: first.eligibleSlots[0] });
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [formation.id, seed],
  );

  function startDraft() {
    setPlacements({});
    setRecent([]);
    setRerollCount(0);
    setPhase("drafting");
    callRoll("next", {}, null, 3, [], 0);
  }

  function selectPlayer(p: RollPlayer) {
    setSelected(p);
    if (p.eligibleSlots.length > 0 && !p.alreadyPlaced) {
      // Tentatively place at the first eligible slot; user can move or change.
      setPending({ player: p, slotId: p.eligibleSlots[0] });
    }
  }

  function onSlotClick(slotId: string) {
    // Clicking a highlighted slot moves the tentative placement there.
    if (selected && selected.eligibleSlots.includes(slotId)) {
      setPending({ player: selected, slotId });
    }
  }

  function confirmRoll() {
    if (!pending) return;
    const next = { ...placements, [pending.slotId]: pending.player };
    setPlacements(next);
    setPending(null);
    setSelected(null);
    setPresented(null);
    if (Object.keys(next).length >= total) setPhase("ready");
    else callRoll("next", next, null, rerollsLeft, recent, 0);
  }

  async function saveTeam() {
    if (!teamName.trim()) return;
    setSavingTeam(true);
    setError(null);
    try {
      const xi = Object.entries(placements).map(([slotId, p]) => ({
        slotId, position: posOf(slotId), playerId: p.id,
      }));
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName, creator: creator || null, owner, formationId: formation.id, xi,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push("/teams");
    } catch (e) {
      setError((e as Error).message);
      setSavingTeam(false);
    }
  }

  async function simulate() {
    setLoading(true);
    setError(null);
    try {
      const xi = Object.entries(placements).map(([slotId, p]) => ({
        slotId, position: posOf(slotId), playerId: p.id,
      }));
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formationId: formation.id, xi, seed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Simulation failed");
      setResult(data.result as SimResult);
      setPhase("result");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAndShare() {
    setSaving(true);
    setError(null);
    try {
      const xi = Object.entries(placements).map(([slotId, p]) => ({
        slotId, position: posOf(slotId), playerId: p.id,
      }));
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formationId: formation.id, xi, seed, owner, teamLabel: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(`/r/${data.slug}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  const eligibleSet = selected && !selected.alreadyPlaced ? new Set(selected.eligibleSlots) : undefined;
  const isLast = placedCount === total - 1;

  // ---------- FORMATION PICK ----------
  if (phase === "formation") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-4xl uppercase tracking-tight">Pick your shape</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-white/55">
          <span><strong className="text-white">11</strong> rolls</span>
          <span className="text-white/25">·</span>
          <span><strong className="text-white">3</strong> rerolls</span>
          <span className="text-white/25">·</span>
          <span>no take-backs</span>
        </div>

        <div className="mt-7 grid lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 items-start">
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FORMATIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormation(f)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    formation.id === f.id
                      ? "border-emerald-400 bg-emerald-400/10"
                      : "border-white/15 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <div className="font-display text-2xl tracking-wide">{f.name}</div>
                  <div className="mt-1 text-xs text-white/50">{summarize(f)}</div>
                </button>
              ))}
            </div>
            <button
              onClick={startDraft}
              className="mt-5 w-full rounded-2xl bg-emerald-400 py-4 font-display text-2xl uppercase tracking-wide text-black hover:bg-emerald-300 transition"
            >
              Draft with {formation.name} →
            </button>
          </div>

          {/* Live pitch preview of the selected formation */}
          <div className="order-first lg:order-last lg:sticky lg:top-20">
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2 text-center lg:text-left">
              {formation.name} · positions
            </div>
            <div className="max-w-[17rem] mx-auto">
              <Pitch formation={formation} placements={{}} compact />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- RESULT ----------
  if (phase === "result" && result) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ResultView result={result} formation={formation} placements={placements} quality={quality} />
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            onClick={saveAndShare}
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & get share link"}
          </button>
          <button
            onClick={() => location.reload()}
            className="rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/10"
          >
            Play again
          </button>
        </div>
        {error && <p className="mt-4 text-center text-rose-400 text-sm">{error}</p>}
      </div>
    );
  }

  // ---------- DRAFTING / READY ----------
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid lg:grid-cols-[1fr_400px] gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-3xl uppercase tracking-wide">{formation.name}</h1>
          <div className="text-sm text-white/70">
            <span className="font-bold text-white">{placedCount}/{total}</span> placed ·{" "}
            <span className="font-bold text-emerald-300">{rerollsLeft}</span> reroll{rerollsLeft === 1 ? "" : "s"} left
          </div>
        </div>
        <div className="max-w-[19rem] sm:max-w-sm mx-auto lg:mx-0">
          <Pitch
            formation={formation}
            placements={displayPlacements}
            eligibleSlots={eligibleSet}
            pendingSlotId={pending?.slotId}
            onSlotClick={onSlotClick}
          />
        </div>
        <div className="max-w-sm mx-auto lg:mx-0 mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <TeamLines q={quality} />
        </div>
        {pending && selected && selected.eligibleSlots.length > 1 && (
          <p className="mt-3 text-center text-sm text-yellow-200">
            <strong>{pending.player.name}</strong> → {posOf(pending.slotId)} slot. Tap another highlighted
            slot to move, or hit Roll.
          </p>
        )}
      </div>

      <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 h-fit lg:sticky lg:top-4">
        {phase === "ready" ? (
          <div className="py-4">
            <div className="text-center">
              <h2 className="font-display text-2xl uppercase tracking-wide">XI complete</h2>
              <p className="mt-2 text-white/60 text-sm">
                Name it and save to the pool, or run a quick solo test.
              </p>
            </div>
            <div className="mt-5 space-y-2">
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                maxLength={40}
                className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-3 outline-none focus:border-emerald-400/60"
              />
              <input
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={30}
                className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/60"
              />
              <button
                onClick={saveTeam}
                disabled={savingTeam || !teamName.trim()}
                className="w-full rounded-2xl bg-emerald-400 py-4 font-display text-xl uppercase tracking-wide text-black hover:bg-emerald-300 disabled:opacity-40 disabled:bg-white/15 disabled:text-white/50 transition"
              >
                {savingTeam ? "Saving…" : "Save to pool"}
              </button>
            </div>
            <div className="my-4 flex items-center gap-3 text-xs text-white/30">
              <div className="flex-1 h-px bg-white/10" /> or <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              onClick={simulate}
              disabled={loading}
              className="w-full rounded-xl border border-white/20 py-3 font-semibold hover:bg-white/10 disabled:opacity-50 transition"
            >
              {loading ? "Simulating…" : "Quick solo test"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50">Rolled squad</div>
                <div className="font-display text-2xl tracking-wide">{presented?.squad.label ?? "…"}</div>
              </div>
              {loading && <span className="text-xs text-white/50 animate-pulse">rolling…</span>}
            </div>

            {/* Always reserve the card's space so the layout never jumps between rolls. */}
            <div className="mt-3 min-h-[284px]">
              {selected ? (
                <PlayerCard player={selected} />
              ) : (
                <div className="h-[284px] rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/30 text-sm">
                  {loading ? "Rolling…" : "Select a player to see their card"}
                </div>
              )}
            </div>

            <div className="mt-3 space-y-1 max-h-[42vh] overflow-y-auto pr-1">
              {presented?.players.map((p) => {
                const selectable = p.eligibleSlots.length > 0 && !p.alreadyPlaced;
                const isSel = selected?.id === p.id;
                const isPending = pending?.player.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPlayer(p)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                      isPending
                        ? "bg-yellow-300/20 ring-1 ring-yellow-300"
                        : isSel
                          ? "bg-white/15 ring-1 ring-white/40"
                          : "hover:bg-white/10"
                    } ${selectable ? "" : "opacity-40"}`}
                  >
                    <span className="w-7 text-center font-bold text-sm tabular-nums">{p.overall}</span>
                    <span className="flex-1 truncate text-sm">
                      {p.name} {p.legend && <span>⭐</span>}
                      {p.alreadyPlaced && <span className="ml-1 text-[10px] text-white/40">(in XI)</span>}
                    </span>
                    <span className="text-[10px] text-white/50">{p.positions.join("/")}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={confirmRoll}
              disabled={loading || !pending}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-3 font-bold text-black hover:bg-emerald-400 disabled:opacity-40 disabled:bg-white/15 disabled:text-white/50"
            >
              {pending
                ? isLast
                  ? `Place ${pending.player.name} & finish XI →`
                  : `Place ${pending.player.name} & roll →`
                : "Select a player to place"}
            </button>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => callRoll("reroll-same-team", placements, presented?.squad.id ?? null, rerollsLeft, recent, rerollCount)}
                disabled={loading || rerollsLeft <= 0 || !presented}
                className="rounded-lg border border-white/20 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
              >
                Same team<br /><span className="text-white/50">different year</span>
              </button>
              <button
                onClick={() => callRoll("reroll-same-year", placements, presented?.squad.id ?? null, rerollsLeft, recent, rerollCount)}
                disabled={loading || rerollsLeft <= 0 || !presented}
                className="rounded-lg border border-white/20 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
              >
                Same year<br /><span className="text-white/50">different team</span>
              </button>
            </div>
          </>
        )}
        {error && <p className="mt-3 text-rose-400 text-sm">{error}</p>}
      </aside>
    </div>
  );
}

function summarize(f: Formation): string {
  const counts: Record<string, number> = {};
  for (const s of f.slots) {
    const group = ["RB", "LB", "CB"].includes(s.position)
      ? "DEF"
      : ["CM", "AM", "RM", "LM"].includes(s.position)
        ? "MID"
        : s.position === "GK"
          ? "GK"
          : "ATT";
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return `${counts.DEF ?? 0} def · ${counts.MID ?? 0} mid · ${counts.ATT ?? 0} att`;
}
