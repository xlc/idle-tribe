import { expect, test } from 'bun:test'
import { startAction } from './actions'
import { JOBS } from './definitions'
import { RESOURCES } from './ids'
import { enqueue, nextExpansion, quoteProject } from './research'
import { advanceTime, resourceFlowEntries, resourceFlows } from './simulation'
import { createDefaultState } from './state'
import { people, settlement } from './test-helpers'

test('automated level-ups change the remaining interval at the same timestamp across tick sizes', () => {
  const state = createDefaultState()
  state.discovered.wood = true
  state.facilities.lumber.level = 1
  state.actionSkills.sticks.xp = 2.99
  state.resources.food = 100
  people(state, 'woodcutter')
  const sliced = structuredClone(state)
  advanceTime(state, 3)
  for (let i = 0; i < 30; i++) advanceTime(sliced, 0.1)
  expect(state.actionSkills.sticks.level).toBe(2)
  expect(state.resources.wood).toBeCloseTo(sliced.resources.wood, 10)
  expect(state.actionSkills.sticks.xp).toBeCloseTo(
    sliced.actionSkills.sticks.xp,
    10,
  )
})

test('exploration starts when newly produced food can pay for a trip', () => {
  const state = createDefaultState()
  state.exploreUnlocked = true
  state.facilities['expedition-camp'].level = 1
  state.facilities.farm.level = 1
  state.resources.food = 100
  people(state, 'explorer', 'farmer')
  const sliced = structuredClone(state)
  advanceTime(state, 30)
  for (let i = 0; i < 300; i++) advanceTime(sliced, 0.1)
  expect(state.exploreRolls).toBeGreaterThan(0)
  expect(state.exploreRolls).toBe(sliced.exploreRolls)
  expect(state.resources.food).toBeCloseTo(sliced.resources.food, 10)
  expect(state.actionProgress.explore).toBeCloseTo(
    sliced.actionProgress.explore,
    10,
  )
})

test('exploration pauses at a food shortage without banking unpaid trips', () => {
  const state = createDefaultState()
  state.exploreUnlocked = true
  state.facilities['expedition-camp'].level = 1
  state.resources.food = 6
  people(state, 'explorer')
  advanceTime(state, 30)
  expect(state.exploreRolls).toBeGreaterThan(0)
  expect(state.resources.food).toBeLessThan(6)
  expect(state.actionProgress.explore).toBeCloseTo(0, 10)
  const rolls = state.exploreRolls
  advanceTime(state, 30)
  expect(state.exploreRolls).toBe(rolls)
  expect(state.actionProgress.explore).toBeCloseTo(0, 10)
})

test('food starvation releases builders for manual gathering and resumes construction', () => {
  const state = createDefaultState()
  state.research.shelters = 1
  state.facilities.housing.level = 1
  state.resources.wood = 10
  state.resources.food = 5
  const project = nextExpansion(state, 'housing')
  expect(enqueue(state, project)).toBe(true)
  expect(state.people[0]?.job).toBe('builder')

  advanceTime(state, 30, true)

  expect(state.resources.food).toBe(0)
  expect(state.people[0]?.job).toBe('idle')
  expect(state.queues.construction.active?.progress).toBeGreaterThan(0)
  expect(startAction(state, 'gather')).toBe(true)

  advanceTime(state, 1, true)

  expect(state.resources.food).toBeGreaterThan(0)
  expect(state.people[0]?.job).toBe('builder')
})

test('the first shelter is a quick, cheap build and later levels scale up', () => {
  const state = createDefaultState()
  state.research.shelters = 1
  const first = quoteProject(state, nextExpansion(state, 'housing'))
  expect(first.cost.wood).toBe(4)
  expect(first.cost.food).toBe(2)
  expect(first.total).toBe(0.25)

  state.facilities.housing.level = 1
  const second = quoteProject(state, nextExpansion(state, 'housing'))
  expect(second.cost.wood).toBeGreaterThan(first.cost.wood ?? 0)
  expect(second.cost.food).toBeGreaterThan(first.cost.food ?? 0)
  expect(second.total).toBeGreaterThan(first.total)
})

test('itemized flow entries sum to the aggregate resource flows', () => {
  const s = settlement()
  people(s, 'sawyer', 'sawyer', 'scholar', 'explorer', 'forager')
  s.actionSkills.explore.level = 5
  const entries = resourceFlowEntries(s),
    flows = resourceFlows(s)
  for (const r of RESOURCES) {
    const sum = (kind: 'production' | 'input' | 'meal') =>
      entries[r]
        .filter((e) => e.kind === kind)
        .reduce((n, e) => n + e.amount, 0)
    expect(sum('production')).toBeCloseTo(flows[r].production, 8)
    expect(sum('input')).toBeCloseTo(flows[r].inputs, 8)
    expect(sum('meal')).toBeCloseTo(flows[r].meals, 8)
    for (const entry of entries[r]) expect(entry.amount).toBeGreaterThan(0)
  }
})

test('flow entries name their sources', () => {
  const s = settlement()
  people(s, 'sawyer', 'explorer')
  s.actionSkills.explore.level = 5
  const entries = resourceFlowEntries(s)
  expect(entries.planks.find((e) => e.kind === 'production')?.label).toBe(
    JOBS.sawyer.name,
  )
  expect(
    entries.wood.some(
      (e) => e.label === JOBS.sawyer.name && e.kind === 'input',
    ),
  ).toBe(true)
  expect(
    entries.food.some((e) => e.label === 'Meals' && e.kind === 'meal'),
  ).toBe(true)
  expect(
    entries.food.some((e) => e.label === 'Explore' && e.kind === 'input'),
  ).toBe(true)
})

test('arrival actions do not report exploration production', () => {
  const s = createDefaultState()
  s.research.shelters = 1
  s.facilities.housing.level = 1
  s.resources.food = 100
  const founder = s.people[0]
  if (!founder) throw new Error('Missing founder')
  founder.job = 'greeter'

  const invite = resourceFlowEntries(s).food.filter(
    (entry) => entry.label === 'Invite settlers',
  )
  expect(invite).toEqual([
    { label: 'Invite settlers', amount: 30, kind: 'input' },
  ])
})
