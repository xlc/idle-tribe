import { expect, test } from 'bun:test'
import {
  beginAbsence,
  effectiveOfflineSeconds,
  offlineWindow,
  settleAbsence,
} from './clock'
import { RESOURCES } from './ids'
import { parseSave } from './persistence'
import { enqueue } from './research'
import { createSession } from './session'
import { people, settlement } from './test-helpers'

const hour = 3600000

test('the offline tail is continuous and keeps advancing after a week', () => {
  expect(effectiveOfflineSeconds(8 * 3600, 8)).toBe(8 * 3600)
  expect(effectiveOfflineSeconds(24 * 3600, 8) / 3600).toBeCloseTo(19.7128, 3)
  expect(effectiveOfflineSeconds(168 * 3600, 8) / 3600).toBeCloseTo(65.3212, 3)
  expect(effectiveOfflineSeconds(169 * 3600, 8)).toBeGreaterThan(
    effectiveOfflineSeconds(168 * 3600, 8),
  )
})

test('hidden callbacks and reloads preserve one snapshotted absence', () => {
  const initial = settlement()
  people(initial, 'forager', 'builder', 'scholar')
  initial.savedAt = hour
  const closed = structuredClone(initial)
  beginAbsence(closed, hour)
  settleAbsence(closed, 25 * hour)
  const hidden = structuredClone(initial)
  const first = createSession(hidden, () => {}, hour, true)
  first.setVisible(false, hour)
  for (let n = 2; n <= 13; n++) first.tick(n * hour)
  const restored = parseSave(JSON.stringify(hidden))
  const second = createSession(restored, () => {}, 13 * hour, false)
  for (let n = 14; n <= 25; n++) second.tick(n * hour)
  second.setVisible(true, 25 * hour)
  for (const r of RESOURCES)
    expect(restored.resources[r]).toBeCloseTo(closed.resources[r], 6)
  expect(restored.people.length).toBe(closed.people.length)
  expect(restored.absence).toBeNull()
  expect(second.away?.wallSeconds).toBe(24 * 3600)
})

test('an offline upgrade extends the next absence without changing this one', () => {
  const s = settlement()
  people(s, 'forager')
  s.research['record-keeping'] = false
  s.savedAt = hour
  enqueue(s, { kind: 'research', id: 'record-keeping' })
  const before = offlineWindow(s)
  beginAbsence(s, hour)
  settleAbsence(s, 25 * hour)
  expect(s.research['record-keeping']).toBe(true)
  expect(offlineWindow(s)).toBe(before + 4)
  expect(s.absence?.windowHours).toBe(before)
  expect(s.absence?.settledSeconds).toBeCloseTo(
    effectiveOfflineSeconds(24 * 3600, before),
    6,
  )
})

test('manual work pauses while hidden; research continues; duplicate restoration settles once', () => {
  const s = settlement()
  people(s, 'forager')
  s.research['record-keeping'] = false
  const session = createSession(s, () => {}, hour, true)
  session.change(() => {
    session.game.startAction('gather')
    enqueue(s, { kind: 'research', id: 'record-keeping' })
  }, hour)
  session.setVisible(false, hour + 500)
  const manual = s.manual?.progress
  expect(manual).toBeGreaterThan(0)
  expect(manual).toBeLessThan(1)
  session.tick(3 * hour)
  expect(s.manual?.progress).toBe(manual)
  expect(s.research['record-keeping']).toBe(true)
  session.setVisible(true, 3 * hour)
  const before = { ...s.resources }
  session.setVisible(true, 3 * hour)
  expect(s.resources).toEqual(before)
  session.tick(3 * hour + 30000)
  expect(s.manual).toBeNull()
})

test('actions settle elapsed gameplay before spending newly produced stock', () => {
  const s = settlement()
  people(s, 'woodcutter')
  s.resources.wood = 0
  const session = createSession(s, () => {}, hour, true)
  session.change(() => {
    expect(s.resources.wood).toBeGreaterThan(0)
  }, hour + 60000)
  expect(s.savedAt).toBe(hour + 60000)
})

test('a backwards wall clock cannot settle the same interval twice or invalidate a save', () => {
  const s = settlement()
  people(s, 'forager')
  s.savedAt = 2 * hour
  const session = createSession(s, () => {}, hour, false)
  session.tick(hour + 60000)
  const before = { ...s.resources }
  expect(parseSave(JSON.stringify(s)).resources).toEqual(before)
  session.setVisible(true, hour + 60000)
  session.tick(2 * hour)
  expect(s.resources).toEqual(before)
  session.tick(2 * hour + 60000)
  expect(s.resources.food).toBeGreaterThan(before.food)
})
