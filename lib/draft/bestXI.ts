// Auto-builds a strong XI from a squad for a given formation. Used to generate
// the 31 opponent teams. Greedy max-overall assignment over eligible (slot,player)
// pairs — cheap and produces a sensible, strong lineup.

import type { Player, Squad } from "../types.ts";
import type { Formation } from "./formations.ts";
import type { PlacedPlayer } from "../types.ts";
import { squadPlayers } from "../data/index.ts";

export function buildBestXI(squad: Squad, formation: Formation): PlacedPlayer[] | null {
  const players = squadPlayers(squad);
  const open = new Set(formation.slots.map((s) => s.id));
  const used = new Set<string>();
  const result: PlacedPlayer[] = [];

  while (open.size > 0) {
    let best: { slotId: string; player: Player; ovr: number } | null = null;
    for (const slot of formation.slots) {
      if (!open.has(slot.id)) continue;
      for (const p of players) {
        if (used.has(p.id) || !p.positions.includes(slot.position)) continue;
        if (!best || p.overall > best.ovr) best = { slotId: slot.id, player: p, ovr: p.overall };
      }
    }
    if (!best) return null; // squad can't fill this formation
    open.delete(best.slotId);
    used.add(best.player.id);
    const slot = formation.slots.find((s) => s.id === best!.slotId)!;
    result.push({ slotId: slot.id, position: slot.position, player: best.player });
  }
  return result;
}
