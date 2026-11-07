
import { useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Heart,
  Info,
  Radio,
  Search,
  Trophy,
  Users,
  AlertCircle,
} from 'lucide-react';
import type { League, Match } from '@/types';
import LeagueFilter from '@/components/LeagueFilter';
import MatchCard from '@/components/MatchCard';
import Standings from '@/components/Standings';
import TopScorers from '@/components/TopScorers';

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

type Section = 'home' | 'live' | 'fixtures' | 'standings' | 'scorers' | 'favorites' | 'search';

const navigation: {
  id: Exclude<Section, 'home'>;
  title: string;
  description: string;
  icon: typeof Trophy;
}[] = [
  { id: 'live', title: 'Live Matches', description: 'Follow matches live', icon: Radio },
  { id: 'fixtures', title: 'Upcoming Fixtures', description: 'See upcoming games', icon: CalendarDays },
  { id: 'standings', title: 'League Standings', description: 'Explore league tables', icon: Trophy },
  { id: 'scorers', title: 'Top Scorers', description: 'Discover top goalscorers', icon: Users },
  { id: 'favorites', title: 'Favorite Teams', description: 'Save your favorite clubs', icon: Heart },
  { id: 'search', title: 'Search Teams', description: 'Find a team and its matches', icon: Search },
];

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
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [search, setSearch] = useState('');
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('goalzone-favorites') || '[]');
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (team: string) => {
    setFavorites((current) => {
      const updated = current.includes(team)
        ? current.filter((name) => name !== team)
        : [...current, team];
      try {
        localStorage.setItem('goalzone-favorites', JSON.stringify(updated));
      } catch {
        // The selection still works if browser storage is unavailable.
      }
      return updated;
    });
  };

  const openSection = (section: Section) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allTeams = Array.from(
    new Set(matches.flatMap((match) => [match.home.name, match.away.name]))
  ).sort((a, b) => a.localeCompare(b));

  const visibleTeams = showAllTeams
    ? allTeams
    : allTeams.filter((team, index) => index < 6 || favorites.includes(team));

  const leagueMatches = matches.filter(
    (match) => activeLeague === 'all' || match.leagueId === activeLeague
  );
  const liveMatches = leagueMatches.filter((match) => match.status === 'live');
  const upcomingMatches = leagueMatches
    .filter((match) => match.status === 'upcoming')
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  const favoriteMatches = leagueMatches.filter(
    (match) => favorites.includes(match.home.name) || favorites.includes(match.away.name)
  );
  const searchedMatches = leagueMatches.filter((match) => {
    const query = search.trim().toLowerCase();
    return (
      match.home.name.toLowerCase().includes(query) ||
      match.away.name.toLowerCase().includes(query)
    );
  });

  const currentTitle = navigation.find((item) => item.id === activeSection)?.title;
  const showMatchFilters = ['live', 'fixtures', 'favorites', 'search'].includes(activeSection);

  const renderMatches = (items: Match[], emptyMessage: string) =>
    items.length > 0 ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onClick={() => onSelectMatch(match.id)}
          />
        ))}
      </div>
    ) : (
      <div className="card p-8 text-center text-sm text-ink-400">{emptyMessage}</div>
    );

  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-[60%] -translate-x-1/2 rounded-full bg-pitch-500/10 blur-3xl" />
        </div>
        <div className="container-app relative py-10 sm:py-16">
          <div className="flex w-fit items-center gap-2 rounded-full border border-pitch-500/20 bg-pitch-500/5 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
            <span className="text-xs font-medium text-pitch-400">Your football world</span>
          </div>
          <h1 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Welcome to <span className="text-pitch-400">GoalZone.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-300 sm:text-lg">
            Live scores, upcoming fixtures, league tables and your favorite teams — all in one place.
          </p>
          {activeSection === 'home' && (
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openSection('live')}
                className="flex items-center gap-2 rounded-xl bg-pitch-500 px-5 py-3 text-sm font-semibold text-ink-950 shadow-neon-sm hover:shadow-neon"
              >
                <Radio className="h-4 w-4" /> Watch live
              </button>
              <button
                type="button"
                onClick={() => openSection('fixtures')}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-ink-100 hover:bg-white/10"
              >
                <CalendarDays className="h-4 w-4" /> Upcoming fixtures
              </button>
            </div>
          )}
        </div>
      </section>

      <main className="container-app space-y-8 pb-12">
        {activeSection === 'home' ? (
          <section aria-label="Explore GoalZone">
            <h2 className="mb-5 font-display text-2xl font-bold">Explore GoalZone</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
              {navigation.map(({ id, title, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openSection(id)}
                  className="card flex min-h-40 flex-col items-start justify-between gap-4 p-4 text-left hover:border-pitch-500/40 sm:min-h-48 sm:p-6"
                >
                  <span className="rounded-xl bg-pitch-500/10 p-3 text-pitch-400">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="w-full">
                    <span className="block text-sm font-bold text-ink-100 sm:text-lg">{title}</span>
                    <span className="mt-1 block text-xs text-ink-400 sm:text-sm">{description}</span>
                    <span className="mt-3 block text-xs font-semibold text-pitch-400">Open →</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <>
            <div>
              <button
                type="button"
                onClick={() => openSection('home')}
                className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-pitch-400 hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </button>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{currentTitle}</h2>
            </div>

            {activeSection === 'standings' && <Standings />}
            {activeSection === 'scorers' && <TopScorers />}

            {showMatchFilters && (
              <>
                {loadError && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="flex-1 text-sm text-red-300">Could not load matches right now.</span>
                    <button type="button" onClick={onRetry} className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">Retry</button>
                  </div>
                )}
                {loading && (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-pitch-500/30 border-t-pitch-500" />
                  </div>
                )}
                {!loading && !loadError && (
                  <>
                    <LeagueFilter leagues={leagues} active={activeLeague} onChange={onLeagueChange} />

                    {activeSection === 'live' && renderMatches(
                      liveMatches,
                      'No live matches right now. Check back when games kick off.'
                    )}

                    {activeSection === 'fixtures' && renderMatches(
                      upcomingMatches,
                      'No upcoming fixtures available for this league right now.'
                    )}

                    {activeSection === 'favorites' && (
                      <>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                          <h3 className="mb-3 flex items-center gap-2 font-bold">
                            <Heart className="h-5 w-5 text-red-400" /> Choose your favorite teams
                          </h3>
                          <p className="mb-4 text-sm text-ink-400">Tap a heart to save or remove a team.</p>
                          {allTeams.length === 0 ? (
                            <p className="text-sm text-ink-400">Teams will appear when match data is available.</p>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {visibleTeams.map((team) => (
                                  <button
                                    key={team}
                                    type="button"
                                    onClick={() => toggleFavorite(team)}
                                    aria-pressed={favorites.includes(team)}
                                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                      favorites.includes(team)
                                        ? 'border-red-400 bg-red-500/20 text-red-300'
                                        : 'border-white/10 bg-white/5 text-ink-300 hover:border-red-400/50'
                                    }`}
                                  >
                                    {favorites.includes(team) ? '❤️' : '♡'} {team}
                                  </button>
                                ))}
                              </div>
                              {allTeams.length > visibleTeams.length || showAllTeams ? (
                                <button
                                  type="button"
                                  onClick={() => setShowAllTeams((value) => !value)}
                                  className="mt-4 text-sm font-semibold text-pitch-400 hover:text-pitch-300"
                                >
                                  {showAllTeams ? 'Show less ↑' : 'View all teams →'}
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                        <h3 className="text-lg font-bold">Matches with your favorite teams</h3>
                        {renderMatches(
                          favoriteMatches,
                          favorites.length === 0
                            ? 'Choose a favorite team above to see its matches here.'
                            : 'No matches found for your favorite teams in this league.'
                        )}
                      </>
                    )}

                    {activeSection === 'search' && (
                      <>
                        <label htmlFor="goalzone-team-search" className="block text-sm font-semibold text-ink-200">
                          Search for a team
                        </label>
                        <input
                          id="goalzone-team-search"
                          type="search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search Arsenal, Barcelona, Real Madrid..."
                          className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-ink-100 outline-none placeholder:text-ink-500 focus:border-pitch-500 sm:max-w-lg"
                        />
                        {search.trim() ? renderMatches(
                          searchedMatches,
                          'No matches found. Try another team or league.'
                        ) : (
                          <p className="text-sm text-ink-400">Type a team name to find its matches.</p>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-ink-800/40 px-4 py-3 text-sm text-ink-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
          <p>
            Are you the site admin? Go to the{' '}
            <a href="#/admin" className="font-medium text-pitch-400 hover:text-pitch-300">
              admin dashboard
            </a>{' '}
            to manage matches.
          </p>
        </div>
      </main>
    </div>
  );
}
