import { expect, test } from 'bun:test'
import { actionAvailability, startAction } from './actions'
import { createDefaultState } from './state'

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
