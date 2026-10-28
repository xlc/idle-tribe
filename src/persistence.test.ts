import { expect, test } from 'bun:test'
import { startAction } from './actions'
import { parseSave } from './persistence'
import { enqueue, nextExpansion } from './research'
import { advanceTime } from './simulation'
import { createDefaultState } from './state'
import { people, settlement } from './test-helpers'

test('current saves preserve active paid projects and queued ordering without refunding', () => {
  const s = settlement()
  people(s, 'builder', 'sawyer')
  s.research['record-keeping'] = false
  enqueue(s, nextExpansion(s, 'housing'))
  enqueue(s, nextExpansion(s, 'housing'))
  enqueue(s, { kind: 'research', id: 'record-keeping' })
  advanceTime(s, 30)
  s.savedAt = 12345
  const loaded = parseSave(JSON.stringify(s))
  expect(loaded).toEqual(s)
  const direct = structuredClone(s)
  advanceTime(loaded, 4000)
  advanceTime(direct, 4000)
  expect(loaded).toEqual(direct)
})

test('reloading cancels only manual work and refunds its exact commitment once', () => {
  const s = createDefaultState()
  s.exploreUnlocked = true
  s.resources.food = 20
  startAction(s, 'explore')
  advanceTime(s, 1, true)
  const loaded = parseSave(JSON.stringify(s))
  expect(loaded.resources.food).toBe(20)
  expect(loaded.manual).toBeNull()
  expect(parseSave(JSON.stringify(loaded)).resources.food).toBe(20)
})

test('incompatible and incomplete saves reset projects and absence timestamps together', () => {
  expect(parseSave(JSON.stringify({ fruit: 900, savedAt: 123 }))).toEqual(
    createDefaultState(),
  )
  const s = settlement()
  s.savedAt = 1000
  const malformed = { ...s, queues: { research: null, construction: null } }
  expect(parseSave(JSON.stringify(malformed))).toEqual(createDefaultState())
})

test('current saves preserve unlimited levels and overstaffing', () => {
  const s = settlement()
  s.facilities.housing.level = 100
  s.facilities.lumber.level = 1
  s.facilities.lumber.equipment = 20
  people(s, ...Array.from({ length: 10 }, () => 'woodcutter' as const))
  const loaded = parseSave(JSON.stringify(s))
  expect(loaded.facilities.housing.level).toBe(100)
  expect(loaded.facilities.lumber.equipment).toBe(20)
  expect(loaded.people.every((p) => p.job === 'woodcutter')).toBe(true)
})

test('current saves preserve expedition history and pending reports', () => {
  const s = createDefaultState()
  s.completedEncounters['abandoned-cache'] = true
  s.pendingEncounter = 'ridge-travelers'
  const loaded = parseSave(JSON.stringify(s))
  expect(loaded.completedEncounters).toEqual(s.completedEncounters)
  expect(loaded.pendingEncounter).toBe('ridge-travelers')
})

test('encounter schema changes reset incomplete saves', () => {
  const s = createDefaultState()
  const old = { ...s, pendingEncounter: undefined }
  expect(parseSave(JSON.stringify(old))).toEqual(createDefaultState())
})
