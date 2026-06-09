import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { deserializeXI, type XiSlot } from "@/lib/serialize";
import { teamQuality } from "@/lib/teamQuality";

export const runtime = "nodejs";

function makeSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ teams: [] });
  const rows = await db()
    .select({
      slug: teams.slug, name: teams.name, creator: teams.creator,
      formationId: teams.formationId, overall: teams.overall,
      quality: teams.quality, createdAt: teams.createdAt,
    })
    .from(teams)
    .orderBy(desc(teams.overall))
    .limit(200);
  return NextResponse.json({ teams: rows });
}

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  }
  let body: {
    name?: string; creator?: string; owner?: string;
    formationId?: string; xi?: XiSlot[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { name, creator, owner, formationId, xi } = body;
  if (!name?.trim() || !owner || !formationId || !Array.isArray(xi)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let placed;
  try {
    placed = deserializeXI(formationId, xi);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const quality = teamQuality(placed.map((pp) => ({ position: pp.position, overall: pp.player.overall })));
  const slug = makeSlug();

  await db().insert(teams).values({
    slug,
    name: name.trim().slice(0, 40),
    creator: creator?.trim().slice(0, 30) || null,
    owner: String(owner).slice(0, 64),
    formationId,
    xi,
    overall: quality.overall,
    quality,
  });

  return NextResponse.json({ slug });
}
