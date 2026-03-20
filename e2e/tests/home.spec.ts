import { test, expect } from '@playwright/test'

test('home page loads with title', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Caption Aotearoa')
})

test('join form exists', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('label:has-text("Event code")')).toBeVisible()
})

test('login page loads', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('h1')).toContainText('Organiser Login')
})
