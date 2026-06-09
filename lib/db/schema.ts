import { pgTable, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

/** A completed build + simulation, shareable by slug and rankable on the leaderboard. */
export const runs = pgTable(
  "runs",
  {
    slug: text("slug").primaryKey(), // short public id, used in /r/[slug]
    owner: text("owner").notNull(), // anonymous client uuid
    formationId: text("formation_id").notNull(),
    seed: integer("seed").notNull(),
    /** The drafted XI: [{ slotId, position, playerId }]. */
    xi: jsonb("xi").notNull(),
    /** Full SimResult JSON for replay/share. */
    result: jsonb("result").notNull(),
    stageReached: text("stage_reached").notNull(),
    score: integer("score").notNull(),
    teamLabel: text("team_label"), // optional display name for the run
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    scoreIdx: index("runs_score_idx").on(t.score),
    ownerIdx: index("runs_owner_idx").on(t.owner),
  }),
);

export type RunRow = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

/** A reusable, named, user-built XI in the shared pool. Selectable into cups. */
export const teams = pgTable(
  "teams",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    creator: text("creator"), // who built it (free text, no login)
    owner: text("owner").notNull(), // anonymous device id (lets you edit your own)
    formationId: text("formation_id").notNull(),
    /** [{ slotId, position, playerId }]. */
    xi: jsonb("xi").notNull(),
    overall: integer("overall").notNull(), // denormalized avg rating for sorting
    quality: jsonb("quality").notNull(), // { gk, def, mid, att, overall }
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    teamsOverallIdx: index("teams_overall_idx").on(t.overall),
    teamsOwnerIdx: index("teams_owner_idx").on(t.owner),
  }),
);

export type TeamRow = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

/** A played cup between selected teams (+ historical fillers), shareable by slug. */
export const tournaments = pgTable("tournaments", {
  slug: text("slug").primaryKey(),
  name: text("name"), // optional cup name
  owner: text("owner").notNull(),
  /** Slugs of the entrant teams (non-filler). */
  entrantSlugs: jsonb("entrant_slugs").notNull(),
  seed: integer("seed").notNull(),
  result: jsonb("result").notNull(), // full CupResult
  championLabel: text("champion_label").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TournamentRow = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
