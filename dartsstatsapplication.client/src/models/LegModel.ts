export interface Leg {
  gameId: string
  legId: string
  status: string
  score: { playerId: string; score: number }[];
  result: string
  finishDarts: number
  order: number
  remainingScore: number
}


export interface LegResult {
  score: { playerId: string; score: number }[];
  result: string
  finishDarts: number
}
