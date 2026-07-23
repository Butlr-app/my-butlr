import { expect, test } from '@playwright/test'

test('la page publique se charge', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toContainText('butlr')
})

test('une page privée redirige vers la connexion', async ({ page }) => {
  await page.goto('/app/reservations')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
})

test('la cérémonie de signature est publique et demande une vérification OTP', async ({ page }) => {
  await page.goto('/sign/test-token')
  await expect(page).toHaveURL(/\/sign\/test-token$/)
  await expect(page.getByRole('heading', { name: 'Signature électronique sécurisée' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recevoir mon code' })).toBeVisible()
})
