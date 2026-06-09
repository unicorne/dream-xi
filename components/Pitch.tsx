"use client";
import type { Formation } from "@/lib/draft/formations";
import type { RollPlayer } from "@/lib/clientTypes";

interface PitchProps {
  formation: Formation;
  placements: Record<string, RollPlayer>;
  eligibleSlots?: Set<string>;
  onSlotClick?: (slotId: string) => void;
  /** Slot holding a tentative (not yet confirmed) placement. */
  pendingSlotId?: string;
  compact?: boolean;
}

function ratingColor(ovr: number): string {
  if (ovr >= 88) return "bg-yellow-400 text-black";
  if (ovr >= 82) return "bg-emerald-400 text-black";
  if (ovr >= 76) return "bg-sky-400 text-black";
  return "bg-slate-300 text-black";
}

export default function Pitch({ formation, placements, eligibleSlots, onSlotClick, pendingSlotId, compact }: PitchProps) {
  return (
    <div
      className="relative w-full pitch-bg rounded-2xl border-2 border-white/20 overflow-hidden"
      style={{ aspectRatio: compact ? "3 / 4" : "2 / 3" }}
    >
      {/* pitch markings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square rounded-full border border-white/25" />
        <div className="absolute left-0 right-0 top-1/2 border-t border-white/25" />
        <div className="absolute left-1/4 right-1/4 top-0 h-[12%] border border-white/25 border-t-0" />
        <div className="absolute left-1/4 right-1/4 bottom-0 h-[12%] border border-white/25 border-b-0" />
      </div>

      {formation.slots.map((slot) => {
        const player = placements[slot.id];
        const eligible = eligibleSlots?.has(slot.id);
        const clickable = !!onSlotClick && (!player || eligible);
        return (
          <button
            key={slot.id}
            disabled={!clickable}
            onClick={() => clickable && onSlotClick?.(slot.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ${
              clickable ? "cursor-pointer" : "cursor-default"
            }`}
            style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
          >
            {player ? (
              <div className="flex flex-col items-center">
                <div
                  className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-full grid place-items-center font-bold text-xs sm:text-sm shadow ${ratingColor(
                    player.overall,
                  )} ${slot.id === pendingSlotId ? "ring-2 ring-yellow-300 ring-offset-2 ring-offset-emerald-800 animate-pulse" : ""}`}
                >
                  {player.overall}
                  {player.legend && (
                    <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>
                  )}
                </div>
                <span className="mt-0.5 max-w-[72px] truncate text-[10px] sm:text-xs font-medium text-white drop-shadow">
                  {player.name}
                </span>
              </div>
            ) : (
              <div
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-dashed grid place-items-center text-[10px] sm:text-xs font-semibold ${
                  eligible
                    ? "border-yellow-300 text-yellow-200 bg-yellow-300/20 animate-pulse"
                    : "border-white/40 text-white/70 bg-black/20"
                }`}
              >
                {slot.position}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
