import { test, expect } from '@playwright/test'

// Minimal smoke coverage. Expand with auth/search flows as the app grows.

test('home redirects to a locale and renders the brand', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/(ko|en|ja|es)(\/|$)/)
  await expect(page.getByRole('link', { name: 'Showcase' })).toBeVisible()
})

test('explore page renders the tablist', async ({ page }) => {
  await page.goto('/en/explore')
  await expect(page.getByRole('tablist')).toBeVisible()
  await expect(page.getByRole('tab', { name: /Latest/ })).toBeVisible()
})

test('login page shows the credentials form', async ({ page }) => {
  await page.goto('/en/login')
  await expect(page.getByLabel('Username or Email')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
