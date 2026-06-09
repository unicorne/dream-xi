// Squad-roll sampling (7A0 "SETE A ZERO" algorithm).
//
// Rolls are NOT uniform: squads are drawn with probability proportional to a
// strength weight in [0.25, 1.0] (a hard 4:1 strong-to-weak ratio), derived from
// the squad's average roster "force". Here "force" is the player `overall`, and a
// squad's avg_force is the mean overall across its WHOLE roster (not a best XI).
//
// A squad's key is "TEAM:YEAR" (the spec's "SEL:COPA"). Weights are computed once
// over the full pool, in the canonical array order shipped in squads.json
// (grouped by year ascending, then team) — the weighted picker walks the pool in
// order and subtracts as it goes, so the order is part of the contract.

import type { Squad } from "../types.ts";
import type { Rng } from "../rng.ts";
import { SQUADS, squadPlayers } from "../data/index.ts";

/** Stable squad identity for weighting + the recent-pick buffer. */
export function squadKey(s: { team: string; year: number }): string {
  return `${s.team}:${s.year}`;
}

/** Mean `overall` across the squad's entire roster. */
function avgForce(squad: Squad): number {
  const players = squadPlayers(squad);
  if (players.length === 0) return 0;
  let sum = 0;
  for (const p of players) sum += p.overall;
  return sum / players.length;
}

// Weight map built once over the full pool: weight = 0.25 + 0.75 * normalized
// avg_force, giving the weakest squad 0.25 and the strongest 1.0.
const WEIGHT_BY_KEY = new Map<string, number>();
{
  const avgByKey = new Map<string, number>();
  let minAvg = Infinity;
  let maxAvg = -Infinity;
  for (const s of SQUADS) {
    const a = avgForce(s);
    avgByKey.set(squadKey(s), a);
    if (a < minAvg) minAvg = a;
    if (a > maxAvg) maxAvg = a;
  }
  const span = maxAvg - minAvg || 1;
  for (const [key, a] of avgByKey) {
    WEIGHT_BY_KEY.set(key, 0.25 + 0.75 * ((a - minAvg) / span));
  }
}

/** Strength weight in [0.25, 1.0]; 0.5 fallback if a key is somehow missing. */
export function squadWeight(s: { team: string; year: number }): number {
  return WEIGHT_BY_KEY.get(squadKey(s)) ?? 0.5;
}

/** Cumulative-weight picker. `items` and `weights` are parallel lists. */
export function pickWeighted<T>(rng: Rng, items: T[], weights: number[]): T {
  let total = 0;
  for (const w of weights) total += w;
  let x = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1]; // numeric-safety fallback
}

export function pickUniform<T>(rng: Rng, items: T[]): T {
  return items[Math.floor(rng.next() * items.length)];
}

// Country codes treated as the same nation family across history, so old/new
// names count as one when swapping editions (the "copa" reroll axis). Each entry
// lists every code in a family; any code not listed is its own group. Editing
// this only changes which editions are reachable via the edition-swap reroll.
const NATION_FAMILIES: string[][] = [
  ["GER", "FRG"], // Germany / West Germany
  ["RUS", "URS"], // Russia / Soviet Union
  ["SRB", "SCG", "YUG"], // Serbia / Serbia & Montenegro / Yugoslavia
  ["CZE", "TCH"], // Czechia / Czechoslovakia
];

/** Codes treated as the same nation as `sel` (default: just `[sel]`). */
export function nationGroup(sel: string): string[] {
  for (const family of NATION_FAMILIES) {
    if (family.includes(sel)) return family;
  }
  return [sel];
}

/** Max distinct squad keys kept in the anti-repeat buffer. */
export const RECENT_MAX = 6;

/** Append a pick to the recent buffer, keeping only the last RECENT_MAX. */
export function pushRecent(recent: string[], key: string): string[] {
  return [...recent, key].slice(-RECENT_MAX);
}
