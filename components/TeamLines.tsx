"use client";
import type { LineQuality } from "@/lib/teamQuality";

function Bar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 85 ? "bg-yellow-400" : value >= 80 ? "bg-emerald-400" : value >= 74 ? "bg-sky-400" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-xs text-white/60">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${value ? Math.max(6, (value / 99) * 100) : 0}%` }} />
      </div>
      <span className="w-6 text-right text-xs font-semibold tabular-nums">{value || "–"}</span>
    </div>
  );
}

export default function TeamLines({ q }: { q: LineQuality }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-white/50">Team quality</span>
        <span className="text-sm font-bold text-emerald-300">OVR {q.overall || "–"}</span>
      </div>
      <Bar label="ATT" value={q.att} />
      <Bar label="MID" value={q.mid} />
      <Bar label="DEF" value={q.def} />
      <Bar label="GK" value={q.gk} />
      {q.chemistry != null && <Bar label="CHEM" value={q.chemistry} />}
    </div>
  );
}
