import { expect, test } from 'bun:test'
import {
  actionAvailability,
  actionDuration,
  applyExploreReward,
  exploreExpectedRate,
  exploreExpectedRewards,
  resolveEncounter,
  startAction,
} from './actions'
import { EXPEDITION_ENCOUNTER_IDS } from './ids'
import { storageCapacity } from './resources'
import { advanceTime } from './simulation'
import { createDefaultState } from './state'

function encounterState() {
  const state = createDefaultState()
  state.discovered = { wood: true, stone: true }
  state.exploreUnlocked = true
  state.actionSkills.explore.level = 5
  state.facilities.stockyard.level = 10
  state.facilities['food-store'].level = 10
  for (const resource of Object.keys(state.resources) as Array<
    keyof typeof state.resources
  >)
    state.resources[resource] = 1000
  return state
}

function triggerEncounter(
  state: ReturnType<typeof encounterState>,
  mode: 'manual' | 'automated',
  scale = 1,
) {
  // Roll 17 is the first deterministic draw in the encounter bucket.
  state.exploreRolls = 17
  applyExploreReward(state, scale, mode)
}

test('action availability reports discovery, cost and active-work blockers', () => {
  const state = createDefaultState()

  expect(actionAvailability(state, 'sticks')).toMatchObject({
    kind: 'locked',
  })
  expect(actionAvailability(state, 'gather')).toMatchObject({
    kind: 'manual',
    state: 'ready',
  })

  state.resources.food = 0
  state.exploreUnlocked = true
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'manual',
    state: 'missing-cost',
    missing: { food: 6 },
  })
  state.resources.food = 6
  expect(startAction(state, 'gather')).toBe(true)
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'manual',
    state: 'blocked',
  })
  expect(actionAvailability(state, 'gather')).toMatchObject({
    kind: 'manual',
    state: 'running',
  })
})

test('automated actions report active and paused states from their live inputs', () => {
  const state = createDefaultState()
  state.exploreUnlocked = true
  state.facilities['expedition-camp'].level = 1
  const founder = state.people[0]
  if (!founder) throw new Error('Default state has no founder')
  founder.job = 'explorer'
  state.resources.food = 6

  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'automated',
    state: 'active',
    workers: 1,
  })

  state.resources.food = 0
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'automated',
    state: 'paused',
    missing: { food: 6 },
  })
})

test('full output storage does not block manual or automated work', () => {
  const manual = createDefaultState()
  manual.resources.food = storageCapacity(manual, 'food')
  expect(actionAvailability(manual, 'gather')).toMatchObject({
    kind: 'manual',
    state: 'ready',
  })
  expect(startAction(manual, 'gather')).toBe(true)
  advanceTime(manual, actionDuration(manual, 'gather'), true)
  expect(manual.resources.food).toBe(storageCapacity(manual, 'food'))
  expect(manual.manual).toBeNull()

  const automated = createDefaultState()
  automated.discovered.wood = true
  automated.facilities.lumber.level = 1
  automated.resources.wood = storageCapacity(automated, 'wood')
  const founder = automated.people[0]
  if (!founder) throw new Error('Default state has no founder')
  founder.job = 'woodcutter'
  expect(actionAvailability(automated, 'sticks')).toMatchObject({
    kind: 'automated',
    state: 'active',
  })
  advanceTime(automated, actionDuration(automated, 'sticks'))
  expect(automated.resources.wood).toBe(storageCapacity(automated, 'wood'))
  expect(automated.actionSkills.sticks.xp).toBeGreaterThan(0)
})

test('retired gathering explains why the action disappeared', () => {
  const state = createDefaultState()
  state.research.agriculture = 1
  state.facilities.farm.level = 1

  expect(actionAvailability(state, 'gather')).toMatchObject({
    kind: 'manual',
    state: 'ready',
  })

  state.facilities.farm.level = 2

  expect(actionAvailability(state, 'gather')).toEqual({
    kind: 'locked',
    reason: 'Retired after the second farm is built',
  })
})

test('manual exploration pauses for a one-time encounter and resolves one choice', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS.slice(1))
    state.completedEncounters[id] = true
  triggerEncounter(state, 'manual')
  expect(state.pendingEncounter).toBe('abandoned-cache')
  expect(state.lastExploreOutcome).toEqual({
    kind: 'encounter',
    id: 'abandoned-cache',
  })
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'manual',
    state: 'blocked',
  })

  const beforeWood = state.resources.wood
  expect(resolveEncounter(state, 0)).toBe(true)
  expect(state.resources.wood).toBe(beforeWood + 30)
  expect(state.pendingEncounter).toBeNull()
  expect(state.lastExploreOutcome).toEqual({
    kind: 'resources',
    amount: { wood: 30, stone: 20 },
  })
  expect(state.completedEncounters['abandoned-cache']).toBe(true)
  expect(resolveEncounter(state, 1)).toBe(false)
})

