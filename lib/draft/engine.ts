// Pure draft engine: formations, "any listed position" eligibility, the 3-reroll
// total budget, dead-roll handling, and a guaranteed-completable XI.
//
// The draft is interactive (user choices), so it does NOT need to replay from a
// seed — only the final XI + the sim seed are persisted. An Rng is passed in for
// squad presentation/reroll so tests stay deterministic.

import type { Player, Squad } from "../types.ts";
import { makeRng, type Rng } from "../rng.ts";
import { SQUADS, getSquad, squadPlayers, getPlayer as playerById } from "../data/index.ts";
import { type Formation, type Slot } from "./formations.ts";
import {
  squadKey, squadWeight, pickWeighted, pickUniform, nationGroup, pushRecent,
} from "./sampling.ts";

export const TOTAL_REROLLS = 3;

export interface DraftState {
  formation: Formation;
  /** slotId -> placed player. */
  placements: Record<string, Player>;
  /** The squad currently on the table to pick from (null before first roll). */
  presentedSquadId: string | null;
  rerollsLeft: number;
  /** Last 6 distinct "TEAM:YEAR" keys (most recent last) for anti-repeat. */
  recent: string[];
}

export type RerollFlavor = "same-team" | "same-year";

export function initDraft(formation: Formation): DraftState {
  return {
    formation,
    placements: {},
    presentedSquadId: null,
    rerollsLeft: TOTAL_REROLLS,
    recent: [],
  };
}

/** Rebuild a DraftState from compact client state (slotId -> playerId). */
export function restoreDraft(
  formation: Formation,
  placements: Record<string, string>,
  presentedSquadId: string | null,
  rerollsLeft: number,
  recent: string[] = [],
): DraftState {
  const placed: Record<string, Player> = {};
  for (const [slotId, playerId] of Object.entries(placements)) {
    const slot = formation.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error(`Unknown slot ${slotId}`);
    const player = playerById(playerId);
    if (!player) throw new Error(`Unknown player ${playerId}`);
    if (!player.positions.includes(slot.position)) {
      throw new Error(`${player.name} cannot play ${slot.position}`);
    }
    placed[slotId] = player;
  }
  return {
    formation,
    placements: placed,
    presentedSquadId,
    rerollsLeft: Math.max(0, Math.min(TOTAL_REROLLS, rerollsLeft)),
    recent: Array.isArray(recent) ? recent.slice(-6) : [],
  };
}

export function placedPlayerIds(state: DraftState): Set<string> {
  return new Set(Object.values(state.placements).map((p) => p.id));
}

/** Real people already in the XI. Only one player per person may be drafted,
 *  even across different World Cups (e.g. Pelé 1958 vs Pelé 1970). */
export function placedPersonIds(state: DraftState): Set<string> {
  return new Set(Object.values(state.placements).map((p) => p.personId));
}

export function emptySlots(state: DraftState): Slot[] {
  return state.formation.slots.filter((s) => !state.placements[s.id]);
}

export function isComplete(state: DraftState): boolean {
  return emptySlots(state).length === 0;
}

/** Empty slots a given player is eligible to fill (any listed position). */
export function eligibleSlotsForPlayer(state: DraftState, player: Player): Slot[] {
  return emptySlots(state).filter((s) => player.positions.includes(s.position));
}

export interface PlaceableEntry {
  player: Player;
  slots: Slot[];
}

/** Players of a squad (excluding anyone whose person is already placed) that can
 *  fill some empty slot. */
export function placeableEntries(state: DraftState, squad: Squad): PlaceableEntry[] {
  const placedPersons = placedPersonIds(state);
  const empties = emptySlots(state);
  const out: PlaceableEntry[] = [];
  for (const player of squadPlayers(squad)) {
    if (placedPersons.has(player.personId)) continue;
    const slots = empties.filter((s) => player.positions.includes(s.position));
    if (slots.length > 0) out.push({ player, slots });
  }
  return out;
}

export function squadCanPlace(state: DraftState, squad: Squad): boolean {
  const placedPersons = placedPersonIds(state);
  const empties = emptySlots(state);
  return squadPlayers(squad).some(
    (p) => !placedPersons.has(p.personId) && empties.some((s) => p.positions.includes(s.position)),
  );
}

/**
 * Strength-weighted pick from a base pool, honoring the recent-pick buffer and
 * the placeability requirement (a presented squad must be able to fill an empty
 * slot, so the draft never soft-locks). Returns null if the pool has nothing
 * placeable — callers handle that fallback.
 */
