import { NextResponse } from "next/server";
import { deserializeXI, type XiSlot } from "@/lib/serialize";
import { simulateWorldCup } from "@/lib/sim";

export const runtime = "nodejs";

/** Simulate without persisting. Used for the in-page result before saving. */
export async function POST(req: Request) {
  let body: { formationId?: string; xi?: XiSlot[]; seed?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { formationId, xi, seed } = body;
  if (!formationId || !Array.isArray(xi) || typeof seed !== "number") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  try {
    const placed = deserializeXI(formationId, xi);
    const result = simulateWorldCup(placed, seed);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
