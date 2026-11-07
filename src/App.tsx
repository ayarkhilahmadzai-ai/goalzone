
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { rowToMatch, type MatchRow } from '@/lib/matchMapping';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveTicker from '@/components/LiveTicker';
import Home from '@/pages/Home';
import MatchPage from '@/pages/MatchPage';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import { SAMPLE_LEAGUES } from '@/data';
import type { Match, MatchDetails } from '@/types';

type Route = 'home' | 'admin';

function parseHash(): Route {
  return window.location.hash.replace('#/', '') === 'admin'
    ? 'admin'
    : 'home';
}

async function fetchMatchDetails(
  match: Match
): Promise<MatchDetails | null> {
  const { data, error } = await supabase.functions.invoke(
    'football-details',
    {
      body: {
        homeTeam: match.home.name,
        awayTeam: match.away.name,
        date: match.kickoff.slice(0, 10),
      },
    }
  );

  if (error) {
    console.error('Could not load match details:', error);
    return null;
  }

  if (!data?.success || !data?.found || !data?.details) {
    return null;
  }

  return data.details as MatchDetails;
}

function AppInner() {
  const { session, loading: authLoading } = useAuth();

  const [route, setRoute] = useState<Route>(parseHash());
  const [activeLeague, setActiveLeague] = useState('all');
  const [selectedMatchId, setSelectedMatchId] =
    useState<string | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [detailsLoadingId, setDetailsLoadingId] =
    useState<string | null>(null);

  const [detailsCheckedIds, setDetailsCheckedIds] =
    useState<string[]>([]);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());

    window.addEventListener('hashchange', onHash);

    return () => {
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const [dbResult, footballResult] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .order('kickoff', { ascending: false }),

        supabase.functions.invoke('football-matches', {
          body: {},
        }),
      ]);

      if (dbResult.error) {
        console.error('Database error:', dbResult.error);
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

      const apiRows = footballResult.error
        ? []
        : footballResult.data?.matches ?? [];

      const automaticMatches: Match[] = apiRows.map(
        (m: MatchRow) =>
          rowToMatch({
            ...m,
            id: `api-${m.home_short}-${m.away_short}-${m.kickoff}`,
            created_at: new Date().toISOString(),
          })
      );

      // Show API matches and manually added matches.
      // Avoid duplicates when both sources use the same ID.
      const allMatches = [...automaticMatches];

      for (const manualMatch of manualMatches) {
        if (!allMatches.some((m) => m.id === manualMatch.id)) {
          allMatches.push(manualMatch);
        }
      }

      setMatches(allMatches);

      if (dbResult.error && footballResult.error) {
        setLoadError(true);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const selectedMatch = useMemo(
    () =>
      selectedMatchId
        ? matches.find((m) => m.id === selectedMatchId) ?? null
        : null,
    [matches, selectedMatchId]
  );

  useEffect(() => {
    if (!selectedMatch) return;

    const matchId = selectedMatch.id;

    if (
      selectedMatch.details ||
      detailsCheckedIds.includes(matchId)
    ) {
      return;
    }

    let cancelled = false;

    async function loadDetails() {
      setDetailsLoadingId(matchId);

      try {
        const details = await fetchMatchDetails(selectedMatch!);

        if (cancelled) return;

        if (details) {
          setMatches((previous) =>
            previous.map((match) =>
              match.id === matchId
                ? {
                    ...match,
                    details,
                    events:
                      details.events.length > 0
                        ? details.events
                        : match.events,
                  }
                : match
            )
          );
        }

        setDetailsCheckedIds((previous) =>
          previous.includes(matchId)
            ? previous
            : [...previous, matchId]
        );
      } catch (error) {
        console.error('Error loading details:', error);
      } finally {
        if (!cancelled) {
          setDetailsLoadingId(null);
        }
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedMatchId, selectedMatch?.id]);

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === 'live'),
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
          {detailsLoadingId === selectedMatch.id && (
            <div className="py-3 text-center text-sm text-muted-foreground">
              Loading match details...
            </div>
          )}

          <MatchPage
            match={selectedMatch}
            onBack={() => setSelectedMatchId(null)}
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
          {session ? <AdminDashboard /> : <AdminLogin />}
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
