import { expect, test } from 'bun:test'
import { feast, feastCost } from './food'
import { RESOURCES } from './ids'
import { createRecord } from './records'
import { enqueue, nextExpansion } from './research'
import { arrivalStatus, happinessTarget, workerRate } from './settlement'
import { advanceTime, resourceRates } from './simulation'
import { createDefaultState } from './state'
import { complete, people, required, settlement } from './test-helpers'

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
  s.facilities.lumber.level = 1
  s.facilities.sawmill.level = 1
  s.welcome = false
  people(s, 'woodcutter', 'sawyer')
  s.resources.food = 10
  s.resources.wood = 2
  advanceTime(s, 30)
  expect(s.resources.wood).toBe(3)
  expect(s.people[1]?.progress).toBeCloseTo(0, 8)
  advanceTime(s, 30)
  expect(s.people[1]?.progress).toBeCloseTo(0.25, 8)
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
  initial.welcome = true
  initial.resources.food = 400
  enqueue(initial, nextExpansion(initial, 'food-store'))
  initial.research['record-keeping'] = false
  enqueue(initial, { kind: 'research', id: 'record-keeping' })
  const one = structuredClone(initial),
    many = structuredClone(initial)
  advanceTime(one, 18000)
  for (let i = 0; i < 1800; i++) advanceTime(many, 10)
  for (const r of RESOURCES)
    expect(one.resources[r]).toBeCloseTo(many.resources[r], 6)
  expect(one.facilities).toEqual(many.facilities)
  expect(one.research).toEqual(many.research)
  expect(one.people.length).toBe(many.people.length)
  expect(one.happiness).toBeCloseTo(many.happiness, 6)
  one.people.forEach((p, i) => {
    expect(p.progress).toBeCloseTo(many.people[i]?.progress ?? -1, 6)
    expect(p.health).toBe(required(many.people[i]).health)
  })
})

test('simultaneous project completion changes housing before immigration checks', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters')
  people(s, 'forager', 'builder')
  s.facilities.housing.level = 1
  s.resources.food = 80
  s.resources.wood = 100
  enqueue(s, nextExpansion(s, 'housing'))
  advanceTime(s, 0)
  const active = s.queues.construction.active
  if (!active) throw new Error('No project')
  active.progress = active.total
  s.arrivalProgress = 1
  advanceTime(s, 0)
  expect(s.facilities.housing.level).toBe(2)
  expect(s.people.length).toBe(3)
  expect(s.people[2]?.job).toBe('idle')
})

test('immigration pauses on inadequate sustainable supply, resumes, and arrivals stay unassigned', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters')
  s.facilities.housing.level = 1
  s.resources.food = 100
  people(s, 'forager')
  advanceTime(s, 300)
  expect(s.people.length).toBe(2)
  expect(s.people[1]?.job).toBe('idle')
  s.welcome = false
  const progress = s.arrivalProgress
  advanceTime(s, 600)
  expect(s.arrivalProgress).toBe(progress)
  s.welcome = true
  required(s.people[0]).job = 'idle'
  advanceTime(s, 600)
  expect(s.arrivalProgress).toBe(progress)
  required(s.people[0]).job = 'forager'
  expect(arrivalStatus(s).foodOutput).toBeGreaterThan(arrivalStatus(s).required)
})

test('food security guard accounts for scholarship at maximum happiness and ignores temporary hoards', () => {
  const s = settlement()
  people(s, 'farmer', 'scholar', 'scholar')
  s.facilities.farm.level = 1
  s.facilities.study.level = 1
  s.facilities.study.form = 1
  s.welcome = true
  s.resources.food = 100000
  const high = arrivalStatus(s)
  s.resources.food = high.buffer
  const buffer = arrivalStatus(s)
  expect(high.foodOutput).toBe(buffer.foodOutput)
  expect(high.required).toBeGreaterThan(1.1 * 4)
  s.happiness = 0
  expect(arrivalStatus(s).foodOutput).toBe(high.foodOutput)
  s.happiness = 100
  expect(arrivalStatus(s).required).toBe(high.required)
})

test('hunger remains recoverable and feasts consume exactly missing health', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters')
  people(s, 'idle', 'idle')
  s.welcome = false
  advanceTime(s, 300)
  expect(s.people.map((p) => p.health)).toEqual([0, 0])
  expect(feastCost(s)).toBe(10)
  required(s.people[0]).job = 'forager'
  advanceTime(s, 600)
  expect(s.people.map((p) => p.health)).toEqual([5, 5])
  required(s.people[0]).health = 2
  s.resources.food = 3
  expect(feast(s)).toBe(true)
  expect(s.resources.food).toBe(0)
  expect(s.people[0]?.health).toBe(5)
})

test('happiness begins at Writing and moves gradually after the shared meal', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters')
  s.facilities.housing.level = 12
  s.resources.food = 1000
  s.welcome = false
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

test('net rates include processor inputs, meals, equipment and storage pressure', () => {
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
})

test('spending from an above-threshold stockpile immediately relieves production pressure', () => {
  const s = settlement()
  people(s, 'woodcutter')
  s.resources = createRecord(RESOURCES, () => 0)
  s.resources.food = 1000
  s.resources.wood = 10000
  const slow = workerRate(s, required(s.people[0]))
  s.resources.wood = 1
  expect(workerRate(s, required(s.people[0]))).toBeGreaterThan(slow)
})
