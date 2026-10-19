import { describe, expect, test } from 'bun:test'
import { createGame } from './game'
import { parseSave } from './persistence'
import { createDefaultState } from './state'

describe('browser saves', () => {
  test('missing or invalid saves start a fresh game', () => {
    for (const value of [null, '{', 'null', '[]']) {
      expect(parseSave(value)).toEqual(createDefaultState())
    }
    const first = parseSave(null)
    first.skills.gather.level = 20
    expect(parseSave(null).skills.gather.level).toBe(1)
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

  test('legacy tools and exploration remain unlocked', () => {
    const state = parseSave(
      JSON.stringify({ basicTools: true, explored: true }),
    )
    expect(state.researchLevels['sharpened-stick']).toBe(1)
    expect(state.basicTools).toBe(true)
    expect(state.exploreUnlocked).toBe(true)
  })

  test('malformed fields are normalized', () => {
    const state = parseSave(
      JSON.stringify({
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

  test('saves predating unread indicators preserve progress and notify about next unlocks', () => {
    const restored = parseSave(
      JSON.stringify({
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

test('version 1 migration preserves every person and progress while initializing jobs', () => {
  const old = {
    fruit: 52,
    wood: 18,
    stone: 3,
    explored: true,
    stoneFound: true,
    basicTools: true,
    actions: 123,
    foodElapsedMs: 45000,
    researchLevels: { 'foraging-practice': 2 },
    skills: { sticks: { level: 8, xp: 4 } },
    people: [
      { name: 'You', hunger: 4, maxHunger: 5 },
      { name: '<b>Mira</b>', hunger: 3, maxHunger: 5 },
    ],
  }
  const restored = parseSave(JSON.stringify(old))
  expect(restored.version).toBe(4)
  expect(
    restored.people.map(
      ({ job, workElapsedMs, isPlayer, ...person }) => person,
    ),
  ).toEqual(old.people)
  expect(restored.people.map((person) => person.isPlayer)).toEqual([
    true,
    false,
  ])
  expect(
    restored.people.every(
      (person) => person.job === 'idle' && person.workElapsedMs === 0,
    ),
  ).toBe(true)
  expect(restored.skills.sticks).toEqual(old.skills.sticks)
  expect([
    restored.fruit,
    restored.wood,
    restored.stone,
    restored.actions,
    restored.foodElapsedMs,
  ]).toEqual([52, 18, 3, 123, 45000])
  expect(restored.researchLevels['foraging-practice']).toBe(2)
  expect(parseSave(JSON.stringify(restored))).toEqual(restored)
})

test('jobs normalize invalid or locked assignments without removing existing people', () => {
  const state = createDefaultState()
  state.people = Array.from({ length: 10 }, (_, i) => ({
    ...state.people[0],
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
  expect(restored.people[0].job).toBe('stoneworker')
  expect(restored.people[0].workElapsedMs).toBe(1000)
  const invalid = {
    ...state,
    people: [{ ...state.people[0], job: 'unknown', workElapsedMs: -10 }],
  }
  expect(parseSave(JSON.stringify(invalid)).people[0].job).toBe('idle')
  expect(parseSave(JSON.stringify(invalid)).people[0].workElapsedMs).toBe(0)
})

test('version 2 migration identifies the player and preserves jobs, hunger and work', () => {
  const state = createDefaultState()
  state.researchLevels.shelters = 1
  state.buildings['foraging-camp'] = state.buildings['lumber-camp'] = 1
  state.seenResearchLevels.shelters = 1
  state.people[0].job = 'forager'
  state.people[0].hunger = 2
  state.people[0].workElapsedMs = 2345
  state.people.unshift({ ...state.people[0], name: 'Mira', isPlayer: false })
  const old = {
    ...state,
    version: 2,
    people: state.people.map(({ isPlayer, ...person }) => person),
  }
  const restored = parseSave(JSON.stringify(old))
  expect(restored).toEqual(state)
  expect(parseSave(JSON.stringify(restored))).toEqual(restored)
})

test('migration protects an existing survivor if the original player was already lost', () => {
  const state = createDefaultState()
  state.fruit = 12.3
  state.people[0].name = 'Tribe member 2'
  state.people[0].hunger = 1
  const restored = parseSave(JSON.stringify({ ...state, version: 2 }))
  expect(restored).toEqual(state)
  expect(restored.people).toHaveLength(1)
})

test('current saves preserve explicit player identity and normalize duplicate or missing markers', () => {
  const state = createDefaultState()
  state.people[0].name = 'Renamed player'
  state.people.unshift({ ...state.people[0], name: 'You', isPlayer: false })
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

test('version 3 workplaces preserve existing jobs and grant enough seats without changing people', () => {
  const state = createDefaultState()
  state.researchLevels.shelters = 2
  state.explored = state.stoneFound = true
  state.fruit = 123
  state.people = Array.from({ length: 8 }, (_, i) => ({
    ...state.people[0],
    name: `Person ${i}`,
    isPlayer: i === 0,
    job: 'woodcutter',
    workElapsedMs: 4321,
    hunger: 3,
  }))
  const old = { ...state, version: 3 }
  const migrated = parseSave(JSON.stringify(old))
  expect(migrated.people).toEqual(state.people)
  expect(migrated.buildings['lumber-camp']).toBe(4)
  expect(migrated.fruit).toBe(123)
  expect(migrated.researchLevels.shelters).toBe(2)
  expect(migrated.savedAt).toBe(0)
  expect(parseSave(JSON.stringify(migrated))).toEqual(migrated)
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
