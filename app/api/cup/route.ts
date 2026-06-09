import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { teams, tournaments } from "@/lib/db/schema";
import { deserializeXI, type XiSlot } from "@/lib/serialize";
import { simulateCup } from "@/lib/sim";
import type { NamedXI } from "@/lib/sim/types";

export const runtime = "nodejs";

function makeSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function makeSeed(): number {
  // 31-bit positive so it fits Postgres `integer`.
  return (crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff) || 1;
}

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  }
  let body: { teamSlugs?: string[]; name?: string; owner?: string; seed?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { teamSlugs, name, owner } = body;
  if (!Array.isArray(teamSlugs) || teamSlugs.length < 1 || !owner) {
    return NextResponse.json({ error: "Pick at least 1 team" }, { status: 400 });
  }
  const picked = teamSlugs.slice(0, 32);

  const rows = await db().select().from(teams).where(inArray(teams.slug, picked));
  if (rows.length < 1) {
    return NextResponse.json({ error: "Teams not found" }, { status: 400 });
  }

  // Preserve the user's selection order.
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const entrants: NamedXI[] = [];
  for (const slug of picked) {
    const row = bySlug.get(slug);
    if (!row) continue;
    try {
      const xi = deserializeXI(row.formationId, row.xi as XiSlot[]);
      entrants.push({
        id: row.slug,
        label: row.name,
        creator: row.creator ?? undefined,
        xi,
      });
    } catch {
      // skip malformed team
    }
  }
  if (entrants.length < 1) {
    return NextResponse.json({ error: "No valid teams" }, { status: 400 });
  }

  const seed = typeof body.seed === "number" ? (body.seed >>> 0) & 0x7fffffff : makeSeed();
  const result = simulateCup(entrants, seed);
  const slug = makeSlug();

  await db().insert(tournaments).values({
    slug,
    name: name?.trim().slice(0, 50) || null,
    owner: String(owner).slice(0, 64),
    entrantSlugs: entrants.map((e) => e.id),
    seed,
    result,
    championLabel: result.champion.label,
  });

  return NextResponse.json({ slug });
}
