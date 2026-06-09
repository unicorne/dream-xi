# World Cup Simulator — Implementation Plan

A rebuild + improvement of https://7a0.com.br/en

## 1. Concept

The player drafts a starting eleven by "rolling" random historical World Cup squads
(1950–2026) and placing one player per roll into a formation slot. Once the XI is
complete, it is dropped into a simulated 32-team World Cup against random historical
XIs and the whole tournament is played out. Completed runs are saved and shareable.

## 2. Core data

- Source: `data/players_master.csv` (5,613 players, the *enriched* file — use this one).
- 250 squads = 52 national teams × 20 World Cups (1950, 1954, … 2022, 2026).
- ~22–23 players per squad.
- Columns used: `player_id, player, team, year, squad, number, pos_en, overall,
  PAC, SHO, PAS, DRI, DEF, PHY, GK`.
- `pos_en` is slash-separated, **primary position first**, e.g. `ST/LW`.
- 12 canonical slot positions: `GK RB CB LB DM CM AM RM LM RW LW ST`.

### Build-time data pipeline
At build we convert the CSV → a static JSON bundle the client/server reads:
- `squads.json`: `{ squadId, team, year, label, players: [...] }`
- `players.json`: keyed by `player_id`, with parsed `positions: string[]`.
- Precompute per-squad "best XI" for each supported formation (used for opponents).
- Output committed under `lib/data/generated/` (no DB round-trips for static data).

Script: `scripts/build-data.ts` (run via `pnpm gen:data`, also in `prebuild`).

## 3. Game mechanics (LOCKED decisions)

### 3.1 Formation
- Player picks a formation **before** drafting (this is the strategic choice that
  fixes how many of each position they need — e.g. number of strikers).
- Supported formations (each defines 11 slots with a canonical position):
  `4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 4-1-2-1-2, 5-3-2, 3-4-3`.
- A slot has exactly one canonical position from the 12 above.

### 3.2 Position eligibility — **ANY LISTED POSITION**
- A rolled player can be placed in a slot if the slot's canonical position is in the
  player's parsed `positions` list. `ST/LW` is eligible for an `ST` **or** `LW` slot.
- GK only ever fills GK; GK slots only accept players whose positions include GK.

### 3.3 Roll & reroll budget — **3 REROLLS, TOTAL**
- The XI has 11 slots. The draft proceeds as 11 "rolls".
- Each roll: the engine presents a **random squad** (random team × random year).
  The player must place **one** of that squad's still-unplaced players into one
  **empty, position-eligible** slot.
- The player has a shared pool of **3 rerolls** for the entire build. A reroll
  discards the current presented squad and presents a new one. Two reroll flavors,
  each costs 1 from the pool:
  - **Same team, different year** (e.g. Brazil 1950 → Brazil 1970).
  - **Different team, same year** (e.g. Brazil 1950 → Italy 1950).
- Edge case — *dead roll*: if a presented squad has **no** player eligible for any
  remaining empty slot, it does NOT consume a reroll; the engine auto-presents a new
  squad (guaranteed to be placeable, see §3.4).
- Once a player is placed, that slot is **locked** (cannot be changed), matching the
  original game.

### 3.4 Guaranteeing a completable XI
Because eligibility is per-roll, we must never soft-lock the player:
- Before presenting a squad on a forced roll (no rerolls left), filter to squads that
  contain at least one player eligible for at least one remaining empty slot.
- Rerolls are still free-choice within their flavor; if a chosen flavor yields only
  dead squads, fall back to any placeable squad and surface a toast.

### 3.5 Draft state machine
States: `pickFormation → rolling(slotIndex, presentedSquad, rerollsLeft) →
  placed → … → complete(XI) → simulating → result`.

## 4. Simulation
See `descriptions/simulation.md` for the full engine spec. Summary:
- Your XI + 31 random historical best-XIs → 32-team bracket.
- 8 groups of 4 → Round of 16 → QF → SF → Final.
- Match outcome: position-weighted team strengths → Poisson goals with upset variance;
  knockouts add extra time + penalty shootout.
- Deterministic given a seed (so shared results reproduce the same bracket).

## 5. Tech stack & persistence (LOCKED: Next.js + Postgres, shareable, no login)

- **Next.js (App Router) + TypeScript + Tailwind**, deployed on Vercel.
- **Postgres** via Vercel Postgres / Neon, accessed with Drizzle ORM.
- **No auth.** Anonymous owner id stored in a `localStorage` cookie/uuid.
- Persisted entities:
  - `runs`: a completed build + simulation. Stores formation, the XI (player ids +
    slots), the RNG seed, the final bracket/result JSON, owner uuid, created_at.
  - Each run has a short public `slug` → shareable URL `/r/[slug]`.
  - Optional global **leaderboard** ranking runs by how far the user's team advanced
    + goal difference (read-only view, derived from `runs`).
- Static player/squad data stays in the JSON bundle (not the DB).

## 6. Architecture & routes

```
app/
  page.tsx                 Landing + "New game"
  play/page.tsx            Draft + sim flow (client-driven state machine)
  r/[slug]/page.tsx        Shared/saved run (server component, reads DB)
  leaderboard/page.tsx     Top runs
  api/
    runs/route.ts          POST create run (returns slug)
    runs/[slug]/route.ts   GET a run
    leaderboard/route.ts   GET ranked runs
lib/
  data/                    CSV loader + generated JSON
  draft/                   formations, eligibility, reroll, state machine (pure TS)
  sim/                     tournament + match engine (pure TS, seedable RNG)
  db/                      drizzle schema + client
scripts/build-data.ts
```

Design rule: **draft and sim engines are pure, deterministic, framework-free TS**
under `lib/`, unit-tested in isolation. UI and DB are thin shells around them.

## 7. UI flow

1. **Landing** — explain, pick formation, "Start draft".
2. **Pitch view** — formation drawn on a pitch; empty slots highlighted.
3. **Roll panel** — presented squad (team + year crest/label), its players grouped by
   eligibility; reroll buttons with remaining count; place = drag/click into a slot.
4. **Progress** — XI fills slot by slot; placed slots show player + rating.
5. **Simulate** — once 11/11 filled, "Simulate World Cup" → animated bracket reveal.
6. **Result** — final placement, key matches, shareable link, "Save to leaderboard".

## 8. Improvements over the original

- FIFA-style stat radar per placed player (data already has PAC/SHO/PAS/DRI/DEF/PHY).
- Smart reroll guidance (show which slots a squad *can* fill before you commit).
- Deterministic, reproducible & shareable tournament via seed.
- Leaderboard + per-run permalink.
- Match commentary / scoreline reveal animation.
- Mobile-first responsive pitch.

## 9. Build phases (tracked as tasks)

1. Scaffold Next.js + Tailwind + Drizzle; data pipeline (CSV→JSON).
2. Pure draft engine (formations, eligibility, reroll budget) + unit tests.
3. Pure sim engine (match + tournament + seed) + unit tests.
4. Draft UI (pitch, roll panel, placement).
5. Sim UI (bracket reveal, result).
6. Persistence (runs API, share pages, leaderboard).
7. Polish, mobile, deploy to Vercel.

## 10. Open/deferred (sensible defaults, revisit later)

- Tournament size fixed at 32 (classic format) even for 2026 squads.
- Crests: text labels first (e.g. "🇧🇷 Brazil 1970"); real crests later.
- Formation set above is the v1 list; easy to extend.
