import type { Position } from "../types.ts";

export interface Slot {
  id: string;
  position: Position;
  /** Relative pitch coords, 0..100 (x left→right, y own-goal→opp-goal). */
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  slots: Slot[];
}

function slot(id: string, position: Position, x: number, y: number): Slot {
  return { id, position, x, y };
}

// Each formation: 1 GK + 10 outfield, with pitch coordinates for rendering.
export const FORMATIONS: Formation[] = [
  {
    id: "4-3-3",
    name: "4-3-3",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("dm", "CM", 50, 42), slot("rcm", "CM", 68, 50), slot("lcm", "CM", 32, 50),
      slot("rw", "RW", 80, 76), slot("st", "ST", 50, 84), slot("lw", "LW", 20, 76),
    ],
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("rm", "RM", 82, 54), slot("rcm", "CM", 60, 48),
      slot("lcm", "CM", 40, 48), slot("lm", "LM", 18, 54),
      slot("rst", "ST", 60, 82), slot("lst", "ST", 40, 82),
    ],
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("rdm", "CM", 62, 40), slot("ldm", "CM", 38, 40),
      slot("ram", "RW", 80, 64), slot("cam", "AM", 50, 62), slot("lam", "LW", 20, 64),
      slot("st", "ST", 50, 86),
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rcb", "CB", 72, 20), slot("ccb", "CB", 50, 18), slot("lcb", "CB", 28, 20),
      slot("rm", "RM", 86, 50), slot("rcm", "CM", 64, 46),
      slot("dm", "CM", 50, 40), slot("lcm", "CM", 36, 46), slot("lm", "LM", 14, 50),
      slot("rst", "ST", 60, 82), slot("lst", "ST", 40, 82),
    ],
  },
  {
    id: "3-4-3",
    name: "3-4-3",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rcb", "CB", 72, 20), slot("ccb", "CB", 50, 18), slot("lcb", "CB", 28, 20),
      slot("rm", "RM", 82, 48), slot("rcm", "CM", 60, 44),
      slot("lcm", "CM", 40, 44), slot("lm", "LM", 18, 48),
      slot("rw", "RW", 78, 78), slot("st", "ST", 50, 84), slot("lw", "LW", 22, 78),
    ],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rwb", "RB", 88, 34), slot("rcb", "CB", 68, 18),
      slot("ccb", "CB", 50, 16), slot("lcb", "CB", 32, 18), slot("lwb", "LB", 12, 34),
      slot("rcm", "CM", 66, 50), slot("dm", "CM", 50, 46), slot("lcm", "CM", 34, 50),
      slot("rst", "ST", 60, 80), slot("lst", "ST", 40, 80),
    ],
  },
  {
    id: "4-1-2-1-2",
    name: "4-1-2-1-2",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("dm", "CM", 50, 38),
      slot("rcm", "CM", 70, 50), slot("lcm", "CM", 30, 50),
      slot("am", "AM", 50, 62),
      slot("rst", "ST", 60, 82), slot("lst", "ST", 40, 82),
    ],
  },
  {
    id: "4-4-1-1",
    name: "4-4-1-1",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("rm", "RM", 82, 52), slot("rcm", "CM", 60, 48),
      slot("lcm", "CM", 40, 48), slot("lm", "LM", 18, 52),
      slot("am", "AM", 50, 68),
      slot("st", "ST", 50, 86),
    ],
  },
  {
    id: "4-5-1",
    name: "4-5-1",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("rm", "RM", 86, 54), slot("rcm", "CM", 64, 48),
      slot("cm", "CM", 50, 44), slot("lcm", "CM", 36, 48), slot("lm", "LM", 14, 54),
      slot("st", "ST", 50, 84),
    ],
  },
  {
    id: "4-2-2-2",
    name: "4-2-2-2",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("rdm", "CM", 62, 42), slot("ldm", "CM", 38, 42),
      slot("ram", "AM", 72, 64), slot("lam", "AM", 28, 64),
      slot("rst", "ST", 60, 84), slot("lst", "ST", 40, 84),
    ],
  },
  {
    id: "4-3-1-2",
    name: "4-3-1-2",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rb", "RB", 82, 26), slot("rcb", "CB", 62, 20),
      slot("lcb", "CB", 38, 20), slot("lb", "LB", 18, 26),
      slot("rcm", "CM", 70, 46), slot("cm", "CM", 50, 42), slot("lcm", "CM", 30, 46),
      slot("am", "AM", 50, 64),
      slot("rst", "ST", 60, 84), slot("lst", "ST", 40, 84),
    ],
  },
  {
    id: "3-4-2-1",
    name: "3-4-2-1",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rcb", "CB", 72, 20), slot("ccb", "CB", 50, 18), slot("lcb", "CB", 28, 20),
      slot("rm", "RM", 84, 48), slot("rcm", "CM", 60, 44),
      slot("lcm", "CM", 40, 44), slot("lm", "LM", 16, 48),
      slot("ram", "AM", 64, 66), slot("lam", "AM", 36, 66),
      slot("st", "ST", 50, 86),
    ],
  },
  {
    id: "5-4-1",
    name: "5-4-1",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rwb", "RB", 88, 34), slot("rcb", "CB", 68, 18),
      slot("ccb", "CB", 50, 16), slot("lcb", "CB", 32, 18), slot("lwb", "LB", 12, 34),
      slot("rm", "RM", 82, 54), slot("rcm", "CM", 60, 48),
      slot("lcm", "CM", 40, 48), slot("lm", "LM", 18, 54),
      slot("st", "ST", 50, 84),
    ],
  },
  {
    id: "3-3-3-1",
    name: "3-3-3-1",
    slots: [
      slot("gk", "GK", 50, 6),
      slot("rcb", "CB", 72, 20), slot("ccb", "CB", 50, 18), slot("lcb", "CB", 28, 20),
      slot("rcm", "CM", 72, 42), slot("ccm", "CM", 50, 40), slot("lcm", "CM", 28, 42),
      slot("rw", "RW", 74, 66), slot("am", "AM", 50, 64), slot("lw", "LW", 26, 66),
      slot("st", "ST", 50, 86),
    ],
  },
];

export const FORMATION_BY_ID = new Map(FORMATIONS.map((f) => [f.id, f]));

export function getFormation(id: string): Formation {
  const f = FORMATION_BY_ID.get(id);
  if (!f) throw new Error(`Unknown formation: ${id}`);
  return f;
}
