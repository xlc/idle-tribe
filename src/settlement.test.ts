import { describe, expect, test } from 'bun:test'
import { createActivityTimer, createClock } from './clock'
import { FOOD_TICK_MS, OFFLINE_CAP_MS } from './constants'
import { createGame } from './game'
import { RESOURCES } from './ids'
import { parseSave } from './persistence'
import { createDefaultState } from './state'
import { itemAt } from './test-helpers'
import type { ActionKey, JobId, Specialization } from './types'

function workshop() {
  const state = createDefaultState()
  state.researchUnlocked = state.explored = state.stoneFound = true
  state.researchLevels.shelters =
    state.researchLevels.carpentry =
    state.researchLevels.masonry =
    state.researchLevels.writing =
      1
  for (const id of [
    'foraging-camp',
    'lumber-camp',
    'quarry',
    'sawmill',
    'stoneworks',
    'study',
  ] as const)
    state.buildings[id] = 1
  state.fruit = 100
  return createGame(state)
}

describe('settlement production', () => {
  test('workplaces enforce capacity and preserve work when a full assignment is rejected', () => {
    const game = workshop()
    game.recruitPerson()
    game.recruitPerson()
    expect(game.adjustWorkers('sawyer', 1)).toBe(true)
    expect(game.adjustWorkers('sawyer', 1)).toBe(true)
    const before = structuredClone(game.state)
    expect(game.adjustWorkers('sawyer', 1)).toBe(false)
    expect(game.state).toEqual(before)
    expect(game.adjustWorkers('sawyer', -1)).toBe(true)
    expect(game.adjustWorkers('mason', 1)).toBe(true)
  })

  test('processors wait for inputs, convert exactly once, and resume partial cycles', () => {
    const game = workshop()
    const worker = itemAt(game.state.people, 0)
    game.assignJob(worker, 'sawyer')
    game.advanceTime(4000)
    expect(game.state.planks).toBe(0)
    expect(worker.workElapsedMs).toBe(0)
    game.state.wood = 3
    game.advanceTime(4500)
    const restored = createGame(parseSave(JSON.stringify(game.state)))
    restored.advanceTime(3500)
    expect(restored.state.wood).toBe(0)
    expect(restored.state.planks).toBe(1)
    restored.advanceTime(30000)
    expect(restored.state.planks).toBe(1)
    restored.state.wood = 3
    restored.advanceTime(8000)
    expect(restored.state.planks).toBe(2)
  })

  test('competing processors cannot double spend the same input', () => {
    const game = workshop()
    game.recruitPerson()
    game.state.wood = 3
    game.adjustWorkers('sawyer', 1)
    game.adjustWorkers('sawyer', 1)
    game.advanceTime(8000)
    expect(game.state.wood).toBe(0)
    expect(game.state.planks).toBe(1)
  })

  test('building payment is atomic and houses raise capacity without deleting existing people', () => {
    const game = workshop()
    const original = structuredClone(game.state)
    expect(game.build('houses')).toBe(false)
    expect(game.state).toEqual(original)
    game.state.planks = 8
    game.state.blocks = 4
    expect(game.build('houses')).toBe(true)
    expect(game.getPopulationCapacity()).toBe(5)
    expect(game.state.planks).toBe(0)
    expect(game.build('houses')).toBe(false)
  })

  test('specializations survive reload and permanently reject the other branch', () => {
    const game = workshop()
    game.state.knowledge = game.state.planks = game.state.blocks = 100
    expect(game.startAction(game.actions.researchForestry)).toBe(true)
    let saved = ''
    const reserved = createGame(structuredClone(game.state), (snapshot) => {
      saved = JSON.stringify(snapshot)
    })
    // The original active research keeps the choice unset until completion.
    expect(game.state.specialization).toBeNull()
    game.finishAction(game.actions.researchForestry)
    const restored = createGame(parseSave(JSON.stringify(game.state)))
    expect(restored.state.specialization).toBe('forestry')
    expect(restored.startAction(restored.actions.researchStonecraft)).toBe(
      false,
    )
    expect(restored.startAction(restored.actions.researchArchitecture)).toBe(
      false,
    )
    expect(restored.startAction(restored.actions.researchMasonry)).toBe(false)
    expect(restored.isJobUnlocked('mason')).toBe(true)
    reserved.saveProgress()
    expect(parseSave(saved).specialization).toBeNull()
  })

  test('new research refunds processed resources on interruption and commits only once', () => {
    const game = workshop()
    game.state.planks = 20
    game.state.blocks = 20
    game.state.researchLevels.writing = 0
    let saved = ''
    const saving = createGame(game.state, (snapshot) => {
      saved = JSON.stringify(snapshot)
    })
    expect(saving.startAction(saving.actions.researchWriting)).toBe(true)
    expect(game.state.planks).toBe(14)
    const restored = parseSave(saved)
    expect(restored.planks).toBe(20)
    expect(restored.blocks).toBe(20)
    saving.finishAction(saving.actions.researchWriting)
    expect(parseSave(saved).planks).toBe(14)
    expect(saving.finishAction(saving.actions.researchWriting)).toBeNull()
  })
})

