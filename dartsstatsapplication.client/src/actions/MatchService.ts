import type { Match, RawMatchData } from "@/models/MatchModel"
import { useMatchDataStore } from "@/stores/matchDataStore"
import type { Game, RawGameData } from "@/models/GameModel"
import { convertToGameListFromGameDataStateList } from "@/models/GameModel"
import { apiGet, apiRequest, ApiError } from "@/actions/apiClient"
import { skipFor, takeForFetch, splitPage, type Page } from "@/pagination/page"

function mapRawMatch(data: RawMatchData): Match {
  return {
    id: data.id ?? '',
    opponent: data.data?.opponent ?? 'Unknown',
    location: data.data?.location ?? '',
    date: new Date(data.data?.date ?? ''),
    availablePlayers: Array.isArray(data.data?.availablePlayers)
      ? data.data.availablePlayers
      : [],
    status: data.data?.status ?? '',
    gamesFor: data.data?.gamesFor ?? 0,
    gamesAgainst: data.data?.gamesAgainst ?? 0,
    seasonId: data.data?.seasonId ?? null,
    startTime: data.data?.startTime ? new Date(data.data.startTime) : null,
    finishTime: data.data?.finishTime ? new Date(data.data.finishTime) : null,
    result: data.data?.result === 'Win' || data.data?.result === 'Loss' ? data.data.result : null,
    playerOfMatch: data.data?.playerOfMatch ?? null,
  }
}

async function setData(data: RawMatchData): Promise<Match> {
  const matchDataStore = useMatchDataStore()
  const match: Match = mapRawMatch(data)

  matchDataStore.setMatchData(
    match.id,
    match.opponent,
    match.date,
    match.location,
    match.availablePlayers,
    match.status,
    match.gamesFor,
    match.gamesAgainst
  )

  return match
}

export async function getNextMatch(): Promise<Match | null> {
  const matchDataStore = useMatchDataStore()
  const existingMatch = matchDataStore.getMatchData()

  if (existingMatch) {
    const mappedMatch: Match = {
      id: existingMatch.matchId ?? '',
      opponent: existingMatch.opposition ?? '',
      location: existingMatch.location ?? '',
      date: existingMatch.date ?? '',
      availablePlayers: existingMatch.availablePlayers ?? [],
      status: existingMatch.status ?? '',
      gamesFor: existingMatch.gamesFor ?? 0,
      gamesAgainst: existingMatch.gamesAgainst ?? 0,
      // Not tracked in the live-match store - only relevant to the Manage
      // Matches table and season stats, not active gameplay.
      seasonId: null,
      startTime: null,
      finishTime: null,
      result: null,
      playerOfMatch: null,
    }
    return mappedMatch
  }

  try {
    const data = await apiGet<RawMatchData>('/api/Match/next')
    const match: Match = await setData(data)

    return match
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // No match is currently scheduled - a normal, expected state (e.g. a
      // fresh install), not a failure. apiClient's request() already pushed
      // this to the error store before we get here, so clear it rather than
      // let it show as a red toast.
      matchDataStore.clearError()
      return null
    }

    console.error(err instanceof Error ? err.message : 'Error fetching next match')
    return null
  }
}

export interface CreateMatchInput {
  opponent: string
  date: string // yyyy-mm-dd
  location: 'Home' | 'Away'
  seasonId?: string | null
}

export interface CreatedMatch {
  id: string
  opponent: string
}

/**
 * Create a new (Scheduled) match. Deliberately does not update matchDataStore -
 * whether this new match becomes "the next match" depends on server-side
 * ordering against whatever else is scheduled, so the normal getNextMatch()
 * flow (re-run when the user returns to the main screen) is what decides that,
 * not this call.
 */
export async function createMatch(input: CreateMatchInput): Promise<CreatedMatch | null> {
  try {
    const data = await apiRequest<RawMatchData>('/api/Match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Scheduled',
        opponent: input.opponent,
        date: input.date,
        location: input.location,
        gamesFor: 0,
        gamesAgainst: 0,
        seasonId: input.seasonId ?? null,
      })
    })

    return { id: data.id ?? '', opponent: data.data?.opponent ?? input.opponent }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error creating match')
    return null
  }
}

