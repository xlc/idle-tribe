import { expect, test } from 'bun:test'
import { WORKERS_PER_BUILDING_LEVEL } from './constants'
import { ACTIONS, BUILDINGS, RESEARCH } from './definitions'
import {
  ACTION_IDS,
  BUILDING_IDS,
  PERK_IDS,
  RESEARCH_IDS,
  RESOURCES,
  type ResearchId,
  type ResourceId,
  SPECIALIZATION_IDS,
} from './ids'
import { isProductionJob, jobRecipe } from './jobs'
import { createRecord } from './records'
import { completeProject, quoteProject } from './research'
import { storageCapacity } from './resources'
import {
  adjustWorkers,
  assigned,
  buildingJobs,
  craftingJob,
  fillWorkers,
  jobCapacity,
  requirementBlocker,
  staffingMultiplier,
} from './settlement'
import { createDefaultState } from './state'
import { advancedSettlement, people } from './test-helpers'
import type { Cost } from './types'

test.each(SPECIALIZATION_IDS)(
  '%s can supply every resource and eligible research without circular costs',
  (branch) => {
    const state = createDefaultState()
    state.discovered = { wood: true, stone: true }
    state.expeditionUnlocked = true
    state.legacy.perks = createRecord(PERK_IDS, () => true)
    const supply = new Set<ResourceId>()
    for (const id of ACTION_IDS) {
      const def = ACTIONS[id]
      if (def.resource && def.visible(state)) supply.add(def.resource)
    }
    const payable = (cost: Cost) =>
      RESOURCES.every((r) => !cost[r] || supply.has(r))
    let changed = true
    while (changed) {
      changed = false
      for (const id of RESEARCH_IDS) {
        const def = RESEARCH[id]
        if (
          state.research[id] ||
          (def.branch && def.branch !== branch) ||
          quoteProject(state, { kind: 'research', id }).blocker ||
          !payable(def.cost)
        )
          continue
        completeProject(state, { kind: 'research', id })
        changed = true
      }
      for (const id of BUILDING_IDS) {
        const def = BUILDINGS[id]
        if (
          state.facilities[id].level ||
          requirementBlocker(state, def.requires) ||
          !payable(def.cost)
        )
          continue
        completeProject(state, { kind: 'expand', id, target: 1 })
        const crafting = craftingJob(id)
        if (
          crafting &&
          isProductionJob(crafting) &&
          payable(def.input ?? jobRecipe(crafting).input)
        )
          supply.add(jobRecipe(crafting).output)
        changed = true
      }
    }
    const locked = new Set<ResearchId>(
      RESEARCH_IDS.filter(
        (id) => RESEARCH[id].branch && RESEARCH[id].branch !== branch,
      ),
    )
    let previous = -1
    while (previous !== locked.size) {
      previous = locked.size
      for (const id of RESEARCH_IDS) {
        const req = RESEARCH[id].requires
        if (
          req.research?.some((r) => locked.has(r)) ||
          (req.anyResearch?.length &&
            req.anyResearch.every((r) => locked.has(r)))
        )
          locked.add(id)
      }
    }
    expect(RESEARCH_IDS.filter((id) => !state.research[id])).toEqual(
      RESEARCH_IDS.filter((id) => locked.has(id)),
    )
    expect(RESOURCES.filter((r) => !supply.has(r))).toEqual([])
  },
)

test('storage buildings cover every resource', () => {
  for (const resource of RESOURCES)
    expect(
      BUILDING_IDS.some((id) => (BUILDINGS[id].storage?.[resource] ?? 0) > 0),
    ).toBe(true)
})

test('the initial era has one general storage building for its early resources', () => {
  const state = createDefaultState()
  completeProject(state, { kind: 'research', id: 'shelters' })
  completeProject(state, { kind: 'research', id: 'stockpiling' })
  const available = BUILDING_IDS.filter(
    (id) =>
      BUILDINGS[id].storage &&
      !requirementBlocker(state, BUILDINGS[id].requires),
  )
  expect(available).toEqual(['stockyard'])
  expect(BUILDINGS.stockyard.storage).toEqual({
    food: 400,
    wood: 300,
    stone: 300,
    planks: 150,
    blocks: 150,
    tools: 60,
    knowledge: 200,
    ore: 600,
  })
})

test('storing ceramics raises its storage capacity through warehouse investment', () => {
  const state = createDefaultState()
  state.resources.ceramics = 120
  completeProject(state, { kind: 'expand', id: 'storehouse', target: 1 })
  const base = storageCapacity(state, 'ceramics')
  completeProject(state, { kind: 'expand', id: 'storehouse', target: 2 })
  expect(storageCapacity(state, 'ceramics')).toBeGreaterThan(base)
})

test('orbital extraction requires a launch complex', () => {
  const state = advancedSettlement()
  state.facilities['launch-complex'].level = 0
  expect(
    requirementBlocker(state, BUILDINGS['orbital-extractor'].requires),
  ).toBe('Requires Launch complex level 1')
})

test('every action job belongs to its workplace', () => {
  const state = createDefaultState()
  for (const id of ACTION_IDS) {
    const def = ACTIONS[id]
    for (const level of [0, 1, 5]) {
      state.facilities[def.building].level = level
      expect(jobCapacity(state, def.job)).toBe(
        WORKERS_PER_BUILDING_LEVEL * level,
      )
    }
    expect(buildingJobs(def.building)).toContain(def.job)
  }
})

test('gathering camp slots are shared across its actions', () => {
  const state = createDefaultState()
  state.facilities.foraging.level = 1
  people(state, 'idle', 'idle', 'idle')

  // Filling one food job consumes the camp's whole shared capacity.
  expect(fillWorkers(state, 'forager')).toBe(true)
  expect(assigned(state, 'forager')).toBe(2)
  expect(fillWorkers(state, 'digger')).toBe(false)

  // Overstaffing any job at the camp idles the surplus beyond capacity.
  expect(adjustWorkers(state, 'digger', 1)).toBe(true)
  expect(staffingMultiplier(state, 'forager')).toBeLessThan(1)
  expect(staffingMultiplier(state, 'digger')).toBeLessThan(1)
})
