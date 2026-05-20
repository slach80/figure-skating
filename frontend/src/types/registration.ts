export interface MembershipType {
  id: string
  name: string
  usfs_category: string
  price_in_club: string
  price_out_of_club: string
  is_family_plan: boolean
  family_additional_discount_pct: string
}

export interface RegistrationFormData {
  // Step 2 — Skater info
  first_name: string
  last_name: string
  date_of_birth: string
  gender: 'F' | 'M' | 'X' | ''
  usfs_number: string
  is_us_citizen: boolean | null
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  // Step 3 — Membership
  membership_type_id: string
  // Step 4 — Emergency / medical
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  // COPPA
  coppa_consent: boolean
}

export const EMPTY_FORM: RegistrationFormData = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  usfs_number: '',
  is_us_citizen: null,
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  membership_type_id: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  coppa_consent: false,
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
]
