import { describe, expect, test } from 'bun:test'
import { createGame } from './game'
import { parseSave } from './persistence'
import { createDefaultState } from './state'
import { itemAt } from './test-helpers'

describe('browser saves', () => {
  test('missing or invalid saves start a fresh game', () => {
    for (const value of [null, '{', 'null', '[]', 'true', '42', '"text"']) {
      expect(parseSave(value)).toEqual(createDefaultState())
    }
    const first = parseSave(null)
    first.skills.gather.level = 20
    expect(parseSave(null).skills.gather.level).toBe(1)
  })

  test('incompatible save versions reset instead of migrating progress', () => {
    for (const version of [undefined, null, 1, 2, 3, 5, '4', {}, []]) {
      const saved = { ...createDefaultState(), version, fruit: 42 }
      expect(parseSave(JSON.stringify(saved))).toEqual(createDefaultState())
    }
  })

  test('current saves round-trip', () => {
    const state = createDefaultState()
    state.fruit = 12.3
    state.skills.gather = { level: 4, xp: 2 }
    state.foodElapsedMs = 1234
    expect(parseSave(JSON.stringify(state))).toEqual(state)
  })

  test('large finite resources survive normalization and repeated saves', () => {
    const state = createDefaultState()
    state.fruit = Number.MAX_VALUE
    state.wood = 1e307
    const restored = parseSave(JSON.stringify(state))
    expect(restored.fruit).toBe(state.fruit)
    expect(restored.wood).toBe(state.wood)
    expect(parseSave(JSON.stringify(restored))).toEqual(restored)
  })

  test('malformed fields are normalized', () => {
    const state = parseSave(
      JSON.stringify({
        ...createDefaultState(),
        fruit: -10,
        wood: '12',
        skills: { gather: { level: -2, xp: 2.9 } },
        researchLevels: { 'sharpened-stick': 99 },
        people: [null, { name: 'You', maxHunger: 5, hunger: 12 }],
        foodElapsedMs: 60042,
      }),
    )
    expect(state.fruit).toBe(0)
    expect(state.wood).toBe(0)
    expect(state.skills.gather).toEqual({ level: 1, xp: 2 })
    expect(state.researchLevels['sharpened-stick']).toBe(3)
    expect(state.people.map((person) => person.hunger)).toEqual([5, 5])
    expect(state.foodElapsedMs).toBe(42)
  })

  test('read research stays read after reloading', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    state.researchLevels['sharpened-stick'] = 1
    state.basicTools = true
    createGame(state).markResearchSeen()
    const restored = parseSave(JSON.stringify(state))
    expect(restored).toEqual(state)
    expect(createGame(restored).getUnreadResearch()).toEqual([])
    restored.stoneFound = true
    expect(createGame(restored).getUnreadResearch()).toEqual(['stone-flakes'])
  })

  test('completed research is read and next unlocks remain unread', () => {
    const restored = parseSave(
      JSON.stringify({
        ...createDefaultState(),
        fruit: 42,
        researchUnlocked: true,
        basicTools: true,
        researchLevels: { 'sharpened-stick': 2 },
      }),
    )
    expect(restored.fruit).toBe(42)
    expect(restored.researchLevels['sharpened-stick']).toBe(2)
    expect(restored.seenResearchLevels['sharpened-stick']).toBe(2)
    expect(createGame(restored).getUnreadResearch()).toEqual([
      'sharpened-stick',
      'foraging-practice',
      'shelters',
    ])
  })

  test('invalid read status is normalized without hiding newly unlocked research', () => {
    const restored = parseSave(
      JSON.stringify({
        ...createDefaultState(),
        researchUnlocked: true,
        seenResearchLevels: {
          'sharpened-stick': '3',
          'foraging-practice': -10,
          'stone-flakes': 99,
        },
      }),
    )
    expect(restored.seenResearchLevels).toEqual({
      ...createDefaultState().seenResearchLevels,
      'sharpened-stick': 0,
      'foraging-practice': 0,
      'stone-flakes': 3,
    })
    expect(createGame(restored).getUnreadResearch()).toEqual([
      'sharpened-stick',
    ])
  })
})

