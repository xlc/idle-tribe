import { expect, test } from 'bun:test'
import type { Specialization } from '../src/types'
import { runBalance } from './balance-runner'

// A balance guard: both branches should reach Mechanization by the 168-hour
// milestone under the deliberate frequent-visit policy. This catches broken
// openings, stalled research, and pacing regressions; `bun run balance` remains
// the tool for detailed tuning. Runtime is dominated by deterministic absence
// simulation, so allow it to finish on slower CI hosts.
const HOURS = 3600
for (const branch of ['forestry', 'stonecraft'] as Specialization[]) {
  test(`${branch} reaches Mechanization under a deliberate player`, () => {
    const result = runBalance({
      branch,
      policy: 'bottleneck',
      schedule: 'frequent',
      days: 7,
      goal: 'mechanization',
      collectDetails: false,
    })
    expect(result.status).toBe('completed')
    const goal = result.milestones.find(({ id }) => id === 'mechanization')
    expect((goal?.time.by ?? Infinity) / HOURS).toBeLessThanOrEqual(170)
    // The scripted opening establishes the settlement within its hour.
    expect(result.openingSeconds).toBeLessThan(HOURS)
  }, 90_000)
}

test('exploratory paths are repeatable for the same seed', () => {
  const options = {
    branch: 'forestry' as const,
    policy: 'exploratory' as const,
    schedule: 'frequent' as const,
    days: 2,
    goal: 'mechanization' as const,
    pathSeed: 42,
    finishAtHorizon: true,
    collectDetails: false,
  }
  const first = runBalance(options),
    second = runBalance(options),
    different = runBalance({ ...options, pathSeed: 43 })
  expect(second.actions).toEqual(first.actions)
  expect(second.milestones).toEqual(first.milestones)
  expect(second.final).toEqual(first.final)
  expect(second.maxVisitControls).toBe(first.maxVisitControls)
  expect(different.actions).not.toEqual(first.actions)
})

test('daily exploratory paths recover when food releases construction workers', () => {
  const result = runBalance({
    branch: 'forestry',
    policy: 'exploratory',
    schedule: 'daily',
    days: 5,
    goal: 'mechanization',
    pathSeed: 42,
    finishAtHorizon: true,
    collectDetails: false,
  })
  expect(result.wallSeconds).toBe(5 * 24 * HOURS)
  expect(result.final.people).toBeGreaterThan(0)
}, 30_000)
