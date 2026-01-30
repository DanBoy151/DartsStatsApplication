import type { GameDataState } from '@/stores/matchDataStore';
export interface Game {
  id: string
  players: string[]
  type: string
  status: string
  result: string
  wonBull: boolean
  order: number
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
    order: g.order ?? 0
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
    order: gameDataState.order ?? 0
  };
  
}
