
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  rowToMatch,
  type MatchRow,
} from '@/lib/matchMapping';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveTicker from '@/components/LiveTicker';

import Home from '@/pages/Home';
import MatchPage from '@/pages/MatchPage';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';

import { SAMPLE_LEAGUES } from '@/data';

import type {
  Match,
  MatchDetails,
  MatchEvent,
  MatchPlayer,
  MatchStatistic,
} from '@/types';

type Route = 'home' | 'admin';

function parseHash(): Route {
  return window.location.hash.replace('#/', '') === 'admin'
    ? 'admin'
    : 'home';
}

type ApiFootballEvent = {
  time?: {
    elapsed?: number | null;
    extra?: number | null;
  };
  team?: {
    id?: number;
    name?: string;
  };
  player?: {
    name?: string;
  };
  type?: string;
  detail?: string;
};

type ApiFootballLineupPlayer = {
  player?: {
    id?: number;
    name?: string;
    number?: number;
    pos?: string;
  };
};

type ApiFootballLineup = {
  team?: {
    name?: string;
    id?: number;
  };
  startXI?: ApiFootballLineupPlayer[];
  substitutes?: ApiFootballLineupPlayer[];
};

type ApiFootballStatistic = {
  team?: {
    name?: string;
    id?: number;
  };
  statistics?: {
    type?: string;
    value?: number | string | null;
  }[];
};

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(fc|cf|afc|sc|club|football)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function sameTeam(a: string, b: string): boolean {
  return normalizeTeamName(a) === normalizeTeamName(b);
}

function getEventType(
  event: ApiFootballEvent
): MatchEvent['type'] | null {
  const type = (event.type ?? '').toLowerCase();
  const detail = (event.detail ?? '').toLowerCase();

  if (type === 'goal') {
    return 'goal';
  }

  if (type === 'subst') {
    return 'sub';
  }

  if (type === 'card') {
    if (detail.includes('red')) {
      return 'red';
    }

    if (detail.includes('yellow')) {
      return 'yellow';
    }
  }

  return null;
}

function mapEvents(
  rawEvents: ApiFootballEvent[],
  match: Match
): MatchEvent[] {
  const result: MatchEvent[] = [];

  for (const event of rawEvents) {
    const type = getEventType(event);

    if (!type) continue;

    const minute = event.time?.elapsed;

    if (typeof minute !== 'number') continue;

    const teamName = event.team?.name ?? '';

    let team: 'home' | 'away';

    if (sameTeam(teamName, match.home.name)) {
      team = 'home';
    } else if (sameTeam(teamName, match.away.name)) {
      team = 'away';
    } else {
      // Do not assign an event to the wrong team.
      continue;
    }

    result.push({
      minute,
      type,
      team,
      player: event.player?.name || 'Unknown player',
    });
  }

  return result.sort(
    (a, b) => a.minute - b.minute
  );
}

function mapPlayers(
  players: ApiFootballLineupPlayer[],
  substitute: boolean
): MatchPlayer[] {
  return players
    .filter((entry) => Boolean(entry.player?.name))
    .map((entry, index) => {
      const player = entry.player!;

      return {
        id: String(
          player.id ??
            `${substitute ? 'sub' : 'start'}-${index}`
        ),
        name: player.name!,
        number: player.number ?? undefined,
        position: player.pos ?? undefined,
        substitute,
      };
    });
}

function mapLineups(
  rawLineups: ApiFootballLineup[],
  match: Match
): MatchDetails['lineups'] {
  const result: MatchDetails['lineups'] = {
    home: [],
    away: [],
  };

  for (const lineup of rawLineups) {
    const teamName = lineup.team?.name ?? '';

    let side: 'home' | 'away';

    if (sameTeam(teamName, match.home.name)) {
      side = 'home';
    } else if (sameTeam(teamName, match.away.name)) {
      side = 'away';
    } else {
      continue;
    }

    result[side] = [
      ...mapPlayers(lineup.startXI ?? [], false),
      ...mapPlayers(lineup.substitutes ?? [], true),
    ];
  }

  return result;
}

