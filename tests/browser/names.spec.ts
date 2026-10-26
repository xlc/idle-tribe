import { expect, test } from '@playwright/test'
import { STORAGE_KEY } from '../../src/persistence'
import { createDefaultState } from '../../src/state'
import { required } from '../../src/test-helpers'

for (const width of [320, 1280]) {
  test.describe(`names ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('generated names can be edited, cancelled, and saved as text through reload', async ({
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
      const rename = page.getByRole('button', {
        name: `Rename ${founder}`,
        exact: true,
      })
      await rename.click()
      const name = page.getByRole('textbox', { name: 'Name', exact: true })
      await expect(name).toBeFocused()
      await expect(name).toHaveValue(founder)
      await name.fill('Discarded')
      await name.press('Escape')
      await expect(rename).toBeFocused()
      await rename.click()
      await expect(name).toHaveValue(founder)
      await name.fill('Also discarded')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await rename.click()
      await name.fill('  Éira   <b>Reed</b>  ')
      await name.press('Enter')
      const row = page.getByRole('article', {
        name: 'Éira <b>Reed</b>',
        exact: true,
      })
      await expect(row.locator('strong')).toHaveText('Éira <b>Reed</b>')
      await expect(
        page.getByRole('button', {
          name: 'Rename Éira <b>Reed</b>',
          exact: true,
        }),
      ).toBeFocused()
      await page.reload()
      await expect(row).toBeVisible()
      await row
        .getByRole('button', { name: 'Rename Éira <b>Reed</b>', exact: true })
        .click()
      await name.fill('Mira Longvale')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(
        page.getByRole('article', { name: 'Mira Longvale', exact: true }),
      ).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true)
    })
  })
}
