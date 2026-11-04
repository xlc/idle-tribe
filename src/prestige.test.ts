import { expect, test } from 'bun:test'
import { buyPerk, canReset, legacyReward, resetRun } from './prestige'
import { prestigeMultiplier } from './settlement'
import { settlement } from './test-helpers'

test('a supported prestige reset preserves only permanent progress and settings', () => {
  const s = settlement()
  s.legacy.discovered = true
  s.legacy.lifetime = 100
  s.legacy.points = 50
  s.welcome = false
  s.seenNotes.explore = true
  const reward = legacyReward(s),
    speed = prestigeMultiplier(s)
  expect(buyPerk(s, 'organized-records')).toBe(true)
  expect(prestigeMultiplier(s)).toBe(speed)
  expect(canReset(s)).toBe(true)
  expect(resetRun(s)).toBe(true)
  expect(s.resources.food).toBe(0)
  // The reset settlement restarts with its single founder.
  expect(s.people).toHaveLength(1)
  expect(s.specialization).toBeNull()
  expect(s.legacy.lifetime).toBe(100 + reward)
  expect(s.legacy.points).toBe(25 + reward)
  expect(s.legacy.perks['organized-records']).toBe(true)
  expect(s.welcome).toBe(false)
  // Unlock notes never re-fire after a reset.
  expect(s.seenNotes.explore).toBe(true)
  expect(canReset(s)).toBe(false)
})
