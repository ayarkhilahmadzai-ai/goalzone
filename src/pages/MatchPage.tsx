import {
  ArrowLeft,
  Radio,
  Lock,
  Play,
  Calendar,
  MapPin,
  Goal,
  Square,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react';
import type { Match, MatchEvent } from '@/types';
import { formatKickoff } from '@/data';
import TeamCrest from '@/components/TeamCrest';

interface MatchPageProps {
  match: Match;
  onBack: () => void;
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-pitch-500/15 px-3 py-1 text-xs font-bold text-pitch-400 ring-1 ring-pitch-500/30">
        <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
        LIVE {match.minute}&apos;
      </div>
    );
  }
  if (match.status === 'finished') {
    return (
      <div className="rounded-full bg-ink-700/60 px-3 py-1 text-xs font-semibold text-ink-300">Full Time</div>
    );
  }
  return (
    <div className="rounded-full bg-ink-700/60 px-3 py-1 text-xs font-semibold text-ink-300">Upcoming</div>
  );
}

function eventIcon(type: MatchEvent['type']) {
  switch (type) {
    case 'goal':
      return <Goal className="h-3.5 w-3.5 text-pitch-400" />;
    case 'yellow':
      return <Square className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />;
    case 'red':
      return <Square className="h-3.5 w-3.5 fill-red-500 text-red-500" />;
    case 'sub':
      return <AlertTriangle className="h-3.5 w-3.5 text-ink-300" />;
  }
}

function eventLabel(e: MatchEvent) {
  switch (e.type) {
    case 'goal':
      return `Goal — ${e.player}`;
    case 'yellow':
      return `Yellow card — ${e.player}`;
    case 'red':
      return `Red card — ${e.player}`;
    case 'sub':
      return `Substitution — ${e.player}`;
  }
}

export default function MatchPage({ match, onBack }: MatchPageProps) {
  const showScore = match.status === 'live' || match.status === 'finished';
  const sortedEvents = [...match.events].sort((a, b) => a.minute - b.minute);
  const hasStream = match.streamAuthorized && Boolean(match.streamUrl);
  const hasEmbed = Boolean(match.embedUrl);
  const isLive = match.status === 'live';

  return (
    <div className="container-app animate-fade-in py-6 sm:py-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-300 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </button>

      {/* Match header */}
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-pitch-500/10 blur-3xl" />
        <div className="relative flex flex-col items-center">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-400">{match.league}</span>
            <StatusBadge match={match} />
          </div>

          <div className="mt-6 flex w-full items-center justify-center gap-4 sm:gap-10">
            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              <TeamCrest team={match.home} size="lg" />
              <span className="text-sm font-semibold text-ink-100 sm:text-base">{match.home.name}</span>
            </div>

            <div className="flex flex-col items-center px-2">
              {showScore ? (
                <span className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
                  {match.homeScore}<span className="mx-2 text-ink-500">:</span>{match.awayScore}
                </span>
              ) : (
                <span className="font-display text-2xl font-bold text-pitch-400 sm:text-3xl">
                  {new Date(match.kickoff).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span className="mt-1 text-xs text-ink-500">vs</span>
            </div>

            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              <TeamCrest team={match.away} size="lg" />
              <span className="text-sm font-semibold text-ink-100 sm:text-base">{match.away.name}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-pitch-400" />
              {formatKickoff(match.kickoff)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-pitch-400" />
              {match.venue || 'Venue TBC'}
            </span>
          </div>
        </div>
      </div>

      {/* Video player area */}
      <div className="mt-6 card overflow-hidden">
        <div className="relative aspect-video w-full bg-ink-950">
          {hasEmbed ? (
            <iframe
              src={match.embedUrl}
              title={`${match.home.name} vs ${match.away.name} live stream`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <>
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 38px, rgba(0,230,77,0.15) 38px, rgba(0,230,77,0.15) 40px)',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                {hasStream && isLive ? (
                  <>
                    <a
                      href={match.streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex h-16 w-16 items-center justify-center rounded-full bg-pitch-500/20 ring-2 ring-pitch-500/40 transition-all hover:bg-pitch-500/30 hover:ring-pitch-500/60"
                    >
                      <Play className="h-7 w-7 fill-pitch-400 text-pitch-400 transition-transform group-hover:scale-110" />
                    </a>
                    <div>
                      <p className="text-lg font-semibold text-white">Watch live now</p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-sm text-pitch-400">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open the official free stream
                      </p>
                    </div>
                  </>
                ) : hasStream && match.status === 'upcoming' ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-700/60 ring-2 ring-white/10">
                      <Calendar className="h-7 w-7 text-ink-300" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">Stream available at kickoff</p>
                      <p className="mt-1 text-sm text-ink-400">
                        This match is scheduled for {formatKickoff(match.kickoff)}. The official free stream
                        will be available here once the match goes live.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-700/60 ring-2 ring-white/10">
                      <Lock className="h-7 w-7 text-ink-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">No stream available</p>
                      <p className="mt-1 text-sm text-ink-400">
                        {match.status === 'finished'
                          ? 'This match has ended. Highlights will appear here when available.'
                          : 'No official free stream has been added for this match.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3 text-xs text-ink-400">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <p>
            The video player is prepared for authorized live streams. GoalZone only links to official free
            streams added by the admin — no unauthorized or invented video links are used.
          </p>
        </div>
      </div>

      {/* Timeline / events */}
      <div className="mt-6 card p-6 sm:p-8">
        <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold">
          <Radio className="h-5 w-5 text-pitch-400" />
          Match timeline
        </h2>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-ink-500">
            {match.status === 'upcoming'
              ? 'No events yet — match hasn’t started.'
              : 'No events recorded for this match.'}
          </p>
        ) : (
          <div className="relative space-y-3">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-white/5" />
            {sortedEvents.map((e, i) => (
              <div key={i} className="relative flex items-center gap-3 pl-10">
                <div className="absolute left-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900 ring-2 ring-white/10">
                  {eventIcon(e.type)}
                </div>
                <span className="w-10 shrink-0 text-xs font-bold tabular-nums text-ink-400">{e.minute}&apos;</span>
                <span className="text-sm text-ink-100">{eventLabel(e)}</span>
                <span className="ml-auto text-xs text-ink-500">{e.team === 'home' ? match.home.short : match.away.short}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
