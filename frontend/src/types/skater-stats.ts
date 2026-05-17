export interface SkaterStatsHistory {
  date: string
  competition: string
  event: string
  score: number | null
  placement: string
  status: string
  eventType: string
  eventLevel: string
}

export interface SkaterStatsProfile {
  name: string
  slug: string
  club: string
  totalEvents: string
  totalCompetitions: string
  coaches: Array<{ name: string; club?: string }>
  history: SkaterStatsHistory[]
}
