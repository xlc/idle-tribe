import { expect, type Page, test } from '@playwright/test'
import { parseSave, STORAGE_KEY } from '../../src/persistence'
import { practiceThreshold } from '../../src/skills'
import { createDefaultState, createPerson } from '../../src/state'
import { complete, required, settlement } from '../../src/test-helpers'
import type { GameState } from '../../src/types'

const founder = required(createDefaultState().people[0]).name

async function open(page: Page, state: GameState) {
  await page.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
  await page.addInitScript(
    ({ key, state }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY, state },
  )
  await page.goto('/')
}
async function saved(page: Page) {
  // Visibility flips force a save, so throttled tick writes land first.
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  )
  return parseSave(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  )
}

for (const width of [1280, 390]) {
  test.describe(`villagers ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('the founder has a visible aptitude before automation', async ({
      page,
    }) => {
      await open(page, createDefaultState())
      await expect(
        page.getByRole('article', { name: founder, exact: true }),
      ).toContainText('Foraging aptitude · +5%')
      await expect(page.getByLabel(`${founder} occupation`)).not.toBeAttached()
      await page
        .getByRole('button', { name: 'Gather food', exact: true })
        .click()
      await page.clock.runFor(1500)
      expect((await saved(page)).resources.food).toBe(1)
    })

    test('staffing chooses expertise and explicit assignments preserve earlier skills', async ({
      page,
    }, info) => {
      const s = settlement()
      s.facilities.lumber.level = 1
      s.people = [
        createPerson('Mira', 'woodcutter'),
        createPerson('Tavi', 'stoneworker'),
        createPerson('Neri', 'forager'),
        createPerson('Rowan', 'woodcutter'),
      ]
      required(s.people[0]).practice.woodcutter = practiceThreshold(4)
      required(s.people[1]).practice.stoneworker = practiceThreshold(4)
      required(s.people[2]).job = 'forager'
      required(s.people[2]).practice.forager = practiceThreshold(4)
      await open(page, s)
      const lumber = page.getByRole('article', {
        name: 'Lumber camp',
        exact: true,
      })
      await lumber.getByRole('button', { name: '+', exact: true }).click()
      await expect(lumber.getByRole('status')).toHaveText('1')
      expect(required((await saved(page)).people[0]).job).toBe('woodcutter')
      await lumber.getByRole('button', { name: 'Fill', exact: true }).click()
      expect(
        (await saved(page)).people
          .filter((p) => p.job === 'woodcutter')
          .map((p) => p.name),
      ).toEqual(['Mira', 'Rowan'])
      await lumber.getByRole('button', { name: '−', exact: true }).click()
      await expect(lumber.getByRole('status')).toHaveText('1')
      expect(required((await saved(page)).people[3]).job).toBe('idle')
      await page.getByRole('tab', { name: 'People', exact: true }).click()
      const rowan = page.getByRole('article', { name: 'Rowan', exact: true })
      await expect(rowan.getByText('Occupation', { exact: true })).toBeVisible()
      await expect(
        rowan.getByRole('option', { name: 'Unassigned', exact: true }),
      ).toHaveJSProperty('selected', true)
      await page.getByLabel('Rowan occupation').selectOption('forager')
      await expect(rowan).toContainText('food/s')
      await page.getByLabel('Rowan occupation').selectOption('idle')
      expect(required((await saved(page)).people[3]).job).toBe('idle')
      await page.getByLabel('Tavi occupation').selectOption('sawyer')
      await page.clock.runFor(30000)
      const before = await saved(page)
      expect(required(before.people[1]).practice.sawyer).toBeGreaterThan(0)
      await page.getByLabel('Tavi occupation').selectOption('stoneworker')
      await page
        .getByRole('article', { name: 'Tavi', exact: true })
        .getByText('Expertise · level 4', { exact: true })
        .click()
      await expect(
        page.getByRole('article', { name: 'Tavi', exact: true }),
      ).toContainText('Stoneworking · level 4')
      await expect(
        page.getByRole('article', { name: 'Tavi', exact: true }),
      ).toContainText('Sawing · level 0')
      await page.getByLabel('Neri occupation').selectOption('farmer')
      expect(
        required((await saved(page)).people[2]).practice.farmer,
      ).toBeLessThan(practiceThreshold(1))
      await expect(
        page.getByRole('article', { name: 'Neri', exact: true }),
      ).toContainText('Expertise · level 0')
      await page
        .getByRole('region', { name: 'People', exact: true })
        .screenshot({
          path: info.outputPath('people.png'),
          animations: 'disabled',
        })
      await page.screenshot({
        path: info.outputPath('villager-assignments.png'),
        fullPage: true,
        animations: 'disabled',
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
      const beforeReload = await saved(page)
      await page.reload()
      const restored = await saved(page)
      expect(required(restored.people[1]).practice.sawyer).toBeCloseTo(
        required(beforeReload.people[1]).practice.sawyer,
        5,
      )
      expect(
        required(restored.people[2]).practice.forager,
      ).toBeGreaterThanOrEqual(practiceThreshold(4))
      expect(required(restored.people[2]).job).toBe('farmer')
    })

    test('fixed meals restore work and the first expertise milestone appears through practice', async ({
      page,
    }, info) => {
      // Pre-farm settlement so wild gathering is still the active food work.
      const s = createDefaultState()
      complete(s, 'sharpened-stick', 'shelters')
      s.resources.food = 10
      const person = createPerson('Neri', 'forager')
      person.job = 'forager'
      person.health = 2
      person.practice.forager = 890
      s.people = [person]
      s.facilities['food-store'].level = 10000
      await open(page, s)
      await page.getByRole('tab', { name: 'People', exact: true }).click()
      const row = page.getByRole('article', { name: 'Neri', exact: true })
      await expect(
        row.getByRole('img', { name: 'Neri health: 2 of 5', exact: true }),
      ).toHaveText('♥♥♡♡♡')
      await page.clock.runFor(180000)
      await expect(
        row.getByRole('img', { name: 'Neri health: 5 of 5', exact: true }),
      ).toHaveText('♥♥♥♥♥')
      await page.clock.runFor(15000)
      await row.getByText('Expertise · level 1', { exact: true }).click()
      await expect(row).toContainText('+5% expertise')
      await expect(
        row.getByRole('progressbar', { name: 'Foraging practice' }),
      ).toBeVisible()
      await row.screenshot({
        path: info.outputPath('practiced-forager.png'),
        animations: 'disabled',
      })
    })

    test('return reports group personal milestones and large rosters remain usable', async ({
      page,
    }, info) => {
      const s = settlement()
      s.facilities.stockyard.level = 100000
      s.facilities['food-store'].level = 100000
      s.facilities.lumber.level = 4
      s.people = Array.from({ length: 36 }, (_, i) =>
        createPerson(`Villager ${i + 1}`, 'woodcutter'),
      )
      for (const person of s.people.slice(0, 7)) person.job = 'woodcutter'
      s.savedAt = new Date('2026-10-20T09:00:00Z').getTime()
      await open(page, s)
      await page.getByRole('button', { name: /Away ·/ }).click()
      const report = page.getByRole('region', { name: 'Offline progress' })
      await report.getByRole('button', { name: /Away ·/ }).click()
      await expect(report).toContainText('Growing expertise')
      await expect(
        report.locator('li').filter({ hasText: 'Villager 1' }),
      ).toContainText('Woodcutting 0 → 2')
      await report.getByText('2 more people', { exact: true }).click()
      await expect(
        report.locator('li').filter({ hasText: 'Villager 7' }),
      ).toBeVisible()
      await report.screenshot({
        path: info.outputPath('expertise-return.png'),
        animations: 'disabled',
      })
      await report.getByRole('button', { name: /Away ·/ }).click()
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Close' })
        .click()
      await page.getByRole('tab', { name: 'People', exact: true }).click()
      await page.getByLabel('Villager 36 occupation').selectOption('farmer')
      await expect(page.getByLabel('Villager 36 occupation')).toHaveValue(
        'farmer',
      )
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })
  })
}
