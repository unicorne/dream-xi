// 32-team World Cup orchestration: opponent generation, group stage, knockouts.
// Deterministic given (userXI, seed).

import type { PlacedPlayer } from "../types.ts";
import { Rng } from "../rng.ts";
import { SQUADS } from "../data/index.ts";
import { FORMATIONS } from "../draft/formations.ts";
import { buildBestXI } from "../draft/bestXI.ts";
import { teamStrength } from "./strength.ts";
import { playMatch } from "./match.ts";
import type {
  Awards, CupResult, GroupResult, GroupStanding, KeeperStatLine, KnockoutRound, MatchResult,
  NamedXI, PlayerStatLine, SimResult, SimTeam, Stage, TeamOutcome, UserOutcome,
} from "./types.ts";

const USER_ID = "USER";
const GROUP_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];

function makeSimTeam(xi: PlacedPlayer[], id: string, label: string): SimTeam {
  return { ref: { id, label }, xi, strength: teamStrength(xi) };
}

function buildOpponents(rng: Rng, count: number): SimTeam[] {
  const pool = rng.shuffle([...SQUADS]);
  const teams: SimTeam[] = [];
  for (const squad of pool) {
    if (teams.length >= count) break;
    const formation = rng.pick(FORMATIONS);
    const xi = buildBestXI(squad, formation);
    if (!xi) continue;
    teams.push(makeSimTeam(xi, squad.id, squad.label));
  }
  return teams;
}

function emptyStanding(team: SimTeam["ref"]): GroupStanding {
  return { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
}

function applyMatch(table: Map<string, GroupStanding>, m: MatchResult) {
  const h = table.get(m.home.id)!;
  const a = table.get(m.away.id)!;
  h.p++; a.p++;
  h.gf += m.homeGoals; h.ga += m.awayGoals;
  a.gf += m.awayGoals; a.ga += m.homeGoals;
  if (m.homeGoals > m.awayGoals) { h.w++; h.pts += 3; a.l++; }
  else if (m.awayGoals > m.homeGoals) { a.w++; a.pts += 3; h.l++; }
  else { h.d++; a.d++; h.pts++; a.pts++; }
  h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
}

function rankGroup(standings: GroupStanding[], rng: Rng): GroupStanding[] {
  return [...standings].sort(
    (x, y) =>
      y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || (rng.next() < 0.5 ? -1 : 1),
  );
}

function runGroup(name: string, teams: SimTeam[], rng: Rng): GroupResult {
  const table = new Map<string, GroupStanding>();
  for (const t of teams) table.set(t.ref.id, emptyStanding(t.ref));
  const matches: MatchResult[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const m = playMatch(teams[i], teams[j], rng, {
        knockout: false, stage: "group", round: `Group ${name}`,
      });
      matches.push(m);
      applyMatch(table, m);
    }
  }
  return { name: `Group ${name}`, standings: rankGroup([...table.values()], rng), matches };
}

const FIELD_SIZE = 32;

interface CoreResult {
  champion: SimTeam;
  runnerUp: SimTeam;
  groups: GroupResult[];
  knockouts: KnockoutRound[];
  matches: MatchResult[];
  awards: Awards;
}

/** Pad a set of provided teams up to FIELD_SIZE with random historical XIs. */
function buildField(rng: Rng, provided: SimTeam[]): SimTeam[] {
  const field = provided.slice(0, FIELD_SIZE);
  if (field.length < FIELD_SIZE) {
    field.push(...buildOpponents(rng, FIELD_SIZE - field.length));
  }
  return field;
}

