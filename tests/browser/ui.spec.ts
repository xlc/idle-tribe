import { expect, type Page, test } from '@playwright/test'
import { STORAGE_KEY } from '../../src/persistence'
import { enqueue, nextExpansion } from '../../src/research'
import { advanceTime } from '../../src/simulation'
import { createDefaultState } from '../../src/state'
import {
  advancedSettlement,
  complete,
  people,
  settlement,
} from '../../src/test-helpers'
import type { GameState } from '../../src/types'

async function open(page: Page, state: GameState) {
  await page.clock.install({ time: new Date('2026-10-19T10:00:00Z') })
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, state },
  )
  await page.goto('/')
}
async function readState(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
    STORAGE_KEY,
  )
}
for (const width of [1280, 390]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })
    test('opening discovery and manual pause survive ordinary interaction', async ({
      page,
    }, info) => {
      await open(page, createDefaultState())
      await expect(
        page.getByRole('button', { name: 'Gather food', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByText('+1 food · 1s', { exact: true }),
      ).toBeVisible()
      for (let i = 0; i < 10; i++) {
        await page
          .getByRole('button', { name: 'Gather food', exact: true })
          .click()
        await page.clock.runFor(1500)
        await expect(
          page.getByRole('button', { name: 'Gather food', exact: true }),
        ).toBeEnabled()
        expect((await readState(page)).resources.food).toBe(i + 1)
      }
      await expect(
        page.getByRole('button', { name: 'Explore nearby', exact: true }),
      ).toBeEnabled()
      await page
        .getByRole('button', { name: 'Explore nearby', exact: true })
        .click()
      await page.clock.runFor(3100)
      await expect(
        page.getByRole('button', { name: 'Gather wood', exact: true }),
      ).toBeVisible()
      for (let i = 0; i < 2; i++) {
        await page
          .getByRole('button', { name: 'Gather wood', exact: true })
          .click()
        await page.clock.runFor(2500)
        expect((await readState(page)).resources.wood).toBe(i + 1)
      }
      await expect(
        page.getByRole('tab', { name: 'Technology', exact: true }),
      ).toBeVisible()
      await page.screenshot({
        animations: 'disabled',
        path: info.outputPath('opening.png'),
        fullPage: true,
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })
    test('Fill, deliberate overstaffing, building queues and exact cancellation refunds', async ({
      page,
    }, info) => {
      const s = createDefaultState()
      s.discovered = { wood: true, stone: true }
      s.researchUnlocked = true
      complete(s, 'sharpened-stick', 'shelters')
      s.facilities.lumber.level = 1
      s.resources = {
        ...s.resources,
        food: 100,
        wood: 100,
        stone: 30,
        planks: 0,
        blocks: 0,
        tools: 0,
        knowledge: 0,
      }
      people(s, 'forager', 'idle', 'idle', 'idle', 'idle')
      s.welcome = false
      await open(page, s)
      const lumber = page.getByRole('article', {
        name: 'Lumber camp',
        exact: true,
      })
      await lumber.getByRole('button', { name: 'Fill', exact: true }).click()
      await expect(lumber.getByText('2 / 2', { exact: true })).toBeVisible()
      await lumber.getByRole('button', { name: '+', exact: true }).click()
      await expect(lumber.getByText('3 / 2', { exact: true })).toBeVisible()
      await page
        .getByRole('group', { name: 'builder staffing' })
        .getByRole('button', { name: 'Fill', exact: true })
        .click()
      const housing = page.getByRole('article', {
        name: 'Shelters',
        exact: true,
      })
      await housing
        .getByRole('button', { name: 'Queue build · 1', exact: true })
        .click()
      const queue = page.getByRole('region', { name: 'construction queue' })
      await expect(
        queue.getByText('Shelters · level 1', { exact: true }),
      ).toBeVisible()
      await housing
        .getByRole('button', { name: 'Queue build · 2', exact: true })
        .click()
      await queue.getByText('Planned · 1', { exact: false }).click()
      await expect(
        queue.getByText('Shelters · level 2', { exact: true }),
      ).toBeVisible()
      await queue.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.getByRole('dialog')).toContainText(
        'Refund 10 food · 20 wood',
      )
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirm', exact: true })
        .click()
      await expect(
        queue.getByText('Requires level 1', { exact: false }).first(),
      ).toBeVisible()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page.screenshot({
        animations: 'disabled',
        path: info.outputPath('settlement.png'),
        fullPage: true,
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })
    test('research plans persist through reload and branch confirmation is consequential', async ({
      page,
    }, info) => {
      const s = settlement()
      people(s, 'forager', 'builder', 'woodcutter', 'scholar')
      s.research.forestry = false
      s.research.joinery = false
      s.specialization = null
      await open(page, s)
      const tabs = page.getByRole('tablist', { name: 'Game views' })
      await tabs.getByRole('tab', { name: 'Settlement', exact: true }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(
        tabs.getByRole('tab', { name: 'Technology', exact: true }),
      ).toHaveAttribute('aria-selected', 'true')
      await expect(
        page.getByRole('tabpanel', { name: 'Technology', exact: true }),
      ).toBeVisible()
      const forestry = page.getByRole('article', {
        name: 'Forestry',
        exact: true,
      })
      await forestry
        .getByRole('button', { name: 'Choose path', exact: true })
        .click()
      await expect(page.getByRole('dialog')).toContainText(
        'This choice lasts for this run',
      )
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirm', exact: true })
        .click()
      await expect(
        page.getByRole('region', { name: 'research queue' }),
      ).toContainText('Forestry')
      await page.clock.runFor(3000)
      const before = await readState(page)
      await page.reload()
      await page.getByRole('tab', { name: 'Technology', exact: true }).click()
      const after = await readState(page)
      expect(after.queues.research.active?.paid).toEqual(
        before.queues.research.active?.paid,
      )
      expect(after.queues.research.active?.progress).toBeGreaterThanOrEqual(
        before.queues.research.active?.progress ?? 0,
      )
      await page.screenshot({
        animations: 'disabled',
        path: info.outputPath('technology.png'),
        fullPage: true,
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })
    test('a farm can be built, staffed, and used to start the town investment', async ({
      page,
    }, info) => {
      const s = settlement()
      s.research.writing = false
      s.facilities.farm.level = 0
      people(s, 'builder', 'forager', 'idle')
      await open(page, s)
      const farm = page.getByRole('article', { name: 'Farm', exact: true })
      await farm.getByRole('button', { name: /Queue build/ }).click()
      await page.getByRole('tab', { name: 'Technology', exact: true }).click()
      const writing = page.getByRole('article', {
        name: 'Writing',
        exact: true,
      })
      await page.clock.fastForward(16 * 60_000)
      await expect(writing).toContainText('Enter town era')
      await writing
        .getByRole('button', { name: 'Queue research', exact: true })
        .click()
      const state = await readState(page)
      expect(state.facilities.farm.level).toBe(1)
      expect(state.queues.research.active?.project.id).toBe('writing')
      expect(state.queues.research.active?.paid.knowledge).toBe(3600)
      await page.getByRole('tab', { name: 'Settlement', exact: true }).click()
      await farm.getByRole('button', { name: 'Fill', exact: true }).click()
      await expect(farm.getByText('1 / 2', { exact: true })).toBeVisible()
      expect(
        (await readState(page)).people.some((p) => p.job === 'farmer'),
      ).toBe(true)
      await page.screenshot({
        path: info.outputPath('agriculture.png'),
        fullPage: true,
        animations: 'disabled',
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })
    test('Chronometry discovers the time box and reset preserves purchased choices', async ({
      page,
    }, info) => {
      const s = settlement()
      complete(s, 'mechanization', 'precision-instruments')
      for (const resource of [
        'charge',
        'circuits',
        'data',
        'exotic-material',
        'quantum-components',
        'causal-models',
      ] as const)
        s.resources[resource] = 0
      people(s, 'forager')
      enqueue(s, { kind: 'research', id: 'chronometry' })
      advanceTime(s, 0)
      const active = s.queues.research.active
      if (!active) throw new Error('Chronometry did not start')
      active.progress = active.total - 1
      await open(page, s)
      await page.clock.runFor(2000)
      await page.getByRole('tab', { name: 'Time box', exact: true }).click()
      await expect(
        page.getByRole('button', { name: /Reset settlement/ }),
      ).toBeEnabled()
      await page.clock.runFor(250)
      await page.screenshot({
        animations: 'disabled',
        path: info.outputPath('time-box.png'),
        fullPage: true,
      })
      await page.getByRole('button', { name: /Reset settlement/ }).click()
      await expect(page.getByRole('dialog')).toContainText(
        'Lose all resources, people, facilities',
      )
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirm', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Gather food', exact: true }),
      ).toBeVisible()
      await page.getByRole('tab', { name: 'Time box', exact: true }).click()
      await page.getByRole('button', { name: '20 points', exact: true }).click()
      const saved = await readState(page)
      expect(saved.legacy.perks['early-astronomy']).toBe(true)
      expect(saved.legacy.lifetime).toBeGreaterThanOrEqual(20)
      expect(saved.people.length).toBe(1)
      await page.reload()
      expect((await readState(page)).legacy).toEqual(saved.legacy)
    })
    test('late production, storage filters and advanced saves work on the full catalog', async ({
      page,
    }, info) => {
      const s = advancedSettlement()
      people(s, 'farmer', 'builder', 'idle', 'idle')
      s.resources['causal-models'] = 0
      await open(page, s)
      await page
        .getByRole('button', { name: 'Production', exact: true })
        .click()
      const lab = page.getByRole('article', {
        name: 'Causal synthesis lab',
        exact: true,
      })
      await lab.getByRole('button', { name: 'Fill', exact: true }).click()
      await expect(lab.getByText('2 / 4', { exact: true })).toBeVisible()
      await lab.getByText('Details & upgrades', { exact: true }).click()
      await expect(lab).toContainText(
        '12 charge · 8 data · 1 quantum components → 1 causal models',
      )
      await page.clock.runFor(600000)
      expect(
        (await readState(page)).resources['causal-models'],
      ).toBeGreaterThan(0)
      await lab.screenshot({ path: info.outputPath('causal-production.png') })
      await page.getByRole('button', { name: 'Storage', exact: true }).click()
      await expect(
        page.getByRole('article', { name: 'Temporal vault', exact: true }),
      ).toBeVisible()
      await page.clock.runFor(250)
      await page.screenshot({
        animations: 'disabled',
        path: info.outputPath('late-storage.png'),
        fullPage: true,
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
      const before = await readState(page)
      await page.reload()
      const after = await readState(page)
      expect(after.facilities['causal-laboratory']).toEqual(
        before.facilities['causal-laboratory'],
      )
      expect(after.people.map((person) => person.job)).toEqual(
        before.people.map((person) => person.job),
      )
    })
    test('conversion preview, modern rebuild and removal retain stock and people', async ({
      page,
    }) => {
      const s = settlement()
      people(s, 'builder', 'woodcutter')
      s.facilities.lumber.level = 1
      await open(page, s)
      const lumber = page.getByRole('article', {
        name: 'Lumber camp',
        exact: true,
      })
      await lumber.getByText('Details & upgrades', { exact: true }).click()
      await lumber
        .getByRole('button', { name: 'Convert to Timber yard', exact: true })
        .click()
      await page.clock.runFor(300000)
      const timber = page.getByRole('article', {
        name: 'Timber yard',
        exact: true,
      })
      await expect(timber).toBeVisible()
      const before = await readState(page)
      await timber
        .getByRole('button', { name: 'Remove facility', exact: true })
        .click()
      await expect(page.getByRole('dialog')).toContainText(
        'workers become available',
      )
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Confirm', exact: true })
        .click()
      const after = await readState(page)
      expect(after.people.length).toBe(before.people.length)
      expect(after.resources.wood).toBeGreaterThanOrEqual(before.resources.wood)
      await page
        .getByRole('article', { name: 'Lumber camp', exact: true })
        .getByLabel('Build form')
        .selectOption('1')
      await expect(
        page
          .getByRole('article', { name: 'Timber yard', exact: true })
          .getByRole('button', { name: 'Queue build · 1', exact: true }),
      ).toBeVisible()
    })
    test('away report shows signed net changes, arrivals and completed plans', async ({
      page,
    }, info) => {
      const s = settlement()
      people(s, 'builder', 'idle')
      s.savedAt = new Date('2026-10-19T09:00:00Z').getTime()
      enqueue(s, nextExpansion(s, 'housing'))
      advanceTime(s, 0)
      await open(page, s)
      await page.getByRole('button', { name: /Away ·/ }).click()
      const report = page.getByRole('region', { name: 'Offline progress' })
      await expect(
        report
          .locator('.away-stats')
          .getByText('Projects completed')
          .locator('..'),
      ).toContainText('1')
      await expect(
        report.locator('.away-resources li').filter({ hasText: 'Food' }),
      ).toContainText('−120')
      await page.screenshot({ path: info.outputPath('away.png') })
      await report.getByRole('button', { name: /Away ·/ }).click()
      await expect(page.getByRole('button', { name: /Away ·/ })).toBeVisible()
    })
  })
}
