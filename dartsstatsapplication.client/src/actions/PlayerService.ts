import type { Player } from '@/models/PlayerModel'
import { useMatchDataStore } from '@/stores/matchDataStore'

interface RawPlayer {
  id: string
  data?: { name?: string }
}

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
    const response = await fetch('http://localhost:5001/api/Player')
    if (!response.ok) throw new Error('Failed to fetch players')
    const data = (await response.json()) as RawPlayer[]
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
