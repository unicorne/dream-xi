import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { runs } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ runs: [] });
  }
  const rows = await db()
    .select({
      slug: runs.slug,
      teamLabel: runs.teamLabel,
      formationId: runs.formationId,
      stageReached: runs.stageReached,
      score: runs.score,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .orderBy(desc(runs.score))
    .limit(50);
  return NextResponse.json({ runs: rows });
}
