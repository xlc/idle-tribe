import { expect, test } from 'bun:test'
import {
  actionAvailability,
  applyExploreReward,
  resolveEncounter,
  startAction,
} from './actions'
import { EXPEDITION_ENCOUNTER_IDS } from './ids'
import { advanceTime } from './simulation'
import { createDefaultState } from './state'

function encounterState() {
  const state = createDefaultState()
  state.discovered = { wood: true, stone: true }
  state.exploreUnlocked = true
  state.actionSkills.explore.level = 5
  for (const resource of Object.keys(state.resources) as Array<
    keyof typeof state.resources
  >)
    state.resources[resource] = 1000
  return state
}

function findEncounter(
  state: ReturnType<typeof encounterState>,
  mode: 'manual' | 'automated',
  scale = 1,
) {
  for (let i = 0; i < 1000; i++) {
    applyExploreReward(state, scale, mode)
    if (
      state.pendingEncounter === 'abandoned-cache' ||
      state.completedEncounters['abandoned-cache']
    )
      return
  }
  throw new Error('Encounter did not occur')
}

test('action availability explains discovery, cost and active-work blockers', () => {
  const state = createDefaultState()

  expect(actionAvailability(state, 'sticks')).toEqual({
    kind: 'locked',
    reason: 'Discover wood by exploring',
  })
  expect(actionAvailability(state, 'gather')).toMatchObject({
    kind: 'manual',
    state: 'ready',
  })

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
    reason: 'Finish Gather food first',
  })
  expect(actionAvailability(state, 'gather')).toMatchObject({
    kind: 'manual',
    state: 'running',
    reason: 'Running · Stop to cancel',
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

test('retired gathering explains why the action disappeared', () => {
  const state = createDefaultState()
  state.research.agriculture = true
  state.facilities.farm.level = 1

  expect(actionAvailability(state, 'gather')).toEqual({
    kind: 'locked',
    reason: 'Retired after farming is built',
  })
})

test('manual exploration pauses for a one-time encounter and resolves one choice', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS.slice(1))
    state.completedEncounters[id] = true
  findEncounter(state, 'manual')
  expect(state.pendingEncounter).toBe('abandoned-cache')
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'manual',
    state: 'blocked',
  })

  const beforeWood = state.resources.wood
  expect(resolveEncounter(state, 0)).toBe(true)
  expect(state.resources.wood).toBe(beforeWood + 30)
  expect(state.pendingEncounter).toBeNull()
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
  state.exploreRolls = 17
  const beforeWood = state.resources.wood
  findEncounter(state, 'automated', 0.1)
  expect(state.pendingEncounter).toBeNull()
  expect(state.completedEncounters['abandoned-cache']).toBe(true)
  expect(state.resources.wood).toBeCloseTo(beforeWood + 3)
  expect(state.resources.stone).toBeCloseTo(1002)
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'automated',
    state: 'active',
  })

  state.pendingEncounter = 'abandoned-cache'
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
