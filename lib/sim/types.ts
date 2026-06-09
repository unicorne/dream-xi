import type { PlacedPlayer, TeamRef } from "../types.ts";
import type { TeamStrength } from "./strength.ts";

export interface SimTeam {
  ref: TeamRef;
  xi: PlacedPlayer[];
  strength: TeamStrength;
}

export type Stage = "group" | "r16" | "qf" | "sf" | "final" | "champion";

export interface GoalEvent {
  side: "home" | "away";
  minute: number;
  scorerId: string;
  scorerName: string;
  assistId?: string;
  assistName?: string;
}

export interface PenKick {
  side: "home" | "away";
  takerName: string;
  scored: boolean;
}

export interface MatchResult {
  stage: Stage | "group";
  round: string; // e.g. "Group A", "Round of 16", "Final"
  home: TeamRef;
  away: TeamRef;
  homeGoals: number;
  awayGoals: number;
  /** Goal scorers + assists in chronological order (regulation + extra time). */
  events: GoalEvent[];
  /** Set when a knockout went past 90'. */
  extraTime?: boolean;
  penalties?: { home: number; away: number; kicks: PenKick[] };
  winner?: TeamRef; // undefined for drawn group games
}

export interface PlayerStatLine {
  id: string;
  name: string;
  team: string;
  goals: number;
  assists: number;
  points: number; // goals*3 + assists*2, for the Golden Ball ranking
}

export interface KeeperStatLine {
  team: string;
  name: string;
  cleanSheets: number;
  goalsConceded: number;
  matches: number;
}

export interface Awards {
  topScorers: PlayerStatLine[]; // Golden Boot ranking
  topAssists: PlayerStatLine[];
  bestPlayer: PlayerStatLine | null; // Golden Ball
  bestKeeper: KeeperStatLine | null; // Golden Glove
}

export interface GroupStanding {
  team: TeamRef;
  p: number; w: number; d: number; l: number;
  gf: number; ga: number; gd: number; pts: number;
}

export interface GroupResult {
  name: string; // "Group A"
  standings: GroupStanding[];
  matches: MatchResult[];
}

export interface KnockoutRound {
  name: string;
  stage: Stage;
  matches: MatchResult[];
}

export interface UserOutcome {
  stageReached: Stage;
  record: { w: number; d: number; l: number; gf: number; ga: number };
}

export interface SimResult {
  seed: number;
  champion: TeamRef;
  runnerUp: TeamRef;
  userOutcome: UserOutcome;
  groups: GroupResult[];
  knockouts: KnockoutRound[];
  matches: MatchResult[];
  awards: Awards;
}

/** A named, user-built XI entered into a custom cup. */
export interface NamedXI {
  id: string;
  label: string;
  creator?: string;
  xi: PlacedPlayer[];
  isFiller?: boolean;
}

/** How far one entrant team got in a cup. */
export interface TeamOutcome {
  id: string;
  label: string;
  creator?: string;
  isFiller?: boolean;
  stageReached: Stage;
  record: { w: number; d: number; l: number; gf: number; ga: number };
}

export interface CupResult {
  seed: number;
  champion: TeamRef;
  runnerUp: TeamRef;
  groups: GroupResult[];
  knockouts: KnockoutRound[];
  matches: MatchResult[];
  awards: Awards;
  /** Entrant (non-filler) teams ranked by how far they advanced. */
  standings: TeamOutcome[];
}
