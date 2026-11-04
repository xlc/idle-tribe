import { expect, test } from 'bun:test'
import { PERKS } from './definitions'
import { BUILDING_IDS, NOTE_IDS, PERK_IDS, RESOURCES } from './ids'
import { createRecord } from './records'
import { enqueue, nextExpansion } from './research'
import { storageCapacity } from './resources'
import {
  happinessTarget,
  noteUnlocked,
  requirementBlocker,
  workerRate,
} from './settlement'
import { advanceTime, resourceFlows, resourceRates } from './simulation'
import { createDefaultState } from './state'
import { complete, people, required, settlement } from './test-helpers'

test('unlock notes follow their mechanic conditions', () => {
  const s = createDefaultState()
  expect(NOTE_IDS.every((id) => !noteUnlocked(s, id))).toBe(true)
  s.researchUnlocked = true
  expect(noteUnlocked(s, 'research')).toBe(true)
  complete(s, 'foraging-rounds')
  expect(noteUnlocked(s, 'jobs')).toBe(true)
  s.expeditionUnlocked = true
  expect(noteUnlocked(s, 'expedition')).toBe(true)
  complete(s, 'writing')
  expect(noteUnlocked(s, 'happiness')).toBe(true)
  s.specialization = 'forestry'
  expect(noteUnlocked(s, 'paths')).toBe(true)
  s.era = 1
  expect(noteUnlocked(s, 'eras')).toBe(true)
  s.legacy.discovered = true
  expect(noteUnlocked(s, 'time-box')).toBe(true)
  expect(NOTE_IDS.every((id) => noteUnlocked(s, id))).toBe(true)
})

test('processing consumes one recipe per completion; scarce inputs resolve in roster order', () => {
  const s = settlement()
  people(s, 'sawyer', 'sawyer')
  s.resources.wood = 2
  s.resources.planks = 0
  advanceTime(s, 600)
  expect(s.resources.planks).toBe(1)
  expect(s.resources.wood).toBe(0)
  expect(s.people[0]?.progress).toBe(0)
  expect(s.people[1]?.progress).toBe(1)
  s.resources.wood = 2
  advanceTime(s, 0)
  expect(s.resources.planks).toBe(2)
  expect(s.resources.wood).toBe(0)
})

test('newly produced inputs start downstream work from that timestamp, without retroactive progress', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters', 'carpentry')
  s.discovered.wood = true
  s.facilities.lumber.level = 1
  s.facilities.sawmill.level = 1
  people(s, 'woodcutter', 'sawyer')
  s.resources.food = 10
  s.resources.wood = 2
  advanceTime(s, 30)
  // Automated wood gathering trickles wood in; the sawyer stays paused
  // until a full recipe exists, then works only from that moment.
  expect(s.resources.wood).toBeGreaterThan(2)
  const started = s.people[1]?.progress ?? 0
  expect(started).toBeGreaterThanOrEqual(0)
  expect(started).toBeLessThan(0.3)
  advanceTime(s, 30)
  expect(s.people[1]?.progress ?? 0).toBeGreaterThan(started)
})

test('live and sliced simulations have the same resources, projects, meals and arrivals', () => {
  const initial = settlement()
  people(
    initial,
    'forager',
    'forager',
    'woodcutter',
    'stoneworker',
    'sawyer',
    'mason',
    'toolmaker',
    'scholar',
    'builder',
  )
  initial.resources.food = 400
  enqueue(initial, nextExpansion(initial, 'food-store'))
  initial.research['record-keeping'] = 0
  enqueue(initial, { kind: 'research', id: 'record-keeping' })
  const one = structuredClone(initial),
    many = structuredClone(initial)
  advanceTime(one, 18000)
  for (let i = 0; i < 1800; i++) advanceTime(many, 10)
  for (const r of RESOURCES)
    expect(one.resources[r]).toBeCloseTo(many.resources[r], 1)
  expect(one.facilities).toEqual(many.facilities)
  expect(one.research).toEqual(many.research)
  expect(one.people.length).toBe(many.people.length)
  expect(one.happiness).toBeCloseTo(many.happiness, 3)
  one.people.forEach((p, i) => {
    expect(p.progress).toBeCloseTo(many.people[i]?.progress ?? -1, 3)
    expect(p.health).toBeCloseTo(required(many.people[i]).health, 5)
  })
})

