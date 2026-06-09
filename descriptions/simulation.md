Pure, deterministic TypeScript under `lib/sim/`. Given the same seed + same teams it
produces the same tournament, so shared/saved results reproduce exactly.
- `userXI`: 11 placed players (each with `overall` + stats + slot position).
- `opponents`: 31 auto-built best-XIs from random historical squads (decision: "random
  historical XIs"). Built with the same best-XI logic used for the user's formations.
- `seed`: 32-bit integer. Stored on the run for reproducibility.
- Seedable PRNG (mulberry32 / xorshift128). All randomness (bracket draw, goals,
  shootouts) draws from this single stream so the whole tournament is a function of
  `(teams, seed)`.
From an XI we derive line ratings by averaging the relevant players' stats, weighted by
how their slot contributes to each phase:
- attack   = f(ST/W SHO,PAC,DRI; AM/CM PAS) — forwards weighted highest.
- midfield = f(CM/DM/AM PAS,DRI,DEF) — controls tempo, feeds both phases.
- defense  = f(CB/FB DEF,PHY; DM DEF; GK GK) — GK weighted into defense.
- overall  = mean of the 11 overall values (used for upset variance + leaderboard).
Each line is a 0–100 number. Slot->phase weight table lives in `lib/sim/weights.ts`.
For a match between A and B:
    base     = 1.35      # avg goals per team per match
    scale    = 8         # rating points -> goal multiplier sensitivity
    attEdgeA = (A.attack + A.midfield/2) - (B.defense + B.midfield/2)
    lambdaA  = clamp(base * exp(attEdgeA / scale / 10), 0.15, 5.5)
    lambdaB  = symmetric
    goalsA   = poisson(lambdaA, rng)
    goalsB   = poisson(lambdaB, rng)
- poisson(lambda, rng) via Knuth's algorithm using the seeded stream.
- Upset variance: Poisson already provides spread; a small random formSwing (+/-) is
  applied per team per match so a weaker side can over-perform.
- If goalsA == goalsB after regulation:
  - Extra time: one extra mini-match with base = 0.5 (fewer goals). Add to score.
  - Still level -> penalty shootout: best-of-5 then sudden death. Each kick is a
    Bernoulli weighted by taker quality vs opponent GK rating; deterministic via rng.
1. Draw: shuffle 32 teams (seeded) into 8 groups of 4 (A–H). User team gets a
   guaranteed slot, no other special treatment.
2. Group stage: round-robin (6 matches/group). 3/1/0 points. Tiebreakers: points ->
   goal difference -> goals for -> head-to-head -> seeded coin (rng).
3. Knockouts: top 2 per group -> Round of 16 (standard W1A-vs-W2B bracket) -> QF ->
   SF -> Final (+ optional 3rd-place playoff).
4. Output a full bracket object: groups, all match results, knockout tree, champion,
   and the user team's run (furthest stage reached, record, goals).
    type SimResult = {
      seed: number;
      champion: TeamRef;
      userOutcome: {
        stageReached: 'group'|'r16'|'qf'|'sf'|'final'|'champion';
        record: { w: number; d: number; l: number; gf: number; ga: number };
      };
      groups: GroupResult[];
      knockouts: KnockoutRound[];   // r16 -> final
      matches: MatchResult[];       // flat list for replay/animation
    };
score = stageWeight[stageReached]*1000 + goalDiff*10 + goalsFor, where
stageWeight = { group:0, r16:1, qf:2, sf:3, final:4, champion:5 }.
Stored denormalized on the run row for cheap ranking.
- Deterministic: same (teams, seed) -> byte-identical SimResult (snapshot test).
- Sanity: over many seeds, higher-rated teams win >50% of head-to-heads; each group of
  4 advances exactly 2; bracket has exactly one champion; no team appears twice.
- Poisson mean ~= lambda over N samples.
