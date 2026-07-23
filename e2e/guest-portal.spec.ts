import { expect, test } from '@playwright/test'

/**
 * Guest portal smoke.
 * - Invalid token always runs (no env).
 * - Live boutique check runs only when E2E_GUEST_TOKEN is set.
 *
 * Chromium: `npx playwright install chromium`
 */

test('token portail invalide affiche Portail indisponible', async ({ page }) => {
  await page.goto('/guest/stay/00000000-0000-4000-8000-000000000000')
  await expect(page.getByText(/Portail indisponible/i)).toBeVisible({ timeout: 15_000 })
})

test('boutique non vide avec token live', async ({ page }) => {
  const token = process.env.E2E_GUEST_TOKEN
  test.skip(!token, 'Définir E2E_GUEST_TOKEN pour le smoke boutique live')

  await page.goto(`/guest/stay/${token}`)
  await expect(page.getByText(/Portail indisponible/i)).toHaveCount(0)
  await page.getByRole('button', { name: /Boutique|Shop/i }).click()
  await expect(page.locator('body')).not.toContainText(/catalogue vide|aucun produit/i)
})
