import { expect, test } from 'bun:test'
import {
  actionDuration,
  actionYield,
  applyExploreReward,
  cancelManual,
  canRepeatAction,
  startAction,
} from './actions'
import { BUILDINGS, RESEARCH } from './definitions'
import { createGame, removeFacility } from './game'
import { BUILDING_IDS, RESEARCH_IDS } from './ids'
import { parseSave } from './persistence'
import {
  allEntries,
  cancelProject,
  completeProject,
  enqueue,
  moveProject,
  nextExpansion,
  plannedQuotes,
  quoteProject,
  startQueues,
} from './research'
import {
  canAfford,
  capital,
  committed,
  storageMultiplier,
  threshold,
} from './resources'
import {
  assignJob,
  comfortablePlaces,
  constructionSpeed,
  effectiveStaff,
  equipmentMultiplier,
  fillWorkers,
  jobInput,
  requirementBlocker,
  workerRate,
} from './settlement'
import { advanceTime } from './simulation'
import { createDefaultState } from './state'
import { complete, people, required, settlement } from './test-helpers'

test('the opening discovers resources and grants a working camp once', () => {
  const s = createDefaultState()
  for (let i = 0; i < 15; i++) {
    expect(startAction(s, 'gather')).toBe(true)
    advanceTime(s, 1, true)
  }
  s.resources.food += 600
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
  enqueue(s, { kind: 'research', id: 'sharpened-stick' })
  enqueue(s, { kind: 'research', id: 'shelters' })
  advanceTime(s, 180)
  expect(s.research.shelters).toBe(true)
  expect(s.facilities.foraging.level).toBe(1)
  expect(s.people[0]?.job).toBe('forager')
  expect(s.facilities.housing.level).toBe(0)
  const before = s.resources.food
  advanceTime(s, 60)
  expect(s.resources.food).toBeGreaterThan(before)
})

test('construction keeps old effects until completion, pays once, and can exceed old caps', () => {
  const s = settlement()
  people(s, 'builder')
  s.facilities.housing.level = 10
  const project = nextExpansion(s, 'housing'),
    quote = quoteProject(s, project),
    before = s.resources.wood,
    places = comfortablePlaces(s)
  enqueue(s, project)
  advanceTime(s, 0)
  expect(s.resources.wood).toBe(before - (quote.cost.wood ?? 0))
  expect(comfortablePlaces(s)).toBe(places)
  advanceTime(s, quote.total * 60 + 600)
  expect(s.facilities.housing.level).toBe(11)
  expect(comfortablePlaces(s)).toBeGreaterThan(places)
  expect(s.resources.wood).toBe(before - (quote.cost.wood ?? 0))
  expect(s.completedProjects).toBe(1)
})

test('active cancellation restores exact stock and storage pressure once', () => {
  const s = settlement()
  people(s, 'builder')
  const before = s.resources.wood,
    pressure = storageMultiplier(s, 'wood')
  enqueue(s, nextExpansion(s, 'stockyard'))
  advanceTime(s, 0)
  const active = s.queues.construction.active
  expect(active).not.toBeNull()
  if (!active) throw new Error('Missing project')
  expect(committed(s, 'wood')).toBe(active.paid.wood ?? 0)
  expect(storageMultiplier(s, 'wood')).toBe(pressure)
  expect(cancelProject(s, 'construction', active.sequence)).toBe(true)
  expect(s.resources.wood).toBe(before)
  expect(storageMultiplier(s, 'wood')).toBe(pressure)
  expect(cancelProject(s, 'construction', active.sequence)).toBe(false)
  expect(s.resources.wood).toBe(before)
})

