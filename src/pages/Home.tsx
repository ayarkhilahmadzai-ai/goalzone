
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Heart,
  Home as HomeIcon,
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
  navigationRequest?: { section: 'home' | 'fixtures' | 'live'; serial: number };
  leagues: League[];
  matches: Match[];
  activeLeague: string;
  onLeagueChange: (id: string) => void;
  onSelectMatch: (id: string) => void;
  loading: boolean;
  loadError: boolean;
  lastSuccessfulFetch: number | null;
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
  navigationRequest,
  leagues,
  matches,
  activeLeague,
  onLeagueChange,
  onSelectMatch,
  loading,
  loadError,
  lastSuccessfulFetch,
  onRetry,
}: HomeProps) {
  const [activeSection, setActiveSection] = useState<Section>('home');

  useEffect(() => {
    if (!navigationRequest) return;
    setActiveSection(navigationRequest.section);
    setVisibleMatchCount(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigationRequest]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const staleLiveData = lastSuccessfulFetch !== null &&
    currentTime - lastSuccessfulFetch > 2 * 60 * 1000;
  const [search, setSearch] = useState('');
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [visibleMatchCount, setVisibleMatchCount] = useState(5);
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
    setVisibleMatchCount(5);
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allTeams = Array.from(
    new Set(matches.flatMap((match) => [match.home.name, match.away.name]))
  ).sort((a, b) => a.localeCompare(b));

  const visibleTeams = showAllTeams
    ? allTeams
    : allTeams.filter((team, index) => index < 6 || favorites.includes(team));

  useEffect(() => {
    setVisibleMatchCount(5);
  }, [activeLeague]);

  const leagueMatches = matches.filter(
    (match) => activeLeague === 'all' || match.leagueId === activeLeague
  );
  // Sortera LIVE efter avsparkstid och stabilt ID, inte API-svarets ordning.
  // Ändrade mål, minuter eller status flyttar inte korten inom LIVE-listan.
  const liveMatches = leagueMatches
    .filter((match) => match.status === 'live')
    .sort((a, b) => {
      const aTime = Date.parse(a.kickoff);
      const bTime = Date.parse(b.kickoff);
      const timeDifference =
        (Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER) -
        (Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER);
      return timeDifference || a.id.localeCompare(b.id);
    });
  const upcomingMatches = leagueMatches
    .filter((match) => match.status === 'upcoming' && Number.isFinite(Date.parse(match.kickoff)) && Date.parse(match.kickoff) > currentTime)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  const todayMatches = leagueMatches.filter(m => new Date(m.kickoff).toDateString() === new Date(currentTime).toDateString());
  const mobileMatches = [...liveMatches, ...todayMatches.filter(m => m.status !== 'live')].slice(0, 4);
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
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, visibleMatchCount).map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onClick={() => onSelectMatch(match.id)}
            />
          ))}
        </div>
        {items.length > visibleMatchCount && (
          <button
            type="button"
            onClick={() => setVisibleMatchCount((count) => count + 5)}
            className="mt-5 min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-pitch-400 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400"
          >
            Visa fler matcher ({items.length - visibleMatchCount} kvar)
          </button>
        )}
      </div>
    ) : (
      <div className="card p-8 text-center text-sm text-ink-400">{emptyMessage}</div>
    );

  return (
    <div className="animate-fade-in motion-reduce:animate-none">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-[60%] -translate-x-1/2 rounded-full bg-pitch-500/10 blur-3xl" />
        </div>
        <div className="container-app relative hidden py-7 sm:block sm:py-16">
          <div className="flex w-fit items-center gap-2 rounded-full border border-pitch-500/20 bg-pitch-500/5 px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
            <span className="text-xs font-medium text-pitch-400">Your football world</span>
          </div>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight min-[360px]:text-4xl sm:mt-5 sm:text-6xl">
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
                className="flex min-h-11 items-center gap-2 rounded-xl bg-pitch-500 px-5 py-3 text-sm font-semibold text-ink-950 shadow-neon-sm hover:shadow-neon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-400"
              >
                <Radio className="h-4 w-4" /> Watch live
              </button>
              <button
                type="button"
                onClick={() => openSection('fixtures')}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-ink-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400"
              >
                <CalendarDays className="h-4 w-4" /> Upcoming fixtures
              </button>
            </div>
          )}
        </div>
      </section>

      <main className="container-app space-y-8 pb-28 sm:pb-12">
      {activeSection === 'home' && (
        <section className="space-y-5 pt-5 sm:hidden" aria-label="Mobilöversikt">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-semibold text-pitch-400">DIN FOTBOLLSVÄRLD</p><h1 className="mt-1 text-2xl font-bold">Dagens matcher</h1></div>
            <button type="button" aria-label="Sök lag" onClick={() => openSection('search')} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-pitch-400"><Search className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => openSection('live')} className="min-h-11 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-bold text-red-300">● LIVE {liveMatches.length || ''}</button>
            <button type="button" onClick={() => openSection('fixtures')} className="min-h-11 rounded-xl border border-pitch-500/30 bg-pitch-500/10 text-sm font-bold text-pitch-400">Matcher</button>
            <button type="button" onClick={() => openSection('favorites')} className="min-h-11 rounded-xl border border-white/10 bg-ink-800 text-sm font-bold">Favoriter</button>
          </div>
          {loadError && <p role="alert" className="text-xs text-amber-400">Matchdata kan vara fördröjd.</p>}
          {lastSuccessfulFetch !== null && <p className="text-xs text-ink-400">Senast uppdaterad: {new Date(lastSuccessfulFetch).toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'})}{staleLiveData ? ' · Kan vara inaktuell' : ''}</p>}
          {loading ? <p className="card p-5 text-sm text-ink-400">Hämtar matcher…</p> : (
            <div className="space-y-3">
              {mobileMatches.length ? mobileMatches.map(match => <MatchCard key={match.id} match={match} onClick={() => onSelectMatch(match.id)} />) : <p className="card p-5 text-sm text-ink-400">Inga matcher idag. Se kommande matcher.</p>}
              <button type="button" onClick={() => openSection('fixtures')} className="min-h-11 w-full rounded-xl border border-pitch-500/30 bg-pitch-500/10 text-sm font-bold text-pitch-400">Visa alla matcher →</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {([{id:'standings',label:'Ligatabeller',icon:Trophy},{id:'scorers',label:'Skytteliga',icon:Users},{id:'search',label:'Sök lag',icon:Search},{id:'favorites',label:'Mina favoritlag',icon:Heart}] as const).map(({id,label,icon:Icon}) => (
              <button key={id} type="button" onClick={() => openSection(id)} className="card flex min-h-24 flex-col items-start justify-between p-4 text-left text-sm font-bold"><Icon className="h-6 w-6 text-pitch-400" />{label} <span className="text-pitch-400">›</span></button>
            ))}
          </div>
        </section>
      )}

        {activeSection === 'home' ? (
          <section aria-label="Explore GoalZone" className="hidden sm:block">
            <h2 className="mb-5 font-display text-2xl font-bold">Explore GoalZone</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
              {navigation.map(({ id, title, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openSection(id)}
                  className="card flex min-h-36 min-w-0 flex-col items-start justify-between gap-3 p-3 text-left transition-colors active:border-pitch-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400 min-[360px]:min-h-40 min-[360px]:p-4 hover:border-pitch-500/40 sm:min-h-48 sm:gap-4 sm:p-6"
                >
                  <span className="rounded-xl bg-pitch-500/10 p-2.5 text-pitch-400 sm:p-3">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="w-full">
                    <span className="block break-words text-xs font-bold text-ink-100 min-[360px]:text-sm sm:text-lg">{title}</span>
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
                className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-pitch-400 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400"
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
                    <span className="flex-1 text-sm text-red-300">Could not refresh matches. Showing the last available data when possible.</span>
                    <button type="button" onClick={onRetry} className="min-h-11 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300">Retry</button>
                  </div>
                )}
                {lastSuccessfulFetch !== null && (
                  <p className="mb-3 text-xs text-ink-400" role="status">
                    Senaste lyckade hämtning: {new Date(lastSuccessfulFetch).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    {staleLiveData && (
                      <span className="ml-2 font-semibold text-amber-400">Data kan vara inaktuell</span>
                    )}
                  </p>
                )}
                {loading && (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-pitch-500/30 border-t-pitch-500 motion-reduce:animate-none" />
                  </div>
                )}
                {!loading && (
                  <>
                    <LeagueFilter leagues={leagues} active={activeLeague} onChange={onLeagueChange} />

                    {activeSection === 'live' && (loadError || staleLiveData) && liveMatches.length > 0 && (
                      <div role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                        LIVE-resultaten kan vara fördröjda. Kontrollera senaste hämtningstid innan du litar på ställningen.
                      </div>
                    )}

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
                                    className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400 ${
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
                                  className="mt-4 min-h-11 text-sm font-semibold text-pitch-400 hover:text-pitch-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch-400"
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

      <nav aria-label="Mobilnavigering" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-5">
          {([
            { id: 'home', label: 'Hem', icon: HomeIcon },
            { id: 'fixtures', label: 'Matcher', icon: CalendarDays },
            { id: 'standings', label: 'Tabeller', icon: Trophy },
            { id: 'scorers', label: 'Skytteliga', icon: Users },
            { id: 'favorites', label: 'Favoriter', icon: Heart },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openSection(id)}
              aria-current={activeSection === id ? 'page' : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-pitch-400 ${activeSection === id ? 'bg-pitch-500/10 text-pitch-400' : 'text-ink-400 hover:text-ink-100'}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
