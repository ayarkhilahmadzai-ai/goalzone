import { useState } from 'react';
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
  Users,
  BarChart3,
  Clock3,
} from 'lucide-react';

import type { Match, MatchEvent } from '@/types';
import { formatKickoff } from '@/data';
import TeamCrest from '@/components/TeamCrest';

interface MatchPageProps {
  match: Match;
  onBack: () => void;
}

type MatchTab = 'timeline' | 'lineups' | 'stats';

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <div className="flex items-center gap-2 rounded-full bg-pitch-500/15 px-3 py-1 text-xs font-bold text-pitch-400 ring-1 ring-pitch-500/30">
        <span className="h-2 w-2 animate-pulse rounded-full bg-pitch-400" />
        LIVE {match.minute != null ? `${match.minute}'` : ''}
      </div>
    );
  }

  if (match.status === 'finished') {
    return (
      <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-ink-300">
        Full Time
      </div>
    );
  }

  return (
    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-ink-300">
      Upcoming
    </div>
  );
}

function eventIcon(type: MatchEvent['type']) {
  switch (type) {
    case 'goal':
      return <Goal className="h-4 w-4 text-pitch-400" />;
    case 'yellow':
      return <Square className="h-4 w-4 fill-amber-400 text-amber-400" />;
    case 'red':
      return <Square className="h-4 w-4 fill-red-500 text-red-500" />;
    case 'sub':
      return <Users className="h-4 w-4 text-blue-400" />;
    default:
      return <Clock3 className="h-4 w-4 text-ink-400" />;
  }
}

function eventLabel(event: MatchEvent) {
  switch (event.type) {
    case 'goal':
      return `Goal — ${event.player}`;
    case 'yellow':
      return `Yellow card — ${event.player}`;
    case 'red':
      return `Red card — ${event.player}`;
    case 'sub':
      return `Substitution — ${event.player}`;
    default:
      return event.player;
  }
}

