export interface PlayerStats {
  playerId: string
  name: string
  matchesPlayed: number
  gamesPlayed: number
  legsPlayed: number
  legsWon: number
  legsLost: number
  winPercentage: number | null
  threeDartAverage: number | null
  firstNineAverage: number | null
  tons: number
  ton40s: number
  maximums: number
  highestCheckout: number | null
  bestLegDarts: number | null
}

/** Wire shape returned by GET /api/Player/stats - already flat (a plain response DTO, not a Marten document), so this matches PlayerStats field-for-field. */
export type RawPlayerStats = PlayerStats

export interface PlayerGameStats {
  id: string
  date: Date
  opponent: string
  result: string
  /** The other players on this player's side - empty for Singles and for per-match (Overall) rows. */
  partners: string[]
  stats: PlayerStats
}

/** Wire shape returned by GET /api/Player/{id}/games. */
export interface RawPlayerGameStats {
  id?: string
  date?: string
  opponent?: string
  result?: string
  partners?: string[]
  stats: RawPlayerStats
}

export function mapRawPlayerGameStats(data: RawPlayerGameStats): PlayerGameStats {
  return {
    id: data.id ?? '',
    date: new Date(data.date ?? ''),
    opponent: data.opponent ?? '',
    result: data.result ?? '',
    partners: data.partners ?? [],
    stats: data.stats,
  }
}
