import { describe, expect, test } from 'bun:test'
import { FOOD_TICK_MS } from './constants'
import { createGame } from './game'
import { RESEARCH_ITEM_KEYS } from './ids'
import { parseSave } from './persistence'
import { createDefaultState } from './state'
import { itemAt } from './test-helpers'
import type { GameState } from './types'

describe('feasts and survival', () => {
  test('a feast restores the whole tribe and only charges for missing hearts', () => {
    const state = createDefaultState()
    const player = itemAt(state.people, 0)
    player.hunger = 3
    state.people.push(
      { ...player, name: 'Mira', isPlayer: false, hunger: 1 },
      { ...player, name: 'Sol', isPlayer: false, hunger: 5 },
    )
    state.fruit = 6
    const game = createGame(state)
    expect(game.getFeastCost()).toBe(6)
    expect(game.canFeast()).toBe(true)
    expect(game.feast()).toBe(true)
    expect(state.people.map((person) => person.hunger)).toEqual([5, 5, 5])
    expect(state.fruit).toBe(0)
    expect(game.getMealCost()).toBe(3)
    const after = structuredClone(state)
    expect(game.feast()).toBe(false)
    expect(state).toEqual(after)
  })

  test('an unaffordable feast changes nothing and a solo player can recover before jobs unlock', () => {
    const state = createDefaultState()
    const player = itemAt(state.people, 0)
    player.hunger = 0
    state.fruit = 4.9
    let saves = 0
    const game = createGame(state, () => saves++)
    const before = structuredClone(state)
    expect(game.canFeast()).toBe(false)
    expect(game.feast()).toBe(false)
    expect(state).toEqual(before)
    expect(saves).toBe(0)
    state.fruit = 5
    expect(game.feast()).toBe(true)
    expect(player.hunger).toBe(5)
    expect(saves).toBe(1)
  })

  test('fractional saved hearts are restored without a free or partial feast', () => {
    const state = createDefaultState()
    const player = itemAt(state.people, 0)
    player.maxHunger = 5.5
    player.hunger = 3.2
    state.fruit = 3
    const game = createGame(state)
    expect(game.getFeastCost()).toBe(3)
    expect(game.feast()).toBe(true)
    expect(player.hunger).toBe(5.5)
    expect(state.fruit).toBe(0)
  })

  test('feasts preserve concurrent work, meal timing, saved progress and reserved costs', () => {
    const state = createDefaultState()
    const player = itemAt(state.people, 0)
    state.researchLevels.shelters = 1
    state.buildings['foraging-camp'] =
      state.buildings['lumber-camp'] =
      state.buildings.quarry =
        1
    state.researchUnlocked = true
    state.fruit = 30
    state.wood = 2
    player.hunger = 2
    player.job = 'forager'
    player.workElapsedMs = 4500
    state.foodElapsedMs = FOOD_TICK_MS - 500
    state.people.push({
      ...player,
      name: 'Mira',
      isPlayer: false,
      hunger: 4,
      job: 'idle',
      workElapsedMs: 0,
    })
    const snapshots: GameState[] = []
    const game = createGame(state, (snapshot) =>
      snapshots.push(structuredClone(snapshot)),
    )
    expect(game.startAction(game.actions.gather)).toBe(true)
    expect(game.startAction(game.actions.research)).toBe(true)
    expect(game.feast()).toBe(true)
    expect(game.getActiveAction()).toBe(game.actions.gather)
    expect(game.getActiveResearch()).toBe(game.actions.research)
    expect(player.workElapsedMs).toBe(4500)
    expect(state.foodElapsedMs).toBe(FOOD_TICK_MS - 500)
    expect(game.getHungerEffects(player).outputMultiplier).toBe(1)
    const restored = parseSave(JSON.stringify(snapshots.at(-1)))
    expect(restored.people).toEqual(state.people)
    expect(restored.foodElapsedMs).toBe(state.foodElapsedMs)
    expect(restored.fruit).toBe(state.fruit + 5)
    expect(restored.wood).toBe(2)
    const beforeMeal = state.fruit
    game.advanceTime(500)
    // The recovered forager delivers two fruit before the scheduled two-person meal.
    expect(state.fruit).toBe(beforeMeal + 2 - 2)
    expect(state.foodElapsedMs).toBe(0)
    expect(player.workElapsedMs).toBe(0)
  })

  test('a due meal is resolved before quoting the next feast', () => {
    const state = createDefaultState()
    itemAt(state.people, 0).hunger = 3
    state.fruit = 2
    state.foodElapsedMs = FOOD_TICK_MS - 1
    const game = createGame(state)
    expect(game.getFeastCost()).toBe(2)
    game.advanceTime(1)
    expect(state.fruit).toBe(1.5)
    expect(game.getFeastCost()).toBe(1)
    expect(game.feast()).toBe(true)
    expect(state.fruit).toBe(0.5)
  })

  test('food shortages preserve every person regardless of identity or roster position', () => {
    const state = createDefaultState()
    const player = itemAt(state.people, 0)
    player.name = 'Renamed survivor'
    player.hunger = 1
    state.people.unshift({ ...player, name: 'You', isPlayer: false })
    state.people.push({ ...player, name: 'Mira', isPlayer: false })
    const game = createGame(state)
    game.advanceTime(FOOD_TICK_MS)
    expect(state.people).toHaveLength(3)
    expect(player.hunger).toBe(0)
    game.advanceTime(2 * FOOD_TICK_MS)
    expect(state.people).toHaveLength(3)
    expect(state.people.every((person) => person.hunger === 0)).toBe(true)
  })

  test('scarce meals feed the hungriest first without changing roster order', () => {
    const state = createDefaultState()
    const player = itemAt(state.people, 0)
    const hungry = { ...player, name: 'Mira', isPlayer: false, hunger: 1 }
    state.people.push(hungry)
    state.fruit = 1
    const game = createGame(state)
    game.advanceTime(FOOD_TICK_MS)
    expect(state.people).toEqual([player, hungry])
    expect(hungry.hunger).toBe(2)
    expect(player.hunger).toBe(4)
    expect(state.fruit).toBe(0.9)
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
      expect(state.fruit).toBe(95)
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
    expect(state.fruit).toBe(5)
    expect(state.wood).toBe(0)
  })
})

