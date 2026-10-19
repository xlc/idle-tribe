import { expect, type Page, test } from '@playwright/test'
import { createDefaultState } from '../../src/state'
import { itemAt } from '../../src/test-helpers'
import type { GameState } from '../../src/types'

async function openGame(page: Page, state: GameState) {
  await page.addInitScript((state) => {
    if (sessionStorage.getItem('fixture')) return
    localStorage.setItem(
      'primitive-tribe-v1',
      JSON.stringify({ ...state, savedAt: Date.now() }),
    )
    sessionStorage.setItem('fixture', 'loaded')
  }, state)
  await page.goto('/')
}

function discoveredState() {
  const state = createDefaultState()
  state.explored = true
  state.exploreUnlocked = true
  state.researchUnlocked = true
  return state
}

test('research completion returns focus to Technology when the next level is unaffordable', async ({
  page,
}) => {
  const state = discoveredState()
  state.wood = 2
  state.fruit = 5
  await openGame(page, state)
  const technology = page.getByRole('tab', { name: /Technology/ })
  await technology.click()
  await page.locator('#research-button').click()
  await expect(page.locator('#feedback')).toHaveText(
    'Sharpened stick · level 1',
    { timeout: 10000 },
  )
  await expect(technology).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Settlement' })).toBeFocused()
})

test('unlocking workplaces moves focus to the collapsed Manual work summary', async ({
  page,
}) => {
  const state = discoveredState()
  state.wood = 20
  state.fruit = 20
  state.researchLevels['sharpened-stick'] = 1
  await openGame(page, state)
  await page.getByRole('tab', { name: /Technology/ }).click()
  await page.locator('#research-shelters-button').click()
  await page.getByRole('tab', { name: 'Settlement' }).click()
  await page.locator('#gather-button').focus()
  const summary = page.locator('#manual-work summary')
  await expect(summary).toBeFocused({ timeout: 10000 })
  await summary.press('Enter')
  await expect(page.locator('#gather-button')).toBeVisible()
  await page.locator('#gather-button').click()
  await expect(page.locator('#gather-button')).toHaveAttribute(
    'aria-busy',
    'true',
  )
})

for (const width of [1280, 390, 320]) {
  test(`worker controls, disclosures, and saves remain usable at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    const state = discoveredState()
    state.fruit = 200
    state.wood = 200
    state.researchLevels['sharpened-stick'] = 1
    state.researchLevels.shelters = 1
    state.buildings['foraging-camp'] = 1
    state.buildings['lumber-camp'] = 1
    itemAt(state.people, 0).name = '<img src=x onerror=alert(1)>'
    await page.setViewportSize({ width, height: 900 })
    await openGame(page, state)
    await page
      .getByRole('button', {
        name: 'Assign worker to Lumber camp',
        exact: true,
      })
      .click()
    await expect(
      page.locator('#building-lumber-camp .worker-count'),
    ).toHaveText('1 / 2')
    await page.locator('#people-details summary').click()
    const job = page.getByRole('combobox', {
      name: 'Workplace for <img src=x onerror=alert(1)>',
    })
    await job.selectOption('forager')
    await job.focus()
    await page.waitForTimeout(1100)
    await expect(job).toBeFocused()
    await expect(
      page.locator('#building-foraging-camp .worker-count'),
    ).toHaveText('1 / 2')
    await expect(page.locator('#tribe-list')).toContainText(
      '<img src=x onerror=alert(1)>',
    )
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'tribe')
    expect(
      await page
        .locator('#people-details summary')
        .evaluate((node) => getComputedStyle(node, '::after').content),
    ).toBe('""')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    if (width < 640)
      expect(
        await page
          .getByRole('button', {
            name: 'Remove worker from Foraging camp',
            exact: true,
          })
          .evaluate((node) => node.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44)
    await page.reload()
    await page.locator('#people-details summary').click()
    await expect(job).toHaveValue('forager')
    expect(errors).toEqual([])
  })
}

for (const [width, path] of [
  [1280, 'forestry'],
  [390, 'stonecraft'],
] as const) {
  test(`${path} choices, processing recovery and village completion at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.clock.install()
    const state = discoveredState()
    state.stoneFound = true
    for (const id of [
      'sharpened-stick',
      'shelters',
      'carpentry',
      'masonry',
      'writing',
    ] as const)
      state.researchLevels[id] = 1
    for (const id of [
      'foraging-camp',
      'lumber-camp',
      'quarry',
      'sawmill',
      'stoneworks',
      'study',
    ] as const)
      state.buildings[id] = 1
    state.fruit = state.planks = state.blocks = state.knowledge = 300
    itemAt(state.people, 0).job = 'sawyer'
    await openGame(page, state)
    await expect(page.locator('#building-sawmill .building-status')).toHaveText(
      'Waiting for wood',
    )
    await page.locator('#manual-work summary').click()
    for (let i = 0; i < 3; i++) {
      await page.locator('#sticks-button').click()
      await page.clock.runFor(2100)
    }
    await expect(page.locator('#building-sawmill .building-status')).toHaveText(
      'Producing',
    )
    await page.clock.runFor(8100)
    await expect(page.locator('.resource-planks .resource-value')).toHaveText(
      '301',
    )
    await page.getByRole('tab', { name: /Technology/ }).click()
    const choice = page.locator(`#research-${path}-button`)
    await choice.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Keep deciding' }).click()
    await expect(choice).toBeEnabled()
    await choice.click()
    await page.screenshot({
      path: testInfo.outputPath('specialization.png'),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Choose this path' }).click()
    await page.clock.runFor(12500)
    await expect(page.locator('#path-name')).toHaveText(
      path === 'forestry' ? 'Forestry' : 'Stonecraft',
    )
    await page.reload()
    await page.getByRole('tab', { name: /Technology/ }).click()
    for (const [id, duration] of [
      ['agriculture', 12000],
      [path === 'forestry' ? 'joinery' : 'architecture', 18000],
      ['engineering', 20000],
    ] as const) {
      await page.locator(`#research-${id}-button`).click()
      await page.clock.runFor(duration + 500)
    }
    await page.getByRole('tab', { name: 'Settlement' }).click()
    await page
      .getByRole('button', { name: 'Build Great Hall', exact: true })
      .click()
    await expect(page.locator('#village-complete')).toBeFocused()
    await expect(page.locator('#chapter')).toHaveText('Village established')
    await page.screenshot({
      path: testInfo.outputPath('village.png'),
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.reload()
    await expect(page.locator('#chapter')).toHaveText('Village established')
  })
}
