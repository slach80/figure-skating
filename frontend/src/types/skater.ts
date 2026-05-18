export interface MembershipType {
  id: string
  name: string
  usfs_category: string
  price_in_club: string
  price_out_of_club: string
  is_family_plan: boolean
  is_active: boolean
}

export interface SkaterList {
  id: string
  first_name: string
  last_name: string
  usfs_number: string
  membership_status: 'pending' | 'active' | 'expired' | 'suspended'
  membership_expiry: string | null
  is_minor: boolean
}

export interface SkaterDetail extends SkaterList {
  middle_name: string
  preferred_name: string
  date_of_birth: string
  gender: 'F' | 'M' | 'X' | ''
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  membership_type: string | null
  membership_type_display: MembershipType | null
  skater_stats_slug: string
  skater_stats_last_synced: string | null
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  medical_notes: string
  name_pronunciation: string
  managed_by: string
  managed_by_email: string | null
  family_group: string | null
  is_active_member: boolean
}

export interface PaginatedResponse<T> {
  results: T[]
  next: string | null
  previous: string | null
}

export interface MembershipCardClub {
  name: string
  primary_color: string
  accent_color: string
  logo: string | null
}

export interface MembershipCardMembershipType {
  name: string
}

export interface MembershipCardData {
  id: string
  first_name: string
  last_name: string
  usfs_number: string
  membership_type: MembershipCardMembershipType | null
  membership_expiry: string | null
  club: MembershipCardClub
}
