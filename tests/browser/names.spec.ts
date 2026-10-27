import { expect, test } from '@playwright/test'
import { STORAGE_KEY } from '../../src/persistence'
import { createDefaultState } from '../../src/state'
import { required } from '../../src/test-helpers'

for (const width of [320, 1280]) {
  test.describe(`names ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('generated names are displayed without an edit control', async ({
      page,
    }) => {
      const state = createDefaultState(42),
        founder = required(state.people[0]).name
      await page.addInitScript(
        ({ key, state }) => {
          if (!localStorage.getItem(key))
            localStorage.setItem(key, JSON.stringify(state))
        },
        { key: STORAGE_KEY, state },
      )
      await page.goto('/')
      const row = page.getByRole('article', {
        name: founder,
        exact: true,
      })
      await expect(row).toBeVisible()
      await expect(row.locator('strong')).toHaveText(founder)
      await expect(row.getByRole('button')).toHaveCount(0)
      await expect(page.getByRole('textbox')).toHaveCount(0)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })
  })
}
