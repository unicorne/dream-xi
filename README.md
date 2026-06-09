# Dream XI

Draft an all-time XI by rolling random historical World Cup squads (1950–2026),
then simulate a 32-nation tournament and share the result. A rebuild + improvement
of [7a0.com.br](https://7a0.com.br/en).

## How it works

1. **Pick a formation** — your one strategic choice; it fixes which positions you must fill.
2. **Roll & draft** — each roll presents a random squad; place one eligible player into a slot.
   A player is eligible for any of their listed positions (e.g. `ST/LW` fits an ST *or* LW slot).
   You get 11 rolls and **3 rerolls total** (same team / different year, or same year / different team).
3. **Simulate** — your XI joins 31 auto-built historical XIs in groups → R16 → QF → SF → final.
4. **Share** — save the run for a permalink and the global leaderboard.

The draft and simulation engines are pure, deterministic TypeScript (`lib/draft`, `lib/sim`);
a run reproduces exactly from its stored XI + seed.

## Stack

- Next.js (App Router) + TypeScript + Tailwind v4
- Postgres via Drizzle ORM (anonymous, no login)
- Deploys on Vercel

## Local development

```bash
pnpm install
pnpm gen:data        # CSV -> static JSON bundle (also runs on prebuild)
pnpm dev             # http://localhost:3000
pnpm test            # engine unit tests
```

Persistence (save/share/leaderboard) needs a Postgres database. Without one the game
is fully playable; only saving is disabled (the API returns 503).

```bash
cp .env.example .env           # set DATABASE_URL
pnpm db:push                   # apply schema (or run drizzle/0000_init.sql)
```

## Shared league mode

- **Build a team** (`/play`) → name it + your name → **Save to pool**.
- **Team pool** (`/teams`) — everyone’s saved teams; tick the ones you want, name a cup, and
  **Run World Cup**. Empty slots (up to 32) are filled with random historical sides.
- **Cup result** (`/cup/[slug]`) — champion, how every entered team finished, awards, full bracket.
  Shareable by link.

Tables: `teams` (saved XIs), `tournaments` (played cups), plus `runs` (solo quick-sims).

## Deploy to Vercel (with Supabase)

1. Create a Supabase project → *Settings → Database → Connection string → “Transaction” pooler*
   (port `6543`). Set it as `DATABASE_URL` (locally in `.env`, and in Vercel’s env settings).
2. Apply the schema once against that URL: `pnpm db:push` (or run `drizzle/*.sql`).
3. Deploy: `npx vercel` from this folder, or push to GitHub and import. `prebuild` regenerates
   the data bundle automatically.

Any Postgres works (Vercel Postgres / Neon auto-inject `POSTGRES_URL`); the app reads
`DATABASE_URL` or `POSTGRES_URL`. Without a database the game is fully playable; only
saving/pool/cups are disabled.

## Data

`data/players_master.csv` — 5,613 players across 250 squads, with FIFA-style ratings
(PAC/SHO/PAS/DRI/DEF/PHY/GK + overall) and English positions. `scripts/build-data.ts`
converts it into `lib/data/generated/{players,squads}.json` at build time.

See `descriptions/game.md` and `descriptions/simulation.md` for the full design.