function pickWeightedPresentable(rng: Rng, state: DraftState, pool: Squad[]): Squad | null {
  const placeable = pool.filter((s) => squadCanPlace(state, s));
  if (placeable.length === 0) return null;
  let candidates = placeable.filter((s) => !state.recent.includes(squadKey(s)));
  if (candidates.length === 0) candidates = placeable; // fallback: ignore recent
  return pickWeighted(rng, candidates, candidates.map((s) => squadWeight(s)));
}

/**
 * Nation-swap (same year, different nation) — UNIFORM over distinct nations, not
 * weighted. Walks SQUADS in canonical order so the uniform draw is reproducible.
 */
function pickNationSwap(rng: Rng, state: DraftState, current: Squad): Squad | null {
  const seen = new Set<string>();
  const sels: string[] = [];
  for (const s of SQUADS) {
    if (s.year !== current.year || s.team === current.team) continue;
    if (seen.has(s.team) || !squadCanPlace(state, s)) continue;
    seen.add(s.team);
    sels.push(s.team);
  }
  if (sels.length === 0) return null;
  let candidates = sels.filter((sel) => !state.recent.includes(`${sel}:${current.year}`));
  if (candidates.length === 0) candidates = sels; // fallback: ignore recent
  const chosenSel = pickUniform(rng, candidates);
  return (
    SQUADS.find((s) => s.team === chosenSel && s.year === current.year && squadCanPlace(state, s)) ??
    null
  );
}

/**
 * Present a fresh squad for the next roll (no reroll cost). Strength-weighted:
 * stronger squads (higher avg roster overall) are likelier, capped at 4:1.
 * `seed`/`rollIndex` make the draw deterministic via the "SEED:roll:N" stream.
 */
export function rollNext(state: DraftState, seed: string, rollIndex: number): DraftState {
  const rng = makeRng(`${seed}:roll:${rollIndex}`);
  const squad = pickWeightedPresentable(rng, state, SQUADS);
  if (!squad) throw new Error("No placeable squad exists for the current draft state.");
  return {
    ...state,
    presentedSquadId: squad.id,
    recent: pushRecent(state.recent, squadKey(squad)),
  };
}

/**
 * Reroll the presented squad. Costs 1 from the shared pool. Two axes:
 *   "same-team" -> edition swap (same nation family, different year), WEIGHTED.
 *   "same-year" -> nation swap (same year, different nation), UNIFORM.
 * If the axis pool is empty even after fallbacks, the current squad is kept and
 * no reroll is spent.
 */
export function reroll(
  state: DraftState,
  seed: string,
  rollIndex: number,
  rerollNo: number,
  flavor: RerollFlavor,
): DraftState {
  if (state.rerollsLeft <= 0) throw new Error("No rerolls left.");
  const current = state.presentedSquadId ? getSquad(state.presentedSquadId) : undefined;
  if (!current) throw new Error("Nothing presented to reroll.");

  const axis = flavor === "same-team" ? "copa" : "sel";
  const rng = makeRng(`${seed}:roll:${rollIndex}:rr:${rerollNo}:${axis}`);

  let squad: Squad | null;
  if (flavor === "same-team") {
    const group = nationGroup(current.team);
    const pool = SQUADS.filter(
      (s) => group.includes(s.team) && squadKey(s) !== squadKey(current),
    );
    squad = pickWeightedPresentable(rng, state, pool);
  } else {
    squad = pickNationSwap(rng, state, current);
  }

  // Safety net: never soft-lock — fall back to any placeable squad if the axis
  // pool yielded nothing.
  if (!squad) {
    squad = pickWeightedPresentable(
      rng,
      state,
      SQUADS.filter((s) => s.id !== current.id),
    );
  }
  if (!squad || squad.id === current.id) return state; // nothing to swap to; keep current, no cost

  return {
    ...state,
    presentedSquadId: squad.id,
    rerollsLeft: state.rerollsLeft - 1,
    recent: pushRecent(state.recent, squadKey(squad)),
  };
}

/** Place a player from the presented squad into an empty, eligible slot. */
export function placePlayer(state: DraftState, player: Player, slotId: string): DraftState {
  const slot = state.formation.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`Unknown slot: ${slotId}`);
  if (state.placements[slotId]) throw new Error(`Slot already filled: ${slotId}`);
  if (!player.positions.includes(slot.position)) {
    throw new Error(`${player.name} (${player.positions.join("/")}) cannot play ${slot.position}.`);
  }
  if (placedPersonIds(state).has(player.personId)) {
    throw new Error(`${player.name} is already in your XI (from another World Cup).`);
  }
  return {
    ...state,
    placements: { ...state.placements, [slotId]: player },
    presentedSquadId: null, // consumed; next roll presents a new squad
  };
}
