
import { useEffect, useRef, useState } from 'react';
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
  detailsError?: boolean;
  onBack: () => void;
}

function LiveMatchClock({ match }: { match: Match }) {
  const minute = match.minute;
  const extraTime = match.extraTime ?? 0;

  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef(Date.now());

  // Starta om sekundräkningen när API:t rapporterar
  // en annan matchminut eller tilläggstid.
  useEffect(() => {
    startRef.current = Date.now();
    setNow(Date.now());
  }, [match.id, minute, extraTime]);

  // Ticka lokalt utan att kontakta något API.
  useEffect(() => {
    if (match.status !== 'live') {
      return;
    }

    const updateClock = () => {
      setNow(Date.now());
    };

    const timer = window.setInterval(updateClock, 1000);

    document.addEventListener(
      'visibilitychange',
      updateClock
    );

    return () => {
      window.clearInterval(timer);
      document.removeEventListener(
        'visibilitychange',
        updateClock
      );
    };
  }, [match.status]);

  if (
    match.status !== 'live' ||
    typeof minute !== 'number' ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  // Visa aldrig en obekräftad ny matchminut.
  // Sekunderna är en uppskattning från senaste API-data.
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - startRef.current) / 1000)
  );

  const seconds = Math.min(59, elapsedSeconds);
  const secondsText = String(seconds).padStart(2, '0');

  const minuteText =
    extraTime > 0
      ? `${minute}+${extraTime}`
      : String(minute);

  return (
    <span
      className="tabular-nums"
      title="Estimated seconds since the latest match update. Not an official match clock."
      aria-label={`LIVE-match, minut ${minuteText}, cirka ${seconds} sekunder`}
    >
      {minuteText}:{secondsText}
    </span>
  );
}

function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-pitch-500/15 px-3 py-1 text-xs font-bold text-pitch-400 ring-1 ring-pitch-500/30">
        <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-pitch-400" />
        LIVE{' '}
        {typeof match.minute === 'number' ? (
          <LiveMatchClock match={match} />
        ) : (
          <span>—</span>
        )}
      </div>
    );
  }

  if (match.status === 'finished') {
    return (
      <div className="rounded-full bg-ink-700/60 px-3 py-1 text-xs font-semibold text-ink-300">
        Slut
      </div>
    );
  }

  return (
    <div className="rounded-full bg-ink-700/60 px-3 py-1 text-xs font-semibold text-ink-300">
      Kommande
    </div>
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
      return `Mål – ${e.player}`;
    case 'yellow':
      return `Gult kort – ${e.player}`;
    case 'red':
      return `Rött kort – ${e.player}`;
    case 'sub':
      return `Byte – ${e.player}`;
  }
}

