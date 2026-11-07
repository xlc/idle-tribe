import { expect, test } from 'bun:test'
import { investmentOutcome } from './investment'
import { completeProject, startProject } from './research'
import { createDefaultState } from './state'
import { people } from './test-helpers'

test('output previews compare the current workforce through expansions and equipment without mutating the settlement', () => {
  const s = createDefaultState()
  s.facilities.farm.level = 1
  s.resources.food = 100
  s.resources.wood = 100
  s.resources.planks = 100
  s.resources.blocks = 100
  s.resources.tools = 100
  people(s, 'farmer')
  const original = structuredClone(s)
  const expansion = investmentOutcome(s, {
    kind: 'expand',
    id: 'farm',
    target: 2,
  })
  expect(expansion?.label).toBe('Food/s')
  expect(expansion?.before).toBeCloseTo(1)
  expect(expansion?.after).toBeCloseTo(1.1)
  const equipment = investmentOutcome(s, {
    kind: 'equip',
    id: 'farm',
    target: 1,
  })
  expect(equipment?.after).toBeCloseTo(1.2)
  expect(s).toEqual(original)
})

test('unstaffed workplaces, housing and storage show a useful investment consequence', () => {
  const s = createDefaultState()
  expect(
    investmentOutcome(s, { kind: 'expand', id: 'farm', target: 1 }),
  ).toEqual({ label: 'Work slots', before: 0, after: 2 })
  expect(
    investmentOutcome(s, { kind: 'expand', id: 'housing', target: 1 }),
  ).toEqual({ label: 'Housing capacity', before: 1, after: 3 })
  expect(
    investmentOutcome(s, {
      kind: 'expand',
      id: 'food-store',
      target: 1,
    }),
  ).toEqual({ label: 'Food storage', before: 50, after: 450 })
})

test('investment comparisons ignore unfinished construction', () => {
  const s = createDefaultState()
  s.research.agriculture = 1
  s.resources.food = 100
  s.resources.wood = 100
  s.resources.planks = 100
  s.resources.blocks = 100
  s.resources.tools = 100
  completeProject(s, { kind: 'research', id: 'shelters' })
  s.facilities.farm.level = 1
  people(s, 'farmer', 'builder')
  startProject(s, { kind: 'expand', id: 'farm', target: 2 })
  const outcome = investmentOutcome(s, {
    kind: 'expand',
    id: 'farm',
    target: 3,
  })
  expect(outcome?.before).toBeCloseTo(1.1)
  expect(outcome?.after).toBeCloseTo(1.2)
  expect(s.facilities.farm.level).toBe(1)
})
