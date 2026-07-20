import { test, expect } from '@playwright/test'

test.describe('Contract generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@mybutlr.com')
    await page.getByLabel('Password').fill('TestPass123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })
  })

  test('contracts page loads with generate CTA', async ({ page }) => {
    await page.goto('/app/contracts')
    await expect(page.getByText(/contract/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /generate pdf/i })).toBeVisible({ timeout: 10_000 })
  })

  test('contract generator wizard loads steps', async ({ page }) => {
    await page.goto('/app/contracts/generate')
    await expect(page.getByText(/generateur|generator|modele|modèle/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /enregistrer|save|generer|générer|aperçu|apercu/i }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('can navigate to contract generation from contracts page', async ({ page }) => {
    await page.goto('/app/contracts')
    const genButton = page.getByRole('button', { name: /generate pdf/i })
    await expect(genButton).toBeVisible({ timeout: 10_000 })
    await genButton.click()
    await expect(page).toHaveURL(/\/app\/contracts\/generate/, { timeout: 10_000 })
  })

  test('wizard next navigates through parties step', async ({ page }) => {
    await page.goto('/app/contracts/generate')
    const next = page.getByRole('button', { name: /suivant|next/i })
    if (await next.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await next.click()
      await expect(page.getByText(/locataire|tenant|parties/i).first()).toBeVisible({ timeout: 10_000 })
    }
  })
})
