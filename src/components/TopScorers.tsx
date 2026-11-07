
import { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Scorer = {
  position: number;
  player: string;
  team: string;
  crest: string | null;
  goals: number;
  assists: number;
  penalties: number;
  playedMatches: number;
};

type ScorerLeague = {
  leagueId: string;
  leagueName: string;
  scorers: Scorer[];
};

const leagueOptions = [
  { id: 'epl', name: 'Premier League' },
  { id: 'laliga', name: 'La Liga' },
  { id: 'seriea', name: 'Serie A' },
  { id: 'bundesliga', name: 'Bundesliga' },
];

export default function TopScorers() {
  const [leagues, setLeagues] = useState<ScorerLeague[]>([]);
  const [activeLeague, setActiveLeague] = useState('epl');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadScorers() {
      setLoading(true);
      setError(false);

      try {
        const { data, error: functionError } =
          await supabase.functions.invoke('football-scorers', {
            body: {},
          });

        if (functionError || !data?.success) {
          throw new Error('Could not load scorers');
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

    loadScorers();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const selectedLeague = leagues.find(
    (league) => league.leagueId === activeLeague
  );

  const scorers = selectedLeague?.scorers || [];

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-pitch-400" />
        <h2 className="font-display text-xl font-bold">
          Top Scorers
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
          Loading top scorers...
        </p>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="mb-3 text-sm text-ink-400">
            Could not load top scorers.
          </p>
          <button
            onClick={() => setRefreshKey((key) => key + 1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-pitch-400"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : scorers.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-400">
            No top scorers available for this league right now.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-ink-400">
                <th className="px-3 py-4">#</th>
                <th className="px-3 py-4">Player</th>
                <th className="px-3 py-4 text-center">Apps</th>
                <th className="px-3 py-4 text-center">Assists</th>
                <th className="px-3 py-4 text-center font-bold text-white">
                  Goals
                </th>
              </tr>
            </thead>

            <tbody>
              {scorers.map((scorer) => (
                <tr
                  key={`${activeLeague}-${scorer.position}-${scorer.player}`}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                >
                  <td className="px-3 py-3 font-semibold text-ink-300">
                    {scorer.position}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {scorer.crest ? (
                        <img
                          src={scorer.crest}
                          alt=""
                          className="h-7 w-7 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-white/10" />
                      )}

                      <div>
                        <p className="font-semibold">
                          {scorer.player}
                        </p>
                        <p className="text-xs text-ink-400">
                          {scorer.team}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center">
                    {scorer.playedMatches}
                  </td>

                  <td className="px-3 py-3 text-center">
                    {scorer.assists}
                  </td>

                  <td className="px-3 py-3 text-center font-bold text-pitch-400">
                    {scorer.goals}
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
