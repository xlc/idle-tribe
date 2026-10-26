import { expect, test } from 'bun:test'
import { actionSlots } from './actions'
import { ACTIONS, BUILDINGS, JOBS, RESEARCH } from './definitions'
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
import { isProductionJob } from './jobs'
import { createRecord } from './records'
import { completeProject, quoteProject } from './research'
import { storageMultiplier, threshold } from './resources'
import { jobCapacity, requirementBlocker } from './settlement'
import { createDefaultState } from './state'
import { advancedSettlement, required } from './test-helpers'
import type { Cost } from './types'

test.each(SPECIALIZATION_IDS)(
  '%s can supply every resource, building form and eligible research without circular costs',
  (branch) => {
    const state = createDefaultState()
    // Discovery and optional prestige are available; materials must still have
    // a reachable source before they can fund research, construction or recipes.
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
    const forms = new Set<string>()
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
        const job = BUILDINGS[id].job
        for (const [form, def] of BUILDINGS[id].forms.entries()) {
          const key = `${id}:${form}`
          if (
            forms.has(key) ||
            requirementBlocker(state, def.requires) ||
            !payable(def.cost) ||
            (job &&
              isProductionJob(job) &&
              !payable(def.input ?? JOBS[job].input))
          )
            continue
          forms.add(key)
          completeProject(state, { kind: 'expand', id, form, target: 1 })
          // Switching forms does not remove sources already established.
          state.facilities[id].form = form
          if (job && isProductionJob(job)) supply.add(JOBS[job].output)
          changed = true
        }
      }
    }

    // Only the other specialization and its descendants may be unreachable.
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
    expect(
      BUILDING_IDS.flatMap((id) =>
        BUILDINGS[id].forms.flatMap((form, index) =>
          forms.has(`${id}:${index}`) ? [] : [form.name],
        ),
      ),
    ).toEqual([])
  },
)

test('storage upgrades retain existing resources and every resource has expandable storage', () => {
  const state = createDefaultState()
  for (const resource of RESOURCES)
    expect(
      BUILDING_IDS.some((id) =>
        BUILDINGS[id].forms.some((form) => (form.storage?.[resource] ?? 0) > 0),
      ),
    ).toBe(true)
  for (const id of BUILDING_IDS) {
    const facility = state.facilities[id]
    facility.level = 2
    for (let form = 1; form < BUILDINGS[id].forms.length; form++) {
      facility.form = form - 1
      const before = createRecord(RESOURCES, (r) => threshold(state, r))
      completeProject(state, { kind: 'convert', id, form })
      for (const resource of RESOURCES)
        expect(threshold(state, resource)).toBeGreaterThanOrEqual(
          before[resource],
        )
    }
    facility.level = 0
  }
})

test('storing ceramics relieves kiln storage pressure and further warehouse investment remains useful', () => {
  const state = createDefaultState()
  state.resources.ceramics = 120
  const initial = storageMultiplier(state, 'ceramics')
  completeProject(state, {
    kind: 'expand',
    id: 'storehouse',
    target: 1,
    form: 0,
  })
  expect(storageMultiplier(state, 'ceramics')).toBeGreaterThan(initial)
  const base = threshold(state, 'ceramics')
  completeProject(state, { kind: 'convert', id: 'storehouse', form: 1 })
  expect(threshold(state, 'ceramics')).toBeGreaterThan(base)
  const upgraded = threshold(state, 'ceramics')
  completeProject(state, {
    kind: 'expand',
    id: 'storehouse',
    target: 2,
    form: 1,
  })
  expect(threshold(state, 'ceramics')).toBeGreaterThan(upgraded)
})

test('all orbital extractor forms require a launch complex even when rebuilding directly', () => {
  const state = advancedSettlement()
  state.facilities['launch-complex'].level = 0
  state.facilities['orbital-extractor'] = { level: 0, form: 0, equipment: 0 }
  for (const form of BUILDINGS['orbital-extractor'].forms.keys())
    expect(
      quoteProject(state, {
        kind: 'expand',
        id: 'orbital-extractor',
        target: 1,
        form,
      }).blocker,
    ).toBe('Requires Launch complex level 1')
})

test('action slots and workplace capacity agree for every action', () => {
  const state = createDefaultState()
  for (const id of ACTION_IDS) {
    const def = ACTIONS[id]
    for (const level of [0, 1, 5]) {
      state.facilities[def.building].level = level
      expect(actionSlots(state, id)).toBe(jobCapacity(state, def.job))
    }
    expect(required(BUILDINGS[def.building].job)).toBe(def.job)
  }
})
