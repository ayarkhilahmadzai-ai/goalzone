export type MatchStatus = 'live' | 'upcoming' | 'finished';

export interface Team {
  name: string;
  short: string;
  color: string;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'sub';
  team: 'home' | 'away';
  player: string;
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
}

export interface League {
  id: string;
  name: string;
  short: string;
}
