import type { League, RawLeague } from '@/models/LeagueModel'
import { mapRawLeague } from '@/models/LeagueModel'
import { apiGet, apiRequest } from '@/actions/apiClient'
import { skipFor, takeForFetch, splitPage, type Page } from '@/pagination/page'

export interface LeagueInput {
  name: string
  numTrebles: number
  numDoubles: number
  numSingles: number
  treblesLegs: number
  doublesLegs: number
  singlesLegs: number
  treblesStartScore: number
  doublesStartScore: number
  singlesStartScore: number
  maxRounds: number | null
}

/** Every League, unpaginated - for populating a Season form's League dropdown. */
export async function getLeagues(): Promise<League[]> {
  try {
    const data = await apiGet<RawLeague[]>('/api/League?take=500')
    return data.map(mapRawLeague)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching leagues')
    return []
  }
}

/** Fetches one (0-based) page of leagues for the league management table. Not cached. */
export async function fetchLeaguesPage(pageIndex: number): Promise<Page<League>> {
  try {
    const data = await apiGet<RawLeague[]>(`/api/League?skip=${skipFor(pageIndex)}&take=${takeForFetch()}`)
    const page = splitPage(data)
    return {
      items: page.items.map(mapRawLeague),
      hasNextPage: page.hasNextPage,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching leagues')
    return { items: [], hasNextPage: false }
  }
}

export async function createLeague(input: LeagueInput): Promise<League | null> {
  try {
    const data = await apiRequest<RawLeague>('/api/League', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return mapRawLeague(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error creating league')
    return null
  }
}

export async function updateLeague(leagueId: string, input: LeagueInput): Promise<League | null> {
  try {
    const data = await apiRequest<RawLeague>(`/api/League/${leagueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return mapRawLeague(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating league')
    return null
  }
}

/**
 * Delete a League. Returns false (and leaves the usual error toast to explain why) if the
 * server rejects it - most commonly because a Season is still linked to it.
 */
export async function deleteLeague(leagueId: string): Promise<boolean> {
  try {
    await apiRequest<void>(`/api/League/${leagueId}`, { method: 'DELETE' })
    return true
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error deleting league')
    return false
  }
}
