import { TEAMS, YEARS } from "@/lib/data";
import { countryName } from "@/lib/countries";
import PlayersBrowser from "@/components/PlayersBrowser";

export const runtime = "nodejs";

export default function PlayersPage() {
  // Order team codes by display name for the dropdown.
  const teams = [...TEAMS].sort((a, b) => countryName(a).localeCompare(countryName(b)));
  const years = [...YEARS];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-4xl uppercase tracking-tight">Players</h1>
      <p className="mt-2 text-white/60 mb-6">
        Every player across all World Cups. Filter by team, position or year, and rank by overall
        rating or any single attribute. Tap a player for their card.
      </p>
      <PlayersBrowser teams={teams} years={years} />
    </div>
  );
}
