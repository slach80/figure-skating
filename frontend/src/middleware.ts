import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login', '/register', '/forgot-password', '/set-password',
  '/home', '/about', '/coaches', '/contact', '/fake-checkout',
]

// Route prefix → allowed roles
const ROLE_RULES: [string, string[]][] = [
  ['/super-admin', ['super_admin']],
  ['/dashboard',   ['super_admin', 'admin']],
  ['/coach',       ['super_admin', 'admin', 'coach']],
  ['/member',      ['super_admin', 'admin', 'member']],
]

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? null
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/') return NextResponse.next()

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('access_token')?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = getRoleFromToken(token)

  for (const [prefix, allowed] of ROLE_RULES) {
    if (pathname.startsWith(prefix)) {
      if (!role || !allowed.includes(role)) {
        // Redirect to the portal they belong to
        if (role === 'member') return NextResponse.redirect(new URL('/member', request.url))
        if (role === 'coach') return NextResponse.redirect(new URL('/coach', request.url))
        if (role === 'admin' || role === 'super_admin') return NextResponse.redirect(new URL('/dashboard', request.url))
        return NextResponse.redirect(new URL('/login', request.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg|sw.js|api).*)'],
}
