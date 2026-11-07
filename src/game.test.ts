import { expect, test } from 'bun:test'
import {
  actionDuration,
  actionWorkers,
  actionWorkersUnlocked,
  actionYield,
  applyExploreReward,
  startAction,
} from './actions'
import { BUILDINGS, RESEARCH } from './definitions'
import { createGame, removeFacility } from './game'
import { BUILDING_IDS, RESEARCH_IDS } from './ids'
import { parseSave } from './persistence'
import {
  cancelProject,
  nextExpansion,
  quoteProject,
  startProject,
} from './research'
import { canAfford, storageCapacity, storageFull } from './resources'
import {
  adjustWorkers,
  assignJob,
  constructionSpeed,
  crewSize,
  effectiveStaff,
  equipmentMultiplier,
  fillWorkers,
  housingCapacity,
  jobInput,
  requirementBlocker,
  workerRate,
} from './settlement'
import { advanceTime } from './simulation'
import { createDefaultState } from './state'
import { complete, people, settlement } from './test-helpers'

test('the opening discovers resources and unlocks camps without building them', () => {
  const s = createDefaultState()
  for (let i = 0; i < 15; i++) {
    expect(startAction(s, 'gather')).toBe(true)
    advanceTime(s, 1, true)
  }
  s.resources.food = 100
  // Explore finds wood through its random reward table eventually.
  for (let i = 0; !s.discovered.wood; i++) {
    expect(i).toBeLessThan(100)
    expect(startAction(s, 'explore')).toBe(true)
    advanceTime(s, 4, true)
  }
  for (let i = 0; i < 30; i++) {
    startAction(s, 'sticks')
    advanceTime(s, 2, true)
  }
  expect(s.researchUnlocked).toBe(true)
  while (s.resources.food < 30) {
    startAction(s, 'gather')
    advanceTime(s, 1, true)
  }
  while (!s.discovered.stone) {
    expect(startAction(s, 'explore')).toBe(true)
    advanceTime(s, 4, true)
  }
  while (s.resources.stone < 5) {
    expect(startAction(s, 'stone')).toBe(true)
    advanceTime(s, 3, true)
  }
  for (const id of [
    'sharpened-stick',
    'shelters',
    'foraging-rounds',
  ] as const) {
    expect(startProject(s, { kind: 'research', id })).toBe(true)
    advanceTime(s, quoteProject(s, { kind: 'research', id }).total)
  }
  expect(s.research.shelters).toBe(1)
  expect(s.research['foraging-rounds']).toBe(1)
  expect(s.facilities.foraging.level).toBe(0)
  expect(s.people[0]?.job).toBe('idle')
  expect(s.facilities.housing.level).toBe(0)
})

test('cheat resource grants add only the requested stockpile amounts', () => {
  const s = createDefaultState(),
    game = createGame(s)
  game.grantResources({ food: 100, wood: 100, stone: 100 })
  expect(s.resources.food).toBe(50)
  expect(s.resources.wood).toBe(50)
  expect(s.resources.stone).toBe(50)
  expect(s.resources.planks).toBe(0)
})

test('construction keeps old effects until completion, pays once, and can exceed old caps', () => {
  const s = settlement()
  people(s, 'builder')
  s.facilities.housing.level = 10
  const project = nextExpansion(s, 'housing'),
    quote = quoteProject(s, project),
    before = s.resources.wood,
    places = housingCapacity(s)
  startProject(s, project)
  advanceTime(s, 0)
  expect(s.resources.wood).toBe(before - (quote.cost.wood ?? 0))
  expect(housingCapacity(s)).toBe(places)
  advanceTime(s, quote.total * 60 + 600)
  expect(s.facilities.housing.level).toBe(11)
  expect(housingCapacity(s)).toBeGreaterThan(places)
  expect(s.resources.wood).toBe(before - (quote.cost.wood ?? 0))
  expect(s.completedProjects).toBe(1)
})

test('active cancellation restores exact stock and storage state once', () => {
  const s = settlement()
  s.facilities.stockyard.level = 0
  people(s, 'builder')
  const before = s.resources.wood,
    full = storageFull(s, 'wood')
  startProject(s, nextExpansion(s, 'stockyard'))
  advanceTime(s, 0)
  const active = s.projects.construction
  expect(active).not.toBeNull()
  if (!active) throw new Error('Missing project')
  expect(storageFull(s, 'wood')).toBe(full)
  expect(cancelProject(s, 'construction')).toBe(true)
  expect(s.resources.wood).toBe(before)
  expect(storageFull(s, 'wood')).toBe(full)
  expect(cancelProject(s, 'construction')).toBe(false)
  expect(s.resources.wood).toBe(before)
})

