import api from './api'
import type { LoginCredentials, TokenResponse } from '@/types/auth'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

export async function login(credentials: LoginCredentials): Promise<TokenResponse & { role?: string }> {
  const { data } = await api.post<TokenResponse>('/api/v1/auth/token/', credentials)
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
  // Mirror to cookie so Next.js middleware can read it (Edge runtime has no localStorage)
  document.cookie = `access_token=${data.access}; path=/; SameSite=Lax`
  const payload = decodeJwtPayload(data.access)
  return { ...data, role: payload.role as string | undefined }
}

export function getTokenRole(): string | null {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  const payload = decodeJwtPayload(token)
  return (payload.role as string) ?? null
}

export async function logout() {
  const refresh = localStorage.getItem('refresh_token')
  if (refresh) {
    try {
      await api.post('/api/v1/auth/token/blacklist/', { refresh })
    } catch {
      // ignore — clear tokens regardless
    }
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  document.cookie = 'access_token=; path=/; max-age=0'
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('access_token')
}
