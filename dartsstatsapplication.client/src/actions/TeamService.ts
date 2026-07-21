import type { Team, RawTeam } from '@/models/TeamModel'
import { mapRawTeam } from '@/models/TeamModel'
import type { Season, RawSeasonResponse } from '@/models/SeasonModel'
import { mapRawSeasonResponse } from '@/models/SeasonModel'
import type { PlayerStats, RawPlayerStats } from '@/models/PlayerStatsModel'
import { apiGet, apiRequest } from '@/actions/apiClient'
import { skipFor, takeForFetch, splitPage, type Page } from '@/pagination/page'

/** Every Team, unpaginated - for populating Player/Season form Team dropdowns. */
export async function getTeams(): Promise<Team[]> {
  try {
    const data = await apiGet<RawTeam[]>('/api/Team?take=500')
    return data.map(mapRawTeam)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching teams')
    return []
  }
}

/** Fetches one (0-based) page of teams for the team management table. Not cached. */
export async function fetchTeamsPage(pageIndex: number): Promise<Page<Team>> {
  try {
    const data = await apiGet<RawTeam[]>(`/api/Team?skip=${skipFor(pageIndex)}&take=${takeForFetch()}`)
    const page = splitPage(data)
    return {
      items: page.items.map(mapRawTeam),
      hasNextPage: page.hasNextPage,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching teams')
    return { items: [], hasNextPage: false }
  }
}

export async function createTeam(name: string): Promise<Team | null> {
  try {
    const data = await apiRequest<RawTeam>('/api/Team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    return mapRawTeam(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error creating team')
    return null
  }
}

export async function updateTeam(teamId: string, name: string): Promise<Team | null> {
  try {
    const data = await apiRequest<RawTeam>(`/api/Team/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    return mapRawTeam(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating team')
    return null
  }
}

/**
 * Delete a Team. Returns false (and leaves the usual error toast to explain why) if the
 * server rejects it - most commonly because a Player or Season is still linked to it.
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    await apiRequest<void>(`/api/Team/${teamId}`, { method: 'DELETE' })
    return true
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error deleting team')
    return false
  }
}

/** Every Season this Team has played, each with its computed status - for the Season filter dropdown. */
export async function getTeamSeasons(teamId: string): Promise<Season[]> {
  try {
    const data = await apiGet<RawSeasonResponse[]>(`/api/Team/${teamId}/seasons`)
    return data.map(mapRawSeasonResponse)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching team seasons')
    return []
  }
}

/** This Team's aggregated player stats - optionally scoped to a single Season and/or a single game type. */
export async function getTeamStats(
  teamId: string,
  seasonId?: string,
  gameType?: 'Singles' | 'Doubles' | 'Trebles'
): Promise<PlayerStats[]> {
  try {
    const params = new URLSearchParams()
    if (seasonId) params.set('seasonId', seasonId)
    if (gameType) params.set('gameType', gameType)
    const query = params.toString()
    const data = await apiGet<RawPlayerStats[]>(`/api/Team/${teamId}/stats${query ? `?${query}` : ''}`)
    return data
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching team stats')
    return []
  }
}
