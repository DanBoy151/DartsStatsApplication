export interface Team {
  id: string
  name: string
}

/** Wire shape returned by the Team endpoints. */
export interface RawTeam {
  id?: string
  data?: { name?: string }
}

export function mapRawTeam(data: RawTeam): Team {
  return {
    id: data.id ?? '',
    name: data.data?.name ?? '',
  }
}
