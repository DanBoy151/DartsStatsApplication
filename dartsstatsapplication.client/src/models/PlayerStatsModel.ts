export interface PlayerStats {
  playerId: string
  name: string
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
