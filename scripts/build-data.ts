// Converts data/players_master.csv into the static JSON bundle the app reads.
// Run via `pnpm gen:data` (also runs automatically on `prebuild`).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { POSITIONS, type Player, type Position, type Squad } from "../lib/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_PATH = join(ROOT, "data", "players_master.csv");
const OUT_DIR = join(ROOT, "lib", "data", "generated");

const VALID = new Set<string>(POSITIONS);

/** Minimal RFC-4180-ish CSV parser (handles quoted fields + embedded commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  // Strip BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore; handled by \n
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parsePositions(posEn: string): Position[] {
  const out: Position[] = [];
  for (const raw of posEn.split("/")) {
    let p = raw.trim().toUpperCase();
    if (p === "DM") p = "CM"; // DM is merged into CM
    if (VALID.has(p) && !out.includes(p as Position)) out.push(p as Position);
  }
  return out;
}

function num(v: string, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function teamLabel(team: string, year: number): string {
  const NAMES: Record<string, string> = {
    BRA: "Brazil", GER: "Germany", FRG: "West Germany", ARG: "Argentina",
    ITA: "Italy", FRA: "France", ENG: "England", ESP: "Spain", NED: "Netherlands",
    URU: "Uruguay", POR: "Portugal", BEL: "Belgium", CRO: "Croatia", MEX: "Mexico",
    USA: "USA", SUI: "Switzerland", SWE: "Sweden", POL: "Poland", DEN: "Denmark",
    RUS: "Russia", URS: "Soviet Union", SCG: "Serbia", SRB: "Serbia", YUG: "Yugoslavia",
    COL: "Colombia", CHI: "Chile", PER: "Peru", PAR: "Paraguay", ECU: "Ecuador",
    JPN: "Japan", KOR: "South Korea", AUS: "Australia", KSA: "Saudi Arabia",
    IRN: "Iran", MAR: "Morocco", SEN: "Senegal", NGA: "Nigeria", CMR: "Cameroon",
    GHA: "Ghana", CIV: "Ivory Coast", EGY: "Egypt", TUN: "Tunisia", ALG: "Algeria",
    RSA: "South Africa", CRC: "Costa Rica", BUL: "Bulgaria", ROU: "Romania",
    HUN: "Hungary", AUT: "Austria", CZE: "Czechia", TCH: "Czechoslovakia",
    SCO: "Scotland", IRL: "Ireland", NIR: "Northern Ireland", WAL: "Wales",
    GRE: "Greece", TUR: "Turkey", UKR: "Ukraine", NOR: "Norway", SVN: "Slovenia",
    SVK: "Slovakia", QAT: "Qatar", CAN: "Canada",
  };
  return `${NAMES[team] ?? team} ${year}`;
}

function main() {
  const csv = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(csv);
  const header = rows[0];
  const idx = (name: string) => header.indexOf(name);
  const col = {
    id: idx("player_id"), player: idx("player"), team: idx("team"),
    year: idx("year"), squad: idx("squad"), number: idx("number"),
    posEn: idx("pos_en"), overall: idx("overall"),
    PAC: idx("PAC"), SHO: idx("SHO"), PAS: idx("PAS"), DRI: idx("DRI"),
    DEF: idx("DEF"), PHY: idx("PHY"), GK: idx("GK"), legend: idx("legend"),
  };

  const players: Record<string, Player> = {};
  const squadMap = new Map<string, Squad>();
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < header.length) continue;
    const id = row[col.id]?.trim();
    if (!id) continue;
    const positions = parsePositions(row[col.posEn] ?? "");
    if (positions.length === 0) {
      skipped++;
      continue; // unplaceable; exclude from pool
    }
    const team = row[col.team]?.trim();
    const year = num(row[col.year]);
    const squadId = row[col.squad]?.trim();

    const player: Player = {
      id,
      personId: id, // raw CSV player_id = the real person (shared across World Cups)
      name: row[col.player]?.trim() ?? id,
      team,
      year,
      squadId,
      number: num(row[col.number]),
      positions,
      overall: num(row[col.overall], 70),
      stats: {
        PAC: num(row[col.PAC]), SHO: num(row[col.SHO]), PAS: num(row[col.PAS]),
        DRI: num(row[col.DRI]), DEF: num(row[col.DEF]), PHY: num(row[col.PHY]),
        GK: num(row[col.GK]),
      },
      legend: (row[col.legend] ?? "").toLowerCase() === "true",
    };
    // De-dupe player ids (same id can appear in multiple squads/years); keep per-squad copy id.
    const uniqueId = players[id] ? `${id}__${squadId}` : id;
    player.id = uniqueId;
    players[uniqueId] = player;

    let squad = squadMap.get(squadId);
    if (!squad) {
      squad = { id: squadId, team, year, label: teamLabel(team, year), playerIds: [] };
      squadMap.set(squadId, squad);
    }
    squad.playerIds.push(uniqueId);
  }

  // Keep only squads that can field a valid XI (>= 11 players, has a GK).
  const squads: Squad[] = [];
  for (const squad of squadMap.values()) {
    const hasGk = squad.playerIds.some((pid) => players[pid].positions.includes("GK"));
    if (squad.playerIds.length >= 11 && hasGk) squads.push(squad);
  }
  squads.sort((a, b) => a.year - b.year || a.team.localeCompare(b.team));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "players.json"), JSON.stringify(players));
  writeFileSync(join(OUT_DIR, "squads.json"), JSON.stringify(squads));

  console.log(
    `Generated ${Object.keys(players).length} players, ${squads.length} squads ` +
      `(${skipped} players skipped: no valid position).`,
  );
}

main();