test('jobs normalize invalid or locked assignments without removing existing people', () => {
  const state = createDefaultState()
  state.people = Array.from({ length: 10 }, (_, i) => ({
    ...itemAt(state.people, 0),
    name: `Person ${i}`,
    job: 'stoneworker',
    workElapsedMs: 13000,
  }))
  let restored = parseSave(JSON.stringify(state))
  expect(restored.people).toHaveLength(10)
  expect(restored.people.every((person) => person.job === 'idle')).toBe(true)
  state.researchLevels.shelters = 1
  state.stoneFound = true
  state.buildings.quarry = 5
  restored = parseSave(JSON.stringify(state))
  const worker = itemAt(restored.people, 0)
  expect(worker.job).toBe('stoneworker')
  expect(worker.workElapsedMs).toBe(1000)
  const invalid = {
    ...state,
    people: [
      { ...itemAt(state.people, 0), job: 'unknown', workElapsedMs: -10 },
    ],
  }
  const unassigned = itemAt(parseSave(JSON.stringify(invalid)).people, 0)
  expect(unassigned.job).toBe('idle')
  expect(unassigned.workElapsedMs).toBe(0)
})

test('current saves preserve explicit player identity and normalize duplicate or missing markers', () => {
  const state = createDefaultState()
  const player = itemAt(state.people, 0)
  player.name = 'Renamed player'
  state.people.unshift({
    ...player,
    name: 'You',
    isPlayer: false,
  })
  expect(parseSave(JSON.stringify(state))).toEqual(state)
  for (const markers of [
    [true, true],
    [false, false],
    ['true', null],
  ]) {
    const restored = parseSave(
      JSON.stringify({
        ...state,
        people: state.people.map((person, index) => ({
          ...person,
          isPlayer: markers[index],
        })),
      }),
    )
    expect(restored.people.map((person) => person.isPlayer)).toEqual([
      true,
      false,
    ])
  }
})

test('new economy state round-trips and malformed choices cannot unlock both paths', () => {
  const state = createDefaultState()
  state.planks = 42.3
  state.blocks = 12
  state.knowledge = 10
  state.specialization = 'forestry'
  state.researchLevels.forestry = 1
  state.seenResearchLevels.forestry = 1
  state.buildings.sawmill = 3
  state.savedAt = 123456
  expect(parseSave(JSON.stringify(state))).toEqual(state)
  const corrupt = {
    ...state,
    researchLevels: { ...state.researchLevels, stonecraft: 1, architecture: 1 },
    buildings: { ...state.buildings, study: -1 },
    savedAt: -10,
  }
  const restored = parseSave(JSON.stringify(corrupt))
  expect(restored.specialization).toBe('forestry')
  expect(restored.researchLevels.stonecraft).toBe(0)
  expect(restored.researchLevels.architecture).toBe(0)
  expect(restored.buildings.study).toBe(0)
  expect(restored.savedAt).toBe(0)
})

test('untrusted job values cannot become assignments or discard valid progress', () => {
  const state = createDefaultState()
  state.fruit = 42
  state.explored = true
  state.researchLevels.shelters = 1
  state.buildings['foraging-camp'] = 2
  state.buildings['lumber-camp'] = 2
  const person = itemAt(state.people, 0)
  for (const job of [
    'constructor',
    '__proto__',
    'toString',
    '',
    null,
    7,
    {},
    [],
  ]) {
    const restored = parseSave(
      JSON.stringify({
        ...state,
        people: [
          { ...person, job, workElapsedMs: 1234 },
          {
            ...person,
            name: 'Mira',
            isPlayer: false,
            job: 'woodcutter',
            workElapsedMs: 2345,
          },
        ],
      }),
    )
    expect(restored.fruit).toBe(42)
    expect(restored.people).toHaveLength(2)
    const unassigned = itemAt(restored.people, 0)
    const worker = itemAt(restored.people, 1)
    expect(unassigned.job).toBe('idle')
    expect(unassigned.workElapsedMs).toBe(0)
    expect(worker.job).toBe('woodcutter')
    expect(worker.workElapsedMs).toBe(2345)
  }
})

test('malformed nested records preserve unrelated resources and valid people', () => {
  const restored = parseSave(
    JSON.stringify({
      version: 4,
      fruit: 42,
      wood: 12,
      skills: { gather: [], sticks: { level: 3, xp: 2 } },
      researchLevels: [],
      buildings: false,
      people: [[], { name: 'Mira', hunger: 3, maxHunger: 5 }],
    }),
  )
  expect(restored.fruit).toBe(42)
  expect(restored.wood).toBe(12)
  expect(restored.skills.gather).toEqual({ level: 1, xp: 0 })
  expect(restored.skills.sticks).toEqual({ level: 3, xp: 2 })
  expect(restored.people.map(({ name, hunger }) => ({ name, hunger }))).toEqual(
    [
      { name: 'Person', hunger: 5 },
      { name: 'Mira', hunger: 3 },
    ],
  )
  expect(parseSave(JSON.stringify(restored))).toEqual(restored)
})
