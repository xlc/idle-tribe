import { expect, type Page, test } from '@playwright/test'
import { ACTIONS } from '../../src/actions'
import { formatResource } from '../../src/format'
import { STORAGE_KEY } from '../../src/persistence'
import { enqueue, nextExpansion } from '../../src/research'
import { committed, storageMultiplier, threshold } from '../../src/resources'
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

    test('storage pressure explains slower gathering without moving controls', async ({
      page,
    }, info) => {
      const state = createDefaultState()
      state.discovered.wood = true
      state.resources.wood = threshold(state, 'wood')
      state.exploreUnlocked = true
      await open(page, state)
      const gather = page.getByRole('button', {
        name: 'Gather wood',
        exact: true,
      })
      const before = await gather.boundingBox()
      await expect(gather.locator('..')).toContainText('+1 wood · 2s')
      await gather.click()
      await page.clock.runFor(ACTIONS.sticks.seconds * 1000 + 1000)
      await expect(gather.locator('..')).toContainText('+1 wood · 2.02s')
      expect(await gather.boundingBox()).toEqual(before)
      const resource = page.getByRole('region', {
        name: 'Wood resource',
        exact: true,
      })
      await expect(
        resource.getByText('Storage ×0.992', { exact: true }),
      ).toBeVisible()
      await expect(resource.getByText('61', { exact: true })).toBeVisible()
      expect(await gather.boundingBox()).toEqual(before)
      await page.screenshot({ path: info.outputPath('storage.png') })
    })

    test('paid construction still contributes to explained storage pressure', async ({
      page,
    }) => {
      const building = settlement()
      people(building, 'builder')
      building.resources.wood = threshold(building, 'wood') + 1
      enqueue(building, nextExpansion(building, 'housing'))
      advanceTime(building, 0)
      const held = committed(building, 'wood')
      expect(held).toBeGreaterThan(1)
      expect(building.resources.wood).toBeLessThan(threshold(building, 'wood'))
      await open(page, building)
      const resource = page.getByRole('region', {
        name: 'Wood resource',
        exact: true,
      })
      await expect(
        resource.getByText(
          `Storage ×${formatResource(storageMultiplier(building, 'wood'))}`,
          { exact: true },
        ),
      ).toBeVisible()
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
      await expect(meter).toHaveAttribute(
        'aria-valuetext',
        `${formatResource(state.happiness)}, target ${formatResource(target)}`,
      )
      await page.screenshot({ path: info.outputPath('happiness.png') })
    })
  })
}

test('construction summary opens builder controls and retains them across toggles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await open(page, settlement())
  const toggle = page.getByRole('button', { name: 'Construction', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const builders = page.getByRole('group', { name: 'builder staffing' })
  await expect(builders).toBeVisible()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(builders).toBeVisible()
})