test('an older ready queue pays first, but a blocked queue does not reserve stock', () => {
  const s = createDefaultState()
  complete(s, 'sharpened-stick', 'shelters')
  s.discovered.wood = true
  people(s, 'builder')
  s.resources.food = 10
  s.resources.wood = 20
  enqueue(s, { kind: 'expand', id: 'housing', target: 1, form: 0 })
  enqueue(s, { kind: 'research', id: 'stone-tools' })
  startQueues(s)
  expect(s.queues.construction.active?.project.kind).toBe('expand')
  expect(s.resources.wood).toBe(0)
  const other = createDefaultState()
  complete(other, 'sharpened-stick', 'shelters')
  people(other, 'builder')
  other.resources.wood = 20
  other.resources.food = 10
  enqueue(other, { kind: 'research', id: 'stone-tools' })
  enqueue(other, { kind: 'expand', id: 'housing', target: 1, form: 0 })
  startQueues(other)
  expect(other.queues.construction.active?.project.kind).toBe('expand')
})

test('both eligible queue heads use enqueue order and preserve it through reorder', () => {
  const s = settlement()
  people(s, 'builder')
  s.research['record-keeping'] = false
  s.resources.planks = 200
  s.resources.blocks = 100
  enqueue(s, { kind: 'research', id: 'record-keeping' })
  enqueue(s, { kind: 'expand', id: 'sawmill', target: 3, form: 0 })
  // Both need resources shared with construction; the oldest research wins.
  s.facilities.sawmill.level = 0
  required(s.queues.construction.waiting[0]).project = {
    kind: 'expand',
    id: 'farm',
    target: 3,
    form: 0,
  }
  startQueues(s)
  expect(s.queues.research.active?.project.id).toBe('record-keeping')
  expect(s.resources.planks).toBe(0)
  const q = settlement()
  people(q, 'builder')
  enqueue(q, nextExpansion(q, 'housing'))
  enqueue(q, nextExpansion(q, 'housing'))
  const second = q.queues.construction.waiting[1]
  if (!second) throw new Error('Missing second')
  const sequence = second.sequence
  moveProject(q, 'construction', sequence, -1)
  expect(q.queues.construction.waiting[0]?.sequence).toBe(sequence)
  expect(quoteProject(q, second.project).blocker).toBe('Requires level 3')
})

test('converting at different levels charges the same cumulative modern materials and work', () => {
  const early = settlement(),
    late = settlement()
  early.facilities.housing.level = 1
  late.facilities.housing.level = 4
  const first = quoteProject(early, { kind: 'convert', id: 'housing', form: 1 })
  completeProject(early, { kind: 'convert', id: 'housing', form: 1 })
  let planks = first.cost.planks ?? 0,
    work = first.total + 2
  for (let target = 2; target <= 4; target++) {
    const p = {
        kind: 'expand' as const,
        id: 'housing' as const,
        target,
        form: 1,
      },
      q = quoteProject(early, p)
    planks += q.cost.planks ?? 0
    work += q.total
    completeProject(early, p)
  }
  const conversion = quoteProject(late, {
    kind: 'convert',
    id: 'housing',
    form: 1,
  })
  expect(planks).toBe(conversion.cost.planks ?? 0)
  expect(work).toBeCloseTo(
    conversion.total + 2 * (1 + 1.5625 + 2.25 + 3.0625),
    8,
  )
  expect(planks).toBe(capital({ planks: 12 }, 4).planks ?? 0)
})

test('conversion preserves staffing, partial cycles, levels, and tools', () => {
  const s = settlement()
  people(s, 'woodcutter', 'builder')
  required(s.people[0]).progress = 0.6
  s.facilities.lumber.equipment = 2
  completeProject(s, { kind: 'convert', id: 'lumber', form: 1 })
  expect(s.facilities.lumber).toEqual({ level: 2, form: 1, equipment: 2 })
  expect(s.people[0]?.progress).toBe(0.6)
  expect(s.people[0]?.job).toBe('woodcutter')
})

test('planning quotes use target levels and preceding forms, actual payment uses current form', () => {
  const s = settlement()
  people(s, 'builder')
  enqueue(s, { kind: 'convert', id: 'housing', form: 1 })
  enqueue(s, nextExpansion(s, 'housing'))
  const entry = s.queues.construction.waiting[1]
  if (!entry) throw new Error('No planned entry')
  const quote = plannedQuotes(s, 'construction').get(entry.sequence)
  expect(quote?.cost.planks).toBeGreaterThan(0)
  expect(quote?.cost.wood).toBe(0)
  const before = s.resources.planks
  advanceTime(s, 3600)
  expect(s.facilities.housing.form).toBe(1)
  expect(s.facilities.housing.level).toBe(3)
  expect(s.resources.planks).toBeLessThan(before)
})

