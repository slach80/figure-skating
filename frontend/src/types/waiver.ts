export interface WaiverTemplate {
  id: string
  title: string
  body: string
  version: string
  requires_guardian_signature: boolean
  is_active: boolean
  created_at: string
}

export interface WaiverStatus {
  template_id: string
  title: string
  version: string
  requires_guardian_signature: boolean
  signed: boolean
  signed_at: string | null
  signed_by: string | null
}

export interface WaiverSignResponse {
  id: string
  template_id: string
  skater_id: string
  signed_at: string
  season_year: number
}
