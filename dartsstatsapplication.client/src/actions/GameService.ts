import { useMatchDataStore } from "@/stores/matchDataStore"
import type { Player } from "@/models/PlayerModel"
import type { Leg, RawLeg } from "@/models/LegModel"
import type { RawGameData } from "@/models/GameModel"
import { apiGet, apiRequest } from "@/actions/apiClient"

export async function setAvailablePlayers(players: Player[]) {
  const matchDataStore = useMatchDataStore()
  const gameId = matchDataStore.selectedGame?.gameId

  try {
    // Only send non-empty player IDs
    const playerIds = players
      .map(player => player.playerId)
      .filter(playerId => !!playerId)
    const data = await apiRequest<RawGameData>(
      `/api/Game/${gameId}/update-players`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPlayers: playerIds })
      }
    )
    matchDataStore.setGameData(
      data.id ?? '',
      data.data?.playerIds ?? [],
      data.data?.type ?? '',
      data.data?.status ?? '',
      data.data?.result ?? '',
      data.data?.wonBull ?? false,
      data.data?.order ?? 0,
      data.data?.legsToPlay ?? 0,
      data.data?.startingScore ?? 0,
      data.data?.maxRounds ?? null)

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating players')
  }

}

export async function startGame(wonBull: boolean) {
  const matchDataStore = useMatchDataStore()
  const gameId = matchDataStore.selectedGame?.gameId

  try {
    const data = await apiRequest<RawGameData>(`/api/Game/${gameId}/start?wonBull=${wonBull}`, { method: 'PUT' })
    matchDataStore.setGameData(
      data.id ?? '',
      data.data?.playerIds ?? [],
      data.data?.type ?? '',
      data.data?.status ?? '',
      data.data?.result ?? '',
      data.data?.wonBull ?? false,
      data.data?.order ?? 0,
      data.data?.legsToPlay ?? 0,
      data.data?.startingScore ?? 0,
      data.data?.maxRounds ?? null)

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error calling start API')
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
    const data = await apiGet<RawLeg[]>(`/api/Game/${gameId}/legs`)

    const legs: Leg[] = data.map((g) => ({
      legId: g.id,
      gameId: g.data?.gameID || '',
      status: g.data?.status || 'Unknown',
      score: g.data?.score ?? [],
      result: g.data?.result || 'N/A',
      finishDarts: g.data?.finishDarts || 0,
      order: g.data?.order || 0,
      remainingScore: g.data?.remainingScore || 0,
      wonByBullOff: g.data?.wonByBullOff ?? false,
    })) || []

    legs.forEach(leg => {
      matchDataStore.setLegData(
        leg.gameId,
        leg.legId,
        leg.status,
        leg.score,
        leg.result,
        leg.finishDarts,
        leg.order,
        leg.remainingScore,
        leg.wonByBullOff
      );
    });

  }
  catch (err) {
    console.error(err instanceof Error ? err.message : 'Error calling start API')
  }
}

/**
 * Creates the next leg for the selected game, on demand - legs are no longer
 * all pre-created when the game starts (see GameService.CreateNextLeg
 * server-side), so a game decided early (e.g. 2-0 in a best-of-3) never
 * leaves an unused Leg document behind for the leg(s) never played. Called
 * by MatchCenter.vue's startNextLeg() once it determines (via
 * gameProgress.ts's isGameDecided) that another leg is actually needed.
 */
export async function createNextLeg(): Promise<Leg | null> {
  const matchDataStore = useMatchDataStore()
  const gameId = matchDataStore.selectedGame?.gameId
  if (!gameId) return null

  try {
    const data = await apiRequest<RawLeg>(`/api/Game/${gameId}/legs`, { method: 'POST' })

    const leg: Leg = {
      legId: data.id,
      gameId: data.data?.gameID || '',
      status: data.data?.status || 'Unknown',
      score: data.data?.score ?? [],
      result: data.data?.result || 'N/A',
      finishDarts: data.data?.finishDarts || 0,
      order: data.data?.order || 0,
      remainingScore: data.data?.remainingScore || 0,
      wonByBullOff: data.data?.wonByBullOff ?? false,
    }

    matchDataStore.setLegData(
      leg.gameId,
      leg.legId,
      leg.status,
      leg.score,
      leg.result,
      leg.finishDarts,
      leg.order,
      leg.remainingScore,
      leg.wonByBullOff
    )

    return leg
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error creating next leg')
    return null
  }
}

export async function completeGame(result: string) {
  const matchDataStore = useMatchDataStore()
  const gameId = matchDataStore.selectedGame?.gameId

  //Check if a selected game has been set and if so return
  if (!matchDataStore.selectedGame && !gameId) return;

  try {
    const data = await apiRequest<RawGameData>(
      `/api/Game/${gameId}/complete`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: result })
      }
    )
    matchDataStore.setGameData(
      data.id ?? '',
      data.data?.playerIds ?? [],
      data.data?.type ?? '',
      data.data?.status ?? '',
      data.data?.result ?? '',
      data.data?.wonBull ?? false,
      data.data?.order ?? 0,
      data.data?.legsToPlay ?? 0,
      data.data?.startingScore ?? 0,
      data.data?.maxRounds ?? null)

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating Game Record')
  }
}
