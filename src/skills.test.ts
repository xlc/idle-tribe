import { expect, test } from 'bun:test'
import { beginAbsence, effectiveOfflineSeconds, settleAbsence } from './clock'
import { RESOURCES, WORKING_JOB_IDS } from './ids'
import { parseSave } from './persistence'
import { resetRun } from './prestige'
import { cancelProject, enqueue, nextExpansion, quoteProject } from './research'
import {
  adjustWorkers,
  arrivalAptitude,
  assignJob,
  constructionSpeed,
  fillWorkers,
  jobUnlocked,
  spawnSettler,
  workerRate,
  workerRates,
} from './settlement'
import { advanceTime, resourceRates } from './simulation'
import { expertiseLevel, practiceThreshold } from './skills'
import { createDefaultState, createPerson } from './state'
import { complete, people, required, settlement } from './test-helpers'

function camp() {
  const s = createDefaultState()
  complete(s, 'shelters', 'foraging-rounds')
  s.resources.food = 100000
  s.resources.wood = 100000
  s.facilities.foraging.level = 1
  s.facilities.stockyard.level = 100000
  s.facilities['food-store'].level = 100000
  s.facilities.lumber.level = 1
  s.facilities.sawmill.level = 1
  s.facilities['tool-workshop'].level = 1
  s.facilities.farm.level = 1
  return s
}

test('expertise earned at a threshold changes only subsequent work', () => {
  const s = camp()
  people(s, 'farmer')
  const p = required(s.people[0])
  p.practice.farmer = 890
  advanceTime(s, 30)
  expect(p.practice.farmer).toBeCloseTo(920, 8)
  expect(expertiseLevel(p.practice.farmer)).toBe(1)
  expect(s.resources.food - 100000 + p.progress).toBeCloseTo(
    (60 * 10) / 60 + (60 * 1.05 * 20) / 60 - 54 / 60,
    8,
  )
})

test('different recipes and equipment earn the same practice per supported minute', () => {
  const s = camp()
  people(s, 'farmer', 'toolmaker')
  s.resources.planks = 100
  s.resources.blocks = 100
  s.facilities.farm.equipment = 3
  advanceTime(s, 30)
  expect(required(s.people[0]).practice.farmer).toBeCloseTo(30, 8)
  expect(required(s.people[1]).practice.toolmaker).toBeCloseTo(30, 8)
  expect(s.resources.food - 100000).toBeGreaterThan(s.resources.tools)
})

test('contested inputs award actual practice, then resume from the blocked cycle', () => {
  const s = camp()
  people(s, 'sawyer', 'sawyer')
  s.resources.wood = 3
  advanceTime(s, 600)
  expect(s.resources.planks).toBe(1)
  expect(s.people.map((p) => p.practice.sawyer)).toEqual([120, 120])
  expect(s.people.map((p) => p.progress)).toEqual([0, 1])
  s.resources.wood = 3
  advanceTime(s, 0)
  expect(s.resources.planks).toBe(2)
  s.resources.wood = 6
  advanceTime(s, 60)
  expect(s.people.map((p) => p.practice.sawyer)).toEqual([180, 180])
})

test('crowding slows practice while storage does not change efficiency', () => {
  const crowded = camp()
  people(crowded, 'farmer', 'farmer', 'farmer', 'farmer')
  const roomy = structuredClone(crowded)
  roomy.facilities.farm.level = 2
  advanceTime(crowded, 30)
  advanceTime(roomy, 30)
  expect(required(crowded.people[0]).practice.farmer).toBeCloseTo(15, 8)
  expect(required(roomy.people[0]).practice.farmer).toBeCloseTo(30, 8)
  const stock = camp()
  people(stock, 'farmer')
  stock.facilities['food-store'].level = 0
  stock.resources.food = 100
  advanceTime(stock, 30)
  expect(required(stock.people[0]).practice.farmer).toBeCloseTo(30, 8)
  stock.resources.food = 0
  const before = required(stock.people[0]).practice.farmer
  advanceTime(stock, 30)
  expect(required(stock.people[0]).practice.farmer - before).toBeCloseTo(0, 8)
})

test('idle villagers consume 0.6 food per minute', () => {
  const s = camp()
  people(s, 'idle')
  s.resources.food = 4
  advanceTime(s, 60)
  expect(s.resources.food).toBeCloseTo(3.4, 8)
})

test('builders learn through active work, preserve practice on cancellation, and stop after completion', () => {
  const s = camp()
  people(s, 'builder')
  s.resources.wood = 100
  s.facilities.housing.level = 2
  const p = required(s.people[0])
  const project = nextExpansion(s, 'housing')
  const quote = quoteProject(s, project)
  enqueue(s, project)
  advanceTime(s, 30)
  expect(p.practice.builder).toBeCloseTo(30, 8)
  const active = required(s.queues.construction.active ?? undefined)
  expect(active.progress).toBeCloseTo(30 / 60, 8)
  expect(cancelProject(s, 'construction', active.sequence)).toBe(true)
  expect(p.practice.builder).toBeCloseTo(30, 8)
  expect(s.resources.wood).toBe(100)
  enqueue(s, nextExpansion(s, 'housing'))
  advanceTime(s, 300)
  expect(s.facilities.housing.level).toBe(3)
  expect(p.practice.builder).toBeCloseTo(30 + quote.total * 60, 8)
  expect(constructionSpeed(s)).toBe(1)
})

