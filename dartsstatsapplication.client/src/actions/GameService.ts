import { useMatchDataStore } from "@/stores/matchDataStore"
import type { Player } from "@/models/PlayerModel" 

export async function setAvailablePlayers(players: Player[]) {
  const matchDataStore = useMatchDataStore()
  const gameId = matchDataStore.selectedGame?.gameId

  try {
    // Only send non-empty player IDs
    const playerIds = players
      .map(player => player.playerId)
      .filter(playerId => !!playerId)
    const response = await fetch(
      `http://localhost:5001/api/Game/${gameId}/update-players`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPlayers: playerIds })
      }
    )
    if (!response.ok) throw new Error('Failed to update available players')

    const data = await response.json()
    matchDataStore.setGameData(
      data.id ?? '',
      data.data?.playerIds ?? [],
      data.data?.type ?? '',
      data.data?.status ?? '',
      data.data?.result ?? '',
      data.data?.wonBull ?? false,
      data.data.order ?? 0)

  } catch (err: any) {
    console.error(err.message || 'Error updating players')
  }

}
