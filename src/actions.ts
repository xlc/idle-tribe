import { EPSILON, WORKERS_PER_BUILDING_LEVEL } from './constants'
import { ACTIONS, BUILDINGS } from './definitions'
import {
  type Discovery,
  EXPEDITION_ENCOUNTERS,
  EXPLORE_DISCOVERIES,
  EXPLORE_FINDS,
} from './definitions/tribal/exploration'
import { type ActionId, RESEARCH_IDS, RESOURCES } from './ids'
import { hasResearch, researchEffects } from './research-effects'
import { canAfford, pay, refund, storageMultiplier } from './resources'
import { happinessMultiplier, requirementBlocker } from './settlement'
import type {
  Cost,
  EncounterOptionIndex,
  ExpeditionEncounterId,
  GameState,
} from './types'

// Shared action balance. Keep cadence, displayed output, and simulation on the
// same curve when tuning progression or equipment.
export const ACTION_BALANCE = {
  durationPerLevel: 0.98,
  yieldPerLevel: 1.02,
  xpPerLevel: 1.2,
  baseAutomation: 0.1,
  automationPerEquipment: 0.05,
  automatedXp: 0.1,
  rateModeSeconds: 2,
}

export function syncUnlocks(state: GameState) {
  if (state.resources.food >= 5) state.exploreUnlocked = true
  if (state.resources.wood >= 2) state.researchUnlocked = true
}

export function actionSlots(state: GameState, id: ActionId) {
  return (
    WORKERS_PER_BUILDING_LEVEL * state.facilities[ACTIONS[id].building].level
  )
}
export function actionWorkers(state: GameState, id: ActionId) {
  const job = ACTIONS[id].job
  return state.people.reduce((n, person) => (person.job === job ? n + 1 : n), 0)
}

export type ActionAvailability =
  | { kind: 'locked'; reason: string }
  | {
      kind: 'manual'
      state: 'ready' | 'running' | 'blocked' | 'missing-cost'
      missing: Cost
      reason: string
    }
  | {
      kind: 'automated'
      state: 'active' | 'paused'
      missing: Cost
      reason: string
      workers: number
    }

function missingCost(state: GameState, cost: Cost): Cost {
  const missing: Cost = {}
  for (const resource of RESOURCES) {
    const amount = (cost[resource] ?? 0) - state.resources[resource]
    if (amount > EPSILON) missing[resource] = amount
  }
  return missing
}

export function actionAvailability(
  state: GameState,
  id: ActionId,
): ActionAvailability {
  const def = ACTIONS[id]
  if (state.manual?.id === id) {
    return {
      kind: 'manual',
      state: 'running',
      missing: {},
      reason: 'Running · Stop to cancel',
    }
  }

  if (!def.visible(state))
    return {
      kind: 'locked',
      reason: def.hiddenReason?.(state) ?? 'Not available yet',
    }

  const workers = actionWorkers(state, id)
  if (workers > 0) {
    const missing = missingCost(state, def.cost)
    if (id === 'explore' && state.pendingEncounter)
      return {
        kind: 'automated',
        state: 'paused',
        missing: {},
        reason: 'Paused until the expedition report is resolved',
        workers,
      }
    if (Object.keys(missing).length > 0)
      return {
        kind: 'automated',
        state: 'paused',
        missing,
        reason: 'Paused until its costs are available',
        workers,
      }
    return {
      kind: 'automated',
      state: 'active',
      missing: {},
      reason: `Automated by ${workers} worker${workers === 1 ? '' : 's'}`,
      workers,
    }
  }

  if (state.manual) {
    return {
      kind: 'manual',
      state: 'blocked',
      missing: {},
      reason: `Finish ${ACTIONS[state.manual.id].name} first`,
    }
  }

  if (id === 'explore' && state.pendingEncounter)
    return {
      kind: 'manual',
      state: 'blocked',
      missing: {},
      reason: 'Resolve the pending expedition report first',
    }

  const missing = missingCost(state, def.cost)
  return Object.keys(missing).length
    ? {
        kind: 'manual',
        state: 'missing-cost',
        missing,
        reason: 'Needs more resources',
      }
    : { kind: 'manual', state: 'ready', missing: {}, reason: 'Ready to start' }
}

export function actionWorkersUnlocked(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  const form = BUILDINGS[def.building].forms[0]
  return (
    state.facilities[def.building].level > 0 &&
    !requirementBlocker(state, form?.requires ?? {})
  )
}