test('removal preserves people and stock, releases workers, and rebuilding accepts a modern form', () => {
  const s = settlement()
  people(s, 'woodcutter', 'builder')
  s.facilities.lumber.equipment = 2
  const wood = s.resources.wood
  expect(removeFacility(s, 'lumber')).toBe(true)
  expect(s.people[0]?.job).toBe('idle')
  expect(s.resources.wood).toBe(wood)
  enqueue(s, { kind: 'expand', id: 'lumber', target: 1, form: 1 })
  advanceTime(s, 900)
  expect(s.facilities.lumber).toEqual({ level: 1, form: 1, equipment: 0 })
})

test('storage thresholds slow throughput while prices remain payable', () => {
  const s = createDefaultState()
  s.facilities.stockyard.level = 2
  expect(threshold(s, 'wood')).toBe(828)
  s.resources.wood = 4 * 828
  expect(storageMultiplier(s, 'wood')).toBe(0.5)
  expect(canAfford(s, { wood: 3000 })).toBe(true)
  removeFacility(s, 'stockyard')
  expect(s.resources.wood).toBe(3312)
  expect(storageMultiplier(s, 'wood')).toBeLessThan(0.5)
})

test('health-weighted overstaffing always adds output and Fill only uses available people', () => {
  const s = settlement()
  s.resources.food = 0
  s.facilities.farm.level = 1
  people(s, 'farmer', 'farmer', 'idle', 'idle')
  const rate = () => s.people.reduce((n, p) => n + workerRate(s, p), 0),
    before = rate()
  required(s.people[2]).health = 0
  assignJob(s, 2, 'farmer')
  expect(rate()).toBeGreaterThan(before)
  expect(fillWorkers(s, 'farmer')).toBe(false)
  expect(s.people[3]?.job).toBe('idle')
  assignJob(s, 3, 'farmer')
  expect(rate()).toBeGreaterThan(before)
  expect(effectiveStaff(8, 2)).toBeCloseTo(4.77258872)
  expect(constructionSpeed(s, 8)).toBeGreaterThan(constructionSpeed(s, 4))
})

test('tool refinements continue above tier three and replace rather than compound', () => {
  const s = settlement()
  people(s, 'builder')
  s.facilities.sawmill.equipment = 3
  enqueue(s, { kind: 'equip', id: 'sawmill', target: 4 })
  advanceTime(s, 7200)
  expect(s.facilities.sawmill.equipment).toBe(4)
  expect(equipmentMultiplier(4)).toBeCloseTo(1.75 + 0.5 * (Math.sqrt(2) - 1))
  expect(equipmentMultiplier(25)).toBeGreaterThan(equipmentMultiplier(10))
})

for (const branch of ['forestry', 'stonecraft'] as const)
  test(`${branch} reaches Mechanization without the Great Hall or other branch`, () => {
    const s = settlement(branch)
    people(s, 'forager')
    const game = createGame(s)
    expect(game.enqueue({ kind: 'research', id: 'mechanization' })).toBe(true)
    game.advanceTime(7200)
    expect(s.research.mechanization).toBe(true)
    expect(s.era).toBe(3)
    expect(s.facilities['great-hall'].level).toBe(0)
    expect(jobInput(s, 'sawyer').wood).toBe(branch === 'forestry' ? 2 : 3)
  })

test('queued branches can be cancelled before choosing the other path', () => {
  const s = settlement()
  s.research.forestry = false
  s.specialization = null
  expect(enqueue(s, { kind: 'research', id: 'forestry' })).toBe(true)
  expect(enqueue(s, { kind: 'research', id: 'stonecraft' })).toBe(false)
  const entry = allEntries(s)[0]
  if (!entry) throw new Error('No choice')
  cancelProject(s, 'research', entry.sequence)
  expect(enqueue(s, { kind: 'research', id: 'stonecraft' })).toBe(true)
  advanceTime(s, 2700)
  expect(s).toMatchObject({ specialization: 'stonecraft' })
})

