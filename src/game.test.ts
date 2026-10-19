import { describe, expect, test } from 'bun:test'
import { FOOD_TICK_MS } from './constants'
import { createGame } from './game'
import { parseSave } from './persistence'
import { createDefaultState } from './state'

describe('next steps', () => {
  test('the opening goal follows discoveries even after resources are spent', () => {
    const state = createDefaultState()
    const game = createGame(state)
    expect(game.getNextGoal()).toBe('Gather 10 fruit to explore nearby.')
    state.fruit = 10
    game.syncUnlocks()
    expect(game.getNextGoal()).toBe('Explore nearby to discover wood.')
    game.startAction(game.actions.explore)
    game.finishAction(game.actions.explore)
    expect(state.fruit).toBe(0)
    expect(game.getNextGoal()).toBe('Gather 2 wood to unlock research.')
    state.wood = 2
    game.syncUnlocks()
    state.wood = 0
    expect(game.getNextGoal()).toBe(
      'Research a sharpened stick to gather more fruit.',
    )
  })

  test('tool mastery is shown only after every research line is complete', () => {
    const state = createDefaultState()
    state.explored = true
    state.researchUnlocked = true
    state.researchLevels['sharpened-stick'] = 3
    state.researchLevels['foraging-practice'] = 3
    const game = createGame(state)
    game.syncUnlocks()
    expect(game.getNextGoal()).toBe('Gather 10 fruit to explore farther.')
    state.fruit = 10
    expect(game.getNextGoal()).toBe('Explore farther to discover stone.')
    state.stoneFound = true
    expect(game.getNextGoal()).toBe(
      'Upgrade your tools in Research to improve gathering.',
    )
    state.researchLevels['stone-flakes'] = 3
    expect(game.getNextGoal()).toBe(
      'All tools mastered. Keep gathering to level your skills.',
    )
  })
})

describe('concurrent actions and research', () => {
  test('gathering and tool upgrades can start in either order', () => {
    for (const researchFirst of [false, true]) {
      const state = createDefaultState()
      state.researchUnlocked = true
      state.fruit = 100
      state.wood = 100
      const game = createGame(state)
      const order = researchFirst
        ? ([game.actions.research, game.actions.gather] as const)
        : ([game.actions.gather, game.actions.research] as const)
      for (const action of order) expect(game.startAction(action)).toBe(true)
      expect(game.getActiveAction()).toBe(game.actions.gather)
      expect(game.getActiveResearch()).toBe(game.actions.research)
      expect(state.fruit).toBe(90)
      expect(state.wood).toBe(98)

      // Finishing one activity must leave the other running and blocked.
      game.finishAction(order[0])
      expect(game.startAction(order[1])).toBe(false)
      game.finishAction(order[1])
      expect(game.getActiveAction()).toBeNull()
      expect(game.getActiveResearch()).toBeNull()
      expect(state.researchLevels['sharpened-stick']).toBe(1)
      expect(state.actions).toBe(2)
      expect(game.startAction(game.actions.gather)).toBe(true)
      expect(game.startAction(game.actions.research)).toBe(true)
    }
  })

  test('busy activities reject duplicates and other work of the same kind without spending', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    state.stoneFound = true
    state.fruit = 100
    state.wood = 100
    state.stone = 100
    const game = createGame(state)
    expect(game.startAction(game.actions.explore)).toBe(true)
    expect(game.startAction(game.actions.research)).toBe(true)
    const paid = { fruit: state.fruit, wood: state.wood, stone: state.stone }
    for (const action of [
      game.actions.explore,
      game.actions.sticks,
      game.actions.research,
      game.actions.researchStone,
    ]) {
      expect(game.startAction(action)).toBe(false)
    }
    expect({
      fruit: state.fruit,
      wood: state.wood,
      stone: state.stone,
    }).toEqual(paid)
  })

  test('unaffordable research leaves gathering running and can be retried once affordable', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    const game = createGame(state)
    expect(game.startAction(game.actions.gather)).toBe(true)
    expect(game.startAction(game.actions.research)).toBe(false)
    expect(game.getActiveResearch()).toBeNull()
    expect(game.getActiveAction()).toBe(game.actions.gather)
    state.fruit = 10
    state.wood = 2
    expect(game.startAction(game.actions.research)).toBe(true)
    expect(state.fruit).toBe(0)
    expect(state.wood).toBe(0)
  })
})