/** Run a full 32-team World Cup over an exact field. Shared by solo + cup modes. */
function runTournament(field: SimTeam[], rng: Rng): CoreResult {
  const teams = rng.shuffle([...field]);
  const byId = new Map(teams.map((t) => [t.ref.id, t]));
  const allMatches: MatchResult[] = [];

  // --- Group stage: 8 groups of 4 (snake-free simple slicing after shuffle). ---
  const groups: GroupResult[] = [];
  const qualified: SimTeam[][] = []; // [groupIdx] -> [winner, runnerUp]
  for (let g = 0; g < 8; g++) {
    const groupTeams = teams.slice(g * 4, g * 4 + 4);
    const result = runGroup(GROUP_NAMES[g], groupTeams, rng);
    groups.push(result);
    allMatches.push(...result.matches);
    qualified.push([byId.get(result.standings[0].team.id)!, byId.get(result.standings[1].team.id)!]);
  }

  // --- Knockout bracket: standard W(A)-vs-RU(B) crossing. ---
  // R16 pairs: 1A-2B, 1C-2D, 1E-2F, 1G-2H, 1B-2A, 1D-2C, 1F-2E, 1H-2G
  const W = (g: number) => qualified[g][0];
  const RU = (g: number) => qualified[g][1];
  const r16Pairs: [SimTeam, SimTeam][] = [
    [W(0), RU(1)], [W(2), RU(3)], [W(4), RU(5)], [W(6), RU(7)],
    [W(1), RU(0)], [W(3), RU(2)], [W(5), RU(4)], [W(7), RU(6)],
  ];

  const knockouts: KnockoutRound[] = [];

  function runRound(name: string, stage: Stage, pairs: [SimTeam, SimTeam][]): SimTeam[] {
    const matches: MatchResult[] = [];
    const winners: SimTeam[] = [];
    for (const [home, away] of pairs) {
      const m = playMatch(home, away, rng, { knockout: true, stage, round: name });
      matches.push(m);
      allMatches.push(m);
      winners.push(m.winner!.id === home.ref.id ? home : away);
    }
    knockouts.push({ name, stage, matches });
    return winners;
  }

  const r16Winners = runRound("Round of 16", "r16", r16Pairs);
  const qfPairs = pairUp(r16Winners);
  const qfWinners = runRound("Quarter-finals", "qf", qfPairs);
  const sfPairs = pairUp(qfWinners);
  const sfWinners = runRound("Semi-finals", "sf", sfPairs);
  const finalPair = pairUp(sfWinners);
  const finalWinners = runRound("Final", "final", finalPair);

  const champion = finalWinners[0];
  const runnerUp = finalPair[0][0].ref.id === champion.ref.id ? finalPair[0][1] : finalPair[0][0];

  return {
    champion,
    runnerUp,
    groups,
    knockouts,
    matches: allMatches,
    awards: computeAwards(allMatches, teams),
  };
}

/** Solo mode: your XI + 31 historical fillers; tracks your outcome. */
export function simulateWorldCup(userXI: PlacedPlayer[], seed: number): SimResult {
  const rng = new Rng(seed);
  const user = makeSimTeam(userXI, USER_ID, "Your XI");
  const core = runTournament(buildField(rng, [user]), rng);
  return {
    seed,
    champion: core.champion.ref,
    runnerUp: core.runnerUp.ref,
    userOutcome: computeUserOutcome(core.matches, core.champion.ref.id),
    groups: core.groups,
    knockouts: core.knockouts,
    matches: core.matches,
    awards: core.awards,
  };
}

/** Cup mode: a chosen set of named user-built XIs, padded to 32 with historical XIs. */
export function simulateCup(entrants: NamedXI[], seed: number): CupResult {
  const rng = new Rng(seed);
  const provided = entrants
    .slice(0, FIELD_SIZE)
    .map((e) => makeSimTeam(e.xi, e.id, e.label));
  const core = runTournament(buildField(rng, provided), rng);

  const standings: TeamOutcome[] = entrants.slice(0, FIELD_SIZE).map((e) => {
    const o = computeUserOutcome(core.matches, core.champion.ref.id, e.id);
    return {
      id: e.id, label: e.label, creator: e.creator, isFiller: false,
      stageReached: o.stageReached, record: o.record,
    };
  });
  const order: Stage[] = ["champion", "final", "sf", "qf", "r16", "group"];
  standings.sort(
    (a, b) =>
      order.indexOf(a.stageReached) - order.indexOf(b.stageReached) ||
      b.record.gf - b.record.ga - (a.record.gf - a.record.ga) ||
      b.record.gf - a.record.gf,
  );

  return {
    seed,
    champion: core.champion.ref,
    runnerUp: core.runnerUp.ref,
    groups: core.groups,
    knockouts: core.knockouts,
    matches: core.matches,
    awards: core.awards,
    standings,
  };
}

