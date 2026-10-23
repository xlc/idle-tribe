import { expect, type Page, test } from '@playwright/test'
import { STORAGE_KEY } from '../../src/persistence'
import { createDefaultState } from '../../src/state'
import type { GameState } from '../../src/types'

async function open(page: Page, state = createDefaultState()) {
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

test('action progress animates between ticks and resumes from paused work', async ({
  page,
}) => {
  await open(page)
  const gather = page.getByRole('button', { name: 'Gather food', exact: true })
  const bar = page.getByRole('progressbar', {
    name: 'Gather food progress',
    exact: true,
  })
  const progress = () =>
    bar.evaluate((element: HTMLProgressElement) => element.value)
  await gather.click()
  let previous = 0
  for (let i = 0; i < 3; i++) {
    await page.clock.runFor(100)
    const current = await progress()
    expect(current).toBeGreaterThan(previous)
    // Gradual animation, not a jump to the next tick's value; the loose
    // bound tolerates tick-boundary corrections under suite load.
    expect(current - previous).toBeLessThan(0.3)
    previous = current
  }
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  const paused = await progress()
  await page.clock.runFor(2000)
  expect(await progress()).toBeCloseTo(paused, 5)
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  await page.clock.runFor(100)
  expect(await progress()).toBeGreaterThan(paused)
  expect(await progress()).toBeLessThan(paused + 0.15)
  await page.clock.runFor(1500)
  await expect(gather).toBeEnabled()
  await gather.click()
  await page.clock.runFor(100)
  expect(await progress()).toBeGreaterThan(0)
  expect(await progress()).toBeLessThan(0.15)
})

for (const width of [320, 390, 1280]) {
  test.describe(`opening ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('gathering and discoveries keep existing controls in place', async ({
      page,
    }, info) => {
      await open(page)
      const gather = page.getByRole('button', {
        name: 'Gather food',
        exact: true,
      })
      const health = page.getByRole('img', { name: /^You health:/ })
      await expect(health).toHaveAttribute('aria-label', 'You health: 5 of 5')
      const anchors = {
        gather: await gather.boundingBox(),
      }
      await page.screenshot({ path: info.outputPath('initial.png') })

      await expect(
        page.getByRole('region', { name: 'Food resource', exact: true }),
      ).toContainText('-1/min')
      await expect(
        page.getByRole('article', { name: 'You', exact: true }),
      ).toContainText('Foraging aptitude · +5%')
      expect(await gather.boundingBox()).toEqual(anchors.gather)

      for (let i = 0; i < 10; i++) {
        await gather.click()
        await expect(
          page.getByRole('progressbar', {
            name: 'Gather food progress',
            exact: true,
          }),
        ).toBeVisible()
        expect(await gather.boundingBox()).toEqual(anchors.gather)
        await page.clock.runFor(1500)
        await expect(gather).toBeEnabled()
      }
      const foodAction = page.getByRole('article', {
        name: 'Gather food',
        exact: true,
      })
      await foodAction
        .getByRole('button', { name: 'Gather food details' })
        .click()
      await expect(foodAction.getByText('Level 3·1/6 XP')).toHaveText(
        'Level 3·1/6 XP',
      )
      const explore = page.getByRole('button', {
        name: 'Explore',
        exact: true,
      })
      await expect(explore).toBeEnabled()
      const discoveryPosition = await explore.boundingBox()
      await explore.click()
      expect(await explore.boundingBox()).toEqual(discoveryPosition)
      await page.clock.runFor(4200)
      const wood = page.getByRole('button', {
        name: 'Gather wood',
        exact: true,
      })
      await expect(wood).toBeVisible()
      await expect(page.getByRole('status')).toHaveText('Discovered wood')
      expect(await gather.boundingBox()).toEqual(anchors.gather)
      const woodPosition = await wood.boundingBox()
      for (let i = 0; i < 2; i++) {
        await wood.click()
        await page.clock.runFor(2500)
      }
      await expect(
        page.getByRole('tab', { name: 'Technology', exact: true }),
      ).toBeVisible()
      expect(await gather.boundingBox()).toEqual(anchors.gather)
      expect(await wood.boundingBox()).toEqual(woodPosition)
      await page.screenshot({ path: info.outputPath('discovered.png') })
      await page.reload()
      await foodAction
        .getByRole('button', { name: 'Gather food details' })
        .click()
      await expect(foodAction).toContainText('Level 3')
      await expect(foodAction).toContainText('1/6 XP')
      await page.clock.runFor(360000)
      await expect(health).toHaveAttribute('aria-label', 'You health: 3 of 5')
      expect(await gather.boundingBox()).toEqual(anchors.gather)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })

    test('poor health, meal portions and recovery stay visible through reload', async ({
      page,
    }, info) => {
      const state: GameState = createDefaultState()
      state.resources.food = 5
      const person = state.people[0]
      if (!person) throw new Error('Founder missing')
      person.health = 1
      await open(page, state)
      const health = page.getByRole('img', { name: /^You health:/ })
      const gather = page.getByRole('button', {
        name: 'Gather food',
        exact: true,
      })
      await expect(health).toHaveAttribute('aria-label', 'You health: 1 of 5')
      await page.screenshot({ path: info.outputPath('hungry.png') })
      const before = await gather.boundingBox()
      await expect(
        page.getByRole('region', { name: 'Food resource', exact: true }),
      ).toContainText('-0.1/min')
      await page
        .getByRole('button', { name: 'Feast · 4 food', exact: true })
        .click()
      await expect(
        page.getByRole('img', { name: 'You health: 5 of 5', exact: true }),
      ).toBeVisible()
      await expect(health).toHaveAttribute('aria-label', 'You health: 5 of 5')
      expect(await gather.boundingBox()).toEqual(before)
      await page.reload()
      await expect(health).toHaveAttribute('aria-label', 'You health: 5 of 5')
      await page.screenshot({ path: info.outputPath('recovered.png') })
    })
  })
}