describe('interrupted work', () => {
  test('saved snapshots retain their research, people, and skills after gameplay continues', () => {
    const state = createDefaultState()
    state.researchUnlocked = true
    state.researchLevels['sharpened-stick'] = 1
    state.seenResearchLevels['sharpened-stick'] = 1
    state.basicTools = true
    state.fruit = 100
    state.wood = 100
    const snapshots: GameState[] = []
    const game = createGame(state, (snapshot) => snapshots.push(snapshot))
    expect(game.startAction(game.actions.researchShelters)).toBe(true)
    const reserved = itemAt(snapshots, 0)
    const expected = structuredClone(reserved)

    game.finishAction(game.actions.researchShelters)
    game.advanceTime(5000)
    game.recruitPerson()

    expect(state.researchLevels.shelters).toBe(1)
    expect(state.people).toHaveLength(2)
    expect(state.skills.gather.xp).toBeGreaterThan(0)
    expect(reserved).toEqual(expected)
    expect(parseSave(JSON.stringify(reserved))).toEqual(expected)
  })

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
      state.researchUnlocked = true
      state.stoneFound = key !== 'exploreFurther'
      state.researchLevels = {
        ...state.researchLevels,
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
    game.advanceTime(FOOD_TICK_MS)
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
    expect([state.fruit, state.wood]).toEqual([6, 0])
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
      'shelters',
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
      ...state.researchLevels,
      'sharpened-stick': 3,
      'foraging-practice': 3,
      'stone-flakes': 3,
    }
    for (const id of RESEARCH_ITEM_KEYS) state.researchLevels[id] = 3
    expect(createGame(state).getUnreadResearch()).toEqual([])
  })
})

