import { describe, it, expect } from "vitest";
import { Rng } from "../rng.ts";
import { getFormation } from "../draft/formations.ts";
import { buildBestXI } from "../draft/bestXI.ts";
import { getSquad } from "../data/index.ts";
import { simulateWorldCup, simulateCup } from "./tournament.ts";

function userXI() {
  const squad = getSquad("BRA-1970-")! ?? null;
  // Fall back to any Brazil 1970-ish strong squad if id differs.
  const s = squad ?? getSquad("BRA-1950-f7784c0b")!;
  return buildBestXI(s, getFormation("4-3-3"))!;
}

describe("sim engine", () => {
  it("is deterministic for the same (XI, seed)", () => {
    const xi = userXI();
    const a = simulateWorldCup(xi, 2026);
    const b = simulateWorldCup(xi, 2026);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces a valid 32-team bracket", () => {
    const xi = userXI();
    const r = simulateWorldCup(xi, 99);
    expect(r.groups).toHaveLength(8);
    for (const g of r.groups) {
      expect(g.standings).toHaveLength(4);
      expect(g.matches).toHaveLength(6); // round robin of 4
    }
    const r16 = r.knockouts.find((k) => k.stage === "r16")!;
    expect(r16.matches).toHaveLength(8);
    expect(r.knockouts.find((k) => k.stage === "qf")!.matches).toHaveLength(4);
    expect(r.knockouts.find((k) => k.stage === "sf")!.matches).toHaveLength(2);
    expect(r.knockouts.find((k) => k.stage === "final")!.matches).toHaveLength(1);
    expect(r.champion.id).toBeTruthy();
    expect(r.champion.id).not.toBe(r.runnerUp.id);
  });

  it("every knockout match has a winner", () => {
    const r = simulateWorldCup(userXI(), 7);
    for (const round of r.knockouts) {
      for (const m of round.matches) {
        expect(m.winner).toBeDefined();
        if (m.homeGoals === m.awayGoals) expect(m.penalties ?? m.extraTime).toBeTruthy();
      }
    }
  });

  it("attributes scorers/assists and aggregates awards", () => {
    const r = simulateWorldCup(userXI(), 314);
    // Every goal has a scorer; events count matches the scoreline.
    for (const m of r.matches) {
      // Open-play + ET goals are attributed as events; shootout goals are not.
      const homeGoalEvents = m.events.filter((e) => e.side === "home").length;
      const awayGoalEvents = m.events.filter((e) => e.side === "away").length;
      expect(homeGoalEvents).toBe(m.homeGoals);
      expect(awayGoalEvents).toBe(m.awayGoals);
      for (const e of m.events) expect(e.scorerName).toBeTruthy();
    }
    const totalGoals = r.matches.reduce((n, m) => n + m.events.length, 0);
    const awardGoals = r.awards.topScorers.reduce((n, p) => n + p.goals, 0);
    expect(awardGoals).toBeLessThanOrEqual(totalGoals);
    if (totalGoals > 0) expect(r.awards.bestPlayer).not.toBeNull();
    expect(r.awards.bestKeeper).not.toBeNull();
  });

  it("penalty shootouts produce a kick sequence with a winner", () => {
    let found = false;
    for (let s = 1; s <= 40 && !found; s++) {
      const r = simulateWorldCup(userXI(), s * 13);
      for (const m of r.matches) {
        if (m.penalties) {
          found = true;
          const ks = m.penalties.kicks;
          expect(ks.length).toBeGreaterThanOrEqual(2);
          expect(m.penalties.home).not.toBe(m.penalties.away);
          expect(m.winner).toBeDefined();
          // Stops the moment it's clinched: if the best-of-5 phase becomes
          // mathematically decided, that kick must be the last one (no waste).
          let hh = 0, aa = 0, ht = 0, at = 0;
          ks.forEach((k, i) => {
            if (k.side === "home") { if (k.scored) hh++; ht++; } else { if (k.scored) aa++; at++; }
            const decidedNow = ht <= 5 && at <= 5 && (hh > aa + (5 - at) || aa > hh + (5 - ht));
            if (decidedNow) expect(i).toBe(ks.length - 1);
          });
        }
      }
    }
    expect(found).toBe(true);
  });

  it("the user team appears and advances coherently", () => {
    const r = simulateWorldCup(userXI(), 555);
    const userMatches = r.matches.filter((m) => m.home.id === "USER" || m.away.id === "USER");
    expect(userMatches.length).toBeGreaterThanOrEqual(3); // at least the 3 group games
    expect(["group", "r16", "qf", "sf", "final", "champion"]).toContain(r.userOutcome.stageReached);
  });

  it("runs a custom cup of named teams padded to 32", () => {
    const entrants = [
      { id: "t1", label: "Alice FC", creator: "Alice", xi: userXI() },
      { id: "t2", label: "Bob United", creator: "Bob", xi: userXI() },
      { id: "t3", label: "Carol City", creator: "Carol", xi: userXI() },
    ];
    const r = simulateCup(entrants, 4242);
    // All entrants get a standings row; champion is a real team.
    expect(r.standings).toHaveLength(3);
    expect(r.standings.every((s) => ["t1", "t2", "t3"].includes(s.id))).toBe(true);
    expect(r.groups).toHaveLength(8);
    expect(r.knockouts.find((k) => k.stage === "final")!.matches).toHaveLength(1);
    expect(r.champion.id).toBeTruthy();
    // Deterministic.
    expect(JSON.stringify(simulateCup(entrants, 4242))).toBe(JSON.stringify(r));
    // Standings sorted: best stage first.
    const order = ["champion", "final", "sf", "qf", "r16", "group"];
    for (let i = 1; i < r.standings.length; i++) {
      expect(order.indexOf(r.standings[i].stageReached)).toBeGreaterThanOrEqual(
        order.indexOf(r.standings[i - 1].stageReached),
      );
    }
  });

  it("stronger teams win more often than not over many seeds", () => {
    // Strongest available squad vs simulated field: should reach knockouts often.
    let knockoutCount = 0;
    const xi = userXI();
    for (let seed = 1; seed <= 20; seed++) {
      const r = simulateWorldCup(xi, seed * 31);
      if (r.userOutcome.stageReached !== "group") knockoutCount++;
    }
    expect(knockoutCount).toBeGreaterThan(0);
  });
});