describe('interrupted work', () => {
  test('reloading returns reserved costs for exploration and each research tier', () => {
    for (const key of [
      'explore',
      'exploreFurther',
      'research',
      'researchForaging',
      'researchStone',
    ] as const) {
      const state = createDefaultState()
      state.fruit = state.wood = state.stone = 100
      state.researchUnlocked = state.stoneFound = true
      state.researchLevels = {
        'sharpened-stick': 1,
        'foraging-practice': 1,
        'stone-flakes': 1,
      }
      let saved = ''
      const game = createGame(state, (snapshot) => {
        saved = JSON.stringify(snapshot)
      })
      expect(game.startAction(game.actions[key])).toBe(true)
      expect(state.fruit).toBeLessThan(100)
      // Repeated autosaves must not refund the live inventory or multiply costs.
      game.saveProgress()
      game.saveProgress()
      const restored = parseSave(saved)
      expect([restored.fruit, restored.wood, restored.stone]).toEqual([
        100, 100, 100,
      ])
      expect(restored.researchLevels).toEqual(state.researchLevels)
      expect(restored.actions).toBe(0)
    }
  })

  test('concurrent completions commit only their own costs and preserve meal consumption', () => {
    const state = createDefaultState()
    state.fruit = state.wood = state.stone = 100
    state.researchUnlocked = state.stoneFound = true
    let saved = ''
    const game = createGame(state, (snapshot) => {
      saved = JSON.stringify(snapshot)
    })
    game.startAction(game.actions.explore)
    game.startAction(game.actions.researchStone)
    expect([state.fruit, state.wood, state.stone]).toEqual([80, 98, 97])
    game.advanceFood(FOOD_TICK_MS)
    expect(parseSave(saved).fruit).toBe(99)
    game.finishAction(game.actions.explore)
    let restored = parseSave(saved)
    expect(restored.explored).toBe(true)
    expect([restored.fruit, restored.wood, restored.stone]).toEqual([
      89, 100, 100,
    ])
    game.finishAction(game.actions.researchStone)
    restored = parseSave(saved)
    expect(restored.researchLevels['stone-flakes']).toBe(1)
    expect([restored.fruit, restored.wood, restored.stone]).toEqual([
      79, 98, 97,
    ])
    expect(restored.actions).toBe(2)
  })

  test('gathering earned during research survives an interrupted upgrade', () => {
    const state = createDefaultState()
    state.fruit = 10
    state.wood = 2
    state.researchUnlocked = true
    let saved = ''
    const game = createGame(state, (snapshot) => {
      saved = JSON.stringify(snapshot)
    })
    game.startAction(game.actions.research)
    game.startAction(game.actions.gather)
    game.finishAction(game.actions.gather)
    const restored = parseSave(saved)
    expect([state.fruit, state.wood]).toEqual([1, 0])
    expect([restored.fruit, restored.wood]).toEqual([11, 2])
    expect(restored.skills.gather.xp).toBe(1)
    expect(restored.researchLevels['sharpened-stick']).toBe(0)
  })
})

describe('unread research', () => {
  test('unlocking research is unread even before its cost is affordable', () => {
    const state = createDefaultState()
    const game = createGame(state)
    expect(game.getUnreadResearch()).toEqual([])
    state.explored = true
    state.wood = 2
    game.syncUnlocks()
    expect(game.canAffordResearch('sharpened-stick')).toBe(false)
    expect(game.getUnreadResearch()).toEqual(['sharpened-stick'])
  })

  test('viewing research saves read status once and resource changes do not reset it', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    let saves = 0
    const game = createGame(state, () => saves++)
    game.markResearchSeen()
    expect(game.getUnreadResearch()).toEqual([])
    expect(state.seenResearchLevels['stone-flakes']).toBe(0)
    game.markResearchSeen()
    state.fruit = 100
    state.wood = 100
    expect(game.getUnreadResearch()).toEqual([])
    state.fruit = 0
    expect(game.getUnreadResearch()).toEqual([])
    expect(saves).toBe(1)
  })

  test('new upgrades and discoveries become unread without reviving older notices', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    const game = createGame(state)
    game.markResearchSeen()
    state.fruit = state.wood = 100
    expect(game.startAction(game.actions.research)).toBe(true)
    game.finishAction(game.actions.research)
    expect(game.getUnreadResearch()).toEqual([
      'sharpened-stick',
      'foraging-practice',
    ])
    game.markResearchSeen()
    expect(game.startAction(game.actions.exploreFurther)).toBe(true)
    game.finishAction(game.actions.exploreFurther)
    expect(game.getUnreadResearch()).toEqual(['stone-flakes'])
  })

  test('completed research has no unread notice', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    state.stoneFound = true
    state.researchLevels = {
      'sharpened-stick': 3,
      'foraging-practice': 3,
      'stone-flakes': 3,
    }
    expect(createGame(state).getUnreadResearch()).toEqual([])
  })
})