function computeAwards(matches: MatchResult[], teams: SimTeam[]): Awards {
  const players = new Map<string, PlayerStatLine>();
  const ensure = (id: string, name: string, team: string): PlayerStatLine => {
    let p = players.get(id);
    if (!p) {
      p = { id, name, team, goals: 0, assists: 0, points: 0 };
      players.set(id, p);
    }
    return p;
  };

  for (const m of matches) {
    for (const e of m.events) {
      const teamRef = e.side === "home" ? m.home : m.away;
      const scorer = ensure(e.scorerId, e.scorerName, teamRef.label);
      scorer.goals++;
      if (e.assistId && e.assistName) {
        const assister = ensure(e.assistId, e.assistName, teamRef.label);
        assister.assists++;
      }
    }
  }
  for (const p of players.values()) p.points = p.goals * 3 + p.assists * 2;

  const all = [...players.values()];
  const topScorers = [...all]
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
    .slice(0, 10);
  const topAssists = [...all]
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, 10);
  const bestPlayer = [...all].sort((a, b) => b.points - a.points || b.goals - a.goals)[0] ?? null;

  // Golden Glove: keeper with most clean sheets (tiebreak fewest conceded, more games).
  const keeperByTeam = new Map<string, { name: string; label: string }>();
  for (const t of teams) {
    const gk = t.xi.find((p) => p.player.positions.includes("GK")) ?? t.xi[0];
    keeperByTeam.set(t.ref.id, { name: gk.player.name, label: t.ref.label });
  }
  const kstats = new Map<string, KeeperStatLine>();
  const ensureK = (teamId: string): KeeperStatLine => {
    let k = kstats.get(teamId);
    if (!k) {
      const info = keeperByTeam.get(teamId)!;
      k = { team: info.label, name: info.name, cleanSheets: 0, goalsConceded: 0, matches: 0 };
      kstats.set(teamId, k);
    }
    return k;
  };
  for (const m of matches) {
    const hk = ensureK(m.home.id);
    hk.matches++; hk.goalsConceded += m.awayGoals; if (m.awayGoals === 0) hk.cleanSheets++;
    const ak = ensureK(m.away.id);
    ak.matches++; ak.goalsConceded += m.homeGoals; if (m.homeGoals === 0) ak.cleanSheets++;
  }
  const bestKeeper = [...kstats.values()].sort(
    (a, b) => b.cleanSheets - a.cleanSheets || a.goalsConceded - b.goalsConceded || b.matches - a.matches,
  )[0] ?? null;

  return { topScorers, topAssists, bestPlayer, bestKeeper };
}

function pairUp(teams: SimTeam[]): [SimTeam, SimTeam][] {
  const pairs: [SimTeam, SimTeam][] = [];
  for (let i = 0; i < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]]);
  return pairs;
}

function computeUserOutcome(matches: MatchResult[], championId: string, teamId: string = USER_ID): UserOutcome {
  const record = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  let stageReached: Stage = "group";
  const stageOrder: Stage[] = ["group", "r16", "qf", "sf", "final"];
  let lostAt: Stage | null = null;

  for (const m of matches) {
    const isHome = m.home.id === teamId;
    const isAway = m.away.id === teamId;
    if (!isHome && !isAway) continue;
    const gf = isHome ? m.homeGoals : m.awayGoals;
    const ga = isHome ? m.awayGoals : m.homeGoals;
    record.gf += gf; record.ga += ga;

    const st = m.stage as Stage;
    if (stageOrder.indexOf(st) > stageOrder.indexOf(stageReached)) stageReached = st;

    if (m.winner) {
      if (m.winner.id === teamId) record.w++;
      else { record.l++; if (st !== "group") lostAt = st; }
    } else {
      record.d++;
    }
  }

  // Champion if this team won the final.
  if (stageReached === "final" && lostAt !== "final" && championId === teamId) {
    stageReached = "champion";
  }
  return { stageReached, record };
}
