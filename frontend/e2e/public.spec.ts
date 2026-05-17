import { test, expect } from '@playwright/test'

// Public pages fetch from /api/v1/website/ but render gracefully when the API
// returns empty data, so these tests work against a running dev stack without
// any pre-seeded content.

test.describe('Public website pages', () => {
  test('/home — loads and shows the club hero heading', async ({ page }) => {
    await page.goto('/home')
    // The h1 is hardcoded in the JSX — it does not depend on API data.
    await expect(page.getByRole('heading', { level: 1, name: /Line Creek.*Figure Skating Club/i })).toBeVisible()
  })

  test('/home — shows "Join Now" and "Member Login" CTA links', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByRole('link', { name: /join now/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /member login/i })).toBeVisible()
  })

  test('/home — programs section is visible', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByText('Programs for Every Level')).toBeVisible()
  })

  test('/about — loads and shows the "About Us" heading', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1, name: /about us/i })).toBeVisible()
  })

  test('/about — has links to other public sections', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('link', { name: /contact us/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /meet our coaches/i })).toBeVisible()
  })

  test('/coaches — loads and shows the "Our Coaches" heading', async ({ page }) => {
    await page.goto('/coaches')
    await expect(page.getByRole('heading', { level: 1, name: /our coaches/i })).toBeVisible()
  })

  test('/coaches — shows empty state or coach cards when API data is absent', async ({ page }) => {
    await page.goto('/coaches')
    // When the API returns no coaches the component renders a fallback paragraph.
    // When coaches exist it renders coach cards. Either way the page should not
    // be a blank error screen — at minimum the CTA section at the bottom is shown.
    await expect(page.getByText('Ready to Start Skating?')).toBeVisible()
  })

  test('/contact — loads and shows the "Contact Us" heading', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { level: 1, name: /contact us/i })).toBeVisible()
  })

  test('/contact — contact form has name, email, message inputs and a send button', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByLabel(/your name/i)).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/message/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send message/i })).toBeVisible()
  })
})
