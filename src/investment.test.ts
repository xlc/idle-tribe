import { expect, test } from 'bun:test'
import { investmentOutcome } from './investment'
import { completeProject, enqueue } from './research'
import { createDefaultState } from './state'
import { people } from './test-helpers'

test('output previews compare the current workforce through expansions and equipment without mutating the settlement', () => {
  const s = createDefaultState()
  s.facilities.farm.level = 1
  people(s, 'farmer')
  const original = structuredClone(s)
  const expansion = investmentOutcome(s, {
    kind: 'expand',
    id: 'farm',
    target: 2,
    form: 0,
  })
  expect(expansion?.label).toBe('Food/s')
  expect(expansion?.before).toBeCloseTo(0.3)
  expect(expansion?.after).toBeCloseTo(0.33)
  const equipment = investmentOutcome(s, {
    kind: 'equip',
    id: 'farm',
    target: 1,
  })
  expect(equipment?.after).toBeCloseTo(0.36)
  expect(s).toEqual(original)
})

test('unstaffed workplaces, housing and storage show a useful investment consequence', () => {
  const s = createDefaultState()
  expect(
    investmentOutcome(s, { kind: 'expand', id: 'farm', target: 1, form: 0 }),
  ).toEqual({ label: 'Work slots', before: 0, after: 2 })
  expect(
    investmentOutcome(s, { kind: 'expand', id: 'housing', target: 1, form: 0 }),
  ).toEqual({ label: 'Housing capacity', before: 1, after: 3 })
  expect(
    investmentOutcome(s, {
      kind: 'expand',
      id: 'food-store',
      target: 1,
      form: 0,
    }),
  ).toEqual({ label: 'Food storage', before: 120, after: 520 })
  completeProject(s, { kind: 'expand', id: 'food-store', target: 1, form: 0 })
  expect(
    investmentOutcome(s, { kind: 'convert', id: 'food-store', form: 1 }),
  ).toEqual({ label: 'Food storage', before: 520, after: 1320 })
})

test('investment comparisons account for preceding queued construction', () => {
  const s = createDefaultState()
  s.research.agriculture = 1
  s.facilities.farm.level = 1
  people(s, 'farmer')
  enqueue(s, { kind: 'expand', id: 'farm', target: 2, form: 0 })
  const outcome = investmentOutcome(s, {
    kind: 'expand',
    id: 'farm',
    target: 3,
    form: 0,
  })
  expect(outcome?.before).toBeCloseTo(0.33)
  expect(outcome?.after).toBeCloseTo(0.36)
  expect(s.facilities.farm.level).toBe(1)
})
