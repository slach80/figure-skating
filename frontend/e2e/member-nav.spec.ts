import { test, expect } from '@playwright/test'

// The Next.js middleware (src/middleware.ts) redirects every non-public path to
// /login?next=<path> when the access_token cookie is absent.  These tests
// verify that protection is in place without needing a seeded test database or
// real credentials.

const PROTECTED_ROUTES = [
  '/member',
  '/member/lessons',
  '/member/competitions',
  '/member/payments',
  '/member/family',
]

for (const route of PROTECTED_ROUTES) {
  test(`unauthenticated GET ${route} redirects to /login`, async ({ page }) => {
    await page.goto(route)
    await expect(page).toHaveURL(/\/login/)
  })

  test(`redirect from ${route} includes ?next param`, async ({ page }) => {
    await page.goto(route)
    const url = new URL(page.url())
    expect(url.searchParams.get('next')).toBe(route)
  })
}
