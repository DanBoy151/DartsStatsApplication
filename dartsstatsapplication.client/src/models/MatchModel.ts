import type { MatchDataState } from '@/stores/matchDataStore';

export interface Match {
  id: string;
  location: string;
  date: Date;
  opponent: string;
  availablePlayers: string[];
  status: string;
  gamesFor: number,
  gamesAgainst: number
  seasonId: string | null;
  startTime: Date | null;
  finishTime: Date | null;
}

/** Wire shape returned by the Match endpoints (next, start, update-match-score). */
export interface RawMatchData {
  id?: string
  data?: {
    opponent?: string
    location?: string
    date?: string
    availablePlayers?: string[]
    status?: string
    gamesFor?: number
    gamesAgainst?: number
    seasonId?: string | null
    startTime?: string | null
    finishTime?: string | null
  }
}

export function convertToMatchFromMatchDataState(matchDataState: MatchDataState | null): Match | null {
  if (!matchDataState) return null;

  return {
    id: matchDataState.matchId ?? '',
    location: matchDataState.location,
    date: new Date(matchDataState.date),
    opponent: matchDataState.opposition,
    availablePlayers: matchDataState.availablePlayers,
    status: matchDataState.status ?? '',
    gamesFor: matchDataState.gamesFor ?? 0,
    gamesAgainst: matchDataState.gamesAgainst ?? 0,
    // Not tracked in the live-match store - only relevant to the Manage
    // Matches table and season stats, not active gameplay.
    seasonId: null,
    startTime: null,
    finishTime: null,
  };
}
