export interface Player {
  playerId: string;
  name: string;
  teamId: string | null;
}

/** Wire shape returned by GET /api/Player. */
export interface RawPlayer {
  id: string
  data?: { name?: string; teamId?: string | null }
}