export function startAction(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  const availability = actionAvailability(state, id)
  if (availability.kind !== 'manual' || availability.state !== 'ready')
    return false
  pay(state, def.cost)
  state.manual = { id, paid: { ...def.cost }, progress: 0 }
  return true
}
export function actionRequiredXp(state: GameState, id: ActionId) {
  return Math.ceil(
    ACTIONS[id].baseXp *
      ACTION_BALANCE.xpPerLevel ** (state.actionSkills[id].level - 1),
  )
}
export function actionYield(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  let bonus = 1
  for (const r of RESEARCH_IDS)
    if (hasResearch(state, r))
      bonus += researchEffects(state, r).actionYield?.[id] ?? 0
  return def.resource
    ? def.amount *
        ACTION_BALANCE.yieldPerLevel ** (state.actionSkills[id].level - 1) *
        bonus
    : 0
}
// Skill-adjusted cadence before live storage pressure. The simulation caches
// this between discrete events; displays and mode selection use the same rule.
export function baseActionDuration(state: GameState, id: ActionId) {
  return (
    ACTIONS[id].seconds *
    ACTION_BALANCE.durationPerLevel ** (state.actionSkills[id].level - 1)
  )
}
// Duration of one completion by a single worker at the current skill level.
export function actionDuration(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  return (
    baseActionDuration(state, id) /
    (def.resource ? storageMultiplier(state, def.resource) : 1)
  )
}
// Automated completions run faster with more workers (each adds +100% speed).
export function actionCompletionDuration(state: GameState, id: ActionId) {
  return actionDuration(state, id) / Math.max(1, actionWorkers(state, id))
}
export function isRateMode(state: GameState, id: ActionId) {
  // Fast automated actions are integrated continuously to keep offline
  // settlement bounded; use storage-free cadence so the mode cannot flip while
  // a stockpile changes during one simulation interval.
  const workers = actionWorkers(state, id)
  return (
    Boolean(ACTIONS[id].resource) &&
    workers > 0 &&
    baseActionDuration(state, id) / workers <= ACTION_BALANCE.rateModeSeconds
  )
}

// Automated output keeps the old worker-job balance: 10% of yield per
// completion, raised by research, building forms and equipment, with
// happiness as the final multiplier. Manual clicks give full yield.
export function automationFactor(state: GameState, id: ActionId) {
  let factor = ACTION_BALANCE.baseAutomation
  for (const r of RESEARCH_IDS)
    if (hasResearch(state, r))
      factor += researchEffects(state, r).actionAutomation?.[id] ?? 0
  const facility = state.facilities[ACTIONS[id].building]
  if (facility.level > 0) {
    const form = BUILDINGS[ACTIONS[id].building].forms[facility.form]
    factor += form?.actionAutomation?.[id] ?? 0
    factor += ACTION_BALANCE.automationPerEquipment * facility.equipment
  }
  return factor
}
// Automated skill XP is its own dial, separate from the output factor.
export function xpFactor(state: GameState, id: ActionId) {
  let factor = ACTION_BALANCE.automatedXp
  for (const r of RESEARCH_IDS)
    if (hasResearch(state, r))
      factor += researchEffects(state, r).actionXp?.[id] ?? 0
  return factor
}
export function automatedOutput(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  if (!def.resource) return 0
  return (
    actionYield(state, id) *
    automationFactor(state, id) *
    happinessMultiplier(state)
  )
}
// Continuous output per second of an automated resource action. The discrete
// and rate-mode paths converge on this same quantity, so arrival gates and
// flow displays can rely on it regardless of mode.
export function actionOutputRate(
  state: GameState,
  id: ActionId,
  options: { happiness?: number; storage?: number } = {},
) {
  const def = ACTIONS[id],
    n = actionWorkers(state, id)
  if (!def.resource || n < 1 || !def.visible(state)) return 0
  const storage = options.storage ?? storageMultiplier(state, def.resource)
  return (
    ((n * storage) / baseActionDuration(state, id)) *
    actionYield(state, id) *
    automationFactor(state, id) *
    (options.happiness ?? happinessMultiplier(state))
  )
}

export function manualRate(state: GameState) {
  return state.manual ? 1 / actionDuration(state, state.manual.id) : 0
}

