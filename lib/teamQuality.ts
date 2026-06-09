// Pure line-quality ratings (GK / DEF / MID / ATT) from an XI's overalls.
// Used live in the draft (client) and on the result/share pages (server).
import type { Position } from "./types.ts";

export interface LineQuality {
  gk: number;
  def: number;
  mid: number;
  att: number;
  overall: number;
  chemistry?: number; // 0..100 display value
}

const GROUP: Record<Position, "gk" | "def" | "mid" | "att"> = {
  GK: "gk",
  CB: "def", RB: "def", LB: "def",
  CM: "mid", AM: "mid", RM: "mid", LM: "mid",
  RW: "att", LW: "att", ST: "att",
};

export function teamQuality(entries: { position: Position; overall: number }[]): LineQuality {
  const buckets: Record<"gk" | "def" | "mid" | "att", number[]> = { gk: [], def: [], mid: [], att: [] };
  let sum = 0;
  for (const e of entries) {
    buckets[GROUP[e.position]].push(e.overall);
    sum += e.overall;
  }
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
  return {
    gk: avg(buckets.gk),
    def: avg(buckets.def),
    mid: avg(buckets.mid),
    att: avg(buckets.att),
    overall: entries.length ? Math.round(sum / entries.length) : 0,
  };
}