test('the common research graph is reachable independently of either branch', () => {
  for (const branch of ['forestry', 'stonecraft'] as const) {
    const s = createDefaultState()
    s.discovered = { wood: true, stone: true }
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
        const form = BUILDINGS[facility].forms[0]
        if (form && !requirementBlocker(s, form.requires))
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
    expect(s.research['causal-synthesis']).toBe(true)
    expect(s.legacy.discovered).toBe(true)
  }
})

test('a missing lower expansion can be rebuilt while a higher target stays queued', () => {
  const s = settlement()
  people(s, 'builder')
  s.facilities.housing.level = 0
  enqueue(s, { kind: 'expand', id: 'housing', target: 2, form: 0 })
  const rebuild = nextExpansion(s, 'housing', 1)
  expect(rebuild).toEqual({ kind: 'expand', id: 'housing', target: 1, form: 1 })
  enqueue(s, rebuild)
  const entry = required(s.queues.construction.waiting[1])
  moveProject(s, 'construction', entry.sequence, -1)
  advanceTime(s, 2400)
  expect(s.facilities.housing.level).toBe(2)
  expect(s.facilities.housing.form).toBe(1)
})

test('food gathering rewards the first second and opens exploration after five clicks', () => {
  const s = createDefaultState()
  expect(startAction(s, 'gather')).toBe(true)
  advanceTime(s, 0.4, true)
  expect(s.manual?.progress).toBeCloseTo(0.4)
  advanceTime(s, 3600, false)
  expect(s.manual?.progress).toBeCloseTo(0.4)
  advanceTime(s, 0.6, true)
  expect(s.resources.food).toBe(1)
  expect(s.manual).toBeNull()
  for (let i = 0; i < 4; i++) {
    expect(startAction(s, 'gather')).toBe(true)
    advanceTime(s, 1, true)
  }
  // The fourth completion reaches level 2 (+2% yield), the fifth collects it.
  expect(s.resources.food).toBeCloseTo(5.04, 6)
  expect(s.exploreUnlocked).toBe(true)
})

test.each([
  { action: 'sticks', resource: 'wood', seconds: 2 },
  { action: 'stone', resource: 'stone', seconds: 3 },
] as const)(
  '$resource gathering awards one unit after $seconds seconds',
  ({ action, resource, seconds }) => {
    const s = createDefaultState()
    s.discovered[resource] = true
    expect(startAction(s, action)).toBe(true)
    advanceTime(s, seconds / 2, true)
    expect(s.manual?.progress).toBeCloseTo(0.5)
    advanceTime(s, seconds / 2, true)
    expect(s.resources[resource]).toBe(1)
    expect(s.manual).toBeNull()
  },
)

test('the gathering duration preview completes a batch under storage pressure', () => {
  const s = createDefaultState()
  s.discovered.wood = true
  s.resources.wood = 240
  const duration = actionDuration(s, 'sticks')
  expect(duration).toBe(4)
  expect(startAction(s, 'sticks')).toBe(true)
  advanceTime(s, duration / 2, true)
  expect(s.manual?.progress).toBeCloseTo(0.5)
  advanceTime(s, duration / 2, true)
  expect(s.resources.wood).toBe(241)
})

test('automated gathering follows the same storage pressure timeline across tick sizes', () => {
  const s = createDefaultState()
  s.facilities.foraging.level = 10
  s.resources.food = 150
  people(s, 'forager', 'forager')
  const sliced = structuredClone(s)
  advanceTime(s, 0.5, true)
  for (let i = 0; i < 32; i++) advanceTime(sliced, 0.5 / 32, true)
  expect(s.actionProgress.gather).toBeGreaterThan(0)
  expect(s.actionProgress.gather).toBeCloseTo(sliced.actionProgress.gather, 3)
  advanceTime(s, 4, true)
  advanceTime(sliced, 4, true)
  expect(s.resources.food).toBeGreaterThan(150)
  expect(s.resources.food).toBeCloseTo(sliced.resources.food, 4)
})

