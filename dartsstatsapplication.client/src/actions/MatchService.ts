import type { Match } from "@/models/MatchModel"
import { useMatchDataStore } from "@/stores/matchDataStore"
import type { Game } from "@/models/GameModel"
import { convertToGameListFromGameDataStateList } from "@/models/GameModel"

interface RawMatchData {
  id?: string
  data?: {
    opponent?: string
    location?: string
    date?: string
    availablePlayers?: string[]
    status?: string
    gamesFor?: number
    gamesAgainst?: number
  }
}

interface RawGameData {
  id?: string
  data?: {
    playerIds?: string[]
    type?: string
    status?: string
    result?: string
    wonBull?: boolean
    order?: number
  }
}

async function setData(data: RawMatchData): Promise<Match> {
  const matchDataStore = useMatchDataStore()
  // Construct and return a Match object
  const match: Match = {
    id: data.id ?? '',
    opponent: data.data?.opponent ?? 'Unknown',
    location: data.data?.location ?? '',
    date: data.data?.date ?? '',
    availablePlayers: Array.isArray(data.data?.availablePlayers)
      ? data.data.availablePlayers
      : [],
    status: data.data?.status ?? '',
    gamesFor: data.data?.gamesFor ?? 0,
    gamesAgainst: data.data?.gamesAgainst ?? 0,
  }

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
    }
    return mappedMatch
  }

  try {
    const response = await fetch('http://localhost:5001/api/Match/next')
    if (!response.ok) throw new Error('Failed to fetch next match')
    const data = await response.json()
    const match: Match = await setData(data)

    return match
  } catch (err) {
    // Optionally log error
    console.error(err instanceof Error ? err.message : 'Error fetching next match')
    return null
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
      const response = await fetch(`http://localhost:5001/api/Match/${matchId}/start`, { method: 'PUT' })
      if (!response.ok) throw new Error('Failed to start match')
      const data = await response.json()
      await setData(data)
    }  
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching starting match')
  }
}


//TODO - Put some logic in to ensure that available players are only sent when there is a change
export async function setAvailablePlayers() {
  const matchDataStore = useMatchDataStore()

  let players: string[] = []

  //check to see if players are already in local storage
  if (matchDataStore.matchAvailablePlayers.length > 0) {
    players = matchDataStore.matchAvailablePlayers
      .filter(p => p.isAvailable)
      .map(p => p.playerId)
  }

  try {
    const response = await fetch(
      `http://localhost:5001/api/Match/${matchDataStore.getMatchData()?.matchId}/update-available-players`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availablePlayers: players })
      }
    )
    if (!response.ok) throw new Error('Failed to update available players')
    matchDataStore.updateMatchAvailablePlayers()

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error fetching updating available players')
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
    const response = await fetch(`http://localhost:5001/api/Match/${matchId}/games`)
    if (!response.ok) throw new Error('Failed to fetch match games')
    const data = (await response.json()) as RawGameData[]
    // Map the response to Game[]
    const games: Game[] = Array.isArray(data)
      ? data.map((g) => ({
        id: g.id ?? '',
        players: g.data?.playerIds ?? [],
        type: g.data?.type ?? '',
        status: g.data?.status ?? '',
        result: g.data?.result ?? '',
        wonBull: g.data?.wonBull ?? false,
        order: g.data?.order ?? 0
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
        game.order
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
    const response = await fetch(`http://localhost:5001/api/Match/${matchId}/update-match-score?result=${result}`, { method: 'PUT' })
    if (!response.ok) throw new Error('Failed to update Match:')

    const data = await response.json()
    await setData(data)

  } catch (err) {
    console.error('Error calling update Match API:', err)
  }

}
