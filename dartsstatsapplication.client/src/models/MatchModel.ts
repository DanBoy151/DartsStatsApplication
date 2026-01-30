import type { MatchDataState } from '@/stores/matchDataStore';

export interface Match {
  id: string;
  location: string;
  date: Date;
  opponent: string;
  availablePlayers: string[];
  status: string;
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
  };
}
