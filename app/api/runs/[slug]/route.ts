import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { runs } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Persistence not configured" }, { status: 503 });
  }
  const { slug } = await params;
  const [row] = await db().select().from(runs).where(eq(runs.slug, slug)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
