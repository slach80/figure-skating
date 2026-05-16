export interface LoginCredentials {
  email: string
  password: string
}

export interface TokenResponse {
  access: string
  refresh: string
}

export interface AuthUser {
  id: number
  uuid: string
  email: string
  first_name: string
  last_name: string
  role: 'member' | 'coach' | 'admin' | 'super_admin'
  club: string | null
}
