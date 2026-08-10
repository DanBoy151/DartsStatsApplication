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

  // Let any background per-throw autosave still in flight land first - it's
  // targeting the same leg and would otherwise be able to resolve AFTER this
  // completion PUT, hitting a 400 (SaveProgress rejects a leg that's no
  // longer Started) for no reason. Harmless either way since this PUT below
  // always sends the full authoritative score itself, but avoids the noise.
  await awaitPendingBackgroundSave()

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

  // See the matching comment in completeLeg() above.
  await awaitPendingBackgroundSave()

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
 * Actual PUT for both saveLegProgress() and the background autosave below -
 * always reads selectedLeg fresh at call time (rather than being handed a
 * snapshot), so a save that was queued against one leg but fires after the
 * scorer has already moved on naturally targets/no-ops correctly against
 * whatever's selected by then instead of resurrecting stale data.
 */
async function putLegProgress(): Promise<void> {
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

// Coalesces saveLegProgressInBackground() calls: at most one PUT in flight
// at a time, with at most one more queued behind it. This is what keeps
// concurrent/rapid-fire background saves from ever landing out of order at
// the server - since /progress replaces the whole score array rather than
// appending, an older (shorter) request resolving after a newer one would
// otherwise silently roll the leg back. Serialising them, and always having
// the queued follow-up read the latest store state (not a snapshot taken
// when it was requested), makes that impossible without needing any
// sequencing on the server.
let backgroundSaveInFlight: Promise<void> | null = null
let backgroundSavePending = false

function runQueuedBackgroundSave(): void {
  backgroundSaveInFlight = putLegProgress().finally(() => {
    backgroundSaveInFlight = null
    if (backgroundSavePending) {
      backgroundSavePending = false
      runQueuedBackgroundSave()
    }
  })
}

/**
 * Fire-and-forget: persists the current leg's throw history in the
 * background after every throw/correction, so the keypad and Score Ledger
 * stay instant rather than waiting on a round trip. Called from
 * ScoringConsole.vue (submit/noScore) and ScoreLedgerPanel.vue (saveEdit)
 * right after each local store update. Safe to call as often as needed -
 * see runQueuedBackgroundSave() above for how overlapping calls coalesce.
 */
export function saveLegProgressInBackground(): void {
  if (backgroundSaveInFlight) {
    backgroundSavePending = true
    return
  }
  runQueuedBackgroundSave()
}

/** Waits out any in-flight/queued background autosave, without starting a new one. */
async function awaitPendingBackgroundSave(): Promise<void> {
  while (backgroundSaveInFlight) {
    await backgroundSaveInFlight
  }
}

/**
 * Saves the in-progress leg's throw history to the server without
 * completing it - called when the user navigates away mid-leg (Home/top
 * menu), so a resumed session (possibly on a different device, or after the
 * store's own 6-hour expiry) sees the real throws instead of an empty
 * history. A no-op unless a leg is actually being played. Waits out any
 * pending background autosave first rather than racing it, then does one
 * more save itself to guarantee the latest state actually lands - the
 * background autosave firing is only ever best-effort.
 */
export async function saveLegProgress(): Promise<void> {
  await awaitPendingBackgroundSave()
  await putLegProgress()
}