test('removal preserves people and stock, releases workers, and rebuilding starts from the base building', () => {
  const s = settlement()
  people(s, 'woodcutter', 'builder')
  s.facilities.lumber.equipment = 2
  const wood = s.resources.wood
  expect(removeFacility(s, 'lumber')).toBe(true)
  expect(s.people[0]?.job).toBe('idle')
  expect(s.resources.wood).toBe(wood)
  startProject(s, { kind: 'expand', id: 'lumber', target: 1 })
  advanceTime(s, 900)
  expect(s.facilities.lumber).toEqual({ level: 1, equipment: 0 })
})

test('storage capacity caps new resource gains while prices remain payable', () => {
  const s = createDefaultState()
  s.facilities.stockyard.level = 2
  const capacity = storageCapacity(s, 'wood')
  expect(capacity).toBe(896)
  s.resources.wood = 4 * capacity
  expect(canAfford(s, { wood: 3000 })).toBe(true)
  removeFacility(s, 'stockyard')
  expect(s.resources.wood).toBe(3584)
  expect(storageFull(s, 'wood')).toBe(true)
})

test('overstaffing beyond capacity adds no output and Fill only uses available people', () => {
  const s = settlement()
  s.resources.food = 0
  s.facilities.farm.level = 1
  people(s, 'farmer', 'farmer', 'idle', 'idle')
  const rate = () => s.people.reduce((n, p) => n + workerRate(s, p), 0),
    before = rate()
  assignJob(s, 2, 'farmer')
  expect(rate()).toBeCloseTo(before)
  expect(fillWorkers(s, 'farmer')).toBe(false)
  expect(s.people[3]?.job).toBe('idle')
  assignJob(s, 3, 'farmer')
  expect(rate()).toBeCloseTo(before)
  expect(effectiveStaff(8, 2)).toBe(2)
  const crew = crewSize(s)
  expect(constructionSpeed(s, crew + 10)).toBe(constructionSpeed(s, crew))
})

test('tool refinements continue above tier three and replace rather than compound', () => {
  const s = settlement()
  people(s, 'builder')
  s.facilities.sawmill.equipment = 3
  startProject(s, { kind: 'equip', id: 'sawmill', target: 4 })
  advanceTime(s, 7200)
  expect(s.facilities.sawmill.equipment).toBe(4)
  expect(equipmentMultiplier(4)).toBeCloseTo(1.75 + 0.5 * (Math.sqrt(2) - 1))
  expect(equipmentMultiplier(25)).toBeGreaterThan(equipmentMultiplier(10))
})

for (const branch of ['forestry', 'stonecraft'] as const)
  test(`${branch} reaches Mechanization without the Great Hall or other branch`, () => {
    const s = settlement(branch)
    people(s, 'forager', 'idle')
    const game = createGame(s)
    expect(game.start({ kind: 'research', id: 'mechanization' })).toBe(true)
    game.advanceTime(
      quoteProject(s, { kind: 'research', id: 'mechanization' }).total,
    )
    expect(s.research.mechanization).toBe(1)
    expect(s.era).toBe(3)
    expect(s.facilities['great-hall'].level).toBe(0)
    expect(jobInput(s, 'sawyer').wood).toBe(branch === 'forestry' ? 2 : 3)
  })

test('active branches can be cancelled before choosing the other path', () => {
  const s = settlement()
  s.research.forestry = 0
  s.specialization = null
  expect(startProject(s, { kind: 'research', id: 'forestry' })).toBe(true)
  expect(startProject(s, { kind: 'research', id: 'stonecraft' })).toBe(false)
  cancelProject(s, 'research')
  expect(startProject(s, { kind: 'research', id: 'stonecraft' })).toBe(true)
  const active = s.projects.research
  if (!active) throw new Error('No replacement research')
  advanceTime(s, active.total)
  expect(s).toMatchObject({ specialization: 'stonecraft' })
})

