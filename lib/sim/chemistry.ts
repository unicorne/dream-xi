import type { PlacedPlayer } from "../types.ts";

export interface ChemistryResult {
  score: number;      // 0..1 combined (normalized)
  gkDef: number;      // 0..1 keeper-defense link
  defMid: number;     // 0..1 defense-midfield link
  midAtt: number;     // 0..1 midfield-attack link
  multiplier: number; // 0.92..1.08 applied to team strengths
}

export function teamChemistry(xi: PlacedPlayer[]): ChemistryResult {
  const avg = (players: PlacedPlayer[], stat: (p: PlacedPlayer) => number) =>
    players.length ? players.reduce((s, p) => s + stat(p), 0) / players.length : 0;

  const gks  = xi.filter(pp => pp.position === "GK");
  const defs = xi.filter(pp => ["CB", "RB", "LB"].includes(pp.position));
  const mids = xi.filter(pp => ["CM", "AM", "RM", "LM"].includes(pp.position));
  const atts = xi.filter(pp => ["ST", "RW", "LW"].includes(pp.position));

  // GK ↔ DEF: keeper commands box (GK), CBs lock down defense (DEF)
  const gkDef = gks.length && defs.length
    ? (avg(gks, p => p.player.stats.GK) + avg(defs, p => p.player.stats.DEF)) / 200
    : 0.5;

  // DEF ↔ MID: defenders play out (PAS), mids track back (DEF)
  const defMid = defs.length && mids.length
    ? (avg(defs, p => p.player.stats.PAS) + avg(mids, p => p.player.stats.DEF)) / 200
    : 0.5;

  // MID ↔ ATT: mids create (PAS), attackers finish (SHO)
  const midAtt = mids.length && atts.length
    ? (avg(mids, p => p.player.stats.PAS) + avg(atts, p => p.player.stats.SHO)) / 200
    : 0.5;

  const raw = (gkDef + defMid + midAtt) / 3;

  // Normalize [0.5, 1.0] → [0, 1] so the full multiplier range is used.
  // Ability-based scores cluster in 0.65–0.90; this keeps the swing meaningful.
  const score = Math.max(0, Math.min(1, (raw - 0.5) * 2));
  const multiplier = 0.92 + 0.16 * score; // 0.92..1.08

  return { score, gkDef, defMid, midAtt, multiplier };
}
