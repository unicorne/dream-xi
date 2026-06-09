"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOwner } from "@/lib/useOwner";

export interface PoolTeam {
  slug: string;
  name: string;
  creator: string | null;
  formationId: string;
  overall: number;
  quality: { gk: number; def: number; mid: number; att: number; overall: number };
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

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (next.size < 32) next.add(slug);
      return next;
    });
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
      router.push(`/cup/${data.slug}`);
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
      <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
        {teams.map((t) => {
          const on = selected.has(t.slug);
          return (
            <button
              key={t.slug}
              onClick={() => toggle(t.slug)}
              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left transition ${
                on ? "bg-emerald-400/15" : "hover:bg-white/5"
              }`}
            >
              <span
                className={`shrink-0 w-6 h-6 rounded-md border-2 grid place-items-center text-xs font-black ${
                  on ? "bg-emerald-400 border-emerald-400 text-black" : "border-white/30"
                }`}
              >
                {on ? "✓" : ""}
              </span>
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
            </button>
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