test('injured villagers recover one heart per minute while food lasts', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters', 'foraging-rounds')
  people(s, 'idle', 'idle')
  required(s.people[0]).health = 2
  required(s.people[1]).health = 3
  s.resources.food = 4
  advanceTime(s, 60)
  expect(s.people.map((p) => p.health).map(Math.round)).toEqual([3, 4])
  expect(s.resources.food).toBeCloseTo(0, 6)
})

test('happiness begins at Writing and moves gradually after the shared meal', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters', 'foraging-rounds')
  s.facilities.housing.level = 12
  s.resources.food = 1000
  people(s, ...Array.from({ length: 20 }, () => 'idle' as const))
  s.facilities['public-well'].level = 2
  s.facilities['meeting-place'].level = 1
  s.resources.food = 600
  expect(happinessTarget(s)).toBe(90)
  const before = s.happiness
  advanceTime(s, 60)
  expect(s.happiness).toBe(before)
  complete(s, 'writing')
  expect(s.happiness).toBe(50)
  advanceTime(s, 60)
  expect(s.happiness).toBe(52)
})

test('ceramic craft turns town inputs into a happiness investment', () => {
  const s = settlement()
  for (const id of BUILDING_IDS)
    s.facilities[id] = { level: 0, form: 0, equipment: 0 }
  people(s, 'potter')
  s.resources.blocks = 2
  s.resources.wood = 1
  s.resources.ceramics = 0
  required(s.people[0]).progress = 1

  s.facilities.kiln.level = 1
  advanceTime(s, 0)
  expect(s.resources.ceramics).toBe(1)
  expect(s.resources.blocks).toBe(0)
  expect(s.resources.wood).toBe(0)

  const beforeBathhouse = happinessTarget(s)
  s.facilities.bathhouse.level = 1
  expect(happinessTarget(s)).toBeGreaterThan(beforeBathhouse)
})

test('net rates include processor inputs, meals and equipment without storage penalties', () => {
  const s = settlement()
  people(s, 'forager', 'scholar', 'sawyer')
  s.resources.wood = 20
  s.resources.food = 100
  const rates = resourceRates(s),
    sum = (job: string) =>
      s.people
        .filter((p) => p.job === job)
        .reduce((n, p) => n + workerRate(s, p), 0)
  expect(rates.food).toBeCloseTo(sum('forager') - sum('scholar') - 3)
  expect(rates.wood).toBeCloseTo(-2 * sum('sawyer'))
  expect(rates.planks).toBeCloseTo(sum('sawyer'))
  const flows = resourceFlows(s)
  expect(flows.food.production).toBeCloseTo(sum('forager'))
  expect(flows.food.inputs).toBeCloseTo(sum('scholar'))
  expect(flows.food.meals).toBe(3)
  expect(flows.wood.inputs).toBeCloseTo(2 * sum('sawyer'))
  expect(flows.planks.production).toBeCloseTo(sum('sawyer'))
})

test('full outputs are discarded while processor inputs and work continue', () => {
  const s = settlement()
  people(s, 'sawyer')
  s.resources.planks = storageCapacity(s, 'planks')
  const flows = resourceFlows(s)
  expect(flows.planks.production).toBeGreaterThan(0)
  expect(flows.wood.inputs).toBeGreaterThan(0)
  const before = s.resources.wood
  advanceTime(s, 200)
  expect(s.resources.planks).toBe(storageCapacity(s, 'planks'))
  expect(s.resources.wood).toBeLessThan(before)
})

test('spending from a full stockpile does not change production efficiency', () => {
  const s = settlement()
  people(s, 'farmer')
  s.resources = createRecord(RESOURCES, () => 0)
  s.resources.food = 100000
  const full = workerRate(s, required(s.people[0]))
  s.resources.food = 1
  expect(workerRate(s, required(s.people[0]))).toBeCloseTo(full, 8)
})

test.each(PERK_IDS)('a %s requirement names the actual missing perk', (id) => {
  const state = createDefaultState()
  expect(requirementBlocker(state, { perk: id })).toBe(
    `Requires permanent ${PERKS[id].name} perk`,
  )
  state.legacy.perks[id] = true
  expect(requirementBlocker(state, { perk: id })).toBe('')
})