describe('offline simulation and page clock', () => {
  test('offline resource changes include consumed inputs and meals', () => {
    const game = workshop()
    game.state.wood = 30
    game.state.savedAt = 1000
    game.assignJob(itemAt(game.state.people, 0), 'sawyer')
    const before = structuredClone(game.state)
    const away = game.applyOffline(1000 + FOOD_TICK_MS)
    expect(away.gains.fruit).toBe(-1)
    expect(away.gains.wood).toBe(-21)
    expect(away.gains.planks).toBe(7)
    for (const resource of RESOURCES)
      expect(away.gains[resource]).toBeCloseTo(
        game.state[resource] - before[resource],
      )
    const repeated = game.applyOffline(game.state.savedAt)
    for (const resource of RESOURCES) expect(repeated.gains[resource]).toBe(0)
  })

  test('24-hour catchup matches live ticks with processing, hunger, and competition', () => {
    const game = workshop()
    game.state.researchLevels.shelters = 3
    for (let i = 0; i < 5; i++) game.recruitPerson()
    const jobs: JobId[] = [
      'forager',
      'woodcutter',
      'stoneworker',
      'sawyer',
      'mason',
      'scholar',
    ]
    game.state.people.forEach((person, i) => {
      game.assignJob(person, itemAt(jobs, i))
    })
    game.state.fruit = 0
    game.state.foodElapsedMs = FOOD_TICK_MS - 500
    game.state.savedAt = 1000
    const live = createGame(structuredClone(game.state))
    const away = game.applyOffline(1000 + 2 * OFFLINE_CAP_MS)
    for (let i = 0; i < OFFLINE_CAP_MS / 1000; i++) live.advanceTime(1000)
    live.state.savedAt = game.state.savedAt
    expect(game.state).toEqual(live.state)
    expect(away.elapsed).toBe(OFFLINE_CAP_MS)
    const once = structuredClone(game.state)
    expect(game.applyOffline(game.state.savedAt).elapsed).toBe(0)
    expect(game.state).toEqual(once)
    expect(game.state.people).toHaveLength(6)
    expect(game.state.planks).toBeGreaterThan(0)
    expect(game.state.knowledge).toBeGreaterThan(0)
  })

  test('missing and future timestamps never award invented progress', () => {
    const game = workshop()
    game.assignJob(itemAt(game.state.people, 0), 'forager')
    expect(game.applyOffline(10000).elapsed).toBe(0)
    game.state.savedAt = 20000
    expect(game.applyOffline(10000).elapsed).toBe(0)
    expect(game.state.fruit).toBe(100)
  })

  test('visibility and restoration settle one absence once and cap long sleeps', () => {
    const elapsed: number[] = []
    const clock = createClock((ms) => elapsed.push(ms), 1000, true)
    clock.tick(2000)
    clock.setVisible(false, 3000)
    clock.tick(10000)
    clock.setVisible(false, 11000)
    expect(clock.settledAt()).toBe(3000)
    expect(clock.setVisible(true, 13000)).toBe(10000)
    expect(clock.setVisible(true, 13000)).toBe(0)
    clock.tick(14000)
    expect(elapsed).toEqual([1000, 1000, 10000, 1000])
    clock.setVisible(false, 15000)
    expect(clock.setVisible(true, OFFLINE_CAP_MS * 3)).toBe(OFFLINE_CAP_MS)
  })
})

