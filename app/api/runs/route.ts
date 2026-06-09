import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { runs } from "@/lib/db/schema";
import { deserializeXI, type XiSlot } from "@/lib/serialize";
import { simulateWorldCup, leaderboardScore } from "@/lib/sim";

export const runtime = "nodejs";

function makeSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  }
  let body: {
    formationId?: string;
    seed?: number;
    xi?: XiSlot[];
    owner?: string;
    teamLabel?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { formationId, seed, xi, owner, teamLabel } = body;
  if (!formationId || typeof seed !== "number" || !Array.isArray(xi) || !owner) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Re-simulate server-side from the XI + seed so the stored result is authoritative.
  let placed, result;
  try {
    placed = deserializeXI(formationId, xi);
    result = simulateWorldCup(placed, seed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const score = leaderboardScore(result.userOutcome.stageReached, result.userOutcome.record);
  const slug = makeSlug();

  await db().insert(runs).values({
    slug,
    owner: String(owner).slice(0, 64),
    formationId,
    seed,
    xi,
    result,
    stageReached: result.userOutcome.stageReached,
    score,
    teamLabel: teamLabel?.slice(0, 60) ?? null,
  });

  return NextResponse.json({ slug });
}