test('the common research graph is reachable independently of either branch', () => {
  for (const branch of ['forestry', 'stonecraft'] as const) {
    const s = createDefaultState()
    s.discovered = { wood: true, stone: true }
    s.expeditionUnlocked = true
    const pending = RESEARCH_IDS.filter(
      (id) =>
        id !== 'early-astronomy' &&
        id !==
          (branch === 'forestry' ? 'structural-systems' : 'lean-fabrication') &&
        id !==
          (branch === 'forestry'
            ? 'resilient-megastructures'
            : 'closed-cycle-fabrication') &&
        id !== (branch === 'forestry' ? 'stonecraft' : 'forestry') &&
        id !== (branch === 'forestry' ? 'architecture' : 'joinery'),
    )
    while (pending.length) {
      // This is a dependency-graph fixture, not a pacing run. Construct required
      // facilities only after their own prerequisites become available.
      for (const facility of BUILDING_IDS) {
        const needed = Math.max(
          0,
          ...pending.map(
            (id) => RESEARCH[id].requires.facilities?.[facility] ?? 0,
          ),
        )
        const building = BUILDINGS[facility]
        if (building && !requirementBlocker(s, building.requires))
          s.facilities[facility].level = Math.max(
            s.facilities[facility].level,
            needed,
          )
      }
      const index = pending.findIndex(
        (id) => !quoteProject(s, { kind: 'research', id }).blocker,
      )
      expect(index).toBeGreaterThanOrEqual(0)
      if (index < 0) break
      const id = pending.splice(index, 1)[0]
      if (id) complete(s, id)
    }
    expect(s.research['causal-synthesis']).toBe(1)
    expect(s.legacy.discovered).toBe(true)
  }
})

test('food gathering rewards the first second and opens exploration once a trip is affordable', () => {
  const s = createDefaultState()
  expect(s.resources.food).toBe(0)
  expect(startAction(s, 'gather')).toBe(true)
  advanceTime(s, 0.4, true)
  expect(s.manual[0]?.progress).toBeCloseTo(0.4)
  advanceTime(s, 3600, false)
  expect(s.manual[0]?.progress).toBeCloseTo(0.4)
  advanceTime(s, 0.6, true)
  expect(s.resources.food).toBe(1)
  expect(s.manual).toHaveLength(0)
  for (let i = 0; i < 5; i++) {
    expect(startAction(s, 'gather')).toBe(true)
    advanceTime(s, 1, true)
  }
  expect(s.resources.food).toBeCloseTo(5.8908, 6)
  expect(s.exploreUnlocked).toBe(true)
})

test.each([
  { action: 'sticks', resource: 'wood', seconds: 1.5 },
  { action: 'stone', resource: 'stone', seconds: 2.5 },
] as const)(
  '$resource gathering awards one unit after $seconds seconds',
  ({ action, resource, seconds }) => {
    const s = createDefaultState()
    s.discovered[resource] = true
    expect(startAction(s, action)).toBe(true)
    advanceTime(s, seconds / 2, true)
    expect(s.manual[0]?.progress).toBeCloseTo(0.5)
    advanceTime(s, seconds / 2, true)
    expect(s.resources[resource]).toBe(1)
    expect(s.manual).toHaveLength(0)
  },
)

test('the gathering duration stays constant near the storage cap', () => {
  const s = createDefaultState()
  s.discovered.wood = true
  s.resources.wood = 49
  const duration = actionDuration(s, 'sticks')
  expect(duration).toBe(1.5)
  expect(startAction(s, 'sticks')).toBe(true)
  advanceTime(s, duration / 2, true)
  expect(s.manual[0]?.progress).toBeCloseTo(0.5)
  advanceTime(s, duration / 2, true)
  expect(s.resources.wood).toBe(50)
})

test('automated gathering follows the same storage cap timeline across tick sizes', () => {
  const s = createDefaultState()
  s.facilities.foraging.level = 10
  s.resources.food = 49.1
  people(s, 'forager', 'forager')
  const sliced = structuredClone(s)
  advanceTime(s, 0.5, true)
  for (let i = 0; i < 32; i++) advanceTime(sliced, 0.5 / 32, true)
  expect(s.actionProgress.gather).toBe(0)
  expect(s.actionProgress.gather).toBeCloseTo(sliced.actionProgress.gather, 3)
  advanceTime(s, 4, true)
  advanceTime(sliced, 4, true)
  // The level-10 camp's improved output reaches the food cap before the
  // final meal interval, so only the remaining four seconds drain food.
  expect(s.resources.food).toBeCloseTo(50 - (1.8 * 2 * 4) / 60, 8)
  expect(s.resources.food).toBeCloseTo(sliced.resources.food, 4)
})

