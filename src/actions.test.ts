import { expect, test } from 'bun:test'
import {
  actionAvailability,
  actionCost,
  actionDuration,
  actionRequiredXp,
  actionYield,
  applyExploreReward,
  exploreExpectedRate,
  exploreExpectedRewards,
  resolveEncounter,
  startAction,
  syncUnlocks,
} from './actions'
import { EXPEDITION_ENCOUNTER_IDS } from './ids'
import { completeProject } from './research'
import { storageCapacity } from './resources'
import { adjustWorkers, assignJob, firstIdlePerson } from './settlement'
import { advanceTime } from './simulation'
import { createDefaultState } from './state'
import { people } from './test-helpers'

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

test('exploration unlocks when its reduced food cost is available', () => {
  const state = createDefaultState()

  state.resources.food = 2
  syncUnlocks(state)
  expect(state.exploreUnlocked).toBe(false)

  state.resources.food = 3
  syncUnlocks(state)
  expect(state.exploreUnlocked).toBe(true)
})

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
  people(state, 'explorer')
  state.resources.food = 6

  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'automated',
    state: 'active',
  })

  state.resources.food = 0
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'automated',
    state: 'paused',
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
  expect(manual.manual).toHaveLength(0)

  const automated = createDefaultState()
  automated.discovered.wood = true
  automated.facilities.lumber.level = 1
  automated.resources.wood = storageCapacity(automated, 'wood')
  automated.resources.food = 100
  people(automated, 'woodcutter')
  expect(actionAvailability(automated, 'sticks')).toMatchObject({
    kind: 'automated',
    state: 'active',
  })
  advanceTime(automated, actionDuration(automated, 'sticks'))
  expect(automated.resources.wood).toBe(storageCapacity(automated, 'wood'))
  expect(automated.actionSkills.sticks.xp).toBeGreaterThan(0)
})

test('retired gathering becomes unavailable', () => {
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
  state.facilities['expedition-camp'].level = 1
  people(state, 'explorer')
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

test('travelers on the ridge join as idle settlers when housing has room', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = id !== 'ridge-travelers'
  state.research.shelters = 1
  state.facilities.housing.level = 1

  triggerEncounter(state, 'manual')
  expect(state.pendingEncounter).toBe('ridge-travelers')
  expect(resolveEncounter(state, 0)).toBe(true)
  expect(state.people).toHaveLength(2)
  expect(state.people[1]?.job).toBe('idle')
  expect(state.lastExploreOutcome).toEqual({ kind: 'arrival' })
})

test('travelers cannot join when housing is full', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = id !== 'ridge-travelers'

  triggerEncounter(state, 'manual')
  expect(resolveEncounter(state, 0)).toBe(true)
  expect(state.people).toHaveLength(1)
  expect(state.lastExploreOutcome?.kind).toBe('experience')
})

test('experienced explorers sometimes meet a traveling settler', () => {
  const state = encounterState()
  for (const id of EXPEDITION_ENCOUNTER_IDS)
    state.completedEncounters[id] = true
  state.research.shelters = 1
  state.facilities.housing.level = 1

  for (let attempt = 0; attempt < 100 && state.people.length === 1; attempt++)
    applyExploreReward(state, 1, 'manual')

  expect(state.people).toHaveLength(2)
  expect(state.notice).toBe('Explorers met a traveler · they joined the tribe')
  expect(state.lastExploreOutcome).toEqual({ kind: 'arrival' })
})

test('inviting settlers costs scaling food and spawns an idle newcomer', () => {
  const state = createDefaultState()
  state.research.shelters = 1
  state.facilities.housing.level = 1
  state.resources.food = 100
  expect(actionAvailability(state, 'invite')).toMatchObject({
    kind: 'manual',
    state: 'ready',
  })
  expect(actionCost(state, 'invite')).toEqual({ food: 15 })
  expect(startAction(state, 'invite')).toBe(true)
  const paid = state.manual[0]?.paid
  expect(paid).toEqual({ food: 15 })
  advanceTime(state, actionDuration(state, 'invite'), true)
  expect(state.manual).toHaveLength(0)
  expect(state.people).toHaveLength(2)
  expect(state.people[1]?.job).toBe('idle')
  // The price was paid at start; only meals touch food during the trip.
  expect(state.resources.food).toBeLessThan(85)
  expect(state.resources.food).toBeGreaterThan(75)
  expect(state.actionSkills.invite.xp).toBeGreaterThan(0)
  expect(actionCost(state, 'invite')).toEqual({ food: 20 })
})

test('inviting stays locked before Shelters and blocked when housing is full', () => {
  const state = createDefaultState()
  expect(actionAvailability(state, 'invite')).toEqual({ kind: 'locked' })
  state.research.shelters = 1
  expect(actionAvailability(state, 'invite')).toEqual({
    kind: 'manual',
    state: 'blocked',
  })
  state.facilities.housing.level = 1
  state.resources.food = 100
  expect(actionAvailability(state, 'invite')).toMatchObject({
    kind: 'manual',
    state: 'ready',
  })
})

