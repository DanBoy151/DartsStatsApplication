import { useMatchDataStore } from "@/stores/matchDataStore"
import type { LegResult, RawLeg } from "@/models/LegModel"
import { apiRequest } from "@/actions/apiClient"

export async function startLeg() {
  const matchDataStore = useMatchDataStore()
  const legId = matchDataStore.selectedLeg?.legId

  //Check if a selected leg has been set and if so return
  if (!matchDataStore.selectedLeg && !legId) return;

  //If no leg is selected then start the leg and set it as selected leg
  try {
    const data = await apiRequest<RawLeg>(`/api/Leg/${legId}/start`, { method: 'PUT' })
    matchDataStore.setLegData(
      data.data?.gameID ?? '',
      data.id ?? '',
      data.data?.status ?? '',
      data.data?.score ?? [],
      data.data?.result ?? '',
      data.data?.finishDarts ?? 0,
      data.data?.order ?? 0,
      data.data?.remainingScore ?? 0)
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error calling start API')
  }
}

export async function completeLeg() {
  const matchDataStore = useMatchDataStore()
  const legId = matchDataStore.selectedLeg?.legId

  //Check if a selected leg has been set and if so return
  if (!matchDataStore.selectedLeg && !legId) return;

  const result: LegResult = {
    score: scoreToArray(matchDataStore.selectedLeg?.score),
    result: matchDataStore.selectedLeg?.result ?? '',
    finishDarts: matchDataStore.selectedLeg?.finishDarts ?? 0
  }

  try {
    const data = await apiRequest<RawLeg>(
      `/api/Leg/${legId}/complete`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      }
    )
    matchDataStore.setLegData(
      data.data?.gameID ?? '',
      data.id ?? '',
      data.data?.status ?? '',
      data.data?.score ?? [],
      data.data?.result ?? '',
      data.data?.finishDarts ?? 0,
      data.data?.order ?? 0,
      data.data?.remainingScore ?? 0)

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating selected Leg ')
  }
}

function scoreToArray(
  score: Record<string, number> | { playerId: string; score: number }[] | undefined
): { playerId: string; score: number }[] {
  if (!score) return [];
  if (Array.isArray(score)) return score;
  return Object.entries(score).map(([playerId, score]) => ({
    playerId,
    score: Number(score)
  }));
}
