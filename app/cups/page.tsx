import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default async function CupsHistory() {
  let rows: {
    slug: string; name: string | null; championLabel: string;
    entrantSlugs: unknown; createdAt: Date;
  }[] = [];

  if (isDbConfigured()) {
    rows = await db()
      .select({
        slug: tournaments.slug, name: tournaments.name,
        championLabel: tournaments.championLabel,
        entrantSlugs: tournaments.entrantSlugs, createdAt: tournaments.createdAt,
      })
      .from(tournaments)
      .orderBy(desc(tournaments.createdAt))
      .limit(100);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h1 className="font-display text-4xl uppercase tracking-tight">Cup history</h1>
        <Link href="/teams" className="rounded-xl bg-emerald-400 px-4 py-2.5 font-bold text-black hover:bg-emerald-300 whitespace-nowrap">
          + New cup
        </Link>
      </div>
      <p className="text-white/60 mb-6">Every World Cup that’s been simulated. Tap one to replay it.</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/55">
          No cups have been played yet.{" "}
          <Link href="/teams" className="text-emerald-400 hover:underline">Run the first →</Link>
        </div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => {
            const n = Array.isArray(r.entrantSlugs) ? r.entrantSlugs.length : 0;
            return (
              <li key={r.slug}>
                <Link
                  href={`/cup/${r.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-white/30"
                >
                  <span className="text-2xl shrink-0">🏆</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold truncate block">
                      {r.name || `Cup — ${formatDate(r.createdAt)}`}
                    </span>
                    <span className="text-xs text-white/45">
                      Won by {r.championLabel} · {n} team{n === 1 ? "" : "s"} entered
                    </span>
                  </span>
                  <span className="text-right shrink-0 whitespace-nowrap">
                    <span className="block text-xs text-white/60">{formatDate(r.createdAt)}</span>
                    <span className="block text-[11px] text-white/35">{formatTime(r.createdAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
