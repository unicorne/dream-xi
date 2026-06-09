// Shared domain types for the World Cup Simulator.

/** The 11 canonical slot positions used by formations and eligibility.
 *  (DM is merged into CM — central midfield is a single role; AM is the
 *  distinct attacking-mid role.) */
export const POSITIONS = [
  "GK",
  "RB",
  "CB",
  "LB",
  "CM",
  "AM",
  "RM",
  "LM",
  "RW",
  "LW",
  "ST",
] as const;

export type Position = (typeof POSITIONS)[number];

export interface Stats {
  PAC: number;
  SHO: number;
  PAS: number;
  DRI: number;
  DEF: number;
  PHY: number;
  GK: number;
}

export interface Player {
  id: string;
  /** Identity of the real person, shared across World Cups (e.g. "pele").
   *  Only one player per personId may be drafted into an XI. */
  personId: string;
  name: string;
  team: string; // national team code, e.g. "BRA"
  year: number; // World Cup year
  squadId: string;
  number: number;
  /** Parsed eligible positions, primary first. */
  positions: Position[];
  overall: number;
  stats: Stats;
  legend: boolean;
}

export interface Squad {
  id: string;
  team: string;
  year: number;
  /** Display label, e.g. "Brazil 1970". */
  label: string;
  playerIds: string[];
}

/** A player placed into a specific formation slot. */
export interface PlacedPlayer {
  slotId: string;
  position: Position;
  player: Player;
}

export interface TeamRef {
  /** Either a real squad id (opponents) or "USER". */
  id: string;
  label: string;
}