test('Plus and Fill prefer expertise, Minus releases the least contribution, and explicit assignment trains newcomers', () => {
  const s = camp()
  s.people = [
    createPerson('Novice', 'builder'),
    createPerson('Veteran', 'builder'),
    createPerson('Natural', 'builder'),
    createPerson('Hungry', 'builder'),
  ]
  required(s.people[0]).job = 'builder'
  required(s.people[1]).job = 'idle'
  required(s.people[2]).job = 'idle'
  required(s.people[3]).job = 'idle'
  required(s.people[1]).practice.sawyer = practiceThreshold(4)
  required(s.people[3]).practice.sawyer = practiceThreshold(9)
  expect(adjustWorkers(s, 'sawyer', 1)).toBe(true)
  expect(required(s.people[3]).job).toBe('sawyer')
  expect(fillWorkers(s, 'sawyer')).toBe(true)
  expect(required(s.people[1]).job).toBe('sawyer')
  expect(adjustWorkers(s, 'sawyer', -1)).toBe(true)
  expect(required(s.people[2]).job).toBe('idle')
  expect(assignJob(s, 0, 'sawyer')).toBe(true)
  advanceTime(s, 30)
  expect(required(s.people[0]).practice.sawyer).toBeGreaterThan(0)
  expect(required(s.people[3]).job).toBe('sawyer')
  expect(required(s.people[1]).job).toBe('idle')
})

test('expertise raises aggregate output within capacity and per-person input demand consistently', () => {
  const s = camp()
  people(s, 'farmer', 'farmer')
  const old = resourceRates(s).food
  for (const p of s.people) p.practice.farmer = practiceThreshold(4)
  expect(resourceRates(s).food).toBeGreaterThan(old)
  const capped = resourceRates(s).food
  // A third farmer exceeds the farm's slots and only adds meal demand.
  const novice = createPerson('Newcomer', 'builder')
  novice.job = 'farmer'
  s.people.push(novice)
  expect(resourceRates(s).food).toBeLessThan(capped)
  people(s, 'sawyer', 'sawyer')
  s.resources.wood = 100
  required(s.people[0]).practice.sawyer = practiceThreshold(9)
  const rates = workerRates(s)
  expect(rates[0]).toBeCloseTo(workerRate(s, required(s.people[0])), 10)
  expect(rates[1]).toBeCloseTo(workerRate(s, required(s.people[1])), 10)
  expect(resourceRates(s).wood).toBeCloseTo(
    -3 * rates.reduce((n, r) => n + r, 0),
    10,
  )
})

test('settler aptitudes are available jobs and persist across a reload', () => {
  const s = camp()
  s.resources.food = 100
  s.facilities.housing.level = 1
  people(s, 'forager')
  const expected = arrivalAptitude(s)
  expect(jobUnlocked(s, arrivalAptitude(s, 0))).toBe(true)
  expect(jobUnlocked(s, arrivalAptitude(s, 0.999))).toBe(true)
  expect(spawnSettler(s)).toBe(true)
  expect(required(s.people[1]).aptitude).toBe(expected)
  expect(parseSave(JSON.stringify(s)).people).toEqual(s.people)
})

test('offline practice and milestone reports agree across hidden callbacks and reloads', () => {
  const initial = camp()
  people(initial, 'sawyer', 'farmer')
  initial.facilities.housing.level = 2
  initial.savedAt = 1000
  beginAbsence(initial, 1000)
  const one = structuredClone(initial)
  const report = required(settleAbsence(one, 1000 + 24 * 3600000) ?? undefined)
  const sliced = structuredClone(initial)
  for (let hour = 1; hour <= 12; hour++)
    settleAbsence(sliced, 1000 + hour * 3600000)
  const restored = parseSave(JSON.stringify(sliced))
  let last = report
  for (let hour = 13; hour <= 24; hour++)
    last = required(settleAbsence(restored, 1000 + hour * 3600000) ?? undefined)
  expect(last.expertise).toEqual(report.expertise)
  expect(last.effectiveSeconds).toBeCloseTo(
    effectiveOfflineSeconds(86400, 8),
    8,
  )
  expect(last.expertise[0]?.gains[0]?.after).toBeGreaterThan(0)
  expect(restored.people.map((p) => p.aptitude)).toEqual(
    one.people.map((p) => p.aptitude),
  )
  for (const [index, person] of one.people.entries())
    for (const job of WORKING_JOB_IDS)
      expect(required(restored.people[index]).practice[job]).toBeCloseTo(
        person.practice[job],
        5,
      )
  for (const r of RESOURCES)
    expect(restored.resources[r]).toBeCloseTo(one.resources[r], 5)
  expect(settleAbsence(restored, restored.savedAt)?.expertise).toEqual(
    report.expertise,
  )
})

test('current saves retain fractional practice; incompatible expertise resets and prestige starts a fresh founder', () => {
  const s = settlement()
  people(s, 'woodcutter')
  required(s.people[0]).practice.woodcutter = 12345.678
  expect(parseSave(JSON.stringify(s))).toEqual(s)
  const malformed = { ...s, people: [{ ...s.people[0], practice: {} }] }
  expect(parseSave(JSON.stringify(malformed))).toEqual(createDefaultState())
  s.legacy.discovered = true
  expect(resetRun(s)).toBe(true)
  expect(s.people).toEqual(createDefaultState(s.nameSeed).people)
  expect(s.legacy.lifetime).toBeGreaterThan(0)
})
