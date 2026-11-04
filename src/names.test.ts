import { expect, test } from 'bun:test'
import { FAMILY_NAMES, GIVEN_NAMES } from './definitions/person-names'
import { generatePersonName, PERSON_NAME_MAX_LENGTH } from './names'
import { parseSave } from './persistence'
import { resetRun } from './prestige'
import { spawnSettler } from './settlement'
import { createDefaultState } from './state'
import { complete, required } from './test-helpers'

test('founders get repeatable names from varied settlement seeds', () => {
  const names = Array.from({ length: 100 }, (_, seed) => {
    const state = createDefaultState(seed)
    complete(state, 'shelters', 'foraging-rounds')
    const name = required(state.people[0]).name
    expect(name).toBe(generatePersonName(seed))
    expect(name.length).toBeLessThanOrEqual(PERSON_NAME_MAX_LENGTH)
    expect(name).toMatch(/^\S+ \S+$/)
    return name
  })
  expect(new Set(names).size).toBeGreaterThan(80)
})

test('generation has no population limit at pool exhaustion', () => {
  const names: string[] = []
  for (const given of GIVEN_NAMES)
    for (const family of FAMILY_NAMES) names.push(`${given} ${family}`)
  const overflow = generatePersonName(42, names)
  expect(overflow.length).toBeLessThanOrEqual(PERSON_NAME_MAX_LENGTH)
  expect(overflow).toMatch(/^\S+ \S+( \d+)?$/)
})

test('settlers keep unique, reproducible names across reloads', () => {
  const state = createDefaultState(1942)
  complete(state, 'sharpened-stick', 'shelters', 'foraging-rounds')
  state.facilities.housing.level = 10
  state.facilities.foraging.level = 1
  // Force the next settler to draw a full name already used by the founder.
  required(state.people[0]).name = generatePersonName(state.nameSeed + 1)
  for (let i = 0; i < 3; i++) expect(spawnSettler(state)).toBe(true)
  const reloaded = parseSave(JSON.stringify(state))
  expect(spawnSettler(reloaded)).toBe(true)
  expect(spawnSettler(state)).toBe(true)
  const names = state.people.map((person) => person.name)
  expect(names.length).toBeGreaterThan(2)
  expect(names).toEqual(reloaded.people.map((person) => person.name))
  expect(new Set(names).size).toBe(names.length)
  expect(reloaded.nameSeed).toBe(1942)
})

test('a time-box reset starts a new name sequence', () => {
  const state = createDefaultState(42)
  state.legacy.discovered = true
  state.research.writing = 1
  expect(resetRun(state)).toBe(true)
  expect(state.nameSeed).toBe(43)
  complete(state, 'shelters', 'foraging-rounds')
  expect(required(state.people[0]).name).toBe(
    generatePersonName(state.nameSeed),
  )
  expect(parseSave(JSON.stringify(state))).toEqual(state)
})