test('queued Writing follows a paid farm investment and retains its research cost', () => {
  const s = settlement()
  s.research.writing = false
  s.facilities.farm.level = 0
  people(s, 'builder', 'forager')
  const before = s.resources.knowledge
  enqueue(s, { kind: 'research', id: 'writing' })
  enqueue(s, nextExpansion(s, 'farm'))
  advanceTime(s, 0)
  expect(s.queues.construction.active?.project.id).toBe('farm')
  advanceTime(s, 15 * 60)
  expect(s.facilities.farm.level).toBe(1)
  expect(s.queues.research.active?.project.id).toBe('writing')
  expect(s.queues.research.active?.paid.knowledge).toBe(
    before - s.resources.knowledge,
  )
  advanceTime(s, 180 * 60)
  expect(s.research.writing).toBe(true)
})

test('completed gathering levels up, compounds yield and speed, and persists', () => {
  const s = createDefaultState()
  while (s.actionSkills.gather.level < 3) {
    expect(startAction(s, 'gather')).toBe(true)
    advanceTime(s, actionDuration(s, 'gather'), true)
  }
  expect(actionDuration(s, 'gather')).toBeCloseTo(0.98 ** 2, 8)
  expect(actionYield(s, 'gather')).toBeCloseTo(1.02 ** 2, 8)
  expect(s.actionSkills.sticks).toEqual({ level: 1, xp: 0 })
  expect(s.people[0]?.practice.forager).toBe(0)
  expect(parseSave(JSON.stringify(s)).actionSkills).toEqual(s.actionSkills)
  startAction(s, 'gather')
  advanceTime(s, 0.2, true)
  const loaded = parseSave(JSON.stringify(s))
  expect(loaded.actionSkills).toEqual(s.actionSkills)
  expect(loaded.manual).toBeNull()
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

test('practiced gathering repeats only when selected and can be stopped immediately', () => {
  const s = createDefaultState()
  expect(canRepeatAction(s, 'gather')).toBe(false)
  expect(startAction(s, 'gather', true)).toBe(false)
  for (let i = 0; i < 4; i++) {
    expect(startAction(s, 'gather')).toBe(true)
    advanceTime(s, actionDuration(s, 'gather'), true)
  }
  expect(canRepeatAction(s, 'gather')).toBe(true)
  expect(startAction(s, 'gather', true)).toBe(true)
  const before = s.resources.food
  const sliced = structuredClone(s)
  advanceTime(s, 10, true)
  for (let i = 0; i < 100; i++) advanceTime(sliced, 0.1, true)
  expect(s.resources.food).toBeGreaterThan(before + 5)
  expect(s.resources.food).toBeCloseTo(sliced.resources.food, 7)
  expect(s.actionSkills).toEqual(sliced.actionSkills)
  expect(s.manual?.repeat).toBe(true)
  cancelManual(s)
  const stopped = s.resources.food
  advanceTime(s, 5, true)
  expect(s.resources.food).toBe(stopped)
  expect(s.manual).toBeNull()
  expect(startAction(s, 'explore', true)).toBe(false)
})

test('repeated gathering hands over to assigned workers without starting another manual cycle', () => {
  const s = createDefaultState()
  s.discovered.wood = true
  s.actionSkills.sticks.level = 2
  expect(startAction(s, 'sticks', true)).toBe(true)
  s.facilities.lumber.level = 1
  people(s, 'woodcutter')
  advanceTime(s, actionDuration(s, 'sticks'), true)
  expect(s.manual).toBeNull()
})

test('the first researched stick immediately improves manual food gathering', () => {
  const s = createDefaultState()
  const before = actionYield(s, 'gather')
  complete(s, 'sharpened-stick')
  expect(startAction(s, 'gather')).toBe(true)
  advanceTime(s, actionDuration(s, 'gather'), true)
  expect(s.resources.food).toBeCloseTo(before * 1.25)
})
