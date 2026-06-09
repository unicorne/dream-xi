import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import TeamsBrowser, { type PoolTeam } from "@/components/TeamsBrowser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  let rows: PoolTeam[] = [];
  let configured = isDbConfigured();
  if (configured) {
    rows = (await db()
      .select({
        slug: teams.slug, name: teams.name, creator: teams.creator,
        formationId: teams.formationId, overall: teams.overall, quality: teams.quality,
      })
      .from(teams)
      .orderBy(desc(teams.overall))
      .limit(200)) as PoolTeam[];
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h1 className="font-display text-4xl uppercase tracking-tight">Team pool</h1>
        <Link href="/play" className="rounded-xl bg-emerald-400 px-4 py-2.5 font-bold text-black hover:bg-emerald-300 whitespace-nowrap">
          + Build a team
        </Link>
      </div>
      <p className="text-white/60 mb-3">
        Everyone’s saved teams. Tick the ones you want, name your cup, and kick off a 32-team World
        Cup — empty slots are filled with random historical sides.
      </p>
      <p className="mb-6">
        <Link href="/cups" className="text-sm text-emerald-300 hover:underline">Cup history →</Link>
      </p>

      {!configured ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/55">
          The team pool needs a database. Add <code className="text-emerald-300">DATABASE_URL</code> to enable it.
        </div>
      ) : (
        <TeamsBrowser teams={rows} />
      )}
    </div>
  );
}
