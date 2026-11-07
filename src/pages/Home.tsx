import { CalendarDays, Radio, Trophy, ChevronRight, Info, AlertCircle } from 'lucide-react';
import type { League, Match } from '@/types';
import { formatKickoff } from '@/data';
import LeagueFilter from '@/components/LeagueFilter';
import MatchCard from '@/components/MatchCard';

interface HomeProps {
  leagues: League[];
  matches: Match[];
  activeLeague: string;
  onLeagueChange: (id: string) => void;
  onSelectMatch: (id: string) => void;
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
}

export default function Home({
  leagues,
  matches,
  activeLeague,
  onLeagueChange,
  onSelectMatch,
  loading,
  loadError,
  onRetry,
}: HomeProps) {
  const filtered = activeLeague === 'all' ? matches : matches.filter((m) => m.leagueId === activeLeague);
  const liveMatches = filtered.filter((m) => m.status === 'live');
  const upcoming = filtered.filter((m) => m.status === 'upcoming');
  const finished = filtered.filter((m) => m.status === 'finished');

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-[60%] -translate-x-1/2 rounded-full bg-pitch-500/10 blur-3xl" />
        </div>
        <div className="container-app relative py-14 sm:py-20">
          <div className="flex items-center gap-2 rounded-full border border-pitch-500/20 bg-pitch-500/5 px-3 py-1.5 w-fit">
            <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
            <span className="text-xs font-medium text-pitch-400">Live scores & fixtures</span>
          </div>
          <h1 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Every match, every score, <span className="text-pitch-400">in real time.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-300 sm:text-lg">
            Live scores, upcoming fixtures and authorized streams from the world&apos;s top leagues.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#matches" className="flex items-center gap-1.5 rounded-xl bg-pitch-500 px-5 py-3 text-sm font-semibold text-ink-950 shadow-neon-sm transition-all hover:shadow-neon">
              <Radio className="h-4 w-4" />
              Watch live
            </a>
            <a href="#fixtures" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-ink-100 transition-colors hover:bg-white/10">
              <CalendarDays className="h-4 w-4" />
              Upcoming fixtures
            </a>
          </div>
        </div>
      </section>

      <div className="container-app space-y-12">
        {/* Error state */}
        {loadError && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4 sm:flex-row sm:items-center">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="flex-1 text-sm text-red-300">
              Could not load matches right now. Check your connection and try again.
            </p>
            <button onClick={onRetry} className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pitch-500/30 border-t-pitch-500" />
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Filters */}
            <section id="matches">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                  <Trophy className="h-5 w-5 text-pitch-400" />
                  Matches
                </h2>
              </div>
              <LeagueFilter leagues={leagues} active={activeLeague} onChange={onLeagueChange} />
            </section>

            {matches.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-sm text-ink-400">
                  No matches have been added yet. Matches you add from the admin dashboard will appear here automatically.
                </p>
              </div>
            )}

            {filtered.length > 0 && (
              <>
                {/* Live */}
                {liveMatches.length > 0 && (
                  <section>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pitch-400">
                      <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
                      Live now
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {liveMatches.map((m) => (
                        <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m.id)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Upcoming */}
                <section id="fixtures">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-300">
                    <CalendarDays className="h-4 w-4 text-pitch-400" />
                    Upcoming fixtures
                  </h3>
                  {upcoming.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {upcoming.map((m) => (
                        <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m.id)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-500">No upcoming fixtures for this league.</p>
                  )}
                </section>

                {/* Finished */}
                {finished.length > 0 && (
                  <section>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-300">
                      Full time
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {finished.map((m) => (
                        <MatchCard key={m.id} match={m} onClick={() => onSelectMatch(m.id)} />
                      ))}
                    </div>
                  </section>
                )}

                <div className="flex justify-center pb-4">
                  <button onClick={() => onLeagueChange('all')} className="flex items-center gap-1 text-sm font-medium text-pitch-400 hover:text-pitch-300">
                    View all matches <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Admin hint */}
        <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-ink-800/40 px-4 py-3 text-sm text-ink-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
          <p>
            Are you the site admin? Go to the <a href="#/admin" className="font-medium text-pitch-400 hover:text-pitch-300">admin dashboard</a> to manage matches.
          </p>
        </div>
      </div>
    </div>
  );
}