test('greeters recruit automatically until housing fills', () => {
  const state = createDefaultState()
  state.research.shelters = 1
  state.facilities.housing.level = 1
  state.resources.food = 200
  people(state, 'greeter')
  expect(actionAvailability(state, 'invite')).toMatchObject({
    kind: 'automated',
    state: 'active',
  })
  advanceTime(state, actionDuration(state, 'invite') * 3)
  expect(state.people).toHaveLength(3)
  expect(actionAvailability(state, 'invite')).toMatchObject({
    kind: 'automated',
    state: 'paused',
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

test('exploration without a find still reports bonus exploration XP', () => {
  const state = createDefaultState()
  state.discovered = { wood: true, stone: true }
  // Below level 5 the rare, encounter and mini branches stay closed, so the
  // only XP source is the empty-handed fallback; level 4 keeps the grant
  // from crossing a level boundary.
  state.actionSkills.explore = { level: 4, xp: 0 }

  for (
    let attempt = 0;
    attempt < 100 && state.lastExploreOutcome?.kind !== 'experience';
    attempt++
  )
    applyExploreReward(state, 1, 'manual')

  expect(state.lastExploreOutcome).toEqual({ kind: 'experience', amount: 3 })
  expect(state.notice).toBe(
    'Explorers found a promising vantage point · +3 exploration XP',
  )
  expect(state.actionSkills.explore.xp).toBeGreaterThan(0)
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
  people(state, 'explorer')

  const expected = exploreExpectedRewards(state),
    rate = exploreExpectedRate(state)
  expect(rate.food).toBeCloseTo(
    (expected.food ?? 0) / actionDuration(state, 'explore'),
  )
})

test('research unlocks a better gathering action beside the base action', () => {
  const state = createDefaultState()
  state.discovered.wood = true
  state.actionSkills.sticks = { level: 3, xp: 2 }

  expect(actionAvailability(state, 'chop-wood').kind).toBe('locked')
  completeProject(state, { kind: 'research', id: 'woodcutting' })
  expect(actionAvailability(state, 'chop-wood').kind).not.toBe('locked')

  // Chop wood carries its own cadence and skill track.
  expect(actionYield(state, 'chop-wood')).toBeCloseTo(5)
  expect(actionDuration(state, 'chop-wood')).toBeCloseTo(6)
  expect(actionRequiredXp(state, 'chop-wood')).toBe(5)
  // The base action keeps its own skill-adjusted progress untouched.
  expect(actionYield(state, 'sticks')).toBeCloseTo(1.04)
  expect(state.actionSkills.sticks).toEqual({ level: 3, xp: 2 })
  expect(actionRequiredXp(state, 'sticks')).toBe(Math.ceil(3 * 1.2 ** (3 - 1)))

  completeProject(state, { kind: 'research', id: 'forestry-methods' })
  expect(actionAvailability(state, 'fell-timber').kind).not.toBe('locked')
})

test('better gathering actions award more XP per manual completion', () => {
  const state = createDefaultState()
  state.discovered.wood = true
  completeProject(state, { kind: 'research', id: 'woodcutting' })

  expect(startAction(state, 'chop-wood')).toBe(true)
  advanceTime(state, actionDuration(state, 'chop-wood'), true)
  expect(state.actionSkills['chop-wood'].xp).toBeCloseTo(2)
})

test('manual work occupies idle people and blocks assignment while running', () => {
  const state = createDefaultState()
  people(state, 'idle', 'idle')
  state.discovered.wood = true
  state.exploreUnlocked = true
  state.resources.food = 6
  completeProject(state, { kind: 'research', id: 'foraging-rounds' })

  expect(startAction(state, 'gather')).toBe(true)
  expect(startAction(state, 'sticks')).toBe(true)
  // Both people are busy: a third manual action cannot start.
  expect(startAction(state, 'explore')).toBe(false)
  expect(actionAvailability(state, 'explore')).toMatchObject({
    kind: 'manual',
    state: 'blocked',
  })
  // Busy people cannot be hired.
  expect(assignJob(state, 0, 'builder')).toBe(false)
  expect(adjustWorkers(state, 'builder', 1)).toBe(false)

  advanceTime(state, actionDuration(state, 'gather'), true)
  expect(state.manual).toHaveLength(1)
  // The freed person can now take a job.
  expect(assignJob(state, firstIdlePerson(state), 'builder')).toBe(true)
})

test('staffing an action job stops its manual runs with a refund', () => {
  const state = createDefaultState()
  people(state, 'idle', 'idle')
  completeProject(state, { kind: 'research', id: 'foraging-rounds' })
  const before = state.resources.food
  expect(startAction(state, 'gather')).toBe(true)
  expect(state.manual).toHaveLength(1)

  assignJob(state, 1, 'forager')
  expect(state.manual).toHaveLength(0)
  expect(state.resources.food).toBe(before)
})

test('completing action-unlocking research keeps the plain completion notice', () => {
  const state = createDefaultState()
  state.discovered.wood = true
  state.queues.research.active = {
    sequence: 1,
    project: { kind: 'research', id: 'woodcutting' },
    paid: {},
    progress: 12,
    total: 12,
  }

  advanceTime(state, 1)
  expect(state.queues.research.active).toBeNull()
  // The new card is its own announcement; the notice stays minimal.
  expect(state.notice).toBe('Completed Stone axes')
  expect(actionAvailability(state, 'chop-wood').kind).not.toBe('locked')
})
