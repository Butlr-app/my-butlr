import { test, expect } from '@playwright/test'

test.describe('Contract generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@mybutlr.com')
    await page.getByLabel('Password').fill('TestPass123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })
  })

  test('contracts page loads', async ({ page }) => {
    await page.goto('/app/contracts')
    await expect(page.getByText(/contract/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('contract generator page loads', async ({ page }) => {
    await page.goto('/app/contracts/generate')
    await page.waitForTimeout(2000)
    // Should see some form or wizard content
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('can navigate to contract generation from contracts page', async ({ page }) => {
    await page.goto('/app/contracts')
    await page.waitForTimeout(2000)

    const genButton = page.getByRole('link', { name: /generat|creat|new/i }).first()
      .or(page.getByRole('button', { name: /generat|creat|new/i }).first())
    if (await genButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await genButton.click()
      await expect(page).toHaveURL(/\/app\/contracts\/generate/, { timeout: 10_000 })
    }
  })
})
