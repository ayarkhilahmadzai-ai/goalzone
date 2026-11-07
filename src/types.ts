export type MatchStatus = 'live' | 'upcoming' | 'finished';

export interface Team {
  name: string;
  short: string;
  color: string;
  crestUrl?: string;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'sub';
  team: 'home' | 'away';
  player: string;
}

export interface MatchPlayer {
  id: string;
  name: string;
  number?: number;
  position?: string;
  imageUrl?: string;
  substitute: boolean;
}

export interface MatchStatistic {
  name: string;
  home: number;
  away: number;
}

export interface MatchDetails {
  source: 'thesportsdb';
  eventId: string;
  lineups: {
    home: MatchPlayer[];
    away: MatchPlayer[];
  };
  statistics: MatchStatistic[];
  events: MatchEvent[];
}

export interface Match {
  id: string;
  league: string;
  leagueId: string;
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  minute?: number;
  kickoff: string;
  venue: string;
  events: MatchEvent[];
  streamAuthorized: boolean;
  streamUrl?: string;
  embedUrl?: string;

  // Extra information when available
  details?: MatchDetails;
}

export interface League {
  id: string;
  name: string;
  short: string;
}
