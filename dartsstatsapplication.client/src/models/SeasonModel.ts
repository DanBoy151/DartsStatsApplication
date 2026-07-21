export interface Season {
  id: string
  name: string
  leagueId: string
  teamId: string
  /** Computed server-side (SeasonStatusCalculator), never stored - Active until every linked Match is Completed. */
  status: 'Active' | 'Closed'
}

/** Wire shape returned by GET (list/single) - includes the computed status. */
export interface RawSeasonResponse {
  id?: string
  data?: {
    name?: string
    leagueId?: string
    teamId?: string
  }
  status?: 'Active' | 'Closed'
}

/** Wire shape returned by POST/PUT - the raw stored Season document, no status. */
export interface RawSeason {
  id?: string
  data?: {
    name?: string
    leagueId?: string
    teamId?: string
  }
}

export function mapRawSeasonResponse(data: RawSeasonResponse): Season {
  return {
    id: data.id ?? '',
    name: data.data?.name ?? '',
    leagueId: data.data?.leagueId ?? '',
    teamId: data.data?.teamId ?? '',
    status: data.status ?? 'Active',
  }
}

export function mapRawSeason(data: RawSeason): Season {
  return {
    id: data.id ?? '',
    name: data.data?.name ?? '',
    leagueId: data.data?.leagueId ?? '',
    teamId: data.data?.teamId ?? '',
    status: 'Active',
  }
}
