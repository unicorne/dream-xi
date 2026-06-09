import { NextResponse } from "next/server";
import { PLAYERS } from "@/lib/data";
import { POSITIONS, type Player, type Position } from "@/lib/types";

export const runtime = "nodejs";

const ALL = Object.values(PLAYERS);
const STAT_KEYS = ["overall", "PAC", "SHO", "PAS", "DRI", "DEF", "PHY", "GK"] as const;
type SortKey = (typeof STAT_KEYS)[number];

function scoreOf(p: Player, key: SortKey): number {
  return key === "overall" ? p.overall : p.stats[key];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const team = url.searchParams.get("team") ?? "";
  const pos = (url.searchParams.get("pos") ?? "") as Position | "";
  const year = url.searchParams.get("year") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const sortParam = url.searchParams.get("sort") ?? "overall";
  const sort: SortKey = (STAT_KEYS as readonly string[]).includes(sortParam)
    ? (sortParam as SortKey)
    : "overall";
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
  const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  const validPos = (POSITIONS as readonly string[]).includes(pos);
  const yearNum = year ? parseInt(year, 10) : 0;

  let filtered = ALL;
  if (team) filtered = filtered.filter((p) => p.team === team);
  if (validPos) filtered = filtered.filter((p) => p.positions.includes(pos as Position));
  if (yearNum) filtered = filtered.filter((p) => p.year === yearNum);
  if (q) filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));

  const sorted = [...filtered].sort(
    (a, b) => scoreOf(b, sort) - scoreOf(a, sort) || b.overall - a.overall || a.name.localeCompare(b.name),
  );

  const total = sorted.length;
  const start = page * limit;
  const slice = sorted.slice(start, start + limit).map((p) => ({
    id: p.id, name: p.name, team: p.team, year: p.year,
    positions: p.positions, overall: p.overall, stats: p.stats, legend: p.legend,
  }));

  return NextResponse.json({ total, page, limit, sort, players: slice });
}
