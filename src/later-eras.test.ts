import { expect, test } from 'bun:test'
import {
  actionDuration,
  automationFactor,
  exploreExpectedRewards,
} from './actions'
import { offlineWindow } from './clock'
import { BUILDINGS } from './definitions'
import { RESOURCES } from './ids'
import { parseSave } from './persistence'
import { buyPerk, canReset, legacyReward, resetRun } from './prestige'
import {
  completeProject,
  enqueue,
  quoteProject,
  researchVisible,
} from './research'
import { threshold } from './resources'
import { jobInput, prestigeMultiplier, requirementBlocker } from './settlement'
import { advanceTime, resourceFlows, resourceRates } from './simulation'
import {
  advancedSettlement,
  complete,
  people,
  required,
  settlement,
} from './test-helpers'

test('industrial workers turn newly mined ore into metal and machinery in roster order', () => {
  const s = settlement()
  complete(s, 'mechanization')
  for (const id of ['ore-mine', 'foundry', 'machine-shop'] as const)
    completeProject(s, { kind: 'expand', id, target: 1, form: 0 })
  people(s, 'miner', 'smelter', 'machinist')
  for (const person of s.people) person.progress = 1
  s.resources.ore = 2
  s.resources.metal = 2
  s.resources.machinery = 0
  s.resources.wood = 1
  s.resources.tools = 1
  advanceTime(s, 0)
  expect(s.resources.machinery).toBe(1)
  expect([
    s.resources.ore,
    s.resources.metal,
    s.resources.wood,
    s.resources.tools,
  ]).toEqual([0, 0, 0, 0])
  expect(s.people.map((p) => p.progress)).toEqual([0, 0, 0])
})

test('electric conversion changes the recipe; solar generation removes fuel demand', () => {
  const s = advancedSettlement()
  people(s, 'power-worker', 'smelter')
  s.resources.wood = 0
  s.resources.charge = 0
  s.resources.ore = 3
  s.resources.metal = 0
  required(s.people[0]).progress = 1
  required(s.people[1]).progress = 1
  advanceTime(s, 0)
  expect(s.resources.metal).toBe(1)
  expect(s.resources.ore).toBe(0)
  expect(s.resources.charge).toBe(0)
  expect(jobInput(s, 'power-worker')).toEqual({})
})

test('Chronometry earns discovery through a paid timer, then reset purchases open optional astronomy', () => {
  const s = settlement()
  complete(s, 'mechanization', 'precision-instruments')
  people(s, 'idle')
  const project = { kind: 'research', id: 'chronometry' } as const
  const quote = quoteProject(s, project)
  const before = s.resources.machinery
  enqueue(s, project)
  advanceTime(s, quote.total - 1)
  expect(s.queues.research.active?.paid.machinery).toBe(quote.cost.machinery)
  expect(s.resources.machinery).toBe(before - (quote.cost.machinery ?? 0))
  advanceTime(s, 1)
  expect(s.legacy.discovered).toBe(true)
  expect(canReset(s)).toBe(true)
  const reward = legacyReward(s)
  expect(reward).toBeGreaterThanOrEqual(20)
  resetRun(s)
  expect(s.legacy.lifetime).toBe(reward)
  expect(prestigeMultiplier(s)).toBeGreaterThan(1)
  expect(buyPerk(s, 'early-astronomy')).toBe(true)
  complete(s, 'writing')
  expect(canReset(s)).toBe(true)
  expect(researchVisible(s, 'early-astronomy')).toBe(true)
  const saved = parseSave(JSON.stringify(s))
  expect(saved.legacy).toEqual(s.legacy)
})