describe('net resource rates', () => {
  test('idle fruit loss reflects every tribe member and hunger portion', () => {
    const state = createDefaultState()
    state.fruit = 100
    state.people.push(
      { name: 'Hungry', hunger: 3, maxHunger: 5 },
      { name: 'Starving', hunger: 2, maxHunger: 5 },
    )
    const game = createGame(state)
    const rates = game.getResourceRates(null)
    const before = state.fruit
    game.advanceFood(FOOD_TICK_MS)
    expect(rates.fruit * (FOOD_TICK_MS / 1000)).toBeCloseTo(
      state.fruit - before,
    )
    expect(rates.wood).toBe(0)
    expect(rates.stone).toBe(0)
    // The next meal uses the updated hunger levels.
    expect(game.getResourceRates(null).fruit).toBeCloseTo(-2.5 / 60)
  })

  test('food demand remains visible even when fruit has run out', () => {
    const game = createGame(createDefaultState())
    expect(game.getResourceRates(null).fruit).toBeCloseTo(-1 / 60)
    game.consumeMeal()
    expect(game.state.fruit).toBe(0)
    expect(game.getResourceRates(null).fruit).toBeCloseTo(-1 / 60)
  })

  test('gathering rates match actual yields and durations with upgrades', () => {
    for (const [key, resource] of [
      ['gather', 'fruit'],
      ['sticks', 'wood'],
      ['stone', 'stone'],
    ] as const) {
      const state = createDefaultState()
      state.fruit = 100
      state.researchLevels['sharpened-stick'] = 3
      state.researchLevels['stone-flakes'] = 2
      state.skills[key].level = 5
      const game = createGame(state)
      const action = game.actions[key]
      const idle = game.getResourceRates(null)
      const rates = game.getResourceRates(action)
      const seconds = game.getActionDuration(action) / 1000
      const before = state[resource]
      expect(game.startAction(action)).toBe(true)
      game.finishAction(action)
      expect((rates[resource] - idle[resource]) * seconds).toBeCloseTo(
        state[resource] - before,
      )
      expect(game.getResourceRates(null)).toEqual(idle)
    }
  })

  test('one-time costs do not appear as recurring resource losses', () => {
    const state = createDefaultState()
    state.fruit = 100
    state.wood = 100
    state.researchUnlocked = true
    const game = createGame(state)
    const idle = game.getResourceRates(null)
    for (const action of [game.actions.explore, game.actions.research]) {
      expect(game.startAction(action)).toBe(true)
      expect(game.getResourceRates(action)).toEqual(idle)
    }
    expect(state.fruit).toBe(80)
    expect(state.wood).toBe(98)
  })

  test('rates include a milestone earned on completion without awarding XP early', () => {
    const state = createDefaultState()
    state.skills.gather = { level: 4, xp: 6 }
    const game = createGame(state)
    const rate = game.getResourceRates(game.actions.gather).fruit
    expect(state.skills.gather).toEqual({ level: 4, xp: 6 })
    const duration = game.getActionDuration(game.actions.gather) / 1000
    expect(game.getNextResourceGain('gather')).toBe(1.1)
    expect(game.startAction(game.actions.gather)).toBe(true)
    game.finishAction(game.actions.gather)
    expect(state.skills.gather.level).toBe(5)
    expect((rate + 1 / 60) * duration).toBeCloseTo(state.fruit)
  })

  test('instant gathering does not advertise a continuing rate', () => {
    const state = createDefaultState()
    state.skills.gather.level = 40
    const game = createGame(state)
    expect(game.getResourceRates(game.actions.gather)).toEqual(
      game.getResourceRates(null),
    )
  })
})

describe('action completion', () => {
  test('only started work can complete, and only once', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    state.fruit = 10
    state.wood = 2
    const game = createGame(state)
    const original = structuredClone(state)
    expect(game.finishAction(game.actions.gather)).toBeNull()
    expect(game.finishAction(game.actions.research)).toBeNull()
    expect(state).toEqual(original)
    expect(game.startAction(game.actions.research)).toBe(true)
    expect(game.finishAction(game.actions.researchStone)).toBeNull()
    expect(game.getActiveResearch()).toBe(game.actions.research)
    expect(game.finishAction(game.actions.research)).toContain(
      'reached level 1',
    )
    const completed = structuredClone(state)
    expect(game.finishAction(game.actions.research)).toBeNull()
    expect(state).toEqual(completed)
  })
})