describe('net resource rates', () => {
  test('idle fruit loss reflects every tribe member and hunger portion', () => {
    const state = createDefaultState()
    state.fruit = 100
    state.people.push(
      {
        name: 'Hungry',
        isPlayer: false,
        hunger: 3,
        maxHunger: 5,
        job: 'idle',
        workElapsedMs: 0,
      },
      {
        name: 'Starving',
        isPlayer: false,
        hunger: 2,
        maxHunger: 5,
        job: 'idle',
        workElapsedMs: 0,
      },
    )
    const game = createGame(state)
    const rates = game.getResourceRates(null)
    const before = state.fruit
    game.advanceTime(FOOD_TICK_MS)
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
      state.explored = state.stoneFound = true
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
    expect(state.fruit).toBe(85)
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

  test('high skill keeps manual work bounded rather than turning into unlimited clicking', () => {
    const state = createDefaultState()
    state.skills.gather.level = 40
    const game = createGame(state)
    expect(game.getActionDuration(game.actions.gather)).toBe(500)
    expect(game.getResourceRates(game.actions.gather).fruit).toBeGreaterThan(0)
  })
})

describe('action completion', () => {
  test('actions from another game cannot spend resources or complete against the wrong state', () => {
    const initial = createDefaultState()
    initial.researchUnlocked = true
    initial.fruit = initial.wood = 20
    const source = createGame(structuredClone(initial))
    let saves = 0
    const target = createGame(structuredClone(initial), () => saves++)
    for (const action of [source.actions.gather, source.actions.research]) {
      expect(target.startAction(action)).toBe(false)
      expect(target.finishAction(action)).toBeNull()
    }
    expect(source.state).toEqual(initial)
    expect(target.state).toEqual(initial)
    expect(target.getActiveAction()).toBeNull()
    expect(target.getActiveResearch()).toBeNull()
    expect(saves).toBe(0)

    expect(target.startAction(target.actions.research)).toBe(true)
    target.finishAction(target.actions.research)
    expect(target.state.researchLevels['sharpened-stick']).toBe(1)
    expect(source.state).toEqual(initial)
  })

  test('undiscovered resources and locked exploration cannot start or change progress', () => {
    const state = createDefaultState()
    state.fruit = 100
    let saves = 0
    const game = createGame(state, () => saves++)
    const before = structuredClone(state)
    for (const action of [
      game.actions.sticks,
      game.actions.stone,
      game.actions.exploreFurther,
    ]) {
      expect(game.startAction(action)).toBe(false)
      expect(game.finishAction(action)).toBeNull()
      expect(game.getActiveAction()).toBeNull()
      expect(state).toEqual(before)
    }
    expect(saves).toBe(0)
  })

  test('exploration unlocks gathering and cannot be purchased twice', () => {
    const state = createDefaultState()
    state.fruit = 100
    const game = createGame(state)
    for (const [exploration, gathering] of [
      [game.actions.explore, game.actions.sticks],
      [game.actions.exploreFurther, game.actions.stone],
    ] as const) {
      expect(game.startAction(exploration)).toBe(true)
      game.finishAction(exploration)
      const discovered = structuredClone(state)
      expect(game.startAction(exploration)).toBe(false)
      expect(game.finishAction(exploration)).toBeNull()
      expect(state).toEqual(discovered)
      expect(game.startAction(gathering)).toBe(true)
      game.finishAction(gathering)
      state.researchLevels['sharpened-stick'] = 1
    }
    expect(state.wood).toBeGreaterThan(0)
    expect(state.stone).toBeGreaterThan(0)
  })

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

describe('tribe growth and automated jobs', () => {
  function camp() {
    const state = createDefaultState()
    state.explored = state.stoneFound = state.researchUnlocked = true
    state.researchLevels.shelters = 1
    state.buildings['foraging-camp'] =
      state.buildings['lumber-camp'] =
      state.buildings.quarry =
        1
    state.fruit = 100
    return createGame(state)
  }

  test('shelters unlock recruitment and capacity upgrades without spending on failure', () => {
    const state = createDefaultState()
    state.fruit = state.wood = 100
    const game = createGame(state)
    expect(game.recruitPerson()).toBe(false)
    expect(game.startAction(game.actions.researchShelters)).toBe(false)
    state.researchLevels['sharpened-stick'] = 1
    expect(game.startAction(game.actions.researchShelters)).toBe(true)
    game.finishAction(game.actions.researchShelters)
    expect(game.getPopulationCapacity()).toBe(3)
    expect(game.recruitPerson()).toBe(true)
    expect(game.recruitPerson()).toBe(true)
    const food = state.fruit
    expect(game.recruitPerson()).toBe(false)
    expect(state.fruit).toBe(food)
    state.stone = 5
    expect(game.startAction(game.actions.researchShelters)).toBe(true)
    game.finishAction(game.actions.researchShelters)
    expect(game.getPopulationCapacity()).toBe(5)
    state.fruit = 14.9
    expect(game.recruitPerson()).toBe(false)
    expect(state.fruit).toBe(14.9)
  })

  test('jobs enforce unlocks and switching discards only unfinished work', () => {
    const game = createGame(createDefaultState())
    const person = itemAt(game.state.people, 0)
    expect(game.assignJob(person, 'forager')).toBe(false)
    game.state.researchLevels.shelters = 1
    game.state.buildings['foraging-camp'] = game.state.buildings[
      'lumber-camp'
    ] = 1
    expect(game.assignJob(person, 'woodcutter')).toBe(false)
    expect(game.assignJob(person, 'stoneworker')).toBe(false)
    expect(game.assignJob(person, 'forager')).toBe(true)
    game.advanceTime(4000)
    expect(game.state.fruit).toBe(0)
    expect(game.assignJob(person, 'forager')).toBe(true)
    expect(person.workElapsedMs).toBe(4000)
    game.state.explored = true
    expect(game.assignJob(person, 'woodcutter')).toBe(true)
    expect(person.workElapsedMs).toBe(0)
    game.advanceTime(8000)
    expect(game.state.wood).toBe(2)
    expect(game.state.skills.sticks.xp).toBe(1)
    expect(game.assignJob({ ...person }, 'idle')).toBe(false)
    expect(game.assignJob(person, 'idle')).toBe(true)
    game.advanceTime(10000)
    expect(game.state.wood).toBe(2)
  })

  test('all jobs gather and train skills alongside a manual action and research', () => {
    const game = camp()
    const state = game.state
    const player = itemAt(state.people, 0)
    game.recruitPerson()
    game.recruitPerson()
    state.wood = 10
    game.assignJob(player, 'forager')
    game.assignJob(itemAt(state.people, 1), 'woodcutter')
    game.assignJob(itemAt(state.people, 2), 'stoneworker')
    expect(game.startAction(game.actions.gather)).toBe(true)
    expect(game.startAction(game.actions.researchTeamwork)).toBe(true)
    const fruit = state.fruit
    game.advanceTime(12000)
    expect(state.fruit).toBe(fruit + 4)
    expect(state.wood).toBe(4)
    expect(state.stone).toBe(2)
    expect(state.skills.gather.xp).toBe(2)
    expect(state.skills.stone.xp).toBe(1)
    expect(game.getActiveAction()).toBe(game.actions.gather)
    expect(game.getActiveResearch()).toBe(game.actions.researchTeamwork)
    game.finishAction(game.actions.researchTeamwork)
    expect(game.getWorkerGain(player)).toBe(2.5)
    game.finishAction(game.actions.gather)
    expect(state.fruit).toBe(fruit + 5)
  })

  test('tool research improves manual and worker yields and unlocks the next research', () => {
    const game = camp()
    const state = game.state
    const player = itemAt(state.people, 0)
    state.wood = state.stone = 100
    expect(game.startAction(game.actions.researchAxes)).toBe(false)
    expect(game.startAction(game.actions.researchStone)).toBe(true)
    game.finishAction(game.actions.researchStone)
    expect(game.startAction(game.actions.researchAxes)).toBe(true)
    game.finishAction(game.actions.researchAxes)
    game.assignJob(player, 'woodcutter')
    expect(game.getResourceGain('sticks')).toBe(1.5)
    expect(game.getWorkerGain(player)).toBe(3)
    expect(game.getUnreadResearch()).toContain('quarrying')
    expect(game.startAction(game.actions.researchQuarrying)).toBe(true)
    game.finishAction(game.actions.researchQuarrying)
    expect(game.getResourceGain('stone')).toBe(1.6)
  })

  test('worker rates include hunger, upgrades, meals and the next skill milestone', () => {
    const game = camp()
    const person = itemAt(game.state.people, 0)
    game.state.skills.sticks = { level: 4, xp: 5 }
    game.state.researchLevels['stone-axes'] = 1
    game.state.researchLevels.teamwork = 2
    person.hunger = 3
    game.assignJob(person, 'woodcutter')
    const rate = game.getResourceRates(null).wood
    game.advanceTime(8000)
    expect(game.state.wood).toBeCloseTo(rate * 8)
    expect(game.state.skills.sticks.level).toBe(5)
    expect(game.state.wood).toBe(3.8)
    expect(game.getResourceRates(null).fruit).toBeCloseTo(-0.5 / 60)
  })

  test('long advances match short ticks, including hungry workers recovering at meals', () => {
    const whole = camp()
    const player = itemAt(whole.state.people, 0)
    whole.recruitPerson()
    player.hunger = 2
    whole.assignJob(player, 'forager')
    whole.assignJob(itemAt(whole.state.people, 1), 'woodcutter')
    whole.state.foodElapsedMs = 59500
    const split = createGame(structuredClone(whole.state))
    whole.advanceTime(180123)
    for (let i = 0; i < 180; i++) split.advanceTime(1000)
    split.advanceTime(123)
    expect(whole.state).toEqual(split.state)
    expect(player.hunger).toBe(5)
    expect(whole.state.fruit).toBeGreaterThan(70)
  })

  test('hungry workers keep producing and recover automatically when food returns', () => {
    const game = camp()
    game.recruitPerson()
    const forager = itemAt(game.state.people, 0)
    const woodcutter = itemAt(game.state.people, 1)
    game.assignJob(woodcutter, 'woodcutter')
    woodcutter.hunger = 1
    game.state.fruit = 0
    game.advanceTime(FOOD_TICK_MS)
    expect(game.state.people).toHaveLength(2)
    expect(game.state.wood).toBeGreaterThan(0)
    expect(woodcutter.hunger).toBe(0)
    game.assignJob(forager, 'forager')
    forager.hunger = 0
    game.advanceTime(5 * FOOD_TICK_MS)
    expect(game.state.people).toHaveLength(2)
    expect(forager.hunger).toBe(5)
    expect(woodcutter.hunger).toBe(5)
    expect(game.state.fruit).toBeGreaterThan(1)
  })

  test('zero, negative and nonfinite elapsed time never grants work or consumes meals', () => {
    const game = camp()
    game.assignJob(itemAt(game.state.people, 0), 'forager')
    const before = structuredClone(game.state)
    for (const elapsed of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(game.advanceTime(elapsed)).toBe(false)
    }
    expect(game.state).toEqual(before)
  })

  test('reload preserves partial worker progress and refunds only unfinished research', () => {
    const state = camp().state
    state.wood = 10
    let saved = ''
    const game = createGame(state, (snapshot) => {
      saved = JSON.stringify(snapshot)
    })
    game.assignJob(itemAt(state.people, 0), 'woodcutter')
    game.startAction(game.actions.researchTeamwork)
    game.advanceTime(12000)
    const restored = createGame(parseSave(saved))
    expect(restored.state.wood).toBe(12)
    expect(itemAt(restored.state.people, 0).workElapsedMs).toBe(4000)
    expect(restored.state.researchLevels.teamwork).toBe(0)
    restored.advanceTime(4000)
    expect(restored.state.wood).toBe(14)
    expect(restored.state.skills.sticks.xp).toBe(2)
  })
})
