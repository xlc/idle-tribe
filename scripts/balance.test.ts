import { expect, test } from 'bun:test'
import { effectiveOfflineSeconds } from '../src/clock'
import { createGame } from '../src/game'
import { createDefaultState } from '../src/state'
import { complete, people, required, settlement } from '../src/test-helpers'
import { makeDecisions } from './balance-policy'
import { runBalance, snapshot } from './balance-runner'

const options = {
  branch: 'forestry',
  policy: 'bottleneck',
  schedule: 'frequent',
  days: 1,
  goal: 'causal-synthesis',
} as const

test('the ordinary opening and visits account for elapsed time, successful controls and untouched checkpoints', () => {
  const result = runBalance(options)
  expect(result.openingSeconds / 60).toBeGreaterThan(10)
  expect(result.openingSeconds / 60).toBeLessThan(15)
  expect(result.wallSeconds).toBe(86400)
  expect(result.effectiveSeconds).toBeCloseTo(result.wallSeconds, 6)
  expect(result.visits.every((v) => v.durationSeconds <= 480)).toBe(true)
  const actions = result.actions.reduce((n, a) => n + a.controls, 0)
  expect(actions).toBe(
    result.openingControls + result.visits.reduce((n, v) => n + v.controls, 0),
  )
  expect(
    result.actions.filter((a) => a.kind === 'manual').length,
  ).toBeGreaterThan(20)
  // Shelters is not an era; milestone bounds still record its paid completion.
  expect(
    result.milestones.find((m) => m.id === 'shelters')?.time.by,
  ).toBeGreaterThan(120)
  expect(result.finalCheckpoint.state.resources).toEqual(result.final.resources)
})

test('daily absence uses the departure window and separates active from effective time', () => {
  const result = runBalance({ ...options, schedule: 'daily', days: 1 })
  const expected =
    result.openingSeconds +
    effectiveOfflineSeconds(86400 - result.openingSeconds, 8)
  expect(result.effectiveSeconds).toBeCloseTo(expected, 6)
  expect(result.activeSeconds).toBe(result.openingSeconds)
  expect(result.status).toBe('unfinished')
})

test('a short observation horizon returns the partial ordinary opening', () => {
  const result = runBalance({ ...options, days: 0.001 })
  expect(result.wallSeconds).toBe(86.4)
  expect(result.activeSeconds).toBe(86.4)
  expect(result.final.resources.food).toBeGreaterThan(0)
  expect(result.status).toBe('unfinished')
})

test('resuming a checkpoint clones state and preserves partial work during a missed visit', () => {
  const initial = runBalance(options).finalCheckpoint
  const original = structuredClone(initial)
  const result = runBalance(
    { ...options, skipVisit: 1, absenceHours: 168, days: 7 },
    initial,
  )
  expect(initial).toEqual(original)
  expect(result.wallSeconds - initial.wallSeconds).toBe(7 * 86400)
  expect(result.activeSeconds).toBe(initial.activeSeconds)
  expect(result.effectiveSeconds).toBeGreaterThan(initial.effectiveSeconds)
  expect(result.final.completedProjects).toBeGreaterThanOrEqual(
    initial.state.completedProjects,
  )
})

test('diagnostic snapshots observe resources and paid commitments without changing the economy', () => {
  const s = createDefaultState(),
    game = createGame(s)
  s.discovered.wood = true
  s.resources.wood = 10
  s.resources.food = 10
  game.enqueue({ kind: 'research', id: 'sharpened-stick' })
  game.advanceTime(0)
  const before = structuredClone(s)
  const observation = snapshot(s)
  expect(observation.commitments.wood).toBe(10)
  expect(observation.resources.wood).toBe(0)
  expect(s).toEqual(before)
  game.advanceTime(60)
  expect(s.research['sharpened-stick']).toBe(true)
  expect(snapshot(s).commitments.wood).toBe(0)
})

test('a longer first return builds and staffs the first stone source before optional storage can block it', () => {
  const result = runBalance({ ...options, schedule: 'concentrated', days: 3 })
  expect(result.finalCheckpoint.state.facilities.quarry.level).toBeGreaterThan(
    0,
  )
  expect(
    result.finalCheckpoint.state.people.some((p) => p.job === 'stoneworker'),
  ).toBe(true)
  expect(result.final.resources.stone).toBeGreaterThan(10)
})

test('the deliberate planner expands overcrowded food capacity and releases people for other work', () => {
  const s = settlement()
  s.facilities.farm.level = 1
  people(s, ...Array.from({ length: 60 }, () => 'farmer' as const))
  const game = createGame(s)
  const controls = {
    plan: game.enqueue,
    assign: game.assign,
  }
  makeDecisions(s, 'forestry', 'bottleneck', controls)
  game.advanceTime(0)
  expect(s.queues.construction.active?.project.id).toBe('farm')
  game.advanceTime(3600)
  makeDecisions(s, 'forestry', 'bottleneck', controls)
  expect(s.facilities.farm.level).toBeGreaterThan(1)
  expect(s.people.filter((p) => p.job === 'farmer').length).toBeLessThan(30)
  expect(s.people.every((p) => p.health === 5)).toBe(true)
})

test('queue snapshots retain their original payment and progress after simulation advances', () => {
  const s = createDefaultState(),
    game = createGame(s)
  s.discovered.wood = true
  s.resources.wood = 10
  s.resources.food = 10
  game.enqueue({ kind: 'research', id: 'sharpened-stick' })
  game.advanceTime(0)
  const before = snapshot(s)
  game.advanceTime(30)
  expect(before.queues.research?.active?.progress).toBe(0)
  expect(s.queues.research.active?.progress).toBe(30)
})

test('fixed-horizon comparisons continue after a milestone already present in the checkpoint', () => {
  const start = runBalance(options).finalCheckpoint
  const result = runBalance(
    { ...options, goal: 'shelters', days: 0.5, finishAtHorizon: true },
    start,
  )
  expect(result.wallSeconds).toBe(start.wallSeconds + 43200)
  expect(result.effectiveSeconds).toBeGreaterThan(start.effectiveSeconds)
  expect(result.finalCheckpoint.state.research.shelters).toBe(true)
})

test('a frontier reached and reset during one visit remains in the earned era record', () => {
  const state = settlement()
  complete(
    state,
    'mechanization',
    'powered-workshops',
    'precision-instruments',
    'chronometry',
  )
  const game = createGame(state)
  game.enqueue({ kind: 'research', id: 'electronics' })
  game.advanceTime(0)
  const active = required(state.queues.research.active ?? undefined)
  active.progress = active.total - 1
  const result = runBalance(
    { ...options, resetAt: 'electronics', days: 0.005 },
    { state, wallSeconds: 0, effectiveSeconds: 0, activeSeconds: 0 },
  )
  expect(result.resets).toHaveLength(1)
  expect(
    result.milestones.some((milestone) => milestone.id === 'electronics'),
  ).toBe(true)
  expect(result.finalCheckpoint.state.legacy.highestEra).toBe(4)
})
