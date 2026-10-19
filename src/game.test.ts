import { describe, expect, test } from 'bun:test'
import { FOOD_TICK_MS, RESEARCH_ITEM_KEYS } from './constants'
import { createGame } from './game'
import { parseSave } from './persistence'
import { createDefaultState } from './state'

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
        hunger: 3,
        maxHunger: 5,
        job: 'idle',
        workElapsedMs: 0,
      },
      {
        name: 'Starving',
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

describe('tribe growth and automated jobs', () => {
  function camp() {
    const state = createDefaultState()
    state.explored = state.stoneFound = state.researchUnlocked = true
    state.researchLevels.shelters = 1
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
    const person = game.state.people[0]
    expect(game.assignJob(person, 'forager')).toBe(false)
    game.state.researchLevels.shelters = 1
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
    expect(game.state.wood).toBe(1)
    expect(game.state.skills.sticks.xp).toBe(1)
    expect(game.assignJob({ ...person }, 'idle')).toBe(false)
    expect(game.assignJob(person, 'idle')).toBe(true)
    game.advanceTime(10000)
    expect(game.state.wood).toBe(1)
  })

  test('all jobs gather and train skills alongside a manual action and research', () => {
    const game = camp()
    const state = game.state
    game.recruitPerson()
    game.recruitPerson()
    state.wood = 10
    game.assignJob(state.people[0], 'forager')
    game.assignJob(state.people[1], 'woodcutter')
    game.assignJob(state.people[2], 'stoneworker')
    expect(game.startAction(game.actions.gather)).toBe(true)
    expect(game.startAction(game.actions.researchTeamwork)).toBe(true)
    const fruit = state.fruit
    game.advanceTime(12000)
    expect(state.fruit).toBe(fruit + 2)
    expect(state.wood).toBe(3)
    expect(state.stone).toBe(1)
    expect(state.skills.gather.xp).toBe(2)
    expect(state.skills.stone.xp).toBe(1)
    expect(game.getActiveAction()).toBe(game.actions.gather)
    expect(game.getActiveResearch()).toBe(game.actions.researchTeamwork)
    game.finishAction(game.actions.researchTeamwork)
    expect(game.getWorkerGain(state.people[0])).toBe(1.3)
    game.finishAction(game.actions.gather)
    expect(state.fruit).toBe(fruit + 3)
  })

  test('tool research improves manual and worker yields and unlocks the next research', () => {
    const game = camp()
    const state = game.state
    state.wood = state.stone = 100
    expect(game.startAction(game.actions.researchAxes)).toBe(false)
    expect(game.startAction(game.actions.researchStone)).toBe(true)
    game.finishAction(game.actions.researchStone)
    expect(game.startAction(game.actions.researchAxes)).toBe(true)
    game.finishAction(game.actions.researchAxes)
    game.assignJob(state.people[0], 'woodcutter')
    expect(game.getResourceGain('sticks')).toBe(1.5)
    expect(game.getWorkerGain(state.people[0])).toBe(1.5)
    expect(game.getUnreadResearch()).toContain('quarrying')
    expect(game.startAction(game.actions.researchQuarrying)).toBe(true)
    game.finishAction(game.actions.researchQuarrying)
    expect(game.getResourceGain('stone')).toBe(1.6)
  })

  test('worker rates include hunger, upgrades, meals and the next skill milestone', () => {
    const game = camp()
    const person = game.state.people[0]
    game.state.skills.sticks = { level: 4, xp: 5 }
    game.state.researchLevels['stone-axes'] = 1
    game.state.researchLevels.teamwork = 2
    person.hunger = 3
    game.assignJob(person, 'woodcutter')
    const rate = game.getResourceRates(null).wood
    game.advanceTime(8000)
    expect(game.state.wood).toBeCloseTo(rate * 8)
    expect(game.state.skills.sticks.level).toBe(5)
    expect(game.state.wood).toBe(1.9)
    expect(game.getResourceRates(null).fruit).toBeCloseTo(-0.5 / 60)
  })

  test('long advances match short ticks, including hungry workers recovering at meals', () => {
    const whole = camp()
    whole.recruitPerson()
    whole.state.people[0].hunger = 2
    whole.assignJob(whole.state.people[0], 'forager')
    whole.assignJob(whole.state.people[1], 'woodcutter')
    whole.state.foodElapsedMs = 59500
    const split = createGame(structuredClone(whole.state))
    whole.advanceTime(180123)
    for (let i = 0; i < 180; i++) split.advanceTime(1000)
    split.advanceTime(123)
    expect(whole.state).toEqual(split.state)
    expect(whole.state.people[0].hunger).toBe(5)
    expect(whole.state.fruit).toBeGreaterThan(70)
  })

  test('starving workers pause, lost people stop producing, and the survivor can recover', () => {
    const game = camp()
    game.recruitPerson()
    const [survivor, lost] = game.state.people
    game.assignJob(lost, 'woodcutter')
    lost.hunger = 1
    game.state.fruit = 0
    game.advanceTime(FOOD_TICK_MS)
    expect(game.state.people).toEqual([survivor])
    expect(game.state.wood).toBe(0)
    game.assignJob(survivor, 'forager')
    survivor.hunger = 2
    game.advanceTime(5 * FOOD_TICK_MS)
    expect(game.state.people).toHaveLength(1)
    expect(survivor.hunger).toBe(0)
    expect(game.state.fruit).toBe(0)
    game.startAction(game.actions.gather)
    game.finishAction(game.actions.gather)
    expect(game.state.fruit).toBe(1)
    game.advanceTime(3 * FOOD_TICK_MS + 5000)
    expect(survivor.hunger).toBe(3)
    expect(game.state.fruit).toBeGreaterThan(1)
  })

  test('zero, negative and nonfinite elapsed time never grants work or consumes meals', () => {
    const game = camp()
    game.assignJob(game.state.people[0], 'forager')
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
    game.assignJob(state.people[0], 'woodcutter')
    game.startAction(game.actions.researchTeamwork)
    game.advanceTime(12000)
    const restored = createGame(parseSave(saved))
    expect(restored.state.wood).toBe(11)
    expect(restored.state.people[0].workElapsedMs).toBe(4000)
    expect(restored.state.researchLevels.teamwork).toBe(0)
    restored.advanceTime(4000)
    expect(restored.state.wood).toBe(12)
    expect(restored.state.skills.sticks.xp).toBe(2)
  })
})
