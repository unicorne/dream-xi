import { NextResponse } from "next/server";
import { randomSeed } from "@/lib/rng";
import { getFormation } from "@/lib/draft/formations";
import {
  restoreDraft, rollNext, reroll, emptySlots, placedPersonIds, type RerollFlavor,
} from "@/lib/draft/engine";
import { getSquad, squadPlayers } from "@/lib/data";

export const runtime = "nodejs";

type Action = "next" | "reroll-same-team" | "reroll-same-year";

export async function POST(req: Request) {
  let body: {
    formationId?: string;
    placements?: Record<string, string>;
    presentedSquadId?: string | null;
    rerollsLeft?: number;
    action?: Action;
    seed?: string;
    rollIndex?: number;
    rerollNo?: number;
    recent?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const {
    formationId, placements = {}, presentedSquadId = null, rerollsLeft = 3,
    action = "next", rollIndex = 0, rerollNo = 0, recent = [],
  } = body;
  if (!formationId) return NextResponse.json({ error: "Missing formationId" }, { status: 400 });
  // Campaign seed for the deterministic roll stream (falls back to a fresh one).
  const seed = (body.seed && String(body.seed)) || String(randomSeed());

  let state;
  try {
    state = restoreDraft(getFormation(formationId), placements, presentedSquadId, rerollsLeft, recent);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    if (action === "next") {
      state = rollNext(state, seed, rollIndex);
    } else {
      const flavor: RerollFlavor = action === "reroll-same-team" ? "same-team" : "same-year";
      state = reroll(state, seed, rollIndex, rerollNo, flavor);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const squad = getSquad(state.presentedSquadId!)!;
  const empties = emptySlots(state);
  const placedPersons = placedPersonIds(state);

  // Return the WHOLE squad; the UI greys out players that can't be placed.
  // A player is "already placed" if THIS person is already in the XI — even via a
  // different World Cup year (e.g. Pelé 1958 once Pelé 1970 is in the side).
  const players = squadPlayers(squad)
    .map((p) => {
      const eligibleSlots = empties.filter((s) => p.positions.includes(s.position)).map((s) => s.id);
      return {
        id: p.id,
        name: p.name,
        squadId: p.squadId,
        positions: p.positions,
        overall: p.overall,
        stats: p.stats,
        legend: p.legend,
        number: p.number,
        eligibleSlots,
        alreadyPlaced: placedPersons.has(p.personId),
      };
    })
    .sort((a, b) => b.overall - a.overall);

  return NextResponse.json({
    rerollsLeft: state.rerollsLeft,
    squad: { id: squad.id, label: squad.label, team: squad.team, year: squad.year },
    players,
    recent: state.recent,
  });
}
