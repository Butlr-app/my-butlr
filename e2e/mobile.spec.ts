import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })

test.describe('Mobile shells smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@mybutlr.com')
    await page.getByLabel('Password').fill('TestPass123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    // test account is typically staff/owner → /app or /hm depending on profile role
    await page.waitForURL(/\/(app|hm|guest|partner)/, { timeout: 15_000 })
  })

  test('staff can open HM field app on phone viewport', async ({ page }) => {
    await page.goto('/hm')
    // Either HM today loads, or redirect to role home if unauthorized
    await page.waitForURL(/\/(hm|app|guest|partner)/, { timeout: 10_000 })
    if (page.url().includes('/hm')) {
      await expect(page.getByRole('link', { name: /today|aujourd/i }).or(page.locator('nav a').first())).toBeVisible({ timeout: 10_000 })
    }
  })

  test('guest shell route is reachable structure-wise', async ({ page }) => {
    await page.goto('/guest')
    await page.waitForURL(/\/(guest|app|hm|partner|login)/, { timeout: 10_000 })
    // If allowed (owner bypass), bottom nav Explore exists
    if (page.url().includes('/guest')) {
      await expect(page.getByRole('link', { name: /explore/i })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('link', { name: /guides/i })).toHaveCount(0)
    }
  })

  test('partner shell route is reachable structure-wise', async ({ page }) => {
    await page.goto('/partner')
    await page.waitForURL(/\/(partner|app|hm|guest|login)/, { timeout: 10_000 })
    if (page.url().includes('/partner')) {
      await expect(page.getByRole('link', { name: /dashboard|bookings|earnings/i }).first()).toBeVisible({ timeout: 10_000 })
    }
  })
})
