export type Discipline = 'moves' | 'freestyle' | 'dance' | 'pairs'
export type SkaterLevelValue =
  | 'pre_alpha' | 'alpha' | 'beta' | 'gamma' | 'delta'
  | 'pre_juvenile' | 'juvenile' | 'intermediate' | 'novice' | 'junior' | 'senior'

export interface SkaterLevel {
  id: string
  skater: string
  discipline: Discipline
  discipline_display: string
  level: SkaterLevelValue
  level_display: string
  passed_date: string | null
  judge_name: string
  notes: string
  recorded_by: string | null
  club: string
  created_at: string
  updated_at: string
}

export interface CoachEvaluation {
  id: string
  skater: string
  skater_name: string
  coach: string
  coach_name: string
  evaluation_date: string
  skating_skills: number | null
  transitions: number | null
  performance: number | null
  choreography: number | null
  interpretation: number | null
  strengths: string
  areas_to_improve: string
  goals_next_period: string
  overall_notes: string
  average_score: number | null
  club: string
  created_at: string
  updated_at: string
}

export interface Coach {
  id: string
  user_name: string
  user_email: string
  specialties: string
  bio: string
  is_active: boolean
}

export interface LessonType {
  id: string
  name: string
  description: string
  lesson_format: 'private' | 'semi_private' | 'group' | 'test_session' | 'club_ice'
  duration_minutes: number
  price: string
  drop_in_price: string | null
  max_participants: number
  color: string
  is_active: boolean
}

export interface AvailabilitySlot {
  id: string
  coach: Coach
  lesson_type: LessonType
  date: string
  start_time: string
  end_time: string
  status: 'available' | 'partially_booked' | 'fully_booked' | 'cancelled'
  spots_remaining: number
  effective_price: string
  recurrence: 'none' | 'weekly' | 'biweekly'
  recurrence_end_date: string | null
  notes: string
}

export interface BookingList {
  id: string
  skater_name: string
  coach_name: string
  lesson_type_name: string
  scheduled_date: string
  scheduled_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'pending' | 'paid' | 'refunded'
  amount_paid: string
}

export interface LessonPackage {
  id: string
  name: string
  lesson_type: string  // FK id
  lesson_type_name: string
  lesson_count: number
  price: string
  price_per_lesson: string
  savings_vs_individual: string
  is_active: boolean
  description: string
}

export interface PurchasedPackage {
  id: string
  skater: string  // FK id
  skater_name: string
  package: string  // FK id
  package_name: string
  lesson_type_name: string
  lessons_total: number
  lessons_used: number
  lessons_remaining: number
  amount_paid: string
  payment_status: 'pending' | 'paid' | 'refunded'
  is_active: boolean
  purchased_at: string
  expires_at: string | null
}

export interface BookingDetail extends BookingList {
  skater: string
  coach: string
  availability_slot: string | null
  duration_minutes: number
  cancellation_reason: string
  cancellation_notes: string
  cancelled_at: string | null
  client_notes: string
  coach_notes: string
  can_cancel: boolean
  can_reschedule: boolean
}

// ── Member-facing types ───────────────────────────────────────────────────────

export interface AvailableSlot {
  id: string
  coach_name: string
  lesson_type_name: string
  lesson_type_duration_minutes: number
  lesson_type_color: string
  start_datetime: string   // ISO: "2026-05-19T09:00:00"
  end_datetime: string
  price: string
  spots_remaining: number
  is_recurring: boolean
}

export interface MyPurchasedPackage {
  id: string
  package_name: string
  lesson_type_name: string
  sessions_remaining: number
  expiry_date: string | null
  skater_name: string
  skater: string  // UUID
}

export interface BookingCreatePayload {
  slot: string        // UUID
  skater_id: string   // UUID
  payment_method: 'package' | 'drop_in'
  package_id?: string // UUID, required when payment_method='package'
}

export const TEST_TYPE_LABELS: Record<string, string> = {
  moves: 'Moves in the Field',
  freestyle: 'Freestyle',
  dance: 'Ice Dance',
  pattern_dance: 'Pattern Dance',
  pairs: 'Pairs',
}

export interface TestSession {
  id: string
  name: string
  date: string
  location: string
  judge_name: string
  test_types: string[]
  fee_per_test: string
  registration_deadline: string | null
  max_registrations: number
  is_open: boolean
  notes: string
  spots_remaining: number
  is_registration_open: boolean
  registration_count: number
}

export interface TestRegistration {
  id: string
  test_session: string
  skater: string
  skater_name: string
  skater_usfs: string
  test_types: string[]
  test_levels: Record<string, string>
  amount_paid: string
  payment_status: 'pending' | 'paid' | 'refunded'
  result: 'registered' | 'pass' | 'retry' | 'scratch'
  result_notes: string
}
