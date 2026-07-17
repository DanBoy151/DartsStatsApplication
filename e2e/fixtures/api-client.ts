import type { APIRequestContext } from '@playwright/test'

export interface SeededPlayer {
  id: string
  name: string
}

export interface SeededMatch {
  id: string
  opponent: string
}

async function assertOk(res: { ok(): boolean; status(): number; text(): Promise<string> }, action: string) {
  if (!res.ok()) {
    throw new Error(`${action} failed: ${res.status()} ${await res.text()}`)
  }
}

export async function createPlayer(api: APIRequestContext, name: string): Promise<SeededPlayer> {
  const res = await api.post('/api/Player', { data: { name } })
  await assertOk(res, `create player "${name}"`)
  const body = await res.json()
  return { id: body.id, name }
}

export async function createPlayers(api: APIRequestContext, count: number, namePrefix: string): Promise<SeededPlayer[]> {
  const players: SeededPlayer[] = []
  for (let i = 1; i <= count; i++) {
    players.push(await createPlayer(api, `${namePrefix} ${i}`))
  }
  return players
}

export interface CreateMatchOptions {
  opponent?: string
  location?: 'Home' | 'Away'
  date?: string // yyyy-mm-dd
}

export async function createScheduledMatch(api: APIRequestContext, options: CreateMatchOptions = {}): Promise<SeededMatch> {
  const opponent = options.opponent ?? `E2E Opponent ${Date.now()}`
  const res = await api.post('/api/Match', {
    data: {
      status: 'Scheduled',
      opponent,
      date: options.date ?? new Date().toISOString().slice(0, 10),
      location: options.location ?? 'Home',
      gamesFor: 0,
      gamesAgainst: 0,
    },
  })
  await assertOk(res, `create match vs "${opponent}"`)
  const body = await res.json()
  return { id: body.id, opponent }
}
