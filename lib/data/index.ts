// Loads the generated static data bundle and exposes lookup helpers.
import type { Player, Squad } from "../types.ts";
import playersJson from "./generated/players.json" with { type: "json" };
import squadsJson from "./generated/squads.json" with { type: "json" };

export const PLAYERS: Record<string, Player> = playersJson as Record<string, Player>;
export const SQUADS: Squad[] = squadsJson as Squad[];

const SQUAD_BY_ID = new Map(SQUADS.map((s) => [s.id, s]));
const SQUADS_BY_TEAM = new Map<string, Squad[]>();
const SQUADS_BY_YEAR = new Map<number, Squad[]>();
for (const s of SQUADS) {
  (SQUADS_BY_TEAM.get(s.team) ?? SQUADS_BY_TEAM.set(s.team, []).get(s.team)!).push(s);
  (SQUADS_BY_YEAR.get(s.year) ?? SQUADS_BY_YEAR.set(s.year, []).get(s.year)!).push(s);
}

export function getSquad(id: string): Squad | undefined {
  return SQUAD_BY_ID.get(id);
}

export function getPlayer(id: string): Player | undefined {
  return PLAYERS[id];
}

export function squadPlayers(squad: Squad): Player[] {
  return squad.playerIds.map((id) => PLAYERS[id]).filter(Boolean);
}

export function squadsByTeam(team: string): Squad[] {
  return SQUADS_BY_TEAM.get(team) ?? [];
}

export function squadsByYear(year: number): Squad[] {
  return SQUADS_BY_YEAR.get(year) ?? [];
}

export const YEARS = [...SQUADS_BY_YEAR.keys()].sort((a, b) => a - b);
export const TEAMS = [...SQUADS_BY_TEAM.keys()].sort();
