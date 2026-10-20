import type { GameDataState } from '@/stores/matchDataStore';
export interface Game {
  id: string
  players: string[]
  type: string
  status: string
  result: string
  wonBull: boolean
  order: number
  legsToPlay: number
  startingScore: number
  maxRounds: number | null
  /** True for a game awarded as a walkover because one side only had 5 available players. */
  forfeited: boolean
  /** League late-night cutover ("HH:mm") snapshotted onto the game; null = no late-night options. */
  lateCutoverTime: string | null
  /** Late-night choice made for this game; null if it started before the cutover. */
  playMode: string | null
}

/** Wire shape returned by the Game endpoints (update-players, start, complete, list). */
export interface RawGameData {
  id?: string
  data?: {
    playerIds?: string[]
    type?: string
    status?: string
    result?: string
    wonBull?: boolean
    order?: number
    legsToPlay?: number
    startingScore?: number
    maxRounds?: number | null
    forfeited?: boolean
    lateCutoverTime?: string | null
    playMode?: string | null
  }
}
export function convertToGameListFromGameDataStateList(gameDataState: GameDataState[] | null): Game[] | null {
  if (!gameDataState) return null;

  return gameDataState.map(g => ({
    id: g.gameId ?? '',
    players: g.players ?? [],
    type: g.type ?? '',
    status: g.status ?? '',
    result: g.result ?? '',
    wonBull: g.wonBull ?? false,
    order: g.order ?? 0,
    legsToPlay: g.legsToPlay ?? 0,
    startingScore: g.startingScore ?? 0,
    maxRounds: g.maxRounds ?? null,
    forfeited: g.forfeited ?? false,
    lateCutoverTime: g.lateCutoverTime ?? null,
    playMode: g.playMode ?? null,
  }));
}

export function convertToGameFromGameDataState(gameDataState: GameDataState | null): Game | null {
  if (!gameDataState) return null;

  return {
    id: gameDataState.gameId ?? '',
    players: gameDataState.players ?? [],
    type: gameDataState.type ?? '',
    status: gameDataState.status ?? '',
    result: gameDataState.result ?? '',
    wonBull: gameDataState.wonBull ?? false,
    order: gameDataState.order ?? 0,
    legsToPlay: gameDataState.legsToPlay ?? 0,
    startingScore: gameDataState.startingScore ?? 0,
    maxRounds: gameDataState.maxRounds ?? null,
    forfeited: gameDataState.forfeited ?? false,
    lateCutoverTime: gameDataState.lateCutoverTime ?? null,
    playMode: gameDataState.playMode ?? null,
  };

}
