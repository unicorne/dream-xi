// Shapes exchanged with the API routes (client-safe; no heavy data imports).
import type { Position, Stats } from "./types.ts";

export interface RollPlayer {
  id: string;
  name: string;
  squadId: string;
  positions: Position[];
  overall: number;
  stats: Stats;
  legend: boolean;
  number: number;
  /** Empty slots this player can fill right now ([] = not selectable). */
  eligibleSlots: string[];
  /** True if this player was already placed in the XI (from an earlier roll). */
  alreadyPlaced?: boolean;
}

export interface RollResponse {
  rerollsLeft: number;
  squad: { id: string; label: string; team: string; year: number };
  players: RollPlayer[];
  /** Updated anti-repeat buffer (last 6 "TEAM:YEAR" keys) to send back next roll. */
  recent: string[];
}
