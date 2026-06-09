// Single-match model: position-weighted strengths -> Poisson goals, with per-goal
// scorer + assist attribution, knockout extra time, and a full penalty shootout
// kick sequence. All randomness flows through the seeded Rng (fully deterministic).

import type { Rng } from "../rng.ts";
import type { PlacedPlayer, Position } from "../types.ts";
import type { GoalEvent, MatchResult, PenKick, SimTeam, Stage } from "./types.ts";

const BASE = 1.35; // avg goals per team in regulation
const SCALE = 80; // rating delta sensitivity (points -> goal multiplier)

// How likely each position is to score / to assist (multiplied by SHO / PAS).
const GOAL_W: Record<Position, number> = {
  ST: 1, RW: 0.8, LW: 0.8, AM: 0.65, RM: 0.42, LM: 0.42,
  CM: 0.32, RB: 0.15, LB: 0.15, CB: 0.12, GK: 0,
};
const ASSIST_W: Record<Position, number> = {
  AM: 1, CM: 0.78, RW: 0.8, LW: 0.8, RM: 0.72, LM: 0.72,
  ST: 0.5, RB: 0.55, LB: 0.55, CB: 0.2, GK: 0.03,
};

function poisson(lambda: number, rng: Rng): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return k - 1;
}

function expectedGoals(att: SimTeam, def: SimTeam, base: number, rng: Rng): number {
  const edge = att.strength.attack + att.strength.midfield / 2 -
    (def.strength.defense + def.strength.midfield / 2);
  const swing = (rng.next() - 0.5) * 0.5;
  const lambda = base * Math.exp(edge / SCALE) * (1 + swing);
  return Math.max(0.12, Math.min(6, lambda));
}

