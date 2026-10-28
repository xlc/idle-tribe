import { expect, test } from 'bun:test'
import { parseSave } from './persistence'
import {
  completeProject,
  enqueue,
  quoteProject,
  researchUpgradeVisible,
} from './research'
import { researchEffects } from './research-effects'
import { createDefaultState } from './state'

test('reloading a queued project does not allow the same project to be queued again', () => {
  const state = createDefaultState()
  expect(
    enqueue(state, { kind: 'expand', id: 'housing', target: 1, form: 0 }),
  ).toBe(true)
  const restored = parseSave(JSON.stringify(state))
  expect(restored.queues.construction.waiting).toHaveLength(1)
  expect(
    enqueue(restored, { kind: 'expand', id: 'housing', target: 1, form: 0 }),
  ).toBe(false)
  expect(
    enqueue(restored, { kind: 'expand', id: 'housing', target: 2, form: 0 }),
  ).toBe(true)
  expect(restored.queues.construction.waiting).toHaveLength(2)
})

test('repeatable research has gated levels, rising costs, and a hard maximum', () => {
  const state = createDefaultState()
  state.research['inventory-keeping'] = 1
  expect(researchUpgradeVisible(state, 'inventory-keeping')).toBe(false)

  state.research.writing = 1
  expect(researchUpgradeVisible(state, 'inventory-keeping')).toBe(true)

  const levelTwo = quoteProject(state, {
    kind: 'research',
    id: 'inventory-keeping',
    target: 2,
  })
  expect(levelTwo.blocker).toBe('')
  expect(levelTwo.cost.knowledge).toBe(Math.ceil(1200 * 1.75))
  expect(levelTwo.total).toBe(16200 * 1.2)

  completeProject(state, {
    kind: 'research',
    id: 'inventory-keeping',
    target: 2,
  })
  expect(state.research['inventory-keeping']).toBe(2)
  expect(researchEffects(state, 'inventory-keeping').storage).toBeCloseTo(
    1.5 * 1.08,
  )

  const levelThree = quoteProject(state, {
    kind: 'research',
    id: 'inventory-keeping',
    target: 3,
  })
  expect(levelThree.cost.knowledge).toBe(Math.ceil(1200 * 1.75 ** 2))
  completeProject(state, {
    kind: 'research',
    id: 'inventory-keeping',
    target: 3,
  })
  expect(researchEffects(state, 'inventory-keeping').storage).toBeCloseTo(
    1.5 * 1.08 ** 2,
  )

  const maximum = quoteProject(state, {
    kind: 'research',
    id: 'inventory-keeping',
    target: 4,
  })
  expect(maximum.blocker).toBe('Maximum level 3')
  expect(enqueue(state, maximumProject('inventory-keeping', 4))).toBe(false)
})

test('repeatable effects do not repeat one-time offline bonuses', () => {
  const state = createDefaultState()
  state.research['record-keeping'] = 3
  const effects = researchEffects(state, 'record-keeping')
  expect(effects.offlineHours).toBe(4)
  expect(effects.resourceStorage?.knowledge).toBeCloseTo(1.5 * 1.08 ** 2)
})

function maximumProject(id: 'inventory-keeping', target: number) {
  return { kind: 'research' as const, id, target }
}
