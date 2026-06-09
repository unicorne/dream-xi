import { describe, it, expect } from "vitest";
import { getFormation } from "./formations.ts";
import {
  initDraft, rollNext, reroll, placePlayer, isComplete, emptySlots,
  placeableEntries, squadCanPlace, TOTAL_REROLLS,
} from "./engine.ts";
import { squadKey, squadWeight, nationGroup } from "./sampling.ts";
import { getSquad, squadPlayers, SQUADS } from "../data/index.ts";

describe("draft engine", () => {
  it("starts empty with the full reroll budget", () => {
    const s = initDraft(getFormation("4-3-3"));
    expect(emptySlots(s)).toHaveLength(11);
    expect(s.rerollsLeft).toBe(TOTAL_REROLLS);
    expect(isComplete(s)).toBe(false);
  });

  it("only allows placing a player in an eligible empty slot", () => {
    const s = initDraft(getFormation("4-3-3"));
    const squad = getSquad("BRA-1950-f7784c0b")!;
    const gk = squadPlayers(squad).find((p) => p.positions.includes("GK"))!;
    // GK into a CB slot must throw.
    expect(() => placePlayer(s, gk, "rcb")).toThrow();
    const s2 = placePlayer(s, gk, "gk");
    expect(s2.placements.gk.id).toBe(gk.id);
    expect(emptySlots(s2)).toHaveLength(10);
    // Slot is locked.
    const other = squadPlayers(squad).find((p) => p.positions.includes("GK") && p.id !== gk.id);
    if (other) expect(() => placePlayer(s2, other, "gk")).toThrow();
  });

  it("edition-swap reroll keeps the nation family and costs a reroll", () => {
    let s = initDraft(getFormation("4-4-2"));
    s = { ...s, presentedSquadId: "BRA-1950-f7784c0b" }; // a nation with many editions
    const before = getSquad(s.presentedSquadId!)!;
    s = reroll(s, "seedA", 0, 0, "same-team");
    expect(s.rerollsLeft).toBe(TOTAL_REROLLS - 1);
    const after = getSquad(s.presentedSquadId!)!;
    expect(nationGroup(before.team)).toContain(after.team); // same nation family
    expect(after.id).not.toBe(before.id);
  });

  it("nation-swap reroll keeps the year, changes the nation", () => {
    let s = initDraft(getFormation("4-4-2"));
    s = { ...s, presentedSquadId: "BRA-1950-f7784c0b" };
    const before = getSquad(s.presentedSquadId!)!;
    s = reroll(s, "seedB", 0, 0, "same-year");
    const after = getSquad(s.presentedSquadId!)!;
    expect(after.year).toBe(before.year);
    expect(after.team).not.toBe(before.team);
  });

  it("throws when rerolling with an empty budget", () => {
    let s = initDraft(getFormation("4-4-2"));
    s = { ...s, presentedSquadId: "BRA-1950-f7784c0b" };
    s = reroll(s, "seedC", 0, 0, "same-year");
    s = reroll(s, "seedC", 0, 1, "same-year");
    s = reroll(s, "seedC", 0, 2, "same-year");
    expect(s.rerollsLeft).toBe(0);
    expect(() => reroll(s, "seedC", 0, 3, "same-year")).toThrow();
  });

  it("can always complete a full XI (no soft-lock) across many seeds", () => {
    for (let n = 1; n <= 25; n++) {
      const seed = `soft-lock-${n}`;
      let s = initDraft(getFormation("4-2-3-1"));
      let guard = 0;
      while (!isComplete(s)) {
        if (++guard > 200) throw new Error("draft did not converge");
        s = rollNext(s, seed, Object.keys(s.placements).length);
        const squad = getSquad(s.presentedSquadId!)!;
        const entries = placeableEntries(s, squad);
        expect(entries.length).toBeGreaterThan(0); // presented squad is always placeable
        const entry = entries[0];
        s = placePlayer(s, entry.player, entry.slots[0].id);
      }
      expect(isComplete(s)).toBe(true);
      expect(Object.keys(s.placements)).toHaveLength(11);
    }
  });

  it("presented squad always has at least one placeable player", () => {
    const s = initDraft(getFormation("3-5-2"));
    const rolled = rollNext(s, "present", 0);
    expect(squadCanPlace(rolled, getSquad(rolled.presentedSquadId!)!)).toBe(true);
  });

  it("rolls are deterministic for a given seed + rollIndex", () => {
    const a = rollNext(initDraft(getFormation("4-3-3")), "fixed", 3);
    const b = rollNext(initDraft(getFormation("4-3-3")), "fixed", 3);
    expect(a.presentedSquadId).toBe(b.presentedSquadId);
  });

  it("keeps the last 6 picks in the recent buffer to avoid repeats", () => {
    let s = initDraft(getFormation("4-3-3"));
    for (let i = 0; i < 5; i++) {
      s = rollNext(s, "buffer", i);
      const squad = getSquad(s.presentedSquadId!)!;
      const entry = placeableEntries(s, squad)[0];
      s = placePlayer(s, entry.player, entry.slots[0].id);
    }
    expect(s.recent.length).toBeLessThanOrEqual(6);
    expect(new Set(s.recent).size).toBe(s.recent.length); // distinct
  });

  it("weights strong squads above weak ones within [0.25, 1.0]", () => {
    let min = Infinity;
    let max = -Infinity;
    for (const sq of SQUADS) {
      const w = squadWeight(sq);
      expect(w).toBeGreaterThanOrEqual(0.25 - 1e-9);
      expect(w).toBeLessThanOrEqual(1.0 + 1e-9);
      min = Math.min(min, w);
      max = Math.max(max, w);
    }
    expect(min).toBeCloseTo(0.25, 6);
    expect(max).toBeCloseTo(1.0, 6);
    expect(squadKey({ team: "BRA", year: 1950 })).toBe("BRA:1950");
  });
});
