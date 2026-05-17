import { test, expect } from '@playwright/test'

test.describe('Auth — login flow', () => {
  test('navigating to /member while unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/member')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect preserves the original path as ?next param', async ({ page }) => {
    await page.goto('/member')
    await expect(page).toHaveURL(/next=%2Fmember/)
  })

  test('login page shows email and password fields and a submit button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('submitting with an empty form triggers browser-native required validation', async ({ page }) => {
    await page.goto('/login')
    // Click submit without filling anything — the form uses required attributes,
    // so the browser blocks submission and the URL stays at /login.
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('email field rejects an invalid email format', async ({ page }) => {
    await page.goto('/login')
    // Fill an invalid email and a password so password validation is satisfied,
    // then attempt to submit. type="email" + required prevents submission.
    await page.locator('input[type="email"]').fill('not-an-email')
    await page.locator('input[type="password"]').fill('anypassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('submitting with wrong credentials shows an error message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // The component sets state error = 'Invalid email or password.'
    await expect(page.getByText('Invalid email or password.')).toBeVisible()
  })
})
