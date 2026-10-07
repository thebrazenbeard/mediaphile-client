import { test, expect } from '@playwright/test'

test('real LAN server scans, authenticates, browses and plays synthetic video', async ({ page }) => {
  const username = process.env.MEDIAPHILE_E2E_USERNAME
  const password = process.env.MEDIAPHILE_E2E_PASSWORD
  const itemId = process.env.MEDIAPHILE_E2E_ITEM_ID
  if (!username || !password || !itemId) throw new Error('Real-server fixture environment is missing')

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /Enter Mediaphile/ }).click()
  await expect(page.getByRole('link', { name: 'Movies', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Movies', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Open Synthetic Film' })).toBeVisible()
  await page.getByRole('link', { name: 'Open Synthetic Film' }).click()
  await expect(page.getByRole('heading', { name: 'Synthetic Film' })).toBeVisible()

  const mediaResponsePromise = page.waitForResponse(
    response => response.url().includes('/api/v1/media/') && [200, 206].includes(response.status()),
  )
  await page.getByRole('link', { name: /Play Movie/ }).click()
  const video = page.getByLabel('Playing Synthetic Film')
  await expect(video).toBeVisible()
  const response = await mediaResponsePromise
  expect(response.status()).toBeGreaterThanOrEqual(200)
  await expect(page.getByText('DIRECT PLAY', { exact: false })).toBeVisible()

  await page.waitForFunction(() => {
    const media = document.querySelector('video')
    return media && media.readyState >= HTMLMediaElement.HAVE_METADATA && media.duration >= 6
  })

  const progressResponsePromise = page.waitForResponse(response =>
    response.request().method() === 'PATCH' &&
    response.url().includes('/api/v1/playback/sessions/') &&
    response.status() === 200,
  )
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.currentTime = 2.1
    await element.play()
    element.pause()
  })
  const progressResponse = await progressResponsePromise
  const progress = await progressResponse.json()
  expect(progress.positionMs).toBeGreaterThanOrEqual(1000)
})
