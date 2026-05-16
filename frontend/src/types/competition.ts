export interface CompetitionHistoryItem {
  date: string
  competition: string
  event: string
  eventType: string
  placement: string | null
  score: number | null
  status: string
  judgeDetails: {
    elements: Array<{
      number: number
      elementCode: string
      baseValue: number
      goe: number
      value: number
      judgesGoe: number[]
    }>
    components: unknown[]
    deductions: unknown[]
  } | null
}

export interface SkaterStatsProfile {
  id: number
  name: string
  slug: string
  club: string
  hasUSFSId: boolean
  totalEvents: string
  totalCompetitions: string
  history: CompetitionHistoryItem[]
  coaches: Array<{
    coachId: number
    fullName: string
    slug: string
  }>
}
