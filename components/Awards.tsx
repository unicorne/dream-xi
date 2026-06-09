"use client";
import type { Awards as AwardsType, PlayerStatLine } from "@/lib/sim/types";

const USER_HINT = "Your XI";

function YouBadge() {
  return (
    <span className="shrink-0 rounded bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
      You
    </span>
  );
}

function StatList({ title, icon, rows, metric }: {
  title: string;
  icon: string;
  rows: PlayerStatLine[];
  metric: (p: PlayerStatLine) => string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
      <div className="font-bold text-sm mb-3 flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <ol className="space-y-1">
        {rows.slice(0, 5).map((p, i) => {
          const you = p.team === USER_HINT;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 ${
                you ? "bg-emerald-400/15 ring-1 ring-emerald-400/35" : ""
              }`}
            >
              <span className="w-5 text-center text-xs font-bold text-white/30">{i + 1}</span>
              <span className={`flex-1 truncate ${you ? "font-bold text-emerald-200" : ""}`}>
                {p.name}
                <span className="text-white/35 text-xs font-normal"> · {p.team}</span>
              </span>
              {you && <YouBadge />}
              <span className="font-mono tabular-nums text-xs font-semibold text-white/70">{metric(p)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function HeroAward({ icon, title, name, team, sub }: {
  icon: string; title: string; name: string; team: string; sub: string;
}) {
  const you = team === USER_HINT;
  return (
    <div className={`relative rounded-2xl border overflow-hidden p-4 ${
      you
        ? "border-emerald-400/50 bg-emerald-950/40"
        : "border-yellow-400/30 bg-yellow-950/20"
    }`}>
      {/* Subtle wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${
        you ? "from-emerald-400/8 to-transparent" : "from-yellow-400/6 to-transparent"
      } pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-widest text-white/45">{icon} {title}</div>
          {you && <YouBadge />}
        </div>
        <div className={`mt-2 font-display text-2xl sm:text-3xl tracking-wide uppercase leading-tight ${
          you ? "text-emerald-300" : "text-yellow-200"
        }`}>{name}</div>
        <div className="mt-0.5 text-xs text-white/45">{team}</div>
        <div className="mt-2 text-sm text-white/65">{sub}</div>
      </div>
    </div>
  );
}

export default function Awards({ awards }: { awards: AwardsType }) {
  const bp = awards.bestPlayer;
  const gk = awards.bestKeeper;
  return (
    <div>
      <h2 className="font-display text-2xl uppercase tracking-wide mb-4">Tournament awards</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {bp && (
          <HeroAward
            icon="🥇"
            title="Best player"
            name={bp.name}
            team={bp.team}
            sub={`${bp.goals} goals · ${bp.assists} assists`}
          />
        )}
        <StatList title="Golden Boot" icon="👟" rows={awards.topScorers} metric={(p) => `${p.goals}g`} />
        <StatList title="Most assists" icon="🅰️" rows={awards.topAssists} metric={(p) => `${p.assists}a`} />
        {gk && (
          <HeroAward
            icon="🧤"
            title="Golden Glove"
            name={gk.name}
            team={gk.team}
            sub={`${gk.cleanSheets} clean sheet${gk.cleanSheets === 1 ? "" : "s"} · ${gk.goalsConceded} conceded`}
          />
        )}
      </div>
    </div>
  );
}
