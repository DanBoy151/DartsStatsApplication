import { useMatchDataStore } from "@/stores/matchDataStore"
import type { Player } from "@/models/PlayerModel"
import type { Leg } from "@/models/LegModel"

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

export async function startGame(wonBull: boolean) {
  const matchDataStore = useMatchDataStore()
  const gameId = matchDataStore.selectedGame?.gameId

  try {
    const response = await fetch(`http://localhost:5001/api/Game/${gameId}/start?wonBull=${wonBull}`, { method: 'PUT' })
    if (!response.ok)  throw new Error('Failed to start game:')
 
    const data = await response.json()
    matchDataStore.setGameData(
      data.id ?? '',
      data.data?.playerIds ?? [],
      data.data?.type ?? '',
      data.data?.status ?? '',
      data.data?.result ?? '',
      data.data?.wonBull ?? false,
      data.data.order ?? 0)

  } catch (err) {
    console.error('Error calling start API:', err)
  }

}

export async function fetchLegs() {
  const matchDataStore = useMatchDataStore()
  const selectedGame = matchDataStore.getSelectedGame()

  const gameId = selectedGame?.gameId

  //attempt to fetch legs
  if ((selectedGame?.legs?.length ?? 0) > 0) return;

  //if no legs found then make call to fetch legs
  try {
    const response = await fetch(`http://localhost:5001/api/Game/${gameId}/legs`)
    if (!response.ok) throw new Error('Failed to fetch legs')
    const data = await response.json()

    const legs: Leg[] = data.map((g: any) => ({
      legId: g.id,
      gameId: g.data?.gameID || '',
      status: g.data?.status || 'Unknown',
      score: g.data?.score || {},
      result: g.data?.result || 'N/A',
      finishDarts: g.data?.finishDarts || 0,
      order: g.data?.order || 0,
      remainingScore: g.data?.remainingScore || 0,
    })) || []

    legs.forEach(leg => {
      // Convert score object to array
      const scoreArray = Object.entries(leg.score || {}).map(([playerId, score]) => ({
        playerId,
        score: Number(score)
      }));

      matchDataStore.setLegData(
        leg.gameId,
        leg.legId,
        leg.status,
        scoreArray,
        leg.result,
        leg.finishDarts,
        leg.order,
        leg.remainingScore
      );
    });

  }
  catch (err) {
    console.error('Error calling start API:', err)
  }
}

export async function completeGame() {
  const matchDataStore = useMatchDataStore()
  const gameId = matchDataStore.selectedGame?.gameId

  //Check if a selected game has been set and if so return
  if (!matchDataStore.selectedGame && !gameId) return;

  try {
    const response = await fetch(
      `http://localhost:5001/api/Game/${gameId}/complete`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: matchDataStore.selectedGame?.result })
      }
    )
    if (!response.ok) throw new Error('Unable to complete Game')

  } catch (err: any) {
    console.error(err.message || 'Error updating Game Record')
  }
}
