"use client";
import { useCallback, useEffect, useState } from "react";
import { POSITIONS, type Position, type Stats } from "@/lib/types";
import { countryName } from "@/lib/countries";
import PlayerCard from "./PlayerCard";

interface ApiPlayer {
  id: string; name: string; team: string; year: number;
  positions: Position[]; overall: number; stats: Stats; legend: boolean;
}

const SORTS: { key: string; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "PAC", label: "Pace" },
  { key: "SHO", label: "Shooting" },
  { key: "PAS", label: "Passing" },
  { key: "DRI", label: "Dribbling" },
  { key: "DEF", label: "Defending" },
  { key: "PHY", label: "Physical" },
  { key: "GK", label: "Goalkeeping" },
];

function ratingColor(ovr: number): string {
  if (ovr >= 88) return "bg-yellow-400 text-black";
  if (ovr >= 82) return "bg-emerald-400 text-black";
  if (ovr >= 76) return "bg-sky-400 text-black";
  return "bg-slate-300 text-black";
}

const LIMIT = 50;

export default function PlayersBrowser({ teams, years }: { teams: string[]; years: number[] }) {
  const [team, setTeam] = useState("");
  const [pos, setPos] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState("overall");
  const [q, setQ] = useState("");

  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (team) params.set("team", team);
      if (pos) params.set("pos", pos);
      if (year) params.set("year", year);
      if (sort) params.set("sort", sort);
      if (q.trim()) params.set("q", q.trim());
      params.set("page", String(pageToLoad));
      params.set("limit", String(LIMIT));
      const res = await fetch(`/api/players?${params.toString()}`);
      const data = await res.json();
      setTotal(data.total);
      setPage(pageToLoad);
      setPlayers((prev) => (replace ? data.players : [...prev, ...data.players]));
      setLoading(false);
    },
    [team, pos, year, sort, q],
  );

  // Refetch from page 0 whenever filters change (debounced for the search box).
  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(null);
      fetchPage(0, true);
    }, 200);
    return () => clearTimeout(t);
  }, [fetchPage]);

  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? "Overall";
  const sortStat = (p: ApiPlayer) => (sort === "overall" ? p.overall : p.stats[sort as keyof Stats]);

  const selectCls =
    "rounded-xl bg-black/30 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-emerald-400/60";

  return (
    <div>
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name…"
          className={`${selectCls} col-span-2 sm:col-span-1`}
        />
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectCls}>
          <option value="">All teams</option>
          {teams.map((c) => (
            <option key={c} value={c}>{countryName(c)}</option>
          ))}
        </select>
        <select value={pos} onChange={(e) => setPos(e.target.value)} className={selectCls}>
          <option value="">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
          <option value="">All World Cups</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>Sort: {s.label}</option>
          ))}
        </select>
      </div>

      <div className="text-sm text-white/45 mb-2">
        {total.toLocaleString()} player{total === 1 ? "" : "s"} · ranked by {sortLabel}
      </div>

      {/* Results */}
      <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
        {players.map((p, i) => {
          const isOpen = open === p.id;
          return (
            <div key={p.id}>
              <button
                onClick={() => setOpen(isOpen ? null : p.id)}
                className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 text-left hover:bg-white/5 transition"
              >
                <span className="w-7 text-center text-sm text-white/35 tabular-nums">{i + 1}</span>
                <span className={`shrink-0 w-10 h-10 rounded-lg grid place-items-center font-black ${ratingColor(p.overall)}`}>
                  {p.overall}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold truncate block">
                    {p.name} {p.legend && <span title="Legend">⭐</span>}
                  </span>
                  <span className="text-xs text-white/45">
                    {countryName(p.team)} {p.year} · {p.positions.join("/")}
                  </span>
                </span>
                {sort !== "overall" && (
                  <span className="shrink-0 rounded-md bg-emerald-400/15 text-emerald-300 px-2 py-1 text-sm font-bold tabular-nums">
                    {sortLabel.slice(0, 3).toUpperCase()} {sortStat(p)}
                  </span>
                )}
                <span className="text-white/30 text-xs w-3">{isOpen ? "▲" : "▾"}</span>
              </button>
              {isOpen && (
                <div className="px-3 sm:px-4 pb-3 max-w-xs">
                  <PlayerCard player={{ ...p, squadId: "", number: 0, eligibleSlots: [] }} />
                </div>
              )}
            </div>
          );
        })}
        {players.length === 0 && !loading && (
          <div className="px-4 py-10 text-center text-white/40">No players match these filters.</div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        {players.length < total && (
          <button
            onClick={() => fetchPage(page + 1, false)}
            disabled={loading}
            className="rounded-xl border border-white/20 px-6 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Loading…" : `Load more (${players.length}/${total})`}
          </button>
        )}
      </div>
    </div>
  );
}
