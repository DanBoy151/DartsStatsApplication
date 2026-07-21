export interface Leg {
  gameId: string
  legId: string
  status: string
  score: { playerId: string; score: number }[];
  result: string
  finishDarts: number
  order: number
  remainingScore: number
  wonByBullOff: boolean
}


export interface LegResult {
  score: { playerId: string; score: number }[];
  result: string
  finishDarts: number
  remainingScore: number
}

/** Body for PUT /api/Leg/{id}/complete-bull-off - no finishDarts, since there was no checkout. */
export interface LegBullOffResult {
  score: { playerId: string; score: number }[];
  result: string
  remainingScore: number
}

/**
 * Wire shape returned by the Leg/Game leg endpoints. Note the field is
 * `gameID` (capital ID) matching the server's LegData.gameID, and `score` is
 * a List<PlayerScore> (an array), not a keyed object.
 */
export interface RawLeg {
  id: string
  data?: {
    gameID?: string
    status?: string
    score?: { playerId: string; score: number }[]
    result?: string
    finishDarts?: number
    order?: number
    remainingScore?: number
    wonByBullOff?: boolean
  }
}
