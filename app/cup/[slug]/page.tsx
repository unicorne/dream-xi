import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db, isDbConfigured } from "@/lib/db";
import { tournaments } from "@/lib/db/schema";
import type { CupResult } from "@/lib/sim/types";
import CupView from "@/components/CupView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isDbConfigured()) {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center text-white/70">Persistence isn’t configured.</div>;
  }
  const [row] = await db().select().from(tournaments).where(eq(tournaments.slug, slug)).limit(1);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Suspense>
        <CupView result={row.result as CupResult} cupName={row.name} slug={slug} />
      </Suspense>
    </div>
  );
}
