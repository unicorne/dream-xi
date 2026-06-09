"use client";
import type { RollPlayer } from "@/lib/clientTypes";
import PlayerRadar from "./PlayerRadar";

function ratingTier(ovr: number) {
  if (ovr >= 88) return {
    badge: "bg-gradient-to-br from-yellow-300 to-yellow-500 text-black",
    card: "legend-glow",
    wash: "from-yellow-500/8 to-transparent",
    border: "border-yellow-400/35",
  };
  if (ovr >= 82) return {
    badge: "bg-emerald-400 text-black",
    card: "",
    wash: "from-emerald-500/8 to-transparent",
    border: "border-emerald-400/25",
  };
  if (ovr >= 76) return {
    badge: "bg-sky-400 text-black",
    card: "",
    wash: "from-sky-500/6 to-transparent",
    border: "border-sky-400/20",
  };
  return {
    badge: "bg-slate-400 text-black",
    card: "",
    wash: "from-white/5 to-transparent",
    border: "border-white/12",
  };
}

export default function PlayerCard({ player }: { player: RollPlayer }) {
  const isGk = player.positions.includes("GK");
  const tier = ratingTier(player.overall);

  return (
    <div className={`relative rounded-xl border overflow-hidden p-3.5 transition-all ${tier.border} ${tier.card}`}>
      {/* Tier wash */}
      <div className={`absolute inset-0 bg-gradient-to-b ${tier.wash} pointer-events-none`} />

      <div className="relative flex items-center gap-3">
        <div className={`shrink-0 w-14 h-14 rounded-xl grid place-items-center font-display text-2xl ${tier.badge}`}>
          {player.overall}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-snug">
            {player.name}
            {player.legend && <span className="ml-1 text-yellow-400" title="Legend">⭐</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {player.positions.map((p) => (
              <span key={p} className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/55 rounded px-1.5 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-2 flex justify-center">
        <PlayerRadar stats={player.stats} />
      </div>

      {isGk && (
        <div className="relative mt-1 text-center text-xs text-emerald-300">
          Goalkeeping <strong>{player.stats.GK}</strong>
        </div>
      )}
    </div>
  );
}