test('Writing starts after its farm prerequisite is complete', () => {
  const s = settlement()
  s.research.writing = 0
  s.facilities.farm.level = 0
  people(s, 'builder', 'forager', 'idle')
  s.resources.knowledge = 2000
  const before = s.resources.knowledge
  expect(startProject(s, nextExpansion(s, 'farm'))).toBe(true)
  expect(s.projects.construction?.project.id).toBe('farm')
  advanceTime(s, 15 * 60)
  expect(s.facilities.farm.level).toBe(1)
  expect(startProject(s, { kind: 'research', id: 'writing' })).toBe(true)
  expect(s.projects.research?.project.id).toBe('writing')
  expect(s.projects.research?.paid.knowledge).toBe(
    before - s.resources.knowledge,
  )
  const active = s.projects.research
  if (!active) throw new Error('Writing did not start')
  advanceTime(s, active.total)
  expect(s.research.writing).toBe(1)
})

test('completed gathering levels up, linearly improves yield, and persists', () => {
  const s = createDefaultState()
  while (s.actionSkills.gather.level < 3) {
    expect(startAction(s, 'gather')).toBe(true)
    advanceTime(s, actionDuration(s, 'gather'), true)
  }
  expect(actionDuration(s, 'gather')).toBeCloseTo(0.98 ** 2, 8)
  expect(actionYield(s, 'gather')).toBeCloseTo(1.04, 8)
  s.actionSkills.gather.level = 4
  expect(actionYield(s, 'gather')).toBeCloseTo(1.06, 8)
  expect(s.actionSkills.sticks).toEqual({ level: 1, xp: 0 })
  expect(s.people).toHaveLength(1)
  expect(parseSave(JSON.stringify(s)).actionSkills).toEqual(s.actionSkills)
  startAction(s, 'gather')
  advanceTime(s, 0.2, true)
  const loaded = parseSave(JSON.stringify(s))
  expect(loaded.actionSkills).toEqual(s.actionSkills)
  expect(loaded.manual).toHaveLength(0)
})

test('explore discovers wood then stone through its random rewards', () => {
  const s = createDefaultState()
  s.exploreUnlocked = true
  s.resources.food = 4000
  for (let i = 0; !s.discovered.wood; i++) {
    expect(i).toBeLessThan(200)
    expect(startAction(s, 'explore')).toBe(true)
    advanceTime(s, 4, true)
  }
  expect(s.expeditionUnlocked).toBe(true)
  for (let i = 0; !s.discovered.stone; i++) {
    expect(i).toBeLessThan(200)
    expect(startAction(s, 'explore')).toBe(true)
    advanceTime(s, 4, true)
  }
  expect(s.exploreRolls).toBeGreaterThan(0)
})

test('automated exploration can discover raw resources before manual exploration', () => {
  const s = createDefaultState()
  for (let i = 0; i < 100 && !s.discovered.stone; i++)
    applyExploreReward(s, 0.1)
  expect(s.discovered).toEqual({ wood: true, stone: true })
  expect(s.expeditionUnlocked).toBe(true)
})

test('workers unlock when the corresponding workplace is available', () => {
  const s = createDefaultState()
  expect(actionWorkersUnlocked(s, 'gather')).toBe(false)
  s.facilities.foraging.level = 1
  expect(actionWorkersUnlocked(s, 'gather')).toBe(false)
  s.research['foraging-rounds'] = 1
  people(s, 'idle', 'idle')
  expect(actionWorkersUnlocked(s, 'gather')).toBe(true)
  expect(actionWorkers(s, 'gather')).toBe(0)
  expect(adjustWorkers(s, 'forager', 1)).toBe(true)
  expect(actionWorkers(s, 'gather')).toBe(1)
  expect(adjustWorkers(s, 'forager', -1)).toBe(true)
  expect(actionWorkers(s, 'gather')).toBe(0)
})

test('the first researched stick immediately unlocks manual root digging', () => {
  const s = createDefaultState()
  const startingFood = s.resources.food
  complete(s, 'sharpened-stick')
  // The sharpened stick unlocks Dig roots: 6 food per 4s trip.
  expect(startAction(s, 'dig-roots')).toBe(true)
  advanceTime(s, actionDuration(s, 'dig-roots'), true)
  expect(s.resources.food).toBeCloseTo(startingFood + 6)
})
