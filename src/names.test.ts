import { expect, test } from 'bun:test'
import { FAMILY_NAMES, GIVEN_NAMES } from './definitions/person-names'
import { createGame } from './game'
import {
  generatePersonName,
  normalizePersonName,
  PERSON_NAME_MAX_LENGTH,
} from './names'
import { parseSave } from './persistence'
import { resetRun } from './prestige'
import { createSession } from './session'
import { advanceTime } from './simulation'
import { createDefaultState } from './state'
import { complete, required } from './test-helpers'
import type { GameState } from './types'

test('founders get repeatable names from varied settlement seeds', () => {
  const names = Array.from({ length: 100 }, (_, seed) => {
    const name = required(createDefaultState(seed).people[0]).name
    expect(name).toBe(generatePersonName(seed))
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
  expect(normalizePersonName(overflow)).toBe(overflow)
})

test('arrivals keep the same names across tick sizes and reloads', () => {
  const state = createDefaultState(1942)
  complete(state, 'sharpened-stick', 'shelters')
  state.resources.food = 10000
  state.facilities.farm.level = 1
  state.facilities['food-store'].level = 10000
  state.facilities.housing.level = 10
  required(state.people[0]).job = 'farmer'
  // Force the next arrival to draw a full name already used by the founder.
  required(state.people[0]).name = generatePersonName(state.nameSeed + 1)
  const sliced = structuredClone(state)
  advanceTime(state, 900)
  for (let i = 0; i < 30; i++) advanceTime(sliced, 30)
  const reloaded = parseSave(JSON.stringify(sliced), 999)
  advanceTime(state, 900)
  advanceTime(reloaded, 900)
  const names = state.people.map((person) => person.name)
  expect(names.length).toBeGreaterThan(2)
  expect(names).toEqual(reloaded.people.map((person) => person.name))
  expect(new Set(names).size).toBe(names.length)
  expect(reloaded.nameSeed).toBe(1942)
})

test('renaming normalizes whitespace and preserves personal progress', () => {
  const state = createDefaultState(42),
    game = createGame(state),
    person = required(state.people[0]),
    before = structuredClone(person)
  expect(game.rename(0, '  Éira   River Reed  ')).toBe(true)
  expect(person).toEqual({ ...before, name: 'Éira River Reed' })
  expect(game.rename(0, 'x'.repeat(PERSON_NAME_MAX_LENGTH))).toBe(true)
})

test('a rename saves immediately and survives a reload with the settlement seed', () => {
  const state = createDefaultState(75),
    writes: GameState[] = [],
    session = createSession(state, (saved) => writes.push(saved), 1000, true)
  session.change(() => session.game.rename(0, '<b>River</b>'), 1000)
  const saved = required(writes.at(-1)),
    loaded = parseSave(JSON.stringify(saved), 999)
  expect(required(loaded.people[0]).name).toBe('<b>River</b>')
  expect(loaded.nameSeed).toBe(75)
})

test('a time-box reset starts a new name sequence', () => {
  const state = createDefaultState(42)
  state.legacy.discovered = true
  state.research.writing = true
  createGame(state).rename(0, 'Custom founder')
  expect(resetRun(state)).toBe(true)
  expect(state.nameSeed).toBe(43)
  expect(required(state.people[0]).name).toBe(
    generatePersonName(state.nameSeed),
  )
  expect(parseSave(JSON.stringify(state))).toEqual(state)
})