function pickWeighted(
  xi: PlacedPlayer[],
  weight: (pp: PlacedPlayer) => number,
  rng: Rng,
  excludeId?: string,
): PlacedPlayer | null {
  const pool = xi.filter((pp) => pp.player.id !== excludeId);
  let total = 0;
  const weights = pool.map((pp) => {
    const w = Math.max(0, weight(pp));
    total += w;
    return w;
  });
  if (total <= 0) return pool.length ? pool[rng.int(pool.length)] : null;
  let r = rng.next() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

const scorerWeight = (pp: PlacedPlayer) =>
  GOAL_W[pp.position] * (0.4 + pp.player.stats.SHO / 100);
const assistWeight = (pp: PlacedPlayer) =>
  ASSIST_W[pp.position] * (0.4 + pp.player.stats.PAS / 100);

function goalEvents(
  team: SimTeam,
  side: "home" | "away",
  count: number,
  minLo: number,
  minHi: number,
  rng: Rng,
): GoalEvent[] {
  const events: GoalEvent[] = [];
  for (let i = 0; i < count; i++) {
    const scorer = pickWeighted(team.xi, scorerWeight, rng);
    if (!scorer) continue;
    const minute = minLo + rng.int(minHi - minLo + 1);
    const assistRoll = rng.next();
    let assist: PlacedPlayer | null = null;
    if (assistRoll < 0.74) assist = pickWeighted(team.xi, assistWeight, rng, scorer.player.id);
    events.push({
      side,
      minute,
      scorerId: scorer.player.id,
      scorerName: scorer.player.name,
      assistId: assist?.player.id,
      assistName: assist?.player.name,
    });
  }
  return events;
}

function shootout(home: SimTeam, away: SimTeam, rng: Rng): { home: number; away: number; kicks: PenKick[] } {
  const keeperRating = (t: SimTeam) =>
    Math.max(...t.xi.map((p) => (p.player.positions.includes("GK") ? p.player.stats.GK : 0)), 60);
  const convProb = (taker: SimTeam, keeper: SimTeam) =>
    Math.max(0.55, Math.min(0.92, 0.78 + (taker.strength.attack - keeperRating(keeper)) / 400));
  const pH = convProb(home, away);
  const pA = convProb(away, home);

  // Takers ordered by finishing quality, cycled if it goes long.
  const takers = (t: SimTeam) =>
    [...t.xi].sort((a, b) => b.player.stats.SHO - a.player.stats.SHO);
  const hTakers = takers(home);
  const aTakers = takers(away);

  const kicks: PenKick[] = [];
  let h = 0, a = 0;
  let homeTaken = 0, awayTaken = 0;
  let decided = false;
  const REG = 5;

  // Best of 5, taken one kick at a time so the shootout ENDS the instant it's
  // clinched — i.e. the trailing side can no longer catch up with its remaining
  // kicks. The deciding kick becomes the dramatic last one.
  for (let i = 0; i < REG * 2 && !decided; i++) {
    if (i % 2 === 0) {
      const ht = hTakers[homeTaken % hTakers.length];
      const scored = rng.next() < pH;
      kicks.push({ side: "home", takerName: ht.player.name, scored });
      if (scored) h++;
      homeTaken++;
    } else {
      const at = aTakers[awayTaken % aTakers.length];
      const scored = rng.next() < pA;
      kicks.push({ side: "away", takerName: at.player.name, scored });
      if (scored) a++;
      awayTaken++;
    }
    if (h > a + (REG - awayTaken) || a > h + (REG - homeTaken)) decided = true;
  }

  // Sudden death: both kick each round; the first round with different outcomes wins.
  let sd = 0;
  while (!decided) {
    const ht = hTakers[(REG + sd) % hTakers.length];
    const hScored = rng.next() < pH;
    kicks.push({ side: "home", takerName: ht.player.name, scored: hScored });
    if (hScored) h++;
    const at = aTakers[(REG + sd) % aTakers.length];
    const aScored = rng.next() < pA;
    kicks.push({ side: "away", takerName: at.player.name, scored: aScored });
    if (aScored) a++;
    sd++;
    if (h !== a) decided = true;
  }
  return { home: h, away: a, kicks };
}

export function playMatch(
  home: SimTeam,
  away: SimTeam,
  rng: Rng,
  opts: { knockout: boolean; stage: Stage | "group"; round: string },
): MatchResult {
  let homeGoals = poisson(expectedGoals(home, away, BASE, rng), rng);
  let awayGoals = poisson(expectedGoals(away, home, BASE, rng), rng);

  const events: GoalEvent[] = [
    ...goalEvents(home, "home", homeGoals, 1, 90, rng),
    ...goalEvents(away, "away", awayGoals, 1, 90, rng),
  ];

  const result: MatchResult = {
    stage: opts.stage,
    round: opts.round,
    home: home.ref,
    away: away.ref,
    homeGoals,
    awayGoals,
    events,
  };

  const finalize = () => {
    result.events.sort((x, y) => x.minute - y.minute);
    return result;
  };

  if (!opts.knockout) {
    if (homeGoals > awayGoals) result.winner = home.ref;
    else if (awayGoals > homeGoals) result.winner = away.ref;
    return finalize();
  }

  if (homeGoals !== awayGoals) {
    result.winner = homeGoals > awayGoals ? home.ref : away.ref;
    return finalize();
  }

  // Extra time (fewer goals).
  result.extraTime = true;
  const etH = poisson(expectedGoals(home, away, 0.5, rng), rng);
  const etA = poisson(expectedGoals(away, home, 0.5, rng), rng);
  events.push(...goalEvents(home, "home", etH, 91, 120, rng));
  events.push(...goalEvents(away, "away", etA, 91, 120, rng));
  homeGoals += etH; awayGoals += etA;
  result.homeGoals = homeGoals; result.awayGoals = awayGoals;
  if (homeGoals !== awayGoals) {
    result.winner = homeGoals > awayGoals ? home.ref : away.ref;
    return finalize();
  }

  // Penalties.
  const pens = shootout(home, away, rng);
  result.penalties = pens;
  result.winner = pens.home > pens.away ? home.ref : away.ref;
  return finalize();
}
