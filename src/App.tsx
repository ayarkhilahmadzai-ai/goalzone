
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

    if (typeof minute !== 'number' || !Number.isFinite(minute) || minute < 0) continue;

    const teamName = event.team?.name ?? '';

    let team: 'home' | 'away';

    // API-namn kan skilja sig från visningsnamn. Använd även kortnamn,
    // men bara när exakt ett av lagen matchar.
    const homeMatches = sameTeam(teamName, match.home.name) ||
      sameTeam(teamName, match.home.short);
    const awayMatches = sameTeam(teamName, match.away.name) ||
      sameTeam(teamName, match.away.short);

    if (homeMatches === awayMatches) {
      // Okänt eller tvetydigt lagnamn: gissa aldrig lag.
      continue;
    }

    team = homeMatches ? 'home' : 'away';

    result.push({
      minute,
      type,
      team,
      player: typeof event.player?.name === 'string' && event.player.name.trim()
        ? event.player.name.trim()
        : 'Okänd spelare',
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
    .filter((entry) => typeof entry.player?.name === 'string' && entry.player.name.trim().length > 0)
    .map((entry, index) => {
      const player = entry.player!;

      return {
        id: String(
          player.id ??
            `${substitute ? 'sub' : 'start'}-${index}`
        ),
        name: player.name!.trim(),
        number: typeof player.number === 'number' && Number.isSafeInteger(player.number) && player.number > 0
          ? player.number
          : undefined,
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

    const homeMatches = sameTeam(teamName, match.home.name) ||
      sameTeam(teamName, match.home.short);
    const awayMatches = sameTeam(teamName, match.away.name) ||
      sameTeam(teamName, match.away.short);

    // Undvik att placera en laguppställning under fel lag.
    if (homeMatches === awayMatches) continue;

    side = homeMatches ? 'home' : 'away';

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
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  // Tillåt vanliga numeriska värden och procentsatser, men inte
  // godtyckliga strängar där Number() kan ge ett oväntat resultat.
  if (!/^\d+(?:\.\d+)?%?$/.test(normalized)) return null;

  const parsed = Number(normalized.replace(/%$/, ''));

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function mapStatistics(
  rawStatistics: ApiFootballStatistic[],
  match: Match
): MatchStatistic[] {
  const matchingSide = (name: string): 'home' | 'away' | null => {
    const homeMatches = sameTeam(name, match.home.name) ||
      sameTeam(name, match.home.short);
    const awayMatches = sameTeam(name, match.away.name) ||
      sameTeam(name, match.away.short);
    if (homeMatches === awayMatches) return null;
    return homeMatches ? 'home' : 'away';
  };

  const home = rawStatistics.find((entry) =>
    matchingSide(entry.team?.name ?? '') === 'home'
  );

  const away = rawStatistics.find((entry) =>
    matchingSide(entry.team?.name ?? '') === 'away'
  );

  if (!home || !away) {
    return [];
  }

  const awayValues = new Map<
    string,
    number
  >();

  for (const statistic of away.statistics ?? []) {
    if (typeof statistic.type !== 'string' || !statistic.type.trim()) continue;

    const value = statisticNumber(statistic.value);

    if (value !== null) {
      awayValues.set(statistic.type.trim().toLocaleLowerCase('en'), value);
    }
  }

  const result: MatchStatistic[] = [];
  const seenStatisticTypes = new Set<string>();

  for (const statistic of home.statistics ?? []) {
    if (typeof statistic.type !== 'string' || !statistic.type.trim()) continue;

    const homeValue = statisticNumber(
      statistic.value
    );

    const statisticKey = statistic.type.trim().toLocaleLowerCase('en');
    if (seenStatisticTypes.has(statisticKey)) continue;

    const awayValue = awayValues.get(statisticKey);

    if (
      homeValue === null ||
      awayValue === undefined
    ) {
      continue;
    }

    seenStatisticTypes.add(statisticKey);
    result.push({
      name: statistic.type.trim(),
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

  const [lastSuccessfulFetch, setLastSuccessfulFetch] =
    useState<number | null>(null);

  const [
    loadError,
    setLoadError,
  ] = useState(false);

  const [
    detailsLoadingId,
    setDetailsLoadingId,
  ] = useState<string | null>(null);

  const [detailsErrorId, setDetailsErrorId] = useState<string | null>(null);

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

      // Vid totalt nätverksfel: behåll senast visade matcher.
      // Inga nya API-anrop görs för denna reservlösning.
      if (dbResult.error && footballResult.error) {
        setLoadError(true);
        return;
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

      // Undvik dubletter mellan manuella och automatiska matcher.
      // Kräv samma liga, lag och nästan samma avsparkstid.
      const normalizeTeam = (name: string) =>
        name.toLowerCase().normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');

      const isSameMatch = (a: Match, b: Match) => {
        if (a.leagueId !== b.leagueId) return false;
        if (a.id === b.id) return true;

        if (
          a.apiFootballFixtureId != null &&
          b.apiFootballFixtureId != null
        ) {
          return a.apiFootballFixtureId === b.apiFootballFixtureId;
        }

        const aTime = Date.parse(a.kickoff);
        const bTime = Date.parse(b.kickoff);
        return (
          Number.isFinite(aTime) &&
          Number.isFinite(bTime) &&
          Math.abs(aTime - bTime) <= 15 * 60 * 1000 &&
          normalizeTeam(a.home.name) === normalizeTeam(b.home.name) &&
          normalizeTeam(a.away.name) === normalizeTeam(b.away.name)
        );
      };

      const allMatches: Match[] = [...automaticMatches];

      for (const manualMatch of manualMatches) {
        const existingIndex = allMatches.findIndex(
          (match) => isSameMatch(match, manualMatch)
        );

        if (existingIndex === -1) {
          allMatches.push(manualMatch);
          continue;
        }

        // API-källan behåller resultat och status.
        // Manuellt angiven arena fyller endast tomt fält.
        const automaticMatch = allMatches[existingIndex];
        allMatches[existingIndex] = {
          ...automaticMatch,
          venue: automaticMatch.venue || manualMatch.venue,
        };
      }

      // Behåll redan hämtade detaljer när samma match uppdateras.
      setMatches((previous) => {
        const oldById = new Map(
          previous.map((match) => [match.id, match])
        );

        // Om bara en källa misslyckas: behåll tidigare matcher som
        // saknas i det partiella svaret tills båda källorna fungerar igen.
        // Undvik att lägga till en gammal dubblett av en uppdaterad match.
        const visibleMatches = [...allMatches];
        if (dbResult.error || footballResult.error) {
          for (const oldMatch of previous) {
            const alreadyPresent = visibleMatches.some((current) =>
              current.id === oldMatch.id ||
              isSameMatch(current, oldMatch) ||
              (current.leagueId === oldMatch.leagueId &&
                normalizeTeam(current.home.name) === normalizeTeam(oldMatch.home.name) &&
                normalizeTeam(current.away.name) === normalizeTeam(oldMatch.away.name))
            );
            if (!alreadyPresent) visibleMatches.push(oldMatch);
          }
        }

        // Behåll samma UI-ID vid mindre ändringar av avsparkstid.
        // Kräver en entydig matchning för att inte blanda ihop matcher.
        const claimedIds = new Set<string>();

        return visibleMatches.map((match) => {
          let old = oldById.get(match.id);

          if (!old) {
            const candidates = previous.filter((candidate) => {
              if (claimedIds.has(candidate.id)) return false;
              if (candidate.leagueId !== match.leagueId) return false;
              if (
                normalizeTeam(candidate.home.name) !== normalizeTeam(match.home.name) ||
                normalizeTeam(candidate.away.name) !== normalizeTeam(match.away.name)
              ) return false;
              if (
                candidate.apiFootballFixtureId != null &&
                match.apiFootballFixtureId != null &&
                candidate.apiFootballFixtureId !== match.apiFootballFixtureId
              ) return false;

              const previousTime = Date.parse(candidate.kickoff);
              const currentTime = Date.parse(match.kickoff);
              return Number.isFinite(previousTime) &&
                Number.isFinite(currentTime) &&
                Math.abs(previousTime - currentTime) <= 24 * 60 * 60 * 1000;
            });

            if (candidates.length === 1) old = candidates[0];
          }

          if (!old || claimedIds.has(old.id)) return match;
          claimedIds.add(old.id);

          const stableMatch = { ...match, id: old.id };
          if (old.apiFootballFixtureId !== match.apiFootballFixtureId) {
            return stableMatch;
          }

          return {
            ...stableMatch,
            details: old.details,
            events: old.events,
          };
        });
      });

      const partialFailure = Boolean(dbResult.error || footballResult.error);
      setLoadError(partialFailure);
      if (!partialFailure) setLastSuccessfulFetch(Date.now());
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
    let retryTimer: number | null = null;
    let retryCount = 0;
    let retryPending = false;
    let lastLiveAttemptAt = 0;

    const matchId = selectedMatchId;
    const fixtureId = selectedFixtureId;
    const isLive =
      selectedMatch?.status === 'live';

    // För icke-LIVE-matcher: ett begränsat återförsök efter fel.
    // LIVE-matcher använder redan sitt minutintervall.
    function scheduleRetry() {
      if (cancelled || isLive || retryTimer !== null || retryCount >= 1) return;
      retryCount += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (document.visibilityState !== 'visible' || inFlight) {
          retryPending = true;
          return;
        }
        void refreshDetails(true);
      }, 30_000);
    }

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

      // Flikbyte och minutintervall kan annars trigga täta LIVE-anrop.
      if (isLive && Date.now() - lastLiveAttemptAt < 30_000) return;

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
      if (isLive) lastLiveAttemptAt = Date.now();

      if (!current.details) {
        setDetailsLoadingId(matchId);
      }

      try {
        const details =
          await fetchMatchDetails(current);

        if (cancelled) return;
        if (!details) {
          setDetailsErrorId(matchId);
          scheduleRetry();
          return;
        }
        const hasDetailData = details.events.length > 0 ||
          details.lineups.home.length > 0 ||
          details.lineups.away.length > 0 ||
          details.statistics.length > 0;

        // En match kan sakna statistik även under LIVE eller efter
        // slutsignal. Ett tomt svar är bara ett uppdateringsfel om
        // vi tidigare har fått riktiga detaljer som nu saknas.
        if (!hasDetailData && current.details?.fetchedAt != null) {
          setDetailsErrorId(matchId);
          scheduleRetry();
          return;
        }
        if (retryTimer !== null) {
          window.clearTimeout(retryTimer);
          retryTimer = null;
        }
        retryCount = 0;
        retryPending = false;
        setDetailsErrorId(null);

        setMatches((previous) =>
          previous.map((match) =>
            match.id === matchId &&
            match.apiFootballFixtureId === fixtureId
              ? (() => {
                  // Ett tillfälligt tomt detaljsvar ska inte radera
                  // redan visade händelser, laguppställningar eller statistik.
                  const previousDetails = match.details;
                  const mergedDetails: MatchDetails = {
                    ...details,
                    fetchedAt: hasDetailData
                      ? Date.now()
                      : previousDetails?.fetchedAt,
                    events: details.events.length > 0
                      ? details.events
                      : previousDetails?.events ?? details.events,
                    lineups: {
                      home: details.lineups.home.length > 0
                        ? details.lineups.home
                        : previousDetails?.lineups.home ?? [],
                      away: details.lineups.away.length > 0
                        ? details.lineups.away
                        : previousDetails?.lineups.away ?? [],
                    },
                    statistics: details.statistics.length > 0
                      ? details.statistics
                      : previousDetails?.statistics ?? [],
                  };
                  return {
                    ...match,
                    details: mergedDetails,
                    events: mergedDetails.events,
                  };
                })()
              : match
          )
        );
      } catch (error) {
        if (!cancelled) {
          setDetailsErrorId(matchId);
          scheduleRetry();
        }
        console.error(
          'Error refreshing match details:',
          error
        );
      } finally {
        inFlight = false;

        if (!cancelled) {
          setDetailsLoadingId(null);
          // Ett återförsök som väntade på ett långsamt anrop
          // ska inte fastna när fliken redan är synlig.
          if (retryPending && document.visibilityState === 'visible') {
            retryPending = false;
            retryTimer = window.setTimeout(() => {
              retryTimer = null;
              void refreshDetails(true);
            }, 1000);
          }
        }
      }
    }

    // Hämta detaljer vid öppning. När matchen avslutas görs en
    // sista uppdatering även om tidigare LIVE-detaljer finns cachade.
    // För övriga matcher återanvänds redan hämtade detaljer.
    void refreshDetails(selectedMatch?.status === 'finished');

    // Fortsätt uppdatera endast LIVE-matcher.
    const timer = isLive
      ? window.setInterval(
          () => void refreshDetails(true),
          60_000
        )
      : null;

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (retryPending) {
        retryPending = false;
        void refreshDetails(true);
      } else if (isLive) {
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
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
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
            detailsError={detailsErrorId === selectedMatch.id}
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
          lastSuccessfulFetch={lastSuccessfulFetch}
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