test('the launch project gates orbital work, and quantum materials sustain causal synthesis', () => {
  const s = advancedSettlement()
  s.facilities['launch-complex'].level = 0
  const orbital = required(BUILDINGS['orbital-extractor'].forms[0])
  expect(requirementBlocker(s, orbital.requires)).toBe(
    'Requires Launch complex level 1',
  )
  completeProject(s, {
    kind: 'expand',
    id: 'launch-complex',
    target: 1,
    form: 0,
  })
  expect(requirementBlocker(s, orbital.requires)).toBe('')
  people(s, 'quantum-engineer', 'causal-researcher')
  for (const person of s.people) person.progress = 1
  s.resources['exotic-material'] = 2
  s.resources.data = 13
  s.resources.charge = 22
  s.resources['quantum-components'] = 0
  s.resources['causal-models'] = 0
  advanceTime(s, 0)
  expect(s.resources['causal-models']).toBe(1)
  expect(s.resources['quantum-components']).toBe(0)
  expect(s.resources.data).toBe(0)
  expect(s.resources.charge).toBe(0)
})

test('late branch investments trade ingredient efficiency for housing and storage headroom', () => {
  const forestry = advancedSettlement('forestry'),
    stonecraft = advancedSettlement('stonecraft')
  expect(jobInput(forestry, 'electronics-worker').metal).toBeCloseTo(
    2 * 0.8 * 0.85,
  )
  expect(jobInput(stonecraft, 'electronics-worker').metal).toBe(2)
  expect(threshold(stonecraft, 'circuits')).toBeGreaterThan(
    threshold(forestry, 'circuits'),
  )
  people(forestry, 'electronics-worker')
  forestry.resources.metal = 1.36
  forestry.resources.charge = 2.04
  forestry.resources.circuits = 0
  required(forestry.people[0]).progress = 1
  advanceTime(forestry, 0)
  expect(forestry.resources.circuits).toBe(1)
  expect(forestry.resources.metal).toBeCloseTo(0)
  expect(forestry.resources.charge).toBeCloseTo(0)
})

test('late recipes, archives and partial cycles survive saves and sliced elapsed time', () => {
  const s = advancedSettlement()
  people(
    s,
    'farmer',
    'power-worker',
    'analyst',
    'orbital-worker',
    'quantum-engineer',
    'causal-researcher',
    'stellar-worker',
  )
  expect(offlineWindow(s)).toBeGreaterThan(24)
  const restored = parseSave(JSON.stringify(s)),
    direct = structuredClone(s)
  advanceTime(direct, 600)
  for (let i = 0; i < 60; i++) advanceTime(restored, 10)
  for (const r of RESOURCES)
    expect(restored.resources[r]).toBeCloseTo(direct.resources[r], 6)
  expect(restored.people.map((p) => p.health)).toEqual(
    direct.people.map((p) => p.health),
  )
  expect(restored.resources['causal-models']).toBeGreaterThan(
    s.resources['causal-models'],
  )
})

test('planned production exposes upstream demand even while a downstream recipe is stopped', () => {
  const s = advancedSettlement()
  people(s, 'analyst')
  s.resources.circuits = 0
  const planned = resourceRates(s, { ignoreInputs: true })
  expect(planned.data).toBeGreaterThan(0)
  expect(planned.circuits).toBeCloseTo(-planned.data)
  s.resources.circuits = 10
  const running = resourceRates(s)
  expect(running.data).toBeCloseTo(planned.data)
  expect(running.circuits).toBeCloseTo(planned.circuits)
})

test('experienced explorers include rare knowledge rewards in resource flows', () => {
  const s = settlement()
  people(s, 'explorer')
  expect(resourceFlows(s).knowledge.production).toBe(0)
  s.actionSkills.explore.level = 5
  expect(exploreExpectedRewards(s).knowledge).toBeCloseTo(
    0.1 * automationFactor(s, 'explore'),
  )
  const cycles = 60 / actionDuration(s, 'explore')
  expect(resourceFlows(s).knowledge.production).toBeCloseTo(
    cycles * 0.1 * automationFactor(s, 'explore'),
  )
  s.resources.food = 0
  expect(resourceFlows(s).knowledge.production).toBe(0)
})
