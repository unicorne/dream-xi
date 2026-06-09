export { simulateWorldCup, simulateCup } from "./tournament.ts";
export { teamStrength } from "./strength.ts";
export type { TeamStrength } from "./strength.ts";
export * from "./types.ts";

import type { Stage } from "./types.ts";

export const STAGE_WEIGHT: Record<Stage, number> = {
  group: 0, r16: 1, qf: 2, sf: 3, final: 4, champion: 5,
};

export const STAGE_LABEL: Record<Stage, string> = {
  group: "Group stage",
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  final: "Runner-up",
  champion: "Champion 🏆",
};

/** Leaderboard score: how far the user advanced, then goal diff, then goals for. */
export function leaderboardScore(
  stageReached: Stage,
  record: { gf: number; ga: number },
): number {
  return STAGE_WEIGHT[stageReached] * 1000 + (record.gf - record.ga) * 10 + record.gf;
}
