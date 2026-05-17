import { test, expect } from '@playwright/test'

// Detailed UI assertions for the login page.
// Based on the source at frontend/src/app/login/page.tsx.

test.describe('Login page UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('page title includes the app name', async ({ page }) => {
    // The <title> tag is set by the Next.js layout; check the visible branding
    // h1 instead which is always present regardless of metadata config.
    await expect(page.getByRole('heading', { level: 1, name: /line creek fsc/i })).toBeVisible()
  })

  test('has a "Sign in" form heading', async ({ page }) => {
    // The <h2> inside the form reads "Sign in"
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('email input is present and labelled', async ({ page }) => {
    // Label text is "Email"; the input is type="email"
    const emailInput = page.getByLabel('Email')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('password input is present and labelled', async ({ page }) => {
    // Label text is "Password"; the input is type="password"
    const passwordInput = page.getByLabel('Password')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('email and password inputs are required', async ({ page }) => {
    await expect(page.getByLabel('Email')).toHaveAttribute('required', '')
    await expect(page.getByLabel('Password')).toHaveAttribute('required', '')
  })

  test('"Forgot password?" link is present and points to /forgot-password', async ({ page }) => {
    const link = page.getByRole('link', { name: /forgot password/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/forgot-password')
  })

  test('submit button is present and enabled when the form is idle', async ({ page }) => {
    const btn = page.getByRole('button', { name: /sign in/i })
    await expect(btn).toBeVisible()
    await expect(btn).toBeEnabled()
  })

  test('submit button shows loading state while request is in flight', async ({ page }) => {
    // Slow down the /api/token endpoint so the loading state is observable.
    await page.route('**/api/token/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 800))
      await route.continue()
    })

    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('anypassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // While loading the button is disabled and shows "Signing in…"
    await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
