import type { APIRequestContext } from '@playwright/test'

export interface SeededPlayer {
  id: string
  name: string
}

export interface SeededMatch {
  id: string
  opponent: string
}

export interface SeededLeague {
  id: string
  name: string
}

export interface SeededTeam {
  id: string
  name: string
}

export interface SeededSeason {
  id: string
  name: string
  leagueId: string
  teamId: string
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

export interface CreateLeagueOptions {
  name?: string
  numTrebles?: number
  numDoubles?: number
  numSingles?: number
  treblesLegs?: number
  doublesLegs?: number
  singlesLegs?: number
  treblesStartScore?: number
  doublesStartScore?: number
  singlesStartScore?: number
  maxRounds?: number | null
}

export async function createLeague(api: APIRequestContext, options: CreateLeagueOptions = {}): Promise<SeededLeague> {
  const name = options.name ?? `E2E League ${Date.now()}`
  const data = {
    name,
    numTrebles: options.numTrebles ?? 2,
    numDoubles: options.numDoubles ?? 3,
    numSingles: options.numSingles ?? 6,
    treblesLegs: options.treblesLegs ?? 1,
    doublesLegs: options.doublesLegs ?? 1,
    singlesLegs: options.singlesLegs ?? 3,
    treblesStartScore: options.treblesStartScore ?? 701,
    doublesStartScore: options.doublesStartScore ?? 601,
    singlesStartScore: options.singlesStartScore ?? 501,
    maxRounds: options.maxRounds ?? null,
  }
  const res = await api.post('/api/League', { data })
  await assertOk(res, `create league "${name}"`)
  const body = await res.json()
  return { id: body.id, name }
}

export async function createTeam(api: APIRequestContext, name?: string): Promise<SeededTeam> {
  const teamName = name ?? `E2E Team ${Date.now()}`
  const res = await api.post('/api/Team', { data: { name: teamName } })
  await assertOk(res, `create team "${teamName}"`)
  const body = await res.json()
  return { id: body.id, name: teamName }
}

export interface CreateSeasonOptions {
  name?: string
  leagueId: string
  teamId: string
}

export async function createSeason(api: APIRequestContext, options: CreateSeasonOptions): Promise<SeededSeason> {
  const name = options.name ?? `E2E Season ${Date.now()}`
  const res = await api.post('/api/Season', {
    data: { name, leagueId: options.leagueId, teamId: options.teamId },
  })
  await assertOk(res, `create season "${name}"`)
  const body = await res.json()
  return { id: body.id, name, leagueId: options.leagueId, teamId: options.teamId }
}

export interface SeededGame {
  id: string
}

export interface CreateGameOptions {
  matchId: string
  type?: 'Singles' | 'Doubles' | 'Trebles'
  status?: 'Pending' | 'Ready' | 'InProgress' | 'Complete'
  playerIds: string[]
  order?: number
  legsToPlay?: number
  startingScore?: number
  maxRounds?: number | null
}

/**
 * Creates a Game document directly (POST /api/Game stores whatever's sent,
 * with no status/lifecycle checks) - used to seed a Game with a specific
 * League-resolved config (legsToPlay/startingScore/maxRounds) without going
 * through Match.start(), which is blocked once another match already holds
 * the app's single "one In Progress Match at a time" slot (see
 * MatchControllerValidator.IsValidToStartMatch and 01-start-next-match's
 * final two tests, which use the same direct-API workaround).
 */
export async function createGame(api: APIRequestContext, options: CreateGameOptions): Promise<SeededGame> {
  const res = await api.post('/api/Game', {
    data: {
      matchId: options.matchId,
      type: options.type ?? 'Singles',
      status: options.status ?? 'InProgress',
      playerIds: options.playerIds,
      wonBull: true,
      order: options.order ?? 0,
      legsToPlay: options.legsToPlay ?? 1,
      startingScore: options.startingScore ?? 501,
      maxRounds: options.maxRounds ?? null,
    },
  })
  await assertOk(res, 'create game')
  const body = await res.json()
  return { id: body.id }
}

export interface SeededLeg {
  id: string
}

export interface CreateLegOptions {
  gameID: string
  order?: number
  remainingScore?: number
}

/** Creates a Leg document directly (POST /api/Leg), Started and ready to be completed by a subsequent PUT. Same rationale as createGame(). */
export async function createLeg(api: APIRequestContext, options: CreateLegOptions): Promise<SeededLeg> {
  const res = await api.post('/api/Leg', {
    data: {
      gameID: options.gameID,
      status: 'Started',
      score: [],
      result: null,
      finishDarts: null,
      order: options.order ?? 0,
      remainingScore: options.remainingScore ?? 501,
    },
  })
  await assertOk(res, 'create leg')
  const body = await res.json()
  return { id: body.id }
}