export default function MatchPage({
  match,
  onBack,
}: MatchPageProps) {
  const [activeTab, setActiveTab] =
    useState<MatchTab>('timeline');

  const showScore =
    match.status === 'live' ||
    match.status === 'finished';

  const sortedEvents = [...(match.events || [])].sort(
    (a, b) => a.minute - b.minute
  );

  const hasStream =
    match.streamAuthorized && Boolean(match.streamUrl);

  const hasEmbed =
    match.streamAuthorized && Boolean(match.embedUrl);

  const isLive = match.status === 'live';

  const tabs = [
    {
      id: 'timeline' as MatchTab,
      label: 'Timeline',
      icon: Clock3,
    },
    {
      id: 'lineups' as MatchTab,
      label: 'Lineups',
      icon: Users,
    },
    {
      id: 'stats' as MatchTab,
      label: 'Stats',
      icon: BarChart3,
    },
  ];

  return (
    <div className="container-app animate-fade-in py-6 sm:py-10">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-ink-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </button>

      {/* Match header */}
      <div className="card relative overflow-hidden p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-pitch-500/10 blur-3xl" />

        <div className="relative flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              {match.league}
            </span>

            <StatusBadge match={match} />
          </div>

          <div className="mt-7 flex w-full items-center justify-center gap-2 sm:gap-10">
            {/* Home team */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <TeamCrest team={match.home} size="lg" />

              <span className="break-words text-xs font-semibold text-ink-100 sm:text-base">
                {match.home.name}
              </span>
            </div>

            {/* Score */}
            <div className="flex shrink-0 flex-col items-center px-1">
              {showScore ? (
                <span className="font-display text-3xl font-bold tabular-nums text-white sm:text-5xl">
                  {match.homeScore}
                  <span className="mx-2 text-ink-500">:</span>
                  {match.awayScore}
                </span>
              ) : (
                <span className="font-display text-xl font-bold text-pitch-400 sm:text-3xl">
                  {new Date(match.kickoff).toLocaleTimeString(
                    undefined,
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>
              )}

              <span className="mt-2 text-xs text-ink-500">
                VS
              </span>

              {isLive && match.minute != null && (
                <span className="mt-2 text-sm font-bold text-pitch-400">
                  {match.minute}'
                </span>
              )}
            </div>

            {/* Away team */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <TeamCrest team={match.away} size="lg" />

              <span className="break-words text-xs font-semibold text-ink-100 sm:text-base">
                {match.away.name}
              </span>
            </div>
          </div>

          {/* Match information */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-400">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-pitch-400" />
              {formatKickoff(match.kickoff)}
            </span>

            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-pitch-400" />
              {match.venue || 'Venue TBC'}
            </span>
          </div>
        </div>
      </div>

      {/* Match tabs */}
      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={selected}
              className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold transition-colors sm:text-sm ${
                selected
                  ? 'bg-pitch-500 text-ink-950'
                  : 'text-ink-300 hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <section className="card mt-5 p-5 sm:p-8">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold">
            <Radio className="h-5 w-5 text-pitch-400" />
            Match Timeline
          </h2>

          {sortedEvents.length === 0 ? (
            <div className="py-10 text-center">
              <Clock3 className="mx-auto mb-4 h-10 w-10 text-ink-500" />

              <p className="font-semibold text-ink-200">
                {match.status === 'upcoming'
                  ? 'Match has not started yet'
                  : 'No match events available'}
              </p>

              <p className="mt-2 text-sm text-ink-400">
                Events will appear here when they are
                available from the match data.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEvents.map((event, index) => (
                <div
                  key={`${event.minute}-${event.type}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
                >
                  <span className="w-10 shrink-0 text-sm font-bold text-pitch-400">
                    {event.minute}'
                  </span>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-800">
                    {eventIcon(event.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-ink-100">
                      {eventLabel(event)}
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                      {event.team === 'home'
                        ? match.home.name
                        : match.away.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Lineups */}
      {activeTab === 'lineups' && (
        <section className="card mt-5 p-5 sm:p-8">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold">
            <Users className="h-5 w-5 text-pitch-400" />
            Starting Lineups
          </h2>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="mb-3 flex justify-center">
                <TeamCrest team={match.home} size="lg" />
              </div>

              <p className="text-sm font-semibold">
                {match.home.name}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="mb-3 flex justify-center">
                <TeamCrest team={match.away} size="lg" />
              </div>

              <p className="text-sm font-semibold">
                {match.away.name}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-ink-800/40 px-5 py-10 text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-pitch-400" />

            <h3 className="font-semibold text-ink-100">
              Lineups not available yet
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-400">
              Starting XI, formations and substitutes
              will appear here when GoalZone has
              access to verified lineup data.
            </p>
          </div>
        </section>
      )}

      {/* Statistics */}
      {activeTab === 'stats' && (
        <section className="card mt-5 p-5 sm:p-8">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-pitch-400" />
            Match Statistics
          </h2>

          <div className="mb-6 grid grid-cols-3 items-center gap-2 text-center">
            <div>
              <TeamCrest team={match.home} size="md" />
              <p className="mt-2 text-xs font-semibold">
                {match.home.short}
              </p>
            </div>

            <span className="text-xs font-bold uppercase text-ink-400">
              Statistics
            </span>

            <div>
              <TeamCrest team={match.away} size="md" />
              <p className="mt-2 text-xs font-semibold">
                {match.away.short}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-ink-800/40 px-5 py-10 text-center">
            <BarChart3 className="mx-auto mb-4 h-10 w-10 text-pitch-400" />

            <h3 className="font-semibold text-ink-100">
              Detailed statistics not available yet
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-400">
              Ball possession, shots, shots on target,
              corners and fouls will be displayed
              when verified statistics are available.
            </p>
          </div>
        </section>
      )}

      {/* Authorized stream */}
      <section className="card mt-6 overflow-hidden">
        <div className="relative aspect-video w-full bg-ink-950">
          {hasEmbed ? (
            <iframe
              src={match.embedUrl}
              title={`${match.home.name} vs ${match.away.name} stream`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              {hasStream && isLive ? (
                <>
                  <a
                    href={match.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-pitch-500/20 ring-2 ring-pitch-500/40 hover:bg-pitch-500/30"
                    aria-label="Open official live stream"
                  >
                    <Play className="h-7 w-7 fill-pitch-400 text-pitch-400" />
                  </a>

                  <div>
                    <p className="text-lg font-semibold text-white">
                      Watch live now
                    </p>

                    <p className="mt-2 flex items-center justify-center gap-2 text-sm text-pitch-400">
                      <ExternalLink className="h-4 w-4" />
                      Open official free stream
                    </p>
                  </div>
                </>
              ) : hasStream &&
                match.status === 'upcoming' ? (
                <>
                  <Calendar className="h-12 w-12 text-pitch-400" />

                  <p className="text-lg font-semibold text-white">
                    Stream available at kickoff
                  </p>

                  <p className="text-sm text-ink-400">
                    Scheduled for {formatKickoff(match.kickoff)}
                  </p>
                </>
              ) : (
                <>
                  <Lock className="h-12 w-12 text-ink-500" />

                  <p className="text-lg font-semibold text-white">
                    No stream available
                  </p>

                  <p className="max-w-md text-sm text-ink-400">
                    {match.status === 'finished'
                      ? 'This match has ended.'
                      : 'No official free stream has been added for this match.'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 border-t border-white/5 p-4 text-xs text-ink-400">
          <Info className="h-4 w-4 shrink-0" />

          <p>
            GoalZone only displays authorized streams
            added by the admin.
          </p>
        </div>
      </section>

      {/* Information */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-pitch-400" />

        <p className="text-xs leading-relaxed text-ink-400">
          Match details depend on the available data.
          GoalZone does not invent lineups,
          statistics or match events.
        </p>
      </div>
    </div>
  );
}
