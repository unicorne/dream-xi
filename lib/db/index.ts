import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

// Lazy singleton; throws only when actually used without a configured DB.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function db() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL) is not set. Configure Postgres to enable saving/leaderboard.",
    );
  }
  if (!_db) {
    const client = postgres(connectionString, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export function isDbConfigured(): boolean {
  return Boolean(connectionString);
}

export { schema };
