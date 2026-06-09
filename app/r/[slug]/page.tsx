import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { runs } from "@/lib/db/schema";
import { getFormation } from "@/lib/draft/formations";
import { getPlayer } from "@/lib/data";
import { teamQuality } from "@/lib/teamQuality";
import { teamChemistry } from "@/lib/sim/chemistry";
import type { RollPlayer } from "@/lib/clientTypes";
import type { SimResult } from "@/lib/sim/types";
import type { XiSlot } from "@/lib/serialize";
import ResultView from "@/components/ResultView";
import ShareBar from "@/components/ShareBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SharedRun({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isDbConfigured()) {
    return <Centered>Persistence isn’t configured on this deployment.</Centered>;
  }
  const [row] = await db().select().from(runs).where(eq(runs.slug, slug)).limit(1);
  if (!row) notFound();

  const formation = getFormation(row.formationId);
  const xi = row.xi as XiSlot[];
  const placements: Record<string, RollPlayer> = {};
  for (const s of xi) {
    const p = getPlayer(s.playerId);
    if (!p) continue;
    placements[s.slotId] = {
      id: p.id, name: p.name, squadId: p.squadId, positions: p.positions, overall: p.overall,
      stats: p.stats, legend: p.legend, number: p.number, eligibleSlots: [],
    };
  }

  const quality = teamQuality(
    xi.map((s) => {
      const slot = formation.slots.find((fs) => fs.id === s.slotId)!;
      return { position: slot.position, overall: getPlayer(s.playerId)?.overall ?? 0 };
    }),
  );
  const chemXi = xi.flatMap((s) => {
    const p = getPlayer(s.playerId);
    const slot = formation.slots.find((fs) => fs.id === s.slotId);
    if (!p || !slot) return [];
    return [{ slotId: s.slotId, position: slot.position, player: p }];
  });
  if (chemXi.length > 0) quality.chemistry = Math.round(teamChemistry(chemXi).score * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ResultView result={row.result as SimResult} formation={formation} placements={placements} quality={quality} />
      <div className="mt-6 flex flex-col items-center gap-4">
        <ShareBar path={`/r/${slug}`} />
        <Link href="/play" className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-black hover:bg-emerald-400">
          Build your own XI →
        </Link>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-20 text-center text-white/70">{children}</div>;
}
