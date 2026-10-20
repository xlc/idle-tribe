import { expect, type Page, test } from '@playwright/test'
import { ACTIONS } from '../../src/actions'
import { STORAGE_KEY } from '../../src/persistence'
import { enqueue, nextExpansion } from '../../src/research'
import { committed, threshold } from '../../src/resources'
import { happinessTarget } from '../../src/settlement'
import { advanceTime } from '../../src/simulation'
import { createDefaultState } from '../../src/state'
import { people, settlement } from '../../src/test-helpers'
import type { GameState } from '../../src/types'

async function open(page: Page, state: GameState) {
  await page.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: STORAGE_KEY, state },
  )
  await page.goto('/')
}

for (const width of [320, 390, 1280]) {
  test.describe(`indicators ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('storage continues filling beyond its comfort marker', async ({
      page,
    }, info) => {
      const state = createDefaultState()
      state.discovered.wood = true
      state.resources.wood = threshold(state, 'wood')
      state.exploreUnlocked = true
      await open(page, state)
      const storage = page.getByRole('img', {
        name: 'Wood storage: 60, comfort 60',
        exact: true,
      })
      await expect(storage).toBeVisible()
      const fill = storage.locator('.meter-fill')
      const marker = storage.locator('.meter-marker')
      const filled = await fill.boundingBox()
      const marked = await marker.boundingBox()
      if (!filled || !marked) throw new Error('Storage indicator missing')
      expect(
        Math.abs(filled.x + filled.width - (marked.x + marked.width / 2)),
      ).toBeLessThan(1)

      await page
        .getByRole('button', { name: 'Gather wood', exact: true })
        .click()
      await page.clock.runFor(ACTIONS.sticks.seconds * 1000 + 1000)
      const crowded = page.getByRole('img', { name: /^Wood storage:/ })
      await expect(crowded).toHaveAttribute('data-pressure', 'true')
      const crowdedFill = await crowded.locator('.meter-fill').boundingBox()
      if (!crowdedFill) throw new Error('Storage fill missing')
      expect(crowdedFill.x + crowdedFill.width).toBeGreaterThan(
        marked.x + marked.width / 2,
      )

      await page.screenshot({ path: info.outputPath('storage.png') })
    })

    test('paid construction still contributes to storage pressure', async ({
      page,
    }) => {
      const building = settlement()
      people(building, 'builder')
      building.resources.wood = threshold(building, 'wood') + 1
      enqueue(building, nextExpansion(building, 'housing'))
      advanceTime(building, 0)
      expect(committed(building, 'wood')).toBeGreaterThan(1)
      expect(building.resources.wood).toBeLessThan(threshold(building, 'wood'))
      await open(page, building)
      await expect(
        page.getByRole('img', { name: /^Wood storage:/ }),
      ).toHaveAttribute('data-pressure', 'true')
    })

    test('happiness shows the current value and the target on the same scale', async ({
      page,
    }, info) => {
      const state = settlement()
      people(state, 'idle')
      state.happiness = 40
      const target = happinessTarget(state)
      await open(page, state)
      const meter = page.getByRole('meter', { name: 'Happiness', exact: true })
      await expect(meter).toHaveAttribute('value', '40')
      await expect(meter).toBeVisible()
      const marked = await meter
        .locator('..')
        .locator('.meter-marker')
        .boundingBox()
      const track = await meter.boundingBox()
      if (!marked || !track) throw new Error('Happiness indicator missing')
      expect(
        Math.abs(
          (marked.x + marked.width / 2 - track.x) / track.width - target / 100,
        ),
      ).toBeLessThan(0.02)
      await page.screenshot({ path: info.outputPath('happiness.png') })
    })
  })
}

test('construction chevron follows its controls when opened and closed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await open(page, settlement())
  const toggle = page.getByRole('button', { name: 'Construction', exact: true })
  const chevron = toggle.locator('.construction-chevron')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(
    page.getByRole('group', { name: 'builder staffing' }),
  ).toBeVisible()
  await expect(chevron).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(chevron).toHaveCSS('transform', 'none')
})
