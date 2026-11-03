import { expect, test } from 'bun:test'
import { actionDuration, actionYield, currentAction, xpFactor } from './actions'
import { RESEARCH } from './definitions'
import { parseSave } from './persistence'
import {
  completeProject,
  enqueue,
  quoteProject,
  researchQueueUnlocked,
  researchUpgradeVisible,
  researchVisible,
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

test('research prerequisites stay hidden until the prerequisite completes', () => {
  const state = createDefaultState()
  state.discovered.wood = true
  state.researchUnlocked = true

  expect(researchVisible(state, 'sharpened-stick')).toBe(true)
  expect(enqueue(state, { kind: 'research', id: 'sharpened-stick' })).toBe(true)
  expect(researchVisible(state, 'shelters')).toBe(false)

  completeProject(state, { kind: 'research', id: 'sharpened-stick' })
  expect(researchVisible(state, 'shelters')).toBe(true)
})

test('early gathering research upgrades actions into better tiers', () => {
  const state = createDefaultState()
  state.discovered = { wood: true, stone: true }
  state.researchUnlocked = true

  // Stone axes need shaped rock first, so woodcutting stays hidden.
  expect(researchVisible(state, 'woodcutting')).toBe(false)
  expect(researchVisible(state, 'field-practice')).toBe(false)
  completeProject(state, { kind: 'research', id: 'sharpened-stick' })
  expect(researchVisible(state, 'woodcutting')).toBe(false)
  // The sharpened stick itself upgrades food gathering to Dig roots.
  expect(actionYield(state, 'gather')).toBeCloseTo(4 * 1.25)
  expect(actionDuration(state, 'gather')).toBeCloseTo(4)
  expect(researchVisible(state, 'field-practice')).toBe(false)
  completeProject(state, { kind: 'research', id: 'shelters' })
  expect(researchVisible(state, 'field-practice')).toBe(true)
  expect(researchVisible(state, 'stonecutting')).toBe(false)

  const xpBefore = xpFactor(state, 'sticks')
  completeProject(state, { kind: 'research', id: 'stone-tools' })
  expect(researchVisible(state, 'woodcutting')).toBe(true)
  expect(researchVisible(state, 'stonecutting')).toBe(true)
  completeProject(state, { kind: 'research', id: 'woodcutting' })
  completeProject(state, { kind: 'research', id: 'field-practice' })
  // Chop wood: 5 wood per 6s trip instead of 1 per 2s.
  expect(actionYield(state, 'sticks')).toBeCloseTo(5)
  expect(actionDuration(state, 'sticks')).toBeCloseTo(6)
  expect(currentAction(state, 'sticks').name).toBe('Chop wood')
  expect(xpFactor(state, 'sticks')).toBeCloseTo(xpBefore + 0.03)
  // The tier is the whole payoff; no extra research levels.
  expect(researchUpgradeVisible(state, 'woodcutting')).toBe(false)
  expect(researchUpgradeVisible(state, 'field-practice')).toBe(true)

  completeProject(state, { kind: 'research', id: 'stonecutting' })
  expect(actionYield(state, 'stone')).toBeCloseTo(6)
  expect(actionDuration(state, 'stone')).toBeCloseTo(8)
  expect(currentAction(state, 'stone').name).toBe('Quarry stone')
  expect(researchUpgradeVisible(state, 'stonecutting')).toBe(false)
})

test('reusable research effects follow the same gated level progression', () => {
  const state = createDefaultState()

  state.research['sharpened-stick'] = 1
  expect(researchUpgradeVisible(state, 'sharpened-stick')).toBe(false)
  state.research.shelters = 1
  expect(researchUpgradeVisible(state, 'sharpened-stick')).toBe(true)
  completeProject(state, {
    kind: 'research',
    id: 'sharpened-stick',
    target: 3,
  })
  expect(researchEffects(state, 'sharpened-stick')).toMatchObject({
    actionYield: { gather: 0.35 },
    actionAutomation: { gather: 0.04 },
  })

  state.research.masonry = 1
  state.research.carpentry = 1
  completeProject(state, { kind: 'research', id: 'masonry', target: 3 })
  expect(researchEffects(state, 'masonry').crew).toBe(3)

  state.research.forestry = 1
  state.research.mechanization = 1
  completeProject(state, { kind: 'research', id: 'forestry', target: 2 })
  const forestryEffects = researchEffects(state, 'forestry')
  expect(forestryEffects.specialization?.sawyer).toBeCloseTo(1.512)
  expect(forestryEffects.actionAutomation?.sticks).toBeCloseTo(0.06)

  state.research.joinery = 1
  completeProject(state, { kind: 'research', id: 'joinery', target: 3 })
  expect(researchEffects(state, 'joinery').recipeReduction).toEqual({
    sawyer: { wood: 2 },
    mason: { stone: 2 },
  })
})

test('the research queue unlocks with a library', () => {
  const state = createDefaultState()
  expect(researchQueueUnlocked(state)).toBe(false)
  state.facilities.library.level = 1
  expect(researchQueueUnlocked(state)).toBe(true)
})

test('repeatable effects do not repeat one-time offline bonuses', () => {
  const state = createDefaultState()
  state.research['record-keeping'] = 3
  const effects = researchEffects(state, 'record-keeping')
  expect(effects.offlineHours).toBe(4)
  expect(effects.resourceStorage?.knowledge).toBeCloseTo(1.5 * 1.08 ** 2)
})

test('repeatable recipe reductions accumulate per additional level', () => {
  const upgrade = RESEARCH['inventory-keeping'].upgrade
  if (!upgrade) throw new Error('Inventory keeping should be upgradeable')
  const original = upgrade.effects
  upgrade.effects = { ...original, recipeReduction: { sawyer: { wood: 0.5 } } }
  try {
    const state = createDefaultState()
    state.research['inventory-keeping'] = 3
    expect(researchEffects(state, 'inventory-keeping').recipeReduction).toEqual(
      {
        sawyer: { wood: 1 },
      },
    )
  } finally {
    upgrade.effects = original
  }
})

function maximumProject(id: 'inventory-keeping', target: number) {
  return { kind: 'research' as const, id, target }
}
