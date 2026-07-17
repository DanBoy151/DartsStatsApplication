import type { Player, RawPlayer } from '@/models/PlayerModel'
import { useMatchDataStore } from '@/stores/matchDataStore'
import { apiGet, apiRequest } from '@/actions/apiClient'

export async function getPlayers(): Promise<Player[]> {
  const matchDataStore = useMatchDataStore()
  let players: Player[] = []

  //check to see if players are already in local storage
  if (matchDataStore.matchAvailablePlayers.length > 0) {
    players = matchDataStore.matchAvailablePlayers.map((p) => ({
      playerId: p.playerId,
      name: p.name,
    }))
    return players
  }

  //if they aren't in local storage then fetch them from the api
  try {
    const data = await apiGet<RawPlayer[]>('/api/Player')
    players = data.map((p) => ({
      playerId: p.id,
      name: p.data?.name ?? '',
    })) || []

    matchDataStore.setMatchAvailablePlayers(players)

    return players
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching players')
    return []
  }
}

/**
 * Create a new player. Deliberately does not touch matchDataStore.matchAvailablePlayers -
 * the roster cache is scoped to a specific match's screen and gets rebuilt from
 * GET /api/Player next time it's needed, so this stays a plain create-and-report call.
 */
export async function createPlayer(name: string): Promise<Player | null> {
  try {
    const data = await apiRequest<RawPlayer>('/api/Player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })

    return {
      playerId: data.id ?? '',
      name: data.data?.name ?? name,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error creating player')
    return null
  }
}
