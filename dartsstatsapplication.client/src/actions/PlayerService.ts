import type { Player, RawPlayer } from '@/models/PlayerModel'
import { useMatchDataStore } from '@/stores/matchDataStore'
import { apiGet } from '@/actions/apiClient'

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
