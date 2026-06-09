// Seedable PRNG (mulberry32). All game/sim randomness flows through this so a
// (seed) fully determines a run and shared results reproduce exactly.

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  /** In-place Fisher-Yates shuffle (returns the same array). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export function randomSeed(): number {
  // Non-deterministic seed for fresh games. Kept in signed 32-bit range so it
  // fits Postgres `integer` when persisted. The Rng treats it as uint32 anyway.
  return (Math.floor(Math.random() * 0x7fffffff) >>> 0) || 1;
}

/** Hash a seed string into a 32-bit state (xfnv1a-style; matches the roll spec). */
function hashSeed(str: string): number {
  let h = (0x6a09e667 ^ str.length) >>> 0;
  for (let i = 0; i < str.length; i++) {
    const t = Math.imul(h ^ str.charCodeAt(i), 0xcc9e2d51);
    h = ((t << 13) | (t >>> 19)) >>> 0; // rotl13
  }
  return h >>> 0;
}

/** A deterministic Rng seeded by a string (used for the squad-roll stream). */
export function makeRng(seedString: string): Rng {
  return new Rng(hashSeed(seedString));
}
