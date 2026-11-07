
import { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type StandingRow = {
  position: number;
  team: string;
  crest: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalDifference: number;
  points: number;
};

type LeagueTable = {
  leagueId: string;
  leagueName: string;
  standings: StandingRow[];
};

const leagueOptions = [
  { id: 'epl', name: 'Premier League' },
  { id: 'laliga', name: 'La Liga' },
  { id: 'seriea', name: 'Serie A' },
  { id: 'bundesliga', name: 'Bundesliga' },
];

export default function Standings() {
  const [leagues, setLeagues] = useState<LeagueTable[]>([]);
  const [activeLeague, setActiveLeague] = useState('epl');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStandings() {
      setLoading(true);
      setError(false);

      try {
        const { data, error: functionError } =
          await supabase.functions.invoke('football-standings', {
            body: {},
          });

        if (functionError || !data?.success) {
          throw new Error('Could not load standings');
        }

        if (!cancelled) {
          setLeagues(data.leagues || []);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStandings();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const selectedLeague = leagues.find(
    (league) => league.leagueId === activeLeague
  );

  const rows = selectedLeague?.standings || [];

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-pitch-400" />
        <h2 className="font-display text-xl font-bold">
          League Standings
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {leagueOptions.map((league) => (
          <button
            key={league.id}
            onClick={() => setActiveLeague(league.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeLeague === league.id
                ? 'bg-pitch-500 text-ink-950'
                : 'border border-white/10 bg-white/5 text-ink-300 hover:bg-white/10'
            }`}
          >
            {league.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-ink-400">
          Loading standings...
        </p>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="mb-3 text-sm text-ink-400">
            Could not load standings.
          </p>
          <button
            onClick={() => setRefreshKey((key) => key + 1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-pitch-400"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-400">
            No standings available for this league right now.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-ink-400">
                <th className="px-3 py-4">#</th>
                <th className="px-3 py-4">Team</th>
                <th className="px-2 py-4 text-center">P</th>
                <th className="px-2 py-4 text-center">W</th>
                <th className="px-2 py-4 text-center">D</th>
                <th className="px-2 py-4 text-center">L</th>
                <th className="px-2 py-4 text-center">GD</th>
                <th className="px-3 py-4 text-center font-bold text-white">
                  Pts
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${activeLeague}-${row.position}`}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                >
                  <td className="px-3 py-3 font-semibold text-ink-300">
                    {row.position}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {row.crest ? (
                        <img
                          src={row.crest}
                          alt=""
                          className="h-6 w-6 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-white/10" />
                      )}
                      <span className="font-medium">
                        {row.team}
                      </span>
                    </div>
                  </td>

                  <td className="px-2 py-3 text-center">{row.played}</td>
                  <td className="px-2 py-3 text-center">{row.won}</td>
                  <td className="px-2 py-3 text-center">{row.draw}</td>
                  <td className="px-2 py-3 text-center">{row.lost}</td>
                  <td className="px-2 py-3 text-center">
                    {row.goalDifference > 0
                      ? `+${row.goalDifference}`
                      : row.goalDifference}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-pitch-400">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
