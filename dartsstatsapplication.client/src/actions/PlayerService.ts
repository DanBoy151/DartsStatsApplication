import type { Player, RawPlayer } from '@/models/PlayerModel'
import type { PlayerStats, RawPlayerStats } from '@/models/PlayerStatsModel'
import type { Season, RawSeasonResponse } from '@/models/SeasonModel'
import { mapRawSeasonResponse } from '@/models/SeasonModel'
import type { PlayerForm, RawPlayerForm } from '@/models/PlayerFormModel'
import { mapRawPlayerForm } from '@/models/PlayerFormModel'
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
      teamId: null,
    }))
    return players
  }

  //if they aren't in local storage then fetch them from the api
  try {
    const data = await apiGet<RawPlayer[]>('/api/Player')
    players = data.map((p) => ({
      playerId: p.id,
      name: p.data?.name ?? '',
      teamId: p.data?.teamId ?? null,
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
export async function createPlayer(name: string, teamId: string | null = null): Promise<Player | null> {
  try {
    const data = await apiRequest<RawPlayer>('/api/Player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, teamId })
    })

    return {
      playerId: data.id ?? '',
      name: data.data?.name ?? name,
      teamId: data.data?.teamId ?? teamId,
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
      items: page.items.map((p) => ({ playerId: p.id ?? '', name: p.data?.name ?? '', teamId: p.data?.teamId ?? null })),
      hasNextPage: page.hasNextPage,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching players')
    return { items: [], hasNextPage: false }
  }
}

export async function updatePlayer(playerId: string, name: string, teamId: string | null = null): Promise<Player | null> {
  try {
    const data = await apiRequest<RawPlayer>(`/api/Player/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, teamId })
    })

    return {
      playerId: data.id ?? playerId,
      name: data.data?.name ?? name,
      teamId: data.data?.teamId ?? teamId,
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

/**
 * One player's aggregated stats, optionally scoped to a single Season and/or
 * a single game type - the Player Statistics screen calls this once per
 * section (Overall/Singles/Doubles/Trebles), each with its own filters.
 */
export async function getPlayerDetailStats(
  playerId: string,
  seasonId?: string,
  gameType?: 'Singles' | 'Doubles' | 'Trebles'
): Promise<PlayerStats | null> {
  try {
    const params = new URLSearchParams()
    if (seasonId) params.set('seasonId', seasonId)
    if (gameType) params.set('gameType', gameType)
    const query = params.toString()
    const data = await apiGet<RawPlayerStats>(`/api/Player/${playerId}/stats${query ? `?${query}` : ''}`)
    return data
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching player detail stats')
    return null
  }
}

/** Every Season this player has actually appeared in, each with its computed status - for the Player Statistics screen's season dropdowns. */
export async function getPlayerSeasons(playerId: string): Promise<Season[]> {
  try {
    const data = await apiGet<RawSeasonResponse[]>(`/api/Player/${playerId}/seasons`)
    return data.map(mapRawSeasonResponse)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching player seasons')
    return []
  }
}

/** A player's last 5 completed Singles games and whether their average is trending up or down. */
export async function getPlayerForm(playerId: string): Promise<PlayerForm | null> {
  try {
    const data = await apiGet<RawPlayerForm>(`/api/Player/${playerId}/form`)
    return mapRawPlayerForm(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching player form')
    return null
  }
}