/** Fetch a single match by id, without touching matchDataStore - for viewing a completed match's report. */
export async function getMatch(matchId: string): Promise<Match | null> {
  try {
    const data = await apiGet<RawMatchData>(`/api/Match/${matchId}`)
    return mapRawMatch(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching match')
    return null
  }
}

/** Every game for a match, without touching matchDataStore - for viewing a completed match's report. */
export async function getGamesForMatch(matchId: string): Promise<Game[]> {
  try {
    const data = await apiGet<RawGameData[]>(`/api/Match/${matchId}/games`)
    return data.map((g) => ({
      id: g.id ?? '',
      players: g.data?.playerIds ?? [],
      type: g.data?.type ?? '',
      status: g.data?.status ?? '',
      result: g.data?.result ?? '',
      wonBull: g.data?.wonBull ?? false,
      order: g.data?.order ?? 0,
      legsToPlay: g.data?.legsToPlay ?? 0,
      startingScore: g.data?.startingScore ?? 0,
      maxRounds: g.data?.maxRounds ?? null,
      forfeited: g.data?.forfeited ?? false,
    }))
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching games for match')
    return []
  }
}

/** Every match, unpaginated (capped at 500 server-side) - for the Current Season fixtures list. */
export async function getAllMatches(): Promise<Match[]> {
  try {
    const data = await apiGet<RawMatchData[]>('/api/Match/matches?take=500')
    return data.map(mapRawMatch)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching matches')
    return []
  }
}

/** Fetches one (0-based) page of matches for the match management table. Not cached. */
export async function fetchMatchesPage(pageIndex: number): Promise<Page<Match>> {
  try {
    const data = await apiGet<RawMatchData[]>(`/api/Match/matches?skip=${skipFor(pageIndex)}&take=${takeForFetch()}`)
    const page = splitPage(data)
    return {
      items: page.items.map(mapRawMatch),
      hasNextPage: page.hasNextPage,
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching matches')
    return { items: [], hasNextPage: false }
  }
}

/** Edit a Scheduled match's opponent/date/location. The server rejects this for any other status. */
export async function updateMatch(matchId: string, input: CreateMatchInput): Promise<CreatedMatch | null> {
  try {
    const data = await apiRequest<RawMatchData>(`/api/Match/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opponent: input.opponent,
        date: input.date,
        location: input.location,
        seasonId: input.seasonId ?? null,
      })
    })

    return { id: data.id ?? matchId, opponent: data.data?.opponent ?? input.opponent }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating match')
    return null
  }
}

/**
 * Delete a Scheduled match. Returns false (and leaves the usual error toast to explain why)
 * if the server rejects it - most commonly because the match has moved past Scheduled.
 */
export async function deleteMatch(matchId: string): Promise<boolean> {
  try {
    await apiRequest<void>(`/api/Match/${matchId}`, { method: 'DELETE' })
    return true
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error deleting match')
    return false
  }
}

export async function startMatch(matchId: string) {
  const matchDataStore = useMatchDataStore()
  const existingMatch = matchDataStore.getMatchData()
  if (!existingMatch) return

  if (existingMatch.status !== 'Scheduled') {
    return
  }

  try {
    if (matchId) {
      const data = await apiRequest<RawMatchData>(`/api/Match/${matchId}/start`, { method: 'PUT' })
      await setData(data)
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching starting match')
  }
}


//TODO - Put some logic in to ensure that available players are only sent when there is a change
/**
 * Returns whether the roster was actually saved - callers that chain
 * further requests after this one (e.g. AvailablePlayersControl.proceed(),
 * which follows up with recordOppositionHeadcount()) need to know not to
 * continue on failure: doing so anyway previously meant a rejected roster
 * update (any of ValidateAvailablePlayers' own reasons - a deleted player,
 * an unexpected match status, etc.) was masked by a second, more confusing
 * failure from whatever ran next, since the shared error toast only ever
 * shows the latest one.
 */
export async function setAvailablePlayers(): Promise<boolean> {
  const matchDataStore = useMatchDataStore()

  let players: string[] = []

  //check to see if players are already in local storage
  if (matchDataStore.matchAvailablePlayers.length > 0) {
    players = matchDataStore.matchAvailablePlayers
      .filter(p => p.isAvailable)
      .map(p => p.playerId)
  }

  try {
    await apiRequest<RawMatchData>(
      `/api/Match/${matchDataStore.getMatchData()?.matchId}/update-available-players`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availablePlayers: players })
      }
    )
    matchDataStore.updateMatchAvailablePlayers()
    return true

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching updating available players')
    return false
  }
}

/**
 * Records whether the opposition also arrived with only 5 available players
 * - combined with our own already-saved availablePlayers count, the server
 * resolves the match's last Singles game (walkover win/loss, or removed
 * entirely if both sides are short). Always called as part of
 * AvailablePlayersControl.vue's proceed(), right after setAvailablePlayers()
 * so our own count is already persisted by the time this runs.
 */
export async function recordOppositionHeadcount(oppositionShortHanded: boolean) {
  const matchDataStore = useMatchDataStore()
  const matchId = matchDataStore.getMatchData()?.matchId
  if (!matchId) return

  try {
    await apiRequest<RawMatchData>(
      `/api/Match/${matchId}/opposition-headcount`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oppositionShortHanded })
      }
    )
    // The last Singles game may have just been forfeited or deleted server-
    // side - clear the cached games list so the next fetch (GameSummaryPanel's
    // onMounted, right after this) gets fresh server state instead of
    // getMatchGames()'s cache-first shortcut.
    matchDataStore.resetGamesCache()
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error recording opposition headcount')
  }
}

export async function getMatchGames(matchId: string): Promise<Game[] | null> {
  const matchDataStore = useMatchDataStore()
  const match = matchDataStore.getMatchData()
  if (!match) return null

  if (match.games.length > 0) {
    return convertToGameListFromGameDataStateList(match.games)
  }

  try {
    const data = await apiGet<RawGameData[]>(`/api/Match/${matchId}/games`)
    // Map the response to Game[]
    const games: Game[] = Array.isArray(data)
      ? data.map((g) => ({
        id: g.id ?? '',
        players: g.data?.playerIds ?? [],
        type: g.data?.type ?? '',
        status: g.data?.status ?? '',
        result: g.data?.result ?? '',
        wonBull: g.data?.wonBull ?? false,
        order: g.data?.order ?? 0,
        legsToPlay: g.data?.legsToPlay ?? 0,
        startingScore: g.data?.startingScore ?? 0,
        maxRounds: g.data?.maxRounds ?? null,
        forfeited: g.data?.forfeited ?? false,
      }))
      : []

    games.forEach(game => {
      matchDataStore.setGameData(
        game.id,
        game.players,
        game.type,
        game.status,
        game.result,
        game.wonBull,
        game.order,
        game.legsToPlay,
        game.startingScore,
        game.maxRounds,
        game.forfeited
      )
    })

    return games
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching match games')
    return null
  }
}

export async function updateMatchScore(result: boolean) {
  const matchDataStore = useMatchDataStore()
  const matchId = matchDataStore.match?.matchId

  try {
    const data = await apiRequest<RawMatchData>(`/api/Match/${matchId}/update-match-score?result=${result}`, { method: 'PUT' })
    await setData(data)

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error calling update Match API')
  }

}

/**
 * Complete the match once every game is done, recording who was Player of
 * the Match. `result` isn't derived from the individual leg the caller just
 * played - it's the match's own gamesFor/gamesAgainst tally (updated by
 * updateMatchScore() after each game), same "more wins than losses" rule
 * MatchCenter already uses to decide each individual game's result.
 */
export async function completeMatch(playerOfMatchId: string): Promise<Match | null> {
  const matchDataStore = useMatchDataStore()
  const match = matchDataStore.getMatchData()
  if (!match?.matchId) return null

  const result = match.gamesFor > match.gamesAgainst ? 'Win' : 'Loss'

  try {
    const data = await apiRequest<RawMatchData>(`/api/Match/${match.matchId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: match.matchId, playerOfMatch: playerOfMatchId, result })
    })
    return await setData(data)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error completing match')
    return null
  }
}
