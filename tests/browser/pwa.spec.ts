import { expect, type Page, test } from '@playwright/test'
import { parseSave, STORAGE_KEY } from '../../src/persistence'
import { createDefaultState } from '../../src/state'
import { advancedSettlement, people } from '../../src/test-helpers'
import { offlineServer } from './offline-server'

// Use real touch contexts; Chromium and WebKit both run this file.
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

async function offlineReady(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      )
  })
}

async function food(page: Page): Promise<number> {
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  )
  return parseSave(saved).resources.food
}

test('an installed shell reopens offline, plays, saves, and opens a new offline window', async ({
  page,
  context,
}) => {
  const origin = await offlineServer()
  try {
    await page.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
    await page.addInitScript(
      ({ key, state }) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(key, JSON.stringify(state))
      },
      { key: STORAGE_KEY, state: createDefaultState() },
    )
    await page.goto(origin.url)
    await offlineReady(page)
    const manifestUrl = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href')
    if (!manifestUrl) throw new Error('Manifest link missing')
    const manifestResponse = await page.request.get(
      new URL(manifestUrl, origin.url).href,
    )
    expect(manifestResponse.ok()).toBe(true)
    const manifest: {
      display: string
      start_url: string
      icons: { src: string }[]
    } = await manifestResponse.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    for (const icon of manifest.icons)
      expect(
        (await page.request.get(new URL(icon.src, origin.url).href)).ok(),
      ).toBe(true)

    await origin.close()
    await page.reload()
    const gather = page.getByRole('button', {
      name: 'Gather food',
      exact: true,
    })
    await gather.tap()
    await page.clock.runFor(1500)
    expect(await food(page)).toBe(1)
    await page.reload()
    await expect(gather).toBeEnabled()
    expect(await food(page)).toBe(1)

    // A new document must boot from the service worker, rather than the open page's memory.
    const reopened = await context.newPage()
    await reopened.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
    await page.close()
    await reopened.goto(`${origin.url}/?home-screen=1`)
    await expect(
      reopened.getByRole('button', { name: 'Gather food', exact: true }),
    ).toBeEnabled()
    expect(await food(reopened)).toBe(1)
  } finally {
    await origin.close()
  }
})

test('a downloaded update waits for the running game and activates after it closes', async ({
  page,
  context,
}) => {
  const origin = await offlineServer()
  try {
    await page.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
    await page.goto(origin.url)
    await offlineReady(page)
    await page.getByRole('button', { name: 'Gather food', exact: true }).tap()
    await page.clock.runFor(1500)
    origin.update()
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/')
      await registration?.update()
    })
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const registration =
            await navigator.serviceWorker.getRegistration('/')
          return registration?.waiting?.state
        }),
      )
      .toBe('installed')
    expect(await food(page)).toBe(1)
    expect(
      await page.evaluate(() =>
        navigator.serviceWorker.controller?.scriptURL.endsWith(
          '/service-worker.js',
        ),
      ),
    ).toBe(true)
    const reopening = await context.newPage()
    await page.close()
    await reopening.goto(origin.url)
    await expect
      .poll(() =>
        reopening.evaluate(async () =>
          (await caches.keys()).filter((key) => key.startsWith('tribe-app-')),
        ),
      )
      .toEqual(['tribe-app-browser-update'])
    await origin.close()
    await reopening.reload()
    await expect(
      reopening.getByRole('button', { name: 'Gather food', exact: true }),
    ).toBeEnabled()
    expect(await food(reopening)).toBe(1)
  } finally {
    await origin.close()
  }
})

test('touch controls and long lists stay within the viewport in portrait and landscape', async ({
  page,
  context,
  browserName,
}, info) => {
  const state = advancedSettlement()
  people(state, ...Array.from({ length: 36 }, (): 'idle' => 'idle'))
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: STORAGE_KEY, state },
  )
  await page.goto('/')
  const navigation = page.getByRole('tablist', { name: 'Game views' })
  await navigation.getByRole('tab', { name: 'People', exact: true }).tap()
  await page.getByLabel('Settler 36 occupation').scrollIntoViewIfNeeded()
  await page.getByLabel('Settler 36 occupation').selectOption('farmer')
  await expect(page.getByLabel('Settler 36 occupation')).toBeInViewport()
  await expect(navigation).toBeInViewport()
  expect(
    await page.evaluate(() => ({
      x: scrollX,
      y: scrollY,
      scale: visualViewport?.scale,
    })),
  ).toEqual({ x: 0, y: 0, scale: 1 })
  expect(
    await page.locator('.people-grid').evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0)
  await navigation.getByRole('tab', { name: 'Settlement', exact: true }).tap()
  await expect(
    page.getByRole('region', { name: 'Population' }).first(),
  ).toBeInViewport()
  const stock = page.getByRole('region', { name: 'Stockpile', exact: true })
  const box = await stock.boundingBox()
  if (!box) throw new Error('Stockpile missing')
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  if (browserName === 'chromium') {
    const client = await context.newCDPSession(page)
    await client.send('Input.synthesizePinchGesture', {
      x: 195,
      y: 300,
      scaleFactor: 1.6,
      gestureSourceType: 'touch',
    })
    await client.detach()
  }
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1)
  await page.screenshot({ path: info.outputPath('portrait.png') })

  await page.setViewportSize({ width: 844, height: 390 })
  await navigation.getByRole('tab', { name: 'Technology', exact: true }).tap()
  await expect(navigation).toBeInViewport()
  await navigation.getByRole('tab', { name: 'People', exact: true }).tap()
  await page.getByLabel('Settler 36 occupation').scrollIntoViewIfNeeded()
  await page.getByLabel('Settler 36 occupation').selectOption('forager')
  await expect(page.getByLabel('Settler 36 occupation')).toBeInViewport()
  await expect(navigation).toBeInViewport()
  const geometry = await page.evaluate(() => ({
    x: scrollX,
    y: scrollY,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    scale: visualViewport?.scale,
  }))
  expect(geometry).toEqual({
    x: 0,
    y: 0,
    width: 844,
    height: 390,
    viewportWidth: 844,
    viewportHeight: 390,
    scale: 1,
  })
  await page.screenshot({ path: info.outputPath('landscape.png') })
})
