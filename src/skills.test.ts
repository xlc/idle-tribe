import { expect, test } from 'bun:test'
import { beginAbsence, effectiveOfflineSeconds, settleAbsence } from './clock'
import { feast } from './food'
import { RESOURCES, WORKING_JOB_IDS } from './ids'
import { parseSave } from './persistence'
import { resetRun } from './prestige'
import { cancelProject, enqueue, nextExpansion } from './research'
import {
  adjustWorkers,
  arrivalAptitude,
  arrivalStatus,
  assignJob,
  constructionSpeed,
  fillWorkers,
  jobUnlocked,
  workerRate,
  workerRates,
} from './settlement'
import { advanceTime, resourceRates } from './simulation'
import { expertiseLevel, personalWork, practiceThreshold } from './skills'
import { createDefaultState, createPerson } from './state'
import { complete, people, required, settlement } from './test-helpers'

function camp() {
  const s = createDefaultState()
  complete(s, 'shelters')
  s.welcome = false
  s.resources.food = 100000
  s.resources.wood = 100000
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
    (18 * 10) / 60 + (18 * 1.05 * 20) / 60,
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

test('crowding and storage pressure slow practice and expansion restores efficiency', () => {
  const crowded = camp()
  people(crowded, 'farmer', 'farmer', 'farmer', 'farmer')
  const roomy = structuredClone(crowded)
  roomy.facilities.farm.level = 2
  advanceTime(crowded, 30)
  advanceTime(roomy, 30)
  expect(required(crowded.people[0]).practice.farmer).toBeCloseTo(
    (30 * (1 + Math.log(2))) / 2,
    8,
  )
  expect(required(roomy.people[0]).practice.farmer).toBeCloseTo(30, 8)
  const stock = camp()
  people(stock, 'farmer')
  stock.facilities['food-store'].level = 0
  stock.resources.food = 10000
  advanceTime(stock, 30)
  expect(required(stock.people[0]).practice.farmer).toBeLessThan(30)
  stock.resources.food = 0
  const before = required(stock.people[0]).practice.farmer
  advanceTime(stock, 30)
  expect(required(stock.people[0]).practice.farmer - before).toBeCloseTo(30, 8)
})

test('meals and a feast recover health and the normal learning rate', () => {
  const s = camp()
  people(s, 'farmer')
  const p = required(s.people[0])
  p.health = 2
  advanceTime(s, 30)
  expect(p.practice.farmer).toBeCloseTo(15, 8)
  expect(feast(s)).toBe(true)
  advanceTime(s, 30)
  expect(p.health).toBe(5)
  expect(p.practice.farmer).toBeCloseTo(45, 8)
  p.health = 3
  advanceTime(s, 60)
  expect(p.health).toBe(4)
  expect(p.practice.farmer).toBeCloseTo(93, 8)
})

test('builders learn through active work, preserve practice on cancellation, and stop after completion', () => {
  const s = camp()
  people(s, 'builder')
  s.resources.wood = 100
  const p = required(s.people[0])
  enqueue(s, nextExpansion(s, 'housing'))
  advanceTime(s, 30)
  expect(p.practice.builder).toBeCloseTo(30, 8)
  expect(s.queues.construction.active?.progress).toBeCloseTo(0.5, 8)
  const project = required(s.queues.construction.active ?? undefined)
  expect(cancelProject(s, 'construction', project.sequence)).toBe(true)
  expect(p.practice.builder).toBeCloseTo(30, 8)
  expect(s.resources.wood).toBe(100)
  enqueue(s, nextExpansion(s, 'housing'))
  advanceTime(s, 300)
  expect(s.facilities.housing.level).toBe(1)
  expect(p.practice.builder).toBeCloseTo(150, 8)
  expect(constructionSpeed(s)).toBe(1)
})

test('expertise survives conversion and reassignment while a new occupation starts fresh', () => {
  const s = settlement()
  people(s, 'sawyer')
  const p = required(s.people[0])
  p.practice.sawyer = practiceThreshold(4)
  p.progress = 0.7
  expect(assignJob(s, 0, 'farmer')).toBe(true)
  expect(personalWork(p, 'farmer')).toBe(1)
  expect(p.progress).toBe(0)
  advanceTime(s, 10)
  expect(p.practice.farmer).toBeGreaterThan(0)
  expect(assignJob(s, 0, 'sawyer')).toBe(true)
  expect(expertiseLevel(p.practice.sawyer)).toBe(4)
  complete(s, 'forestry-methods')
  enqueue(s, { kind: 'convert', id: 'lumber', form: 1 })
  people(s, 'builder', 'sawyer')
  required(s.people[1]).practice.sawyer = practiceThreshold(4)
  advanceTime(s, 10000)
  expect(s.facilities.lumber.form).toBe(1)
  expect(required(s.people[1]).practice.sawyer).toBeGreaterThan(
    practiceThreshold(4),
  )
})

test('Plus and Fill prefer healthy expertise, Minus releases the least contribution, and explicit assignment trains newcomers', () => {
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
  required(s.people[3]).health = 2
  expect(adjustWorkers(s, 'sawyer', 1)).toBe(true)
  expect(required(s.people[1]).job).toBe('sawyer')
  expect(fillWorkers(s, 'sawyer')).toBe(true)
  expect(required(s.people[2]).job).toBe('sawyer')
  expect(adjustWorkers(s, 'sawyer', -1)).toBe(true)
  expect(required(s.people[2]).job).toBe('idle')
  expect(assignJob(s, 0, 'sawyer')).toBe(true)
  advanceTime(s, 30)
  expect(required(s.people[0]).practice.sawyer).toBeGreaterThan(0)
  expect(required(s.people[1]).job).toBe('sawyer')
  expect(required(s.people[3]).job).toBe('idle')
})

test('mixed expertise raises aggregate output and per-person input demand consistently', () => {
  const s = camp()
  people(s, 'farmer', 'farmer')
  for (const p of s.people) p.practice.farmer = practiceThreshold(4)
  const old = resourceRates(s).food
  const novice = createPerson('Newcomer', 'builder')
  novice.job = 'farmer'
  s.people.push(novice)
  expect(resourceRates(s).food).toBeGreaterThan(old)
  const before = resourceRates(s).food
  novice.practice.farmer = practiceThreshold(1)
  expect(resourceRates(s).food).toBeGreaterThan(before)
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

test('food security uses every food producer and each scholar under conservative conditions', () => {
  const s = settlement()
  people(s, 'farmer', 'farmer', 'scholar', 'scholar')
  s.facilities.farm.level = 4
  s.facilities.study.level = 4
  s.welcome = true
  const initial = arrivalStatus(s)
  required(s.people[1]).practice.farmer = practiceThreshold(9)
  const trainedFood = arrivalStatus(s)
  expect(trainedFood.foodOutput).toBeGreaterThan(initial.foodOutput)
  required(s.people[3]).practice.scholar = practiceThreshold(9)
  expect(arrivalStatus(s).required).toBeGreaterThan(trainedFood.required)
  required(s.people[3]).health = 2
  expect(arrivalStatus(s).required).toBeGreaterThan(trainedFood.required)
})

test('arrival aptitudes are available occupations and persist across a reload', () => {
  const s = camp()
  s.welcome = true
  s.resources.food = 100
  s.facilities.housing.level = 1
  people(s, 'forager')
  const expected = arrivalAptitude(s)
  expect(jobUnlocked(s, arrivalAptitude(s, 0))).toBe(true)
  expect(jobUnlocked(s, arrivalAptitude(s, 0.999))).toBe(true)
  advanceTime(s, 300)
  expect(s.people.length).toBe(2)
  expect(required(s.people[1]).aptitude).toBe(expected)
  expect(parseSave(JSON.stringify(s)).people).toEqual(s.people)
})

test('offline practice and milestone reports agree across hidden callbacks and reloads', () => {
  const initial = camp()
  people(initial, 'sawyer', 'farmer')
  initial.welcome = true
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
  expect(parseSave(JSON.stringify({ ...s, version: 5 }))).toEqual(
    createDefaultState(),
  )
  const malformed = { ...s, people: [{ ...s.people[0], practice: {} }] }
  expect(parseSave(JSON.stringify(malformed))).toEqual(createDefaultState())
  s.legacy.discovered = true
  expect(resetRun(s)).toBe(true)
  expect(s.people).toEqual(createDefaultState().people)
  expect(s.legacy.lifetime).toBeGreaterThan(0)
})
