// Derives line ratings (attack / midfield / defense / overall) from an XI.
import type { PlacedPlayer, Position } from "../types.ts";
import { teamChemistry } from "./chemistry.ts";

export interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
  chemistry: number; // 0..1 raw score
}

// How much each slot position contributes to each phase (0..1 weights).
const PHASE: Record<Position, { att: number; mid: number; def: number }> = {
  GK: { att: 0, mid: 0, def: 1 },
  CB: { att: 0.05, mid: 0.1, def: 1 },
  RB: { att: 0.25, mid: 0.25, def: 0.8 },
  LB: { att: 0.25, mid: 0.25, def: 0.8 },
  CM: { att: 0.42, mid: 0.95, def: 0.55 },
  AM: { att: 0.75, mid: 0.8, def: 0.1 },
  RM: { att: 0.55, mid: 0.7, def: 0.3 },
  LM: { att: 0.55, mid: 0.7, def: 0.3 },
  RW: { att: 0.85, mid: 0.4, def: 0.05 },
  LW: { att: 0.85, mid: 0.4, def: 0.05 },
  ST: { att: 1, mid: 0.2, def: 0 },
};

/** A player's contribution score for a phase, blending their relevant stats. */
function attackScore(p: PlacedPlayer["player"]): number {
  const s = p.stats;
  return 0.4 * s.SHO + 0.25 * s.DRI + 0.2 * s.PAC + 0.15 * s.PAS;
}
function midScore(p: PlacedPlayer["player"]): number {
  const s = p.stats;
  return 0.45 * s.PAS + 0.3 * s.DRI + 0.25 * s.DEF;
}
function defScore(p: PlacedPlayer["player"]): number {
  const s = p.stats;
  if (p.positions.includes("GK")) return p.stats.GK;
  return 0.55 * s.DEF + 0.3 * s.PHY + 0.15 * s.PAS;
}

export function teamStrength(xi: PlacedPlayer[]): TeamStrength {
  let attNum = 0, attDen = 0, midNum = 0, midDen = 0, defNum = 0, defDen = 0, ovr = 0;
  for (const pp of xi) {
    const w = PHASE[pp.position];
    attNum += w.att * attackScore(pp.player); attDen += w.att;
    midNum += w.mid * midScore(pp.player); midDen += w.mid;
    defNum += w.def * defScore(pp.player); defDen += w.def;
    ovr += pp.player.overall;
  }
  const chem = teamChemistry(xi);
  return {
    attack: (attDen ? attNum / attDen : 0) * chem.multiplier,
    midfield: (midDen ? midNum / midDen : 0) * chem.multiplier,
    defense: (defDen ? defNum / defDen : 0) * chem.multiplier,
    overall: ovr / xi.length,
    chemistry: chem.score,
  };
}
