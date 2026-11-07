
import type {
  Match,
  MatchEvent,
  MatchStatus,
  Team,
} from '@/types';

export interface MatchRow {
  id: string;
  home_team: string;
  home_short: string;
  home_color: string;
  home_crest?: string | null;
  away_team: string;
  away_short: string;
  away_color: string;
  away_crest?: string | null;
  league: string;
  league_id: string;
  home_score: number;
  away_score: number;
  status: 'upcoming' | 'live' | 'finished';
  minute: number | null;
  kickoff: string;
  venue: string;
  stream_url: string | null;
  embed_url: string | null;
  created_at: string;
}

export function rowToMatch(r: MatchRow): Match {
  return {
    id: r.id,
    league: r.league,
    leagueId: r.league_id,
    home: {
      name: r.home_team,
      short: r.home_short,
      color: r.home_color,
      crestUrl: r.home_crest ?? undefined,
    },
    away: {
      name: r.away_team,
      short: r.away_short,
      color: r.away_color,
      crestUrl: r.away_crest ?? undefined,
    },
    homeScore: r.home_score,
    awayScore: r.away_score,
    status: r.status,
    minute: r.minute ?? undefined,
    kickoff: r.kickoff,
    venue: r.venue,
    events: [],
    streamAuthorized: Boolean(
      r.stream_url && /^https?:\/\//.test(r.stream_url)
    ),
    streamUrl: r.stream_url ?? undefined,
    embedUrl: r.embed_url ?? undefined,
  };
}

export function matchToRow(m: {
  home: Team;
  away: Team;
  league: string;
  leagueId: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  minute?: number;
  kickoff: string;
  venue: string;
  streamUrl?: string;
  embedUrl?: string;
}): Omit<MatchRow, 'id' | 'created_at'> {
  return {
    home_team: m.home.name,
    home_short: m.home.short,
    home_color: m.home.color,
    away_team: m.away.name,
    away_short: m.away.short,
    away_color: m.away.color,
    league: m.league,
    league_id: m.leagueId,
    home_score: m.homeScore,
    away_score: m.awayScore,
    status: m.status,
    minute: m.minute ?? null,
    kickoff: m.kickoff,
    venue: m.venue,
    stream_url: m.streamUrl ?? null,
    embed_url: m.embedUrl ?? null,
  };
}

export type { MatchEvent };
