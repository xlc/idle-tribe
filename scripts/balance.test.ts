import { expect, test } from 'bun:test'
import type { Specialization } from '../src/types'
import { runBalance } from './balance-runner'

// A balance guard: both branches, one policy and schedule, generous bounds.
// This catches broken openings, stalled research, and multi-day pacing
// regressions per `bun test`; `bun run balance` remains the tool for detailed
// tuning. Eight days covers the full route with room after the goal completes
// while avoiding an unnecessary extra horizon. Runtime is dominated by the
// deterministic absence simulation, so allow it to finish on slower CI hosts.
const HOURS = 3600
for (const branch of ['forestry', 'stonecraft'] as Specialization[]) {
  test(`${branch} reaches Mechanization under a deliberate player`, () => {
    const result = runBalance({
      branch,
      policy: 'bottleneck',
      schedule: 'frequent',
      days: 8,
      goal: 'mechanization',
      collectDetails: false,
    })
    expect(result.status).toBe('completed')
    expect(result.wallSeconds / HOURS).toBeLessThan(8 * 24)
    // Everyone must stay healthy at every return; sickness indicates a food
    // balance failure, not just slow play.
    expect(result.minimumHealthyRatio).toBe(1)
    // The scripted opening establishes the settlement within its hour.
    expect(result.openingSeconds).toBeLessThan(HOURS)
  }, 30_000)
}
