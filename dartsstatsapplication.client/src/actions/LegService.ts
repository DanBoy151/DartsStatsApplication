import { useMatchDataStore } from "@/stores/matchDataStore"

export async function startLeg() {
  const matchDataStore = useMatchDataStore()
  const legId = matchDataStore.selectedLeg?.legId

  //Check if a selected leg has been set and if so return
  if (!matchDataStore.selectedLeg && !legId) return;

  //If no leg is selected then start the leg and set it as selected leg
  try {
    const response = await fetch(`http://localhost:5001/api/Leg/${legId}/start`, { method: 'PUT' })
    if (!response.ok) throw new Error('Failed to start leg:')
    const data = await response.json()
    matchDataStore.setLegData(
      data.data?.gameId ?? '',
      data.id ?? '',
      data.data?.status ?? '',
      data.data?.score ?? {},
      data.data?.result ?? '',
      data.data?.finishDarts ?? 0,
      data.data?.order ?? 0,
      data.data?.remainingScore ?? 0)
  } catch (err) {
    console.error('Error calling start API:', err)
  }
}
