// Converts between the persisted compact XI ({slotId, position, playerId}) and the
// rich PlacedPlayer[] the engines use. Server rebuilds + re-simulates from this.

import type { PlacedPlayer } from "./types.ts";
import { getFormation } from "./draft/formations.ts";
import { getPlayer } from "./data/index.ts";

export interface XiSlot {
  slotId: string;
  position: string;
  playerId: string;
}

export function serializeXI(xi: PlacedPlayer[]): XiSlot[] {
  return xi.map((pp) => ({ slotId: pp.slotId, position: pp.position, playerId: pp.player.id }));
}

/** Rebuild the rich XI from a formation + compact slots. Throws on bad data. */
export function deserializeXI(formationId: string, slots: XiSlot[]): PlacedPlayer[] {
  const formation = getFormation(formationId);
  if (slots.length !== formation.slots.length) {
    throw new Error(`Expected ${formation.slots.length} players, got ${slots.length}.`);
  }
  const seen = new Set<string>();
  const persons = new Set<string>();
  return slots.map((s) => {
    const slot = formation.slots.find((fs) => fs.id === s.slotId);
    if (!slot) throw new Error(`Unknown slot ${s.slotId}`);
    if (seen.has(s.slotId)) throw new Error(`Duplicate slot ${s.slotId}`);
    seen.add(s.slotId);
    const player = getPlayer(s.playerId);
    if (!player) throw new Error(`Unknown player ${s.playerId}`);
    if (!player.positions.includes(slot.position)) {
      throw new Error(`${player.name} cannot play ${slot.position}`);
    }
    if (persons.has(player.personId)) {
      throw new Error(`${player.name} appears twice (same player, different World Cups).`);
    }
    persons.add(player.personId);
    return { slotId: slot.id, position: slot.position, player };
  });
}
