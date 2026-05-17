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

export interface Competition {
  id: string
  name: string
  comp_type: 'home' | 'away'
  start_date: string
  end_date: string
  venue: string
  city: string
  state: string
  sanction_number: string
  entry_deadline: string | null
  late_entry_deadline: string | null
  base_entry_fee: string
  late_fee: string
  music_upload_deadline: string | null
  notes: string
  is_published: boolean
  entry_count: number
  is_entry_open: boolean
  is_late: boolean
  category_count: number
  club: string
  created_at: string
  updated_at: string
}

export interface EventCategory {
  id: string
  competition: string
  name: string
  discipline: 'singles' | 'pairs' | 'dance' | 'synchronized'
  segment: string
  level: string
  additional_fee: string
  max_entries: number | null
  scheduled_time: string | null
  flight_number: number | null
  entry_count: number
  club: string
  created_at: string
  updated_at: string
}

export interface CompetitionEntry {
  id: string
  competition: string
  competition_name: string
  category: string
  category_name: string
  skater: string
  skater_name: string
  skater_usfs: string
  coach: string | null
  coach_name: string | null
  status: 'draft' | 'submitted' | 'confirmed' | 'accepted' | 'scratched'
  entry_fee: string
  total_fee: string
  is_late: boolean
  music_title: string
  music_artist: string
  music_duration_seconds: number | null
  draw_number: number | null
  skating_order: number | null
  placement: number | null
  score: string | null
  result_notes: string
  scratched_at: string | null
  club: string
  created_at: string
  updated_at: string
}
