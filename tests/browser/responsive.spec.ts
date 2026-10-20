import { expect, type Page, test } from '@playwright/test'
import { STORAGE_KEY } from '../../src/persistence'
import { advancedSettlement, people } from '../../src/test-helpers'
import type { JobId } from '../../src/types'

async function openSettlement(page: Page) {
  const state = advancedSettlement()
  people(state, 'forager', 'builder', ...Array<JobId>(34).fill('idle'))
  await page.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: STORAGE_KEY, state },
  )
  await page.goto('/')
}

for (const width of [320, 390, 768, 1024, 1280, 1920]) {
  test(`settlement controls remain usable at ${width}px and after resizing`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await openSettlement(page)
    const views = page.getByRole('tablist', { name: 'Game views' })
    const stockpile = page.getByRole('region', {
      name: 'Stockpile',
      exact: true,
    })
    const construction = page.getByRole('region', {
      name: 'Construction management',
    })
    const toggle = construction.getByRole('button', { name: /^Construction/ })
    const builders = page.getByRole('group', { name: 'builder staffing' })
    await toggle.click()
    await builders.getByRole('button', { name: 'Fill', exact: true }).click()
    await expect(builders.locator('.worker-count')).toHaveText('4')
    await toggle.click()

    await expect(
      stockpile.getByRole('region', {
        name: 'Causal models resource',
        exact: true,
      }),
    ).toBeVisible()
    const lab = page.getByRole('article', {
      name: 'Causal synthesis lab',
      exact: true,
    })
    await lab.getByText('Details & upgrades', { exact: true }).click()
    await lab.getByRole('button', { name: /Queue expansion/ }).click()
    // Navigation and desktop stock remain reachable while working at the end of a long catalog.
    await expect(
      views.getByRole('tab', { name: 'Settlement', exact: true }),
    ).toBeInViewport()
    if (width >= 720)
      await expect(
        stockpile.getByText('Food', { exact: false }).first(),
      ).toBeInViewport()
    await views.getByRole('tab', { name: 'Settlement', exact: true }).click()
    await views.getByRole('tab', { name: 'People', exact: true }).click()
    await expect(page.getByLabel('You occupation')).toBeInViewport()
    await page.getByLabel('Settler 36 occupation').selectOption('farmer')
    await expect(page.getByLabel('Settler 36 occupation')).toHaveValue('farmer')
    await page.screenshot({
      path: info.outputPath('people.png'),
      fullPage: true,
    })

    const newWidth = width < 720 ? 1440 : 390
    await page.setViewportSize({ width: newWidth, height: 900 })
    await expect(page.getByLabel('Settler 36 occupation')).toHaveValue('farmer')
    await views.getByRole('tab', { name: 'Settlement', exact: true }).click()
    await toggle.click()
    await expect(
      builders.getByRole('button', { name: '−', exact: true }),
    ).toBeEnabled()
    await page.screenshot({
      path: info.outputPath('resized-settlement.png'),
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}