// A playable route, using real costs, recipes and elapsed time. No resources or
// technologies are granted after the opening, and neither route needs manual
// gathering once shelters start the first workplace.
export function playChapter(path: Specialization) {
  const game = createGame(createDefaultState())
  let elapsed = 0
  const advance = (ms: number) => {
    game.advanceTime(ms)
    elapsed += ms
  }
  function action(key: ActionKey) {
    const selected = game.actions[key]
    game.syncUnlocks()
    if (!game.startAction(selected)) throw new Error(`Cannot start ${key}`)
    advance(game.getActionDuration(selected))
    game.finishAction(selected)
  }
  function gatherUntil(resource: 'fruit' | 'wood', count: number) {
    while (game.state[resource] < count)
      action(resource === 'fruit' ? 'gather' : 'sticks')
  }
  function waitUntil(condition: () => boolean) {
    let attempts = 0
    while (!condition()) {
      advance(1000)
      if (++attempts > 7200)
        throw new Error(
          `Stalled at ${elapsed / 60000} minutes: ${JSON.stringify(game.state)}`,
        )
    }
  }
  function research(key: ActionKey) {
    waitUntil(() => Boolean(game.actions[key].canStart?.()))
    action(key)
  }
  gatherUntil('fruit', 10)
  action('explore')
  gatherUntil('wood', 2)
  gatherUntil('fruit', 5)
  action('research')
  gatherUntil('wood', 4)
  gatherUntil('fruit', 8)
  action('researchShelters')
  const openingActions = game.state.actions
  function recruit(job: Exclude<JobId, 'idle'>) {
    waitUntil(game.canRecruit)
    game.recruitPerson()
    if (
      !game.assignJob(
        itemAt(game.state.people, game.state.people.length - 1),
        job,
      )
    )
      throw new Error(`Cannot assign ${job}`)
  }
  recruit('woodcutter')
  waitUntil(() => game.state.fruit >= 10)
  action('exploreFurther')
  recruit('stoneworker')
  research('researchShelters')
  research('researchCarpentry')
  research('researchStone')
  research('researchMasonry')
  research('researchShelters')
  research('researchTeamwork')
  for (const id of ['sawmill', 'stoneworks'] as const) {
    waitUntil(() => game.canBuild(id))
    game.build(id)
  }
  recruit('sawyer')
  recruit('mason')
  research('researchWriting')
  waitUntil(() => game.canBuild('study'))
  game.build('study')
  recruit('scholar')
  research(path === 'forestry' ? 'researchForestry' : 'researchStonecraft')
  research('researchAgriculture')
  research(path === 'forestry' ? 'researchJoinery' : 'researchArchitecture')
  research('researchEngineering')
  waitUntil(() => game.canBuild('great-hall'))
  game.build('great-hall')
  return { game, elapsed, openingActions }
}

for (const path of ['forestry', 'stonecraft'] as const)
  test(`the ${path} chapter reaches the Great Hall through automated production`, () => {
    const { game, elapsed, openingActions } = playChapter(path)
    console.info(
      `${path}: Great Hall in ${(elapsed / 60000).toFixed(1)} minutes; ${openingActions} opening actions`,
    )
    expect(game.state.buildings['great-hall']).toBe(1)
    expect(game.state.specialization).toBe(path)
    expect(game.state.people).toHaveLength(6)
    expect(openingActions).toBeLessThan(40)
    expect(elapsed).toBeLessThan(60 * 60 * 1000)
    expect(RESOURCES.every((id) => game.state[id] >= 0)).toBe(true)
    expect(parseSave(JSON.stringify(game.state))).toEqual(game.state)
  })

test('manual activity pauses while hidden and resumes without banking hidden time', () => {
  const timer = createActivityTimer(1000, 0, true)
  expect(timer.sample(400)).toBe(400)
  timer.setVisible(false, 500)
  expect(timer.sample(10000)).toBe(500)
  timer.setVisible(true, 20000)
  expect(timer.sample(20200)).toBe(700)
  expect(timer.sample(20500)).toBe(1000)
  expect(timer.sample(50000)).toBe(1000)
})
