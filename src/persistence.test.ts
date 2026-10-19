import { describe, expect, test } from 'bun:test'
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

  test('legacy tools and exploration remain unlocked', () => {
    const state = parseSave(JSON.stringify({ basicTools: true, explored: true }))
    expect(state.researchLevels['sharpened-stick']).toBe(1)
    expect(state.basicTools).toBe(true)
    expect(state.exploreUnlocked).toBe(true)
  })

  test('malformed fields are normalized', () => {
    const state = parseSave(JSON.stringify({
      fruit: -10,
      wood: '12',
      skills: { gather: { level: -2, xp: 2.9 } },
      researchLevels: { 'sharpened-stick': 99 },
      people: [null, { name: 'You', maxHunger: 5, hunger: 12 }],
      foodElapsedMs: 60042,
    }))
    expect(state.fruit).toBe(0)
    expect(state.wood).toBe(0)
    expect(state.skills.gather).toEqual({ level: 1, xp: 2 })
    expect(state.researchLevels['sharpened-stick']).toBe(3)
    expect(state.people.map(person => person.hunger)).toEqual([5, 5])
    expect(state.foodElapsedMs).toBe(42)
  })
})
