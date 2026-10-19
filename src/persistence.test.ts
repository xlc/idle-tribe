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
      'sharpened-stick': 0,
      'foraging-practice': 0,
      'stone-flakes': 3,
    })
    expect(createGame(restored).getUnreadResearch()).toEqual([
      'sharpened-stick',
    ])
  })
})
