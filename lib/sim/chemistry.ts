import type { PlacedPlayer } from "../types.ts";

export interface ChemistryResult {
  score: number;       // 0..1 combined
  cohesion: number;    // 0..1 squad familiarity
  linkScore: number;   // 0..1 mid-PAS → att-SHO connection
  multiplier: number;  // 0.92..1.08 applied to team strengths
}

export function teamChemistry(xi: PlacedPlayer[]): ChemistryResult {
  // Cohesion: fraction of XI from the most-represented squad.
  // All same squad = 1.0; fully mixed = 1/11 ≈ 0.09.
  const squadCounts = new Map<string, number>();
  for (const pp of xi) {
    squadCounts.set(pp.player.squadId, (squadCounts.get(pp.player.squadId) ?? 0) + 1);
  }
  const maxCount = Math.max(...squadCounts.values());
  const cohesion = maxCount / xi.length;

  // Link score: midfielders feed attackers — avg mid PAS + avg att SHO, both /100.
  const mids = xi.filter(pp => ["CM", "AM", "RM", "LM"].includes(pp.position));
  const atts = xi.filter(pp => ["ST", "RW", "LW"].includes(pp.position));

  let linkScore = 0.5;
  if (mids.length > 0 && atts.length > 0) {
    const avgMidPAS = mids.reduce((s, pp) => s + pp.player.stats.PAS, 0) / mids.length;
    const avgAttSHO = atts.reduce((s, pp) => s + pp.player.stats.SHO, 0) / atts.length;
    linkScore = (avgMidPAS + avgAttSHO) / 200;
  }

  const score = 0.55 * cohesion + 0.45 * linkScore;
  const multiplier = 0.92 + 0.16 * score; // range: 0.92 (0 chem) → 1.08 (full chem)

  return { score, cohesion, linkScore, multiplier };
}
