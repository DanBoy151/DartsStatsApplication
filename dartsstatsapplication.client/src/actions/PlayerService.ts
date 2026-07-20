import type { Player, RawPlayer } from '@/models/PlayerModel'
import type { PlayerStats, RawPlayerStats } from '@/models/PlayerStatsModel'
import { useMatchDataStore } from '@/stores/matchDataStore'
import { apiGet, apiRequest } from '@/actions/apiClient'
import { skipFor, takeForFetch, splitPage, type Page } from '@/pagination/page'

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

/** Fetches one (0-based) page of players for the player management table. Not cached. */
export async function fetchPlayersPage(pageIndex: number): Promise<Page<Player>> {
  try {
    const data = await apiGet<RawPlayer[]>(`/api/Player?skip=${skipFor(pageIndex)}&take=${takeForFetch()}`)
    const page = splitPage(data)
    return {
      items: page.items.map((p) => ({ playerId: p.id ?? '', name: p.data?.name ?? '' })),
      hasNextPage: page.hasNextPage,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching players')
    return { items: [], hasNextPage: false }
  }
}

export async function updatePlayer(playerId: string, name: string): Promise<Player | null> {
  try {
    const data = await apiRequest<RawPlayer>(`/api/Player/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })

    return {
      playerId: data.id ?? playerId,
      name: data.data?.name ?? name,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating player')
    return null
  }
}

/**
 * Delete a player. Returns false (and leaves the usual error toast to explain why) if the
 * server rejects it - most commonly because the player is already part of a Match roster
 * or Game.
 */
export async function deletePlayer(playerId: string): Promise<boolean> {
  try {
    await apiRequest<void>(`/api/Player/${playerId}`, { method: 'DELETE' })
    return true
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error deleting player')
    return false
  }
}

/** Every player's aggregated career stats, ranked by 3-dart average (server-side sort). */
export async function getPlayerStats(): Promise<PlayerStats[]> {
  try {
    const data = await apiGet<RawPlayerStats[]>('/api/Player/stats')
    return data
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching player stats')
    return []
  }
}