// Whether an action's staff are actively working (visible, staffed, and
// able to pay the per-run cost).
export function actionJobActive(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  return Boolean(
    def.visible(state) &&
      actionWorkers(state, id) > 0 &&
      !(id === 'explore' && state.pendingEncounter) &&
      canAfford(state, def.cost),
  )
}

export function grantActionXp(state: GameState, id: ActionId, xp: number) {
  const skill = state.actionSkills[id]
  skill.xp += xp
  while (skill.xp + EPSILON >= actionRequiredXp(state, id)) {
    skill.xp -= actionRequiredXp(state, id)
    if (skill.xp < EPSILON) skill.xp = 0
    skill.level++
  }
}

// Deterministic RNG: rewards must replay identically no matter how the
// timeline is sliced between live ticks and offline settlement.
function exploreRand(state: GameState) {
  let seed = Math.imul(state.exploreRolls + 1, 0x9e3779b9)
  seed = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad)
  seed = Math.imul(seed ^ (seed >>> 15), 0x735a2d97)
  state.exploreRolls++
  return ((seed ^ (seed >>> 13)) >>> 0) / 4294967296
}

// Explore finds are data-driven: an entry joins the pool once its discovery
// (if any) has happened, so new resource kinds only extend these tables.
function explorePool(state: GameState) {
  return EXPLORE_FINDS.filter(
    (find) => !find.discovery || state.discovered[find.discovery],
  )
}
function nextDiscovery(state: GameState): Discovery | null {
  return EXPLORE_DISCOVERIES.find((id) => !state.discovered[id]) ?? null
}

function exploreResourceReward(state: GameState, level: number, scale: number) {
  const pool = explorePool(state),
    find =
      pool[
        Math.min(pool.length - 1, Math.floor(exploreRand(state) * pool.length))
      ]
  if (find) state.resources[find.resource] += find.amount(level) * scale
}

function eligibleEncounters(state: GameState) {
  return Object.values(EXPEDITION_ENCOUNTERS).filter(
    (encounter) =>
      state.actionSkills.explore.level >= encounter.minimumLevel &&
      !state.completedEncounters[encounter.id],
  )
}

function nextEncounter(state: GameState, roll: number) {
  const encounters = eligibleEncounters(state),
    total = encounters.reduce((sum, encounter) => sum + encounter.weight, 0)
  if (!total) return null
  let remaining = roll * total
  for (const encounter of encounters) {
    remaining -= encounter.weight
    if (remaining < 1e-9) return encounter
  }
  return encounters.at(-1) ?? null
}

function encounterChance(state: GameState) {
  return state.actionSkills.explore.level >= 5 &&
    eligibleEncounters(state).length > 0
    ? 0.05
    : 0
}

function encounterExpectedResources(state: GameState, scale: number): Cost {
  const encounters = eligibleEncounters(state),
    total = encounters.reduce((sum, encounter) => sum + encounter.weight, 0),
    result: Cost = {}
  if (!total) return result
  for (const encounter of encounters) {
    const effect = encounter.options[encounter.automatedOption].effect
    if (effect.kind !== 'resources') continue
    const chance = (encounterChance(state) * encounter.weight) / total
    for (const resource of RESOURCES)
      result[resource] =
        (result[resource] ?? 0) +
        (effect.amount[resource] ?? 0) * chance * scale
  }
  return result
}

function applyEncounterEffect(
  state: GameState,
  id: ExpeditionEncounterId,
  option: EncounterOptionIndex,
  scale = 1,
) {
  const encounter = EXPEDITION_ENCOUNTERS[id]
  if (!encounter) return false
  const effect = encounter.options[option].effect
  if (effect.kind === 'resources')
    for (const resource of RESOURCES)
      state.resources[resource] += (effect.amount[resource] ?? 0) * scale
  if (effect.kind === 'happiness')
    state.happiness = Math.min(100, state.happiness + effect.amount * scale)
  if (effect.kind === 'arrival-progress')
    state.arrivalProgress = Math.min(
      1,
      state.arrivalProgress + effect.amount * scale,
    )
  state.completedEncounters[id] = true
  state.pendingEncounter = null
  state.notice = encounter.options[option].label
  return true
}

export function resolveEncounter(
  state: GameState,
  option: EncounterOptionIndex,
) {
  const id = state.pendingEncounter
  if (!id) return false
  const resolved = applyEncounterEffect(state, id, option)
  if (resolved) syncUnlocks(state)
  return resolved
}