test('automated encounters use their declared default and pause while a report is pending', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS.slice(1))
    state.completedEncounters[id] = true
  const founder = state.people[0]
  if (!founder) throw new Error('Default state has no founder')
  state.facilities['expedition-camp'].level = 1
  founder.job = 'explorer'
  const beforeWood = state.resources.wood
  triggerEncounter(state, 'automated', 0.1)
  expect(state.pendingEncounter).toBeNull()
  expect(state.completedEncounters['abandoned-cache']).toBe(true)
  expect(state.resources.wood).toBeCloseTo(beforeWood + 3)
  expect(state.resources.stone).toBeCloseTo(1002)
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'automated',
    state: 'active',
  })

  state.pendingEncounter = 'abandoned-cache'
  const rolls = state.exploreRolls
  applyExploreReward(state, 0.1)
  expect(state.exploreRolls).toBe(rolls)
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'automated',
    state: 'paused',
  })

  state.actionProgress.explore = 1
  advanceTime(state, 60)
  expect(state.actionProgress.explore).toBe(1)
  expect(resolveEncounter(state, 0)).toBe(true)
  advanceTime(state, 0)
  expect(state.actionProgress.explore).toBeLessThan(1)
})

test('exploration can bring travelers to the next available room', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = id !== 'ridge-travelers'

  triggerEncounter(state, 'manual')
  expect(state.pendingEncounter).toBe('ridge-travelers')
  expect(resolveEncounter(state, 0)).toBe(true)
  expect(state.arrivalProgress).toBe(1)
})

test('exploration outcomes report the applied amount after caps', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = id !== 'ridge-travelers'
  state.arrivalProgress = 0.9
  triggerEncounter(state, 'manual')
  expect(resolveEncounter(state, 0)).toBe(true)
  expect(state.lastExploreOutcome?.kind).toBe('arrival-progress')
  if (state.lastExploreOutcome?.kind !== 'arrival-progress') return
  expect(state.lastExploreOutcome.amount).toBeCloseTo(0.1)
})

test('a traveler lead becomes an idle settler when food and a room are ready', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = id !== 'ridge-travelers'
  state.research.shelters = 1
  state.facilities.housing.level = 1
  state.facilities.foraging.level = 1
  const founder = state.people[0]
  if (!founder) throw new Error('Default state has no founder')
  founder.job = 'forager'

  triggerEncounter(state, 'manual')
  expect(resolveEncounter(state, 0)).toBe(true)
  advanceTime(state, 0)
  expect(state.people).toHaveLength(2)
  expect(state.people[1]?.job).toBe('idle')
})

test('experienced explorers can find repeatable traveler leads', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = true

  for (let attempt = 0; attempt < 100 && state.arrivalProgress === 0; attempt++)
    applyExploreReward(state, 1, 'manual')

  expect(state.arrivalProgress).toBeGreaterThan(0)
  expect(state.notice).toBe('Explorers met travelers · arrival progress +25%')
  expect(state.lastExploreOutcome).toMatchObject({
    kind: 'arrival-progress',
    amount: 0.25,
  })
})

test('every ordinary exploration returns a concrete resource outcome', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = true

  for (
    let attempt = 0;
    attempt < 100 && state.lastExploreOutcome?.kind !== 'resources';
    attempt++
  )
    applyExploreReward(state, 1, 'manual')

  expect(state.lastExploreOutcome?.kind).toBe('resources')
  if (state.lastExploreOutcome?.kind !== 'resources') return
  expect(Object.values(state.lastExploreOutcome.amount)).toHaveLength(1)
  expect(Object.values(state.lastExploreOutcome.amount)[0]).toBeGreaterThan(0)
})

test('exploration reports a toast-worthy result when nothing is found', () => {
  const state = createDefaultState()
  state.discovered = { wood: true, stone: true }

  for (
    let attempt = 0;
    attempt < 100 && state.lastExploreOutcome?.kind !== 'nothing';
    attempt++
  )
    applyExploreReward(state, 1, 'manual')

  expect(state.lastExploreOutcome).toEqual({ kind: 'nothing' })
  expect(state.notice).toBe('Explorers found nothing this time')
})

test('exploration rates include automated encounter resources', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS.slice(1))
    state.completedEncounters[id] = true

  const expected = exploreExpectedRewards(state)
  expect(expected.wood).toBeCloseTo(0.27)
  expect(expected.stone).toBeCloseTo(0.22)
})

test('exploration expected rates include worker cadence', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = true
  state.facilities['expedition-camp'].level = 1
  const founder = state.people[0]
  if (!founder) throw new Error('Default state has no founder')
  founder.job = 'explorer'

  const expected = exploreExpectedRewards(state),
    rate = exploreExpectedRate(state)
  expect(rate.food).toBeCloseTo(
    (expected.food ?? 0) / actionDuration(state, 'explore'),
  )
})
