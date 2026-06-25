import { test, expect } from '@playwright/test'

test.describe('Login flow', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Sign in to your account')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('wrong@email.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid/i).or(page.getByText(/error/i))).toBeVisible({ timeout: 10_000 })
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@mybutlr.com')
    await page.getByLabel('Password').fill('TestPass123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })
  })

  test('forgot password link is present', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Forgot your password?')).toBeVisible()
  })
})
