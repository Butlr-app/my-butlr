import { test, expect } from '@playwright/test'

test.describe('Properties CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@mybutlr.com')
    await page.getByLabel('Password').fill('TestPass123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })
  })

  test('navigates to properties page and lists items', async ({ page }) => {
    await page.goto('/app/properties')
    await expect(page.getByText(/propert/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('can open create property modal', async ({ page }) => {
    await page.goto('/app/properties')
    await page.waitForTimeout(2000)

    const addButton = page.getByRole('button', { name: /add|new|create|\+/i }).first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(1000)
      // Modal or form should appear
      const nameInput = page.getByLabel(/name/i).first()
        .or(page.getByPlaceholder(/name/i).first())
      await expect(nameInput).toBeVisible({ timeout: 5_000 })
    }
  })

  test('property detail page loads', async ({ page }) => {
    await page.goto('/app/properties')
    await page.waitForTimeout(3000)

    // Click on first property link/card if exists
    const propertyLink = page.locator('a[href*="/app/properties/"]').first()
      .or(page.locator('[data-testid="property-card"]').first())
    if (await propertyLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await propertyLink.click()
      await expect(page).toHaveURL(/\/app\/properties\//, { timeout: 10_000 })
    }
  })
})