function statisticNumber(
  value: number | string | null | undefined
): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(
    value.replace('%', '').trim()
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function mapStatistics(
  rawStatistics: ApiFootballStatistic[],
  match: Match
): MatchStatistic[] {
  const home = rawStatistics.find((entry) =>
    sameTeam(entry.team?.name ?? '', match.home.name)
  );

  const away = rawStatistics.find((entry) =>
    sameTeam(entry.team?.name ?? '', match.away.name)
  );

  if (!home || !away) {
    return [];
  }

  const awayValues = new Map<
    string,
    number
  >();

  for (const statistic of away.statistics ?? []) {
    if (!statistic.type) continue;

    const value = statisticNumber(statistic.value);

    if (value !== null) {
      awayValues.set(statistic.type, value);
    }
  }

  const result: MatchStatistic[] = [];

  for (const statistic of home.statistics ?? []) {
    if (!statistic.type) continue;

    const homeValue = statisticNumber(
      statistic.value
    );

    const awayValue = awayValues.get(
      statistic.type
    );

    if (
      homeValue === null ||
      awayValue === undefined
    ) {
      continue;
    }

    result.push({
      name: statistic.type,
      home: homeValue,
      away: awayValue,
    });
  }

  return result;
}

async function fetchMatchDetails(
  match: Match
): Promise<MatchDetails | null> {
  const fixtureId = match.apiFootballFixtureId;

  if (
    typeof fixtureId !== 'number' ||
    !Number.isSafeInteger(fixtureId) ||
    fixtureId <= 0
  ) {
    return null;
  }

  const { data, error } =
    await supabase.functions.invoke(
      'football-api-details',
      {
        body: { fixtureId },
      }
    );

  if (error) {
    console.error(
      'Could not load API-Football details:',
      error
    );

    return null;
  }

  if (
    !data?.success ||
    !data?.found ||
    !data?.details
  ) {
    return null;
  }

  const raw = data.details;

  return {
    source: 'api-football',
    eventId: String(fixtureId),

    events: mapEvents(
      Array.isArray(raw.events)
        ? raw.events
        : [],
      match
    ),

    lineups: mapLineups(
      Array.isArray(raw.lineups)
        ? raw.lineups
        : [],
      match
    ),

    statistics: mapStatistics(
      Array.isArray(raw.statistics)
        ? raw.statistics
        : [],
      match
    ),
  };
}

function AppInner() {
  const {
    session,
    loading: authLoading,
  } = useAuth();

  const [route, setRoute] =
    useState<Route>(parseHash());

  const [activeLeague, setActiveLeague] =
    useState('all');

  const [
    selectedMatchId,
    setSelectedMatchId,
  ] = useState<string | null>(null);

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState(false);

  const [
    detailsLoadingId,
    setDetailsLoadingId,
  ] = useState<string | null>(null);

  const initialLoadRef = useRef(true);
  const matchesRequestRef = useRef(false);
  const selectedMatchRef = useRef<Match | null>(null);

  useEffect(() => {
    const onHash = () =>
      setRoute(parseHash());

    window.addEventListener(
      'hashchange',
      onHash
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        onHash
      );
    };
  }, []);

  const loadMatches = useCallback(async () => {
    if (matchesRequestRef.current) return;
    matchesRequestRef.current = true;

    if (initialLoadRef.current) {
      setLoading(true);
    }

    try {
      const [
        dbResult,
        footballResult,
      ] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .order('kickoff', {
            ascending: false,
          }),

        supabase.functions.invoke(
          'football-matches',
          {
            body: {},
          }
        ),
      ]);

      if (dbResult.error) {
        console.error(
          'Database error:',
          dbResult.error
        );
      }

      if (footballResult.error) {
        console.error(
          'Football API error:',
          footballResult.error
        );
      }

      const manualMatches = (
        (dbResult.data ?? []) as MatchRow[]
      ).map(rowToMatch);

      const apiRows: MatchRow[] =
        footballResult.error
          ? []
          : footballResult.data?.matches ?? [];

      const automaticMatches: Match[] =
        apiRows.map((m) =>
          rowToMatch({
            ...m,
            id:
              `api-${m.home_short}-` +
              `${m.away_short}-${m.kickoff}`,
            created_at:
              new Date().toISOString(),
          })
        );

      const allMatches = [
        ...automaticMatches,
      ];

      for (const manualMatch of manualMatches) {
        if (
          !allMatches.some(
            (m) =>
              m.id === manualMatch.id
          )
        ) {
          allMatches.push(
            manualMatch
          );
        }
      }

      // Behåll redan hämtade detaljer när samma match uppdateras.
      setMatches((previous) => {
        const oldById = new Map(
          previous.map((match) => [match.id, match])
        );

        return allMatches.map((match) => {
          const old = oldById.get(match.id);

          if (
            !old ||
            old.apiFootballFixtureId !==
              match.apiFootballFixtureId
          ) {
            return match;
          }

          return {
            ...match,
            details: old.details,
            events: old.events,
          };
        });
      });

      setLoadError(false);

      if (
        dbResult.error &&
        footballResult.error
      ) {
        setLoadError(true);
      }
    } catch (error) {
      console.error(
        'Error loading matches:',
        error
      );

      setLoadError(true);
    } finally {
      initialLoadRef.current = false;
      matchesRequestRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();

    // Uppdatera i bakgrunden när fliken är synlig.
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === 'visible'
      ) {
        void loadMatches();
      }
    }, 30_000);

    const onVisibilityChange = () => {
      if (
        document.visibilityState === 'visible'
      ) {
        void loadMatches();
      }
    };

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange
    );

    return () => {
      window.clearInterval(timer);
      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      );
    };
  }, [loadMatches]);

  const selectedMatch = useMemo(
    () =>
      selectedMatchId
        ? matches.find(
            (m) =>
              m.id === selectedMatchId
          ) ?? null
        : null,
    [matches, selectedMatchId]
  );

  const selectedFixtureId =
    selectedMatch?.apiFootballFixtureId;

  // Håll senaste valda matchen tillgänglig.
  selectedMatchRef.current = selectedMatch;

  useEffect(() => {
    if (
      !selectedMatchId ||
      !selectedFixtureId
    ) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const matchId = selectedMatchId;
    const fixtureId = selectedFixtureId;
    const isLive =
      selectedMatch?.status === 'live';

    async function refreshDetails(
      force: boolean
    ) {
      if (
        cancelled ||
        inFlight ||
        document.visibilityState !== 'visible'
      ) {
        return;
      }

      const current = selectedMatchRef.current;

      if (
        !current ||
        current.id !== matchId ||
        current.apiFootballFixtureId !== fixtureId
      ) {
        return;
      }

      if (
        !force &&
        current.details
      ) {
        return;
      }

      inFlight = true;

      if (!current.details) {
        setDetailsLoadingId(matchId);
      }

      try {
        const details =
          await fetchMatchDetails(current);

        if (
          cancelled ||
          !details
        ) {
          return;
        }

        setMatches((previous) =>
          previous.map((match) =>
            match.id === matchId &&
            match.apiFootballFixtureId === fixtureId
              ? {
                  ...match,
                  details,
                  events: details.events,
                }
              : match
          )
        );
      } catch (error) {
        console.error(
          'Error refreshing match details:',
          error
        );
      } finally {
        inFlight = false;

        if (!cancelled) {
          setDetailsLoadingId(null);
        }
      }
    }

    // Hämta detaljer vid första öppningen.
    void refreshDetails(false);

    // Fortsätt uppdatera endast LIVE-matcher.
    const timer = isLive
      ? window.setInterval(
          () => void refreshDetails(true),
          60_000
        )
      : null;

    const onVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        isLive
      ) {
        void refreshDetails(true);
      }
    };

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange
    );

    return () => {
      cancelled = true;

      if (timer !== null) {
        window.clearInterval(timer);
      }

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      );
    };
  }, [
    selectedMatchId,
    selectedFixtureId,
    selectedMatch?.status,
  ]);

  const liveMatches = useMemo(
    () =>
      matches.filter(
        (m) => m.status === 'live'
      ),
    [matches]
  );

  const handleNavigate = () => {
    window.location.hash = '#/';
    setSelectedMatchId(null);
  };

  if (selectedMatch) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header
          onNavigate={handleNavigate}
          liveCount={liveMatches.length}
        />

        <main className="flex-1">
          {detailsLoadingId ===
            selectedMatch.id && (
            <div className="py-3 text-center text-sm text-muted-foreground">
              Loading match details...
            </div>
          )}

          <MatchPage
            match={selectedMatch}
            onBack={() =>
              setSelectedMatchId(null)
            }
          />
        </main>

        <Footer />
      </div>
    );
  }

  if (route === 'admin') {
    if (authLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pitch-500/30 border-t-pitch-500" />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col">
        <Header
          onNavigate={handleNavigate}
          liveCount={liveMatches.length}
        />

        <main className="flex-1">
          {session
            ? <AdminDashboard />
            : <AdminLogin />}
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        onNavigate={handleNavigate}
        liveCount={liveMatches.length}
      />

      {liveMatches.length > 0 && (
        <LiveTicker
          matches={liveMatches}
          onSelect={setSelectedMatchId}
        />
      )}

      <main className="flex-1">
        <Home
          leagues={SAMPLE_LEAGUES}
          matches={matches}
          activeLeague={activeLeague}
          onLeagueChange={setActiveLeague}
          onSelectMatch={setSelectedMatchId}
          loading={loading}
          loadError={loadError}
          onRetry={loadMatches}
        />
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
