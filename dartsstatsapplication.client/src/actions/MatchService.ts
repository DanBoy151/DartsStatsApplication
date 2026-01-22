import type { Match } from "@/models/MatchModel"
import { useMatchDataStore } from "@/stores/matchDataStore"

export async function getNextMatch(): Promise<Match | null> {
  const matchDataStore = useMatchDataStore()
  const existingMatch = matchDataStore.getMatchData()

  if (existingMatch) {
    const mappedMatch: Match = {
      id: existingMatch.matchId ?? '',
      opponent: existingMatch.opposition ?? '',
      location: existingMatch.location ?? '',
      date: existingMatch.date ?? null,
      availablePlayers: existingMatch.availablePlayers ?? [],
    }
    return mappedMatch
  }

  try {
    const response = await fetch('http://localhost:5001/api/Match/next')
    if (!response.ok) throw new Error('Failed to fetch next match')
    const data = await response.json()

    // Construct and return a Match object
    const match: Match = {
      id: data.id ?? '',
      opponent: data.data?.opponent ?? 'Unknown',
      location: data.data?.location ?? '',
      date: data.data?.date ?? '',
      availablePlayers: Array.isArray(data.data?.availablePlayers)
        ? data.data.availablePlayers
        : [],
      // Add other properties as needed based on your Match type
    }

    matchDataStore.setMatchData(
      match.id,
      match.opponent,
      match.date,
      match.location,
      match.availablePlayers
    )

    return match
  } catch (err: any) {
    // Optionally log error
    console.error(err.message || 'Error fetching next match')
    return null
  }
}
