export interface League {
  id: string
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
  /** null = no limit configured - a leg is never decided by bull-off. */
  maxRounds: number | null
}

/** Wire shape returned by the League endpoints. */
export interface RawLeague {
  id?: string
  data?: {
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
}

export function mapRawLeague(data: RawLeague): League {
  return {
    id: data.id ?? '',
    name: data.data?.name ?? '',
    numTrebles: data.data?.numTrebles ?? 0,
    numDoubles: data.data?.numDoubles ?? 0,
    numSingles: data.data?.numSingles ?? 0,
    treblesLegs: data.data?.treblesLegs ?? 1,
    doublesLegs: data.data?.doublesLegs ?? 1,
    singlesLegs: data.data?.singlesLegs ?? 1,
    treblesStartScore: data.data?.treblesStartScore ?? 501,
    doublesStartScore: data.data?.doublesStartScore ?? 501,
    singlesStartScore: data.data?.singlesStartScore ?? 501,
    maxRounds: data.data?.maxRounds ?? null,
  }
}
