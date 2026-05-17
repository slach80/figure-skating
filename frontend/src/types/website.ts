export interface SiteConfig {
  id?: string
  tagline: string
  about_text: string
  contact_email: string
  contact_phone: string
  address: string
  facebook_url: string
  instagram_url: string
  rink_name: string
  rink_address: string
  created_at?: string
  updated_at?: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PublicCoach {
  id: string
  user_name: string
  user_email: string
  bio: string
  specialties: string
  is_active: boolean
}
