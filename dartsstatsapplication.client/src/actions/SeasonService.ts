import type { Season, RawSeason, RawSeasonResponse } from '@/models/SeasonModel'
import { mapRawSeason, mapRawSeasonResponse } from '@/models/SeasonModel'
import { apiGet, apiRequest } from '@/actions/apiClient'
import { skipFor, takeForFetch, splitPage, type Page } from '@/pagination/page'

export interface SeasonInput {
  name: string
  leagueId: string
  teamId: string
}

/** Every Season, unpaginated - for populating a Match form's Season dropdown. */
export async function getSeasons(): Promise<Season[]> {
  try {
    const data = await apiGet<RawSeasonResponse[]>('/api/Season?take=500')
    return data.map(mapRawSeasonResponse)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching seasons')
    return []
  }
}

/** Fetches one (0-based) page of seasons for the season management table. Not cached. */
export async function fetchSeasonsPage(pageIndex: number): Promise<Page<Season>> {
  try {
    const data = await apiGet<RawSeasonResponse[]>(`/api/Season?skip=${skipFor(pageIndex)}&take=${takeForFetch()}`)
    const page = splitPage(data)
    return {
      items: page.items.map(mapRawSeasonResponse),
      hasNextPage: page.hasNextPage,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching seasons')
    return { items: [], hasNextPage: false }
  }
}

export async function createSeason(input: SeasonInput): Promise<Season | null> {
  try {
    const data = await apiRequest<RawSeason>('/api/Season', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return mapRawSeason(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error creating season')
    return null
  }
}

export async function updateSeason(seasonId: string, input: SeasonInput): Promise<Season | null> {
  try {
    const data = await apiRequest<RawSeason>(`/api/Season/${seasonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return mapRawSeason(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating season')
    return null
  }
}

/**
 * Delete a Season. Returns false (and leaves the usual error toast to explain why) if the
 * server rejects it - most commonly because a Match is still linked to it.
 */
export async function deleteSeason(seasonId: string): Promise<boolean> {
  try {
    await apiRequest<void>(`/api/Season/${seasonId}`, { method: 'DELETE' })
    return true
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error deleting season')
    return false
  }
}