export default function MatchPage({
  match,
  detailsError = false,
  onBack,
}: MatchPageProps) {
  const showScore =
    match.status === 'live' ||
    match.status === 'finished';

  // Filtrera felaktiga minuter och behåll källans ordning vid samma minut.
  const sortedEvents = match.events
    .filter((event) => Number.isFinite(event.minute) && event.minute >= 0)
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.minute - b.event.minute || a.index - b.index);

  const hasStream =
    match.streamAuthorized &&
    Boolean(match.streamUrl);

  const hasEmbed = Boolean(match.embedUrl);
  const isLive = match.status === 'live';
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    // Räkna om direkt när besökaren öppnar en annan match.
    setCurrentTime(Date.now());
    if (!isLive) return;

    const updateTime = () => {
      if (document.visibilityState === 'visible') {
        setCurrentTime(Date.now());
      }
    };
    const timer = window.setInterval(updateTime, 30_000);
    document.addEventListener('visibilitychange', updateTime);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateTime);
    };
  }, [match.id, isLive]);

  const detailsFetchedAt = match.details?.fetchedAt;
  const detailsStale = isLive && detailsFetchedAt != null &&
    currentTime - detailsFetchedAt > 2 * 60 * 1000;

  return (
    <div className="container-app animate-fade-in py-6 sm:py-10">
      <button
        onClick={onBack}
        className="mb-6 flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till matcher
      </button>

      {/* Match header */}
      <div className="card relative overflow-hidden p-4 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-pitch-500/10 blur-3xl" />

        <div className="relative flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <span className="min-w-0 break-words text-xs font-medium uppercase tracking-wider text-ink-400">
              {match.league}
            </span>

            <StatusBadge match={match} />
          </div>

          {detailsError && (
            <p className="mt-2 text-xs font-medium text-amber-400" role="alert">
              Det gick inte att uppdatera matchdetaljerna. Tidigare uppgifter visas om de finns.
            </p>
          )}
          {detailsFetchedAt != null && (
            <p className="mt-2 text-xs text-ink-400" role="status">
              Matchdetaljer senast hämtade: {new Date(detailsFetchedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              {detailsStale && <span className="ml-2 font-semibold text-amber-400">Uppgifterna kan vara inaktuella</span>}
            </p>
          )}
          {isLive && detailsFetchedAt == null && (
            <p className="mt-2 text-xs text-amber-400" role="status">Ingen bekräftad uppdatering av matchdetaljer ännu.</p>
          )}

          {isLive && typeof match.minute === 'number' && (
            <p className="mt-2 text-[10px] text-ink-500">
              Uppskattade sekunder · LIVE-data kan vara fördröjd
            </p>
          )}

          <div className="mt-6 flex w-full min-w-0 items-start justify-center gap-2 sm:gap-10">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <TeamCrest team={match.home} size="lg" />

              <span className="max-w-full break-words text-xs font-semibold leading-snug text-ink-100 sm:text-base">
                {match.home.name}
              </span>
            </div>

            <div className="flex min-w-0 shrink-0 flex-col items-center px-1 sm:px-2">
              {showScore ? (
                <span className="whitespace-nowrap font-display text-2xl font-bold tabular-nums text-white sm:text-5xl">
                  {match.homeScore}
                  <span className="mx-2 text-ink-500">
                    :
                  </span>
                  {match.awayScore}
                </span>
              ) : (
                <span className="whitespace-nowrap font-display text-xl font-bold text-pitch-400 sm:text-3xl">
                  {new Date(match.kickoff).toLocaleTimeString(
                    undefined,
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>
              )}

              <span className="mt-1 text-xs text-ink-500">
                vs
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <TeamCrest team={match.away} size="lg" />

              <span className="max-w-full break-words text-xs font-semibold leading-snug text-ink-100 sm:text-base">
                {match.away.name}
              </span>
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
              title={`${match.home.name} mot ${match.away.name}, livesändning`}
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
                      aria-label={`Öppna officiell livesändning för ${match.home.name} mot ${match.away.name} i en ny flik`}
                      className="group flex h-16 w-16 items-center justify-center rounded-full bg-pitch-500/20 ring-2 ring-pitch-500/40 transition-all hover:bg-pitch-500/30 hover:ring-pitch-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pitch-400"
                    >
                      <Play aria-hidden="true" className="h-7 w-7 fill-pitch-400 text-pitch-400 transition-transform group-hover:scale-110" />
                    </a>

                    <div>
                      <p className="text-lg font-semibold text-white">
                        Se matchen live
                      </p>

                      <p className="mt-1 flex items-center justify-center gap-1 text-sm text-pitch-400">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Öppna den officiella gratissändningen
                      </p>
                    </div>
                  </>
                ) : hasStream &&
                  match.status === 'upcoming' ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-700/60 ring-2 ring-white/10">
                      <Calendar className="h-7 w-7 text-ink-300" />
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-white">
                        Sändning tillgänglig vid avspark
                      </p>

                      <p className="mt-1 text-sm text-ink-400">
                        Matchen börjar{' '}
                        {formatKickoff(match.kickoff)}.
                        Den officiella gratissändningen blir
                        tillgänglig här när matchen är live.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-700/60 ring-2 ring-white/10">
                      <Lock className="h-7 w-7 text-ink-400" />
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-white">
                        Ingen sändning tillgänglig
                      </p>

                      <p className="mt-1 text-sm text-ink-400">
                        {match.status === 'finished'
                          ? 'Matchen är avslutad. Höjdpunkter visas här om de blir tillgängliga.'
                          : 'Ingen officiell gratissändning har lagts till för matchen.'}
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
            Videospelaren är förberedd för godkända livesändningar. GoalZone länkar endast till officiella gratissändningar som lagts till av administratören. Inga obehöriga eller påhittade videolänkar används.
          </p>
        </div>
      </div>

      {/* Laguppställningar hämtas från redan tillgängliga matchdetaljer. */}
      <section className="mt-6 card p-4 sm:p-8" aria-labelledby="lineups-title">
        <h2 id="lineups-title" className="mb-5 font-display text-lg font-bold">Laguppställningar</h2>
        {!match.details?.lineups.home.length && !match.details?.lineups.away.length ? (
          <p className="text-sm text-ink-400" role="status">
            {match.status === 'upcoming'
              ? 'Laguppställningarna visas när de blir tillgängliga inför avspark.'
              : detailsError
                ? 'Laguppställningarna kunde inte uppdateras just nu. Försök igen senare.'
                : 'Inga laguppställningar har rapporterats för den här matchen.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {(['home', 'away'] as const).map((side) => {
              const team = match[side];
              const players = match.details?.lineups[side] ?? [];
              return (
                <div key={side} className="min-w-0">
                  <h3 className="mb-3 break-words text-base font-semibold text-ink-100">{team.name}</h3>
                  {players.length === 0 ? (
                    <p className="text-sm text-ink-400">
                      {detailsError
                        ? 'Laguppställningen kunde inte uppdateras just nu.'
                        : 'Ingen laguppställning har rapporterats för det här laget.'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {([false, true] as const).map((substitute) => {
                        const group = players.filter((player) => player.substitute === substitute);
                        if (group.length === 0) return null;
                        return (
                          <div key={String(substitute)}>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                              {substitute ? 'Avbytare' : 'Startelva'}
                            </h4>
                            <ul className="space-y-1">
                              {group.map((player) => (
                                <li key={player.id} aria-label={`${player.name}${player.number != null ? `, tröjnummer ${player.number}` : ", tröjnummer saknas"}${player.position ? `, position ${player.position}` : ""}`} className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-lg bg-white/5 px-3 py-2 text-sm sm:grid-cols-[1.75rem_minmax(0,1fr)_auto]">
                                  <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-pitch-400">
                                    {player.number ?? '–'}
                                  </span>
                                  <span className="min-w-0 break-words text-ink-100">{player.name}</span>
                                  {player.position && <span className="col-start-2 min-w-0 break-words text-xs text-ink-400 sm:col-start-3 sm:text-right">{player.position}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Matchstatistik från redan hämtade matchdetaljer. */}
      <section className="mt-6 card p-4 sm:p-8" aria-labelledby="statistics-title">
        <h2 id="statistics-title" className="mb-5 font-display text-lg font-bold">Matchstatistik</h2>
        {!match.details?.statistics.some((stat) =>
          Number.isFinite(stat.home) && Number.isFinite(stat.away) &&
          stat.home >= 0 && stat.away >= 0
        ) ? (
          <p className="text-sm text-ink-400" role="status">
            {match.status === 'upcoming'
              ? 'Statistiken visas när den blir tillgänglig efter avspark.'
              : detailsError
                ? 'Statistiken kunde inte uppdateras just nu. Försök igen senare.'
                : 'Ingen matchstatistik har rapporterats för den här matchen.'}
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-400">
              <span className="min-w-0 flex-1 break-words">{match.home.name}</span>
              <span className="min-w-0 flex-1 break-words text-right">{match.away.name}</span>
            </div>
            {match.details.statistics.filter((stat) =>
              Number.isFinite(stat.home) && Number.isFinite(stat.away) &&
              stat.home >= 0 && stat.away >= 0
            ).map((stat, index) => {
              const home = stat.home;
              const away = stat.away;
              const total = home + away;
              const homePercent = total > 0 ? (home / total) * 100 : 0;
              return (
                <div key={`${stat.name}-${index}`} role="group" aria-label={`${stat.name}: ${match.home.name} ${home}, ${match.away.name} ${away}`}>
                  <div className="mb-2 grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 text-sm sm:grid-cols-[4rem_minmax(0,1fr)_4rem]">
                    <span className="min-w-0 break-all text-left font-bold tabular-nums text-ink-100">{stat.home}</span>
                    <span className="min-w-0 break-words text-center text-xs font-medium text-ink-300">{stat.name}</span>
                    <span className="min-w-0 break-all text-right font-bold tabular-nums text-ink-100">{stat.away}</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-ink-700" aria-hidden="true">
                    {total > 0 && (
                      <>
                        <div className="h-full bg-pitch-400" style={{ width: `${homePercent}%` }} />
                        <div className="h-full bg-ink-400" style={{ width: `${100 - homePercent}%` }} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Timeline / events */}
      <div className="mt-6 card p-4 sm:p-8">
        <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-bold">
          <Radio className="h-5 w-5 text-pitch-400" />
          Matchhändelser
        </h2>

        {sortedEvents.length === 0 ? (
          <p className="text-sm text-ink-500" role="status">
            {match.status === 'upcoming'
              ? 'Inga händelser ännu – matchen har inte börjat.'
              : detailsError
                ? 'Matchhändelserna kunde inte uppdateras just nu. Försök igen senare.'
                : 'Inga matchhändelser har rapporterats för den här matchen.'}
          </p>
        ) : (
          <ol className="relative space-y-3" aria-label="Matchhändelser i tidsordning">
            <li aria-hidden="true" className="pointer-events-none absolute left-4 top-2 bottom-2 w-px bg-white/5" />

            {sortedEvents.map(({ event: e, index }) => (
              <li
                key={`${e.minute}-${e.type}-${e.team}-${e.player}-${index}`}
                aria-label={`${e.minute} minuten, ${eventLabel(e)}, ${e.team === 'home' ? match.home.name : match.away.name}`}
                className="relative grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 pl-9 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-x-3 sm:pl-10"
              >
                <div aria-hidden="true" className="absolute left-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900 ring-2 ring-white/10">
                  {eventIcon(e.type)}
                </div>

                <span className="w-10 shrink-0 text-xs font-bold tabular-nums text-ink-400">
                  {e.minute}&apos;
                </span>

                <span className="min-w-0 break-words text-sm text-ink-100">
                  {eventLabel(e)}
                </span>

                <span className="col-start-2 min-w-0 break-words text-xs text-ink-500 sm:col-start-3 sm:text-right">
                  {e.team === 'home'
                    ? match.home.short
                    : match.away.short}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