// One explore completion: roll the reward table. `scale` is 1 for manual
// runs and the automation factor for workers; discoveries always land in
// full. A manual run always finds the next pending discovery; workers roll.
// Any non-empty result unlocks the expedition camp.
export function applyExploreReward(
  state: GameState,
  scale: number,
  mode: 'manual' | 'automated' = 'automated',
) {
  if (state.pendingEncounter) return
  const level = state.actionSkills.explore.level
  const roll = exploreRand(state)
  const discover = 0.25,
    rare = level >= 5 ? 0.1 : 0,
    encounter = encounterChance(state),
    resources = 0.5 - rare - encounter,
    mini = level >= 5 ? 0.1 : 0
  const next = nextDiscovery(state)
  if ((next && scale >= 1) || roll < discover) {
    if (next) {
      state.discovered[next] = true
      state.notice = `Discovered ${next}`
    } else exploreResourceReward(state, level, scale)
    state.expeditionUnlocked = true
    syncUnlocks(state)
    return
  }
  if (roll < discover + resources) {
    exploreResourceReward(state, level, scale)
    state.expeditionUnlocked = true
    return
  }
  if (roll < discover + resources + rare) {
    grantActionXp(state, 'explore', 5)
    if (state.researchUnlocked) {
      state.resources.knowledge += 1 * scale
      state.notice = 'Explorers brought back unusual insight'
    } else state.notice = 'Explorers found a promising vantage point'
    state.expeditionUnlocked = true
    return
  }
  if (roll < discover + resources + rare + encounter) {
    const found = nextEncounter(state, exploreRand(state))
    if (found) {
      if (mode === 'manual') {
        state.pendingEncounter = found.id
        state.notice = 'Explorers found something unusual'
      } else {
        applyEncounterEffect(state, found.id, found.automatedOption, scale)
      }
      state.expeditionUnlocked = true
      return
    }
  }
  if (roll < discover + resources + rare + encounter + mini) {
    if (exploreRand(state) < 0.5) {
      state.arrivalProgress = Math.min(1, state.arrivalProgress + 0.25 * scale)
      state.notice = 'Explorers met travelers heading this way'
    } else {
      state.happiness = Math.min(100, state.happiness + 5 * scale)
      state.notice = 'Explorers returned with good stories'
    }
    state.expeditionUnlocked = true
  }
}

// Probability-weighted explore rewards per completion, for rate displays.
export function exploreExpectedRewards(state: GameState): Cost {
  const level = state.actionSkills.explore.level,
    scale = automationFactor(state, 'explore'),
    pool = explorePool(state),
    encounter = encounterChance(state),
    chance =
      0.5 -
      (level >= 5 ? 0.1 : 0) -
      encounter +
      (nextDiscovery(state) ? 0 : 0.25)
  const result: Cost = {}
  for (const find of pool)
    result[find.resource] = (chance / pool.length) * find.amount(level) * scale
  if (level >= 5 && state.researchUnlocked)
    result.knowledge = (result.knowledge ?? 0) + 0.1 * scale
  const encounterResources = encounterExpectedResources(state, scale)
  for (const resource of RESOURCES)
    result[resource] =
      (result[resource] ?? 0) + (encounterResources[resource] ?? 0)
  return result
}

export function finishManual(state: GameState) {
  const active = state.manual
  if (!active) return
  const def = ACTIONS[active.id]
  state.manual = null
  grantActionXp(state, active.id, 1)
  if (def.resource) {
    state.resources[def.resource] += actionYield(state, active.id)
  }
  if (def.kind === 'exploration') applyExploreReward(state, 1, 'manual')
  syncUnlocks(state)
}

// One automated completion. Explore pays its cost here (with pause) instead
// of upfront, mirroring how workplaces pay recipe inputs.
export function completeAction(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  if (
    !def.visible(state) ||
    actionWorkers(state, id) < 1 ||
    (id === 'explore' && state.pendingEncounter)
  )
    return false
  if (!canAfford(state, def.cost)) return false
  pay(state, def.cost)
  grantActionXp(state, id, xpFactor(state, id))
  if (def.resource) {
    state.resources[def.resource] += automatedOutput(state, id)
  }
  if (def.kind === 'exploration')
    applyExploreReward(state, automationFactor(state, id))
  syncUnlocks(state)
  return true
}

export function cancelManual(state: GameState) {
  if (!state.manual) return
  refund(state, state.manual.paid)
  state.manual = null
}
