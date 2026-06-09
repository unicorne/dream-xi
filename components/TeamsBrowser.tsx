"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOwner } from "@/lib/useOwner";
import { getFormation } from "@/lib/draft/formations";
import type { RollPlayer } from "@/lib/clientTypes";
import type { LineQuality } from "@/lib/teamQuality";
import Pitch from "./Pitch";
import TeamLines from "./TeamLines";

export interface PoolTeam {
  slug: string;
  name: string;
  creator: string | null;
  formationId: string;
  overall: number;
  quality: { gk: number; def: number; mid: number; att: number; overall: number };
}

interface Lineup {
  formationId: string;
  placements: Record<string, RollPlayer>;
  quality: LineQuality;
}

function ratingColor(ovr: number): string {
  if (ovr >= 85) return "bg-yellow-400 text-black";
  if (ovr >= 80) return "bg-emerald-400 text-black";
  if (ovr >= 75) return "bg-sky-400 text-black";
  return "bg-slate-300 text-black";
}

export default function TeamsBrowser({ teams }: { teams: PoolTeam[] }) {
  const router = useRouter();
  const owner = useOwner();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cupName, setCupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [lineups, setLineups] = useState<Record<string, Lineup | "loading" | "error">>({});

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < 32) next.add(slug);
      return next;
    });
  }

  async function view(slug: string) {
    if (expanded === slug) {
      setExpanded(null);
      return;
    }
    setExpanded(slug);
    if (!lineups[slug] || lineups[slug] === "error") {
      setLineups((m) => ({ ...m, [slug]: "loading" }));
      try {
        const res = await fetch(`/api/teams/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error();
        setLineups((m) => ({ ...m, [slug]: data as Lineup }));
      } catch {
        setLineups((m) => ({ ...m, [slug]: "error" }));
      }
    }
  }

  async function runCup() {
    if (selected.size < 1) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamSlugs: [...selected], name: cupName || null, owner }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push(`/cup/${data.slug}?new=1`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 p-12 text-center">
        <p className="text-white/60 text-lg">No teams in the pool yet.</p>
        <Link href="/play" className="mt-5 inline-block rounded-xl bg-emerald-400 px-6 py-3 font-bold text-black hover:bg-emerald-300">
          Build the first team →
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <p className="text-xs text-white/40 mb-2">Tap a team to view its lineup · tick the box to enter it in a cup.</p>
      <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
        {teams.map((t) => {
          const on = selected.has(t.slug);
          const open = expanded === t.slug;
          const lineup = lineups[t.slug];
          return (
            <div key={t.slug} className={on ? "bg-emerald-400/10" : ""}>
              <div className="flex items-center gap-3 px-3 sm:px-4 py-3">
                <button
                  onClick={() => toggle(t.slug)}
                  aria-label={on ? "Deselect" : "Select for cup"}
                  className={`shrink-0 w-6 h-6 rounded-md border-2 grid place-items-center text-xs font-black transition ${
                    on ? "bg-emerald-400 border-emerald-400 text-black" : "border-white/30 hover:border-white/60"
                  }`}
                >
                  {on ? "✓" : ""}
                </button>
                <button
                  onClick={() => view(t.slug)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <span className={`shrink-0 w-10 h-10 rounded-lg grid place-items-center font-black ${ratingColor(t.overall)}`}>
                    {t.overall}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold truncate block">{t.name}</span>
                    <span className="text-xs text-white/45">
                      {t.creator ? `by ${t.creator} · ` : ""}{t.formationId}
                    </span>
                  </span>
                  <span className="hidden sm:flex gap-1.5 text-[10px] text-white/55">
                    {(["att", "mid", "def", "gk"] as const).map((k) => (
                      <span key={k} className="rounded bg-white/10 px-1.5 py-0.5">
                        {k.toUpperCase()} {t.quality[k]}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 text-white/30 text-xs w-3">{open ? "▲" : "▾"}</span>
                </button>
              </div>

              {open && (
                <div className="px-3 sm:px-4 pb-4">
                  {lineup === "loading" || !lineup ? (
                    <div className="py-6 text-center text-white/40 text-sm animate-pulse">Loading lineup…</div>
                  ) : lineup === "error" ? (
                    <div className="py-6 text-center text-rose-400 text-sm">Couldn’t load this lineup.</div>
                  ) : (
                    <TeamLineup lineup={lineup} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky create-cup bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:p-4 pointer-events-none">
        <div className="mx-auto max-w-2xl pointer-events-auto rounded-2xl border border-white/15 bg-[#11162b]/95 backdrop-blur shadow-2xl shadow-black/50 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            value={cupName}
            onChange={(e) => setCupName(e.target.value)}
            placeholder="Cup name (optional)"
            maxLength={50}
            className="flex-1 rounded-xl bg-black/30 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/60"
          />
          <button
            onClick={runCup}
            disabled={busy || selected.size < 1}
            className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black hover:bg-emerald-300 disabled:opacity-40 disabled:bg-white/15 disabled:text-white/50 whitespace-nowrap transition"
          >
            {busy ? "Simulating…" : `Run World Cup (${selected.size})`}
          </button>
        </div>
        {error && <p className="mx-auto max-w-2xl mt-2 text-center text-rose-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}

function TeamLineup({ lineup }: { lineup: Lineup }) {
  const formation = getFormation(lineup.formationId);
  const players = formation.slots
    .map((s) => ({ slot: s, p: lineup.placements[s.id] }))
    .filter((x) => x.p);

  return (
    <div className="grid sm:grid-cols-[260px_1fr] gap-4">
      <div className="max-w-[260px] mx-auto w-full">
        <Pitch formation={formation} placements={lineup.placements} compact />
      </div>
      <div className="space-y-3">
        {lineup.quality && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <TeamLines q={lineup.quality} />
          </div>
        )}
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
          {players
            .sort((a, b) => b.p!.overall - a.p!.overall)
            .map(({ slot, p }) => (
              <div key={slot.id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm">
                <span className={`shrink-0 w-7 h-7 rounded grid place-items-center font-bold text-xs ${ratingColor(p!.overall)}`}>
                  {p!.overall}
                </span>
                <span className="flex-1 truncate">
                  {p!.name} {p!.legend && <span title="Legend">⭐</span>}
                </span>
                <span className="text-[10px] text-white/45">{slot.position}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
