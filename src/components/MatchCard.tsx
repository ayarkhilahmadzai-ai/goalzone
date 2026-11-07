import { Clock, Radio, Lock, Play } from 'lucide-react';
import type { Match } from '@/types';
import { formatKickoff } from '@/data';
import TeamCrest from './TeamCrest';

interface MatchCardProps {
  match: Match;
  onClick: () => void;
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-pitch-500/15 px-2.5 py-1 text-xs font-bold text-pitch-400 ring-1 ring-pitch-500/30">
        <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
        LIVE {match.minute}&apos;
      </div>
    );
  }
  if (match.status === 'finished') {
    return (
      <div className="rounded-full bg-ink-700/60 px-2.5 py-1 text-xs font-semibold text-ink-300">
        Full Time
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-ink-700/60 px-2.5 py-1 text-xs font-semibold text-ink-300">
      <Clock className="h-3 w-3" />
      {formatKickoff(match.kickoff)}
    </div>
  );
}

export default function MatchCard({ match, onClick }: MatchCardProps) {
  const showScore = match.status === 'live' || match.status === 'finished';
  const isLive = match.status === 'live';
  const canWatch = match.streamAuthorized && (match.status === 'live' || match.status === 'upcoming');

  return (
    <button
      onClick={onClick}
      className="group card relative overflow-hidden p-5 text-left transition-all duration-300 hover:border-pitch-500/30 hover:shadow-neon-sm hover:-translate-y-0.5"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-pitch-500/0 blur-3xl transition-all duration-500 group-hover:bg-pitch-500/10" />

      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400">
          {match.league}
        </span>
        <StatusBadge match={match} />
      </div>

      <div className="relative mt-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamCrest team={match.home} />
            <span className="truncate text-sm font-semibold text-ink-100">{match.home.name}</span>
          </div>
          {showScore && (
            <span className={`font-display text-2xl font-bold tabular-nums ${isLive ? 'text-pitch-400' : 'text-ink-100'}`}>
              {match.homeScore}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamCrest team={match.away} />
            <span className="truncate text-sm font-semibold text-ink-100">{match.away.name}</span>
          </div>
          {showScore && (
            <span className={`font-display text-2xl font-bold tabular-nums ${isLive ? 'text-pitch-400' : 'text-ink-100'}`}>
              {match.awayScore}
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="truncate text-xs text-ink-500">{match.venue}</span>
        {canWatch ? (
          <span className="flex items-center gap-1 rounded-full bg-pitch-500/15 px-2.5 py-1 text-xs font-semibold text-pitch-400 ring-1 ring-pitch-500/20">
            <Play className="h-3 w-3 fill-pitch-400" /> Watch Live
          </span>
        ) : match.streamAuthorized ? (
          <span className="flex items-center gap-1 text-xs font-medium text-ink-400">
            <Radio className="h-3 w-3" /> Highlights
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-ink-500">
            <Lock className="h-3 w-3" /> No stream
          </span>
        )}
      </div>
    </button>
  );
}
