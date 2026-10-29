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
import type { Match } from '@/types';

type Route = 'home' | 'admin';

function parseHash(): Route {
  return window.location.hash.replace('#/', '') === 'admin' ? 'admin' : 'home';
}

function AppInner() {
  const { session, loading: authLoading } = useAuth();
  const [route, setRoute] = useState<Route>(parseHash());
  const [activeLeague, setActiveLeague] = useState('all');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff', { ascending: false });
    if (error) {
      setLoadError(true);
    } else if (data) {
      setMatches((data as MatchRow[]).map(rowToMatch));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === 'live'),
    [matches],
  );

  const selectedMatch = selectedMatchId
    ? matches.find((m) => m.id === selectedMatchId) ?? null
    : null;

  const handleNavigate = () => {
    window.location.hash = '#/';
    setSelectedMatchId(null);
  };

  // Match detail view takes priority (overlay-ish)
  if (selectedMatch) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header onNavigate={handleNavigate} liveCount={liveMatches.length} />
        <main className="flex-1">
          <MatchPage match={selectedMatch} onBack={() => setSelectedMatchId(null)} />
        </main>
        <Footer />
      </div>
    );
  }

  // Admin route — gated by auth
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
        <Header onNavigate={handleNavigate} liveCount={liveMatches.length} />
        <main className="flex-1">
          {session ? <AdminDashboard /> : <AdminLogin />}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onNavigate={handleNavigate} liveCount={liveMatches.length} />
      {liveMatches.length > 0 && (
        <LiveTicker matches={liveMatches} onSelect={setSelectedMatchId} />
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
