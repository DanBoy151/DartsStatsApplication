import { useMatchDataStore } from "@/stores/matchDataStore"
import type { LegBullOffResult, LegResult, RawLeg } from "@/models/LegModel"
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
      data.data?.remainingScore ?? 0,
      data.data?.wonByBullOff ?? false)
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
    finishDarts: matchDataStore.selectedLeg?.finishDarts ?? 0,
    remainingScore: matchDataStore.selectedLeg?.remainingScore ?? 0
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
      data.data?.remainingScore ?? 0,
      data.data?.wonByBullOff ?? false)

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error updating selected Leg ')
  }
}

/**
 * Completes a leg decided by bull-off (the game's configured max rounds was
 * reached with no winner). The real pre-threshold throws are still sent -
 * they still count for stats - but there's no finishDarts, since there was
 * no checkout.
 */
export async function completeLegByBullOff() {
  const matchDataStore = useMatchDataStore()
  const legId = matchDataStore.selectedLeg?.legId

  if (!matchDataStore.selectedLeg && !legId) return;

  const result: LegBullOffResult = {
    score: scoreToArray(matchDataStore.selectedLeg?.score),
    result: matchDataStore.selectedLeg?.result ?? '',
    remainingScore: matchDataStore.selectedLeg?.remainingScore ?? 0
  }

  try {
    const data = await apiRequest<RawLeg>(
      `/api/Leg/${legId}/complete-bull-off`,
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
      data.data?.remainingScore ?? 0,
      data.data?.wonByBullOff ?? false)

  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error completing selected Leg by bull-off')
  }
}

export function scoreToArray(
  score: Record<string, number> | { playerId: string; score: number }[] | undefined
): { playerId: string; score: number }[] {
  if (!score) return [];
  if (Array.isArray(score)) return score;
  return Object.entries(score).map(([playerId, score]) => ({
    playerId,
    score: Number(score)
  }));
}

/**
 * Saves the in-progress leg's throw history to the server without
 * completing it - called when the user navigates away mid-leg (Home/top
 * menu), so a resumed session (possibly on a different device, or after the
 * store's own 6-hour expiry) sees the real throws instead of an empty
 * history. A no-op unless a leg is actually being played.
 */
export async function saveLegProgress(): Promise<void> {
  const matchDataStore = useMatchDataStore()
  const leg = matchDataStore.selectedLeg
  if (!leg || leg.status !== 'Started') return

  try {
    await apiRequest<RawLeg>(
      `/api/Leg/${leg.legId}/progress`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: scoreToArray(leg.score) })
      }
    )
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Error saving leg progress')
  }
}
