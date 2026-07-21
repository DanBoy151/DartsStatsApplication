export interface PlayerFormGame {
  gameId: string
  opponent: string
  date: Date
  result: string
  average: number | null
}

export interface PlayerForm {
  recentGames: PlayerFormGame[]
  recentAverage: number | null
  careerAverage: number | null
  trend: 'Increasing' | 'Decreasing' | 'Steady' | 'Unknown'
}

/** Wire shape returned by GET /api/Player/{id}/form - already flat (a plain response DTO, not a Marten document). */
export interface RawPlayerFormGame {
  gameId?: string
  opponent?: string
  date?: string
  result?: string
  average?: number | null
}

export interface RawPlayerForm {
  recentGames?: RawPlayerFormGame[]
  recentAverage?: number | null
  careerAverage?: number | null
  trend?: string
}

export function mapRawPlayerForm(data: RawPlayerForm): PlayerForm {
  const trend = data.trend
  return {
    recentGames: (data.recentGames ?? []).map((g) => ({
      gameId: g.gameId ?? '',
      opponent: g.opponent ?? '',
      date: new Date(g.date ?? ''),
      result: g.result ?? '',
      average: g.average ?? null,
    })),
    recentAverage: data.recentAverage ?? null,
    careerAverage: data.careerAverage ?? null,
    trend: trend === 'Increasing' || trend === 'Decreasing' || trend === 'Steady' ? trend : 'Unknown',
  }
}
