export interface Leg {
  gameId: string
  legId: string
  status: string
  score: Record<string, number>
  result: string
  finishDarts: number
  order: number
  remainingScore: number
}
