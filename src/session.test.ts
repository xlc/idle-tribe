import { expect, test } from 'bun:test'
import {
  awayHighlight,
  awaySummary,
  beginAbsence,
  effectiveOfflineSeconds,
  MIN_AWAY_REPORT_SECONDS,
  offlineWindow,
  settleAbsence,
} from './clock'
import { RESOURCES } from './ids'
import { parseSave } from './persistence'
import { enqueue, quoteProject } from './research'
import { createSession } from './session'
import { createDefaultState } from './state'
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
  s.research['record-keeping'] = 0
  s.savedAt = hour
  enqueue(s, { kind: 'research', id: 'record-keeping' })
  const before = offlineWindow(s)
  beginAbsence(s, hour)
  settleAbsence(s, 25 * hour)
  expect(s.research['record-keeping']).toBe(1)
  expect(offlineWindow(s)).toBe(before + 4)
  expect(s.absence?.windowHours).toBe(before)
  expect(s.absence?.settledSeconds).toBeCloseTo(
    effectiveOfflineSeconds(24 * 3600, before),
    6,
  )
})

test('manual work pauses while hidden; research continues; duplicate restoration settles once', () => {
  const s = settlement()
  people(s, 'idle')
  s.research['record-keeping'] = 0
  const session = createSession(s, () => {}, hour, true)
  session.change(() => {
    session.game.startAction('sticks')
    enqueue(s, { kind: 'research', id: 'record-keeping' })
  }, hour)
  session.setVisible(false, hour + 500)
  const researchDuration = quoteProject(s, {
    kind: 'research',
    id: 'record-keeping',
  }).total
  const completionAt = hour + 500 + (researchDuration + 1) * 1000
  const manual = s.manual?.progress
  expect(manual).toBeGreaterThan(0)
  expect(manual).toBeLessThan(1)
  session.tick(completionAt)
  expect(s.manual?.progress).toBe(manual)
  expect(s.research['record-keeping']).toBe(1)
  session.setVisible(true, completionAt)
  const before = { ...s.resources }
  session.setVisible(true, completionAt)
  expect(s.resources).toEqual(before)
  session.tick(completionAt + 30000)
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
  people(s, 'farmer', 'farmer')
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

test('disabled persistence does not rewrite a wiped save during page teardown', () => {
  const state = createDefaultState()
  let writes = 0
  const session = createSession(state, () => writes++, hour, true)
  expect(writes).toBe(1)
  session.disablePersistence()
  session.setVisible(false, hour + 1000)
  session.tick(hour + 2000)
  expect(writes).toBe(1)
})

test('leaving preserves the unfinished manual cycle', () => {
  const s = createDefaultState()
  s.actionSkills.gather.level = 2
  const session = createSession(s, () => {}, hour, true)
  session.change(() => session.game.startAction('gather'), hour)
  session.setVisible(false, hour + 200)
  const paused = s.manual?.progress
  session.tick(hour + 10000)
  expect(s.manual?.progress).toBe(paused)
  session.setVisible(true, hour + 10000)
  session.tick(hour + 15000)
  expect(s.manual).toBeNull()
  expect(s.actionSkills.gather.xp).toBe(1)
})

test('a productive return highlights gains even without arrivals or completed projects', () => {
  const s = settlement()
  people(s, 'farmer')
  s.resources.food = 0
  beginAbsence(s, hour)
  const report = settleAbsence(s, hour + 60000)
  expect(report).not.toBeNull()
  if (!report) throw new Error('Missing away report')
  expect(report.arrivals).toBe(0)
  expect(report.completed).toBe(0)
  expect(awayHighlight(report)).toMatch(/^\+.* food$/)
  expect(awaySummary(report)).toMatch(/^\+.* food$/)
  report.expertise = [
    {
      index: 0,
      name: 'Founder',
      gains: [{ job: 'farmer', before: 0, after: 1 }],
    },
  ]
  expect(awayHighlight(report)).toBe('+1 expertise level')
  report.completed = 1
  expect(awayHighlight(report)).toBe('1 project completed')
  report.arrivals = 1
  expect(awaySummary(report)).toBe('1 project completed · 1 new settler')
  expect(awayHighlight(report)).toBe(awaySummary(report))
})

test('a return report highlights the largest resource loss when no milestone landed', () => {
  const s = settlement()
  beginAbsence(s, hour)
  const report = settleAbsence(s, hour + 60000)
  if (!report) throw new Error('Missing away report')
  report.expertise = []
  for (const resource of RESOURCES) report.gains[resource] = 0
  report.gains.food = -120
  expect(awayHighlight(report)).toBe('−120 food')
  expect(awaySummary(report)).toBe('−120 food')
})

test('session events use the settled timeline for actions and returning from an absence', () => {
  const state = createDefaultState()
  const session = createSession(state, () => {}, hour, true)
  session.change(() => {
    state.notice = 'A local action'
  }, hour + 2000)
  expect(session.events.at(-1)?.at).toBe(hour + 2000)
  session.setVisible(false, hour + 3000)
  session.setVisible(true, hour + 3000 + (MIN_AWAY_REPORT_SECONDS + 1) * 1000)
  expect(session.events.at(-1)?.text).toMatch(/^Away 5m 1s/)
  expect(session.events.at(-1)?.at).toBe(
    hour + 3000 + (MIN_AWAY_REPORT_SECONDS + 1) * 1000,
  )
})

test('notifications are dismissible without removing their session history', () => {
  const state = createDefaultState()
  const session = createSession(state, () => {}, hour, true)
  session.change(() => {
    state.notice = 'A local action'
  }, hour + 2000)
  const notice = session.notification
  expect(notice?.kind).toBe('notice')
  expect(session.events.at(-1)?.text).toBe('A local action')
  if (!notice) throw new Error('Missing notice notification')
  session.setVisible(false, hour + 3000)
  expect(session.notification).toBeNull()
  expect(session.events.at(-1)?.text).toBe('A local action')

  session.setVisible(true, hour + 3000 + (MIN_AWAY_REPORT_SECONDS + 1) * 1000)
  const away = session.notification
  expect(away?.kind).toBe('away')
  expect(session.events.at(-1)?.report).toBeDefined()
  if (!away) throw new Error('Missing away notification')
  session.dismissNotification(notice.id)
  expect(session.notification?.id).toBe(away.id)
  session.dismissNotification(away.id)
  expect(session.notification).toBeNull()
})

test('repeated expedition outcomes still create distinct session events', () => {
  const state = createDefaultState()
  const session = createSession(state, () => {}, hour, true)
  session.change(() => {
    state.lastExploreOutcome = { kind: 'resources', amount: { food: 2 } }
    state.notice = 'Explorers returned with +2 food'
  }, hour + 1000)
  session.change(() => {
    state.lastExploreOutcome = { kind: 'resources', amount: { food: 2 } }
    state.notice = 'Explorers returned with +2 food'
  }, hour + 2000)
  expect(
    session.events.filter((event) => event.kind === 'notice'),
  ).toHaveLength(2)
})

test('away reports count automated expedition discoveries', () => {
  const state = createDefaultState()
  state.completedEncounters['abandoned-cache'] = true
  beginAbsence(state, hour)
  state.completedEncounters['ridge-travelers'] = true
  const report = settleAbsence(state, hour + 60_000)
  expect(report?.encounters).toBe(1)
  if (!report) throw new Error('Missing away report')
  expect(awaySummary(report)).toContain('1 expedition discovery')
})
