import { EPSILON } from './constants'
import { BUILDINGS } from './economy'
import {
  type ActionId,
  type ActionJob,
  type BuildingId,
  RESEARCH_IDS,
  type ResourceId,
} from './ids'
import { RESEARCH } from './research-definitions'
import { canAfford, pay, refund, storageMultiplier } from './resources'
import { happinessMultiplier } from './settlement'
import type { Cost, GameState } from './types'

type ActionDefinition = {
  name: string
  description: string
  seconds: number
  baseXp: number
  cost: Cost
  building: BuildingId
  job: ActionJob
  visible: (state: GameState) => boolean
} & (
  | { resource: ResourceId; amount: number }
  | { resource?: never; amount?: never }
)
export const ACTIONS: Record<ActionId, ActionDefinition> = {
  gather: {
    name: 'Gather food',
    description:
      'Investigate the bushes for something that counts as breakfast.',
    seconds: 1,
    baseXp: 4,
    cost: {},
    building: 'foraging',
    job: 'forager',
    resource: 'food',
    amount: 1,
    visible: (s) => !gatherRetired(s),
  },
  sticks: {
    name: 'Gather wood',
    description: 'Find a branch with a promising future.',
    seconds: 2,
    baseXp: 3,
    cost: {},
    building: 'lumber',
    job: 'woodcutter',
    resource: 'wood',
    amount: 1,
    visible: (s) => s.discovered.wood,
  },
  stone: {
    name: 'Gather stone',
    description: 'Pick up a rock and call it the start of something.',
    seconds: 3,
    baseXp: 5,
    cost: {},
    building: 'quarry',
    job: 'stoneworker',
    resource: 'stone',
    amount: 1,
    visible: (s) => s.discovered.stone,
  },
  explore: {
    name: 'Explore',
    description:
      'The edge of the clearing is doing an excellent job of looking interesting.',
    seconds: 4,
    baseXp: 1,
    cost: { food: 6 },
    building: 'expedition-camp',
    job: 'explorer',
    visible: (s) => s.exploreUnlocked,
  },
}

export function syncUnlocks(state: GameState) {
  if (state.resources.food >= 5) state.exploreUnlocked = true
  if (state.resources.wood >= 2) state.researchUnlocked = true
}

// Farming graduates the settlement off wild gathering (design: upgrade
// actions into better systems instead of accumulating parallel ones).
export function gatherRetired(state: GameState) {
  return state.research.agriculture && state.facilities.farm.level >= 1
}

// Actions derive worker slots from their building; retired actions release
// everyone back to idle.
export function actionSlots(state: GameState, id: ActionId) {
  return state.facilities[ACTIONS[id].building].level
}
export function actionWorkers(state: GameState, id: ActionId) {
  const job = ACTIONS[id].job
  return state.people.reduce((n, person) => (person.job === job ? n + 1 : n), 0)
}
export function syncActions(state: GameState) {
  if (!gatherRetired(state)) return
  state.actionProgress.gather = 0
  for (const person of state.people)
    if (person.job === 'forager') {
      person.job = 'idle'
      person.progress = 0
    }
}

export function startAction(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  if (
    state.manual ||
    !def.visible(state) ||
    actionWorkers(state, id) > 0 ||
    !canAfford(state, def.cost)
  )
    return false
  pay(state, def.cost)
  state.manual = { id, paid: { ...def.cost }, progress: 0 }
  return true
}
export function actionRequiredXp(state: GameState, id: ActionId) {
  return Math.ceil(
    ACTIONS[id].baseXp * 1.2 ** (state.actionSkills[id].level - 1),
  )
}
export function actionYield(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  return def.resource
    ? def.amount * 1.02 ** (state.actionSkills[id].level - 1)
    : 0
}
// Duration of one completion by a single worker at the current skill level.
export function actionDuration(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  return (
    (def.seconds * 0.98 ** (state.actionSkills[id].level - 1)) /
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
    (ACTIONS[id].seconds * 0.98 ** (state.actionSkills[id].level - 1)) /
      workers <=
      2
  )
}

// Automated output keeps the old worker-job balance: 10% of yield per
// completion, raised by research, building forms and equipment, with
// happiness as the final multiplier. Manual clicks give full yield.
export function automationFactor(state: GameState, id: ActionId) {
  let factor = 0.1
  for (const r of RESEARCH_IDS)
    if (state.research[r])
      factor += RESEARCH[r].effects.actionAutomation?.[id] ?? 0
  const facility = state.facilities[ACTIONS[id].building]
  if (facility.level > 0) {
    const form = BUILDINGS[ACTIONS[id].building].forms[facility.form]
    factor += form?.actionAutomation?.[id] ?? 0
    factor += 0.05 * facility.equipment
  }
  return factor
}
// Automated skill XP is its own dial, separate from the output factor.
export function xpFactor(state: GameState, id: ActionId) {
  let factor = 0.1
  for (const r of RESEARCH_IDS)
    if (state.research[r]) factor += RESEARCH[r].effects.actionXp?.[id] ?? 0
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
  const level = state.actionSkills[id].level,
    storage = options.storage ?? storageMultiplier(state, def.resource)
  return (
    ((n * storage) / (def.seconds * 0.98 ** (level - 1))) *
    (def.amount * 1.02 ** (level - 1)) *
    automationFactor(state, id) *
    (options.happiness ?? happinessMultiplier(state))
  )
}

export function manualRate(state: GameState) {
  return state.manual ? 1 / actionDuration(state, state.manual.id) : 0
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
type Discovery = keyof GameState['discovered']
const EXPLORE_DISCOVERIES: Discovery[] = ['wood', 'stone']
type ExploreFind = {
  resource: ResourceId
  amount: (level: number) => number
  discovery?: Discovery
}
const EXPLORE_FINDS: ExploreFind[] = [
  { resource: 'food', amount: (level) => 2 + level },
  { resource: 'wood', amount: (level) => 1 + level, discovery: 'wood' },
  { resource: 'stone', amount: (level) => 1 + level, discovery: 'stone' },
]
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

// One explore completion: roll the reward table. `scale` is 1 for manual
// runs and the automation factor for workers; discoveries always land in
// full. Any non-empty result unlocks the expedition camp.
export function applyExploreReward(state: GameState, scale: number) {
  const level = state.actionSkills.explore.level
  const roll = exploreRand(state)
  const discover = 0.25,
    rare = level >= 5 ? 0.1 : 0,
    resources = 0.5 - rare,
    mini = level >= 10 ? 0.1 : 0
  if (roll < discover) {
    const next = nextDiscovery(state)
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
  if (roll < discover + resources + rare + mini) {
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
    chance = 0.5 - (level >= 5 ? 0.1 : 0) + (nextDiscovery(state) ? 0 : 0.25)
  const result: Cost = {}
  for (const find of pool)
    result[find.resource] = (chance / pool.length) * find.amount(level) * scale
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
  if (active.id === 'explore') applyExploreReward(state, 1)
  syncUnlocks(state)
  syncActions(state)
}

// One automated completion. Explore pays its cost here (with pause) instead
// of upfront, mirroring how workplaces pay recipe inputs.
export function completeAction(state: GameState, id: ActionId, count = 1) {
  const def = ACTIONS[id]
  if (!def.visible(state) || actionWorkers(state, id) < 1) return false
  if (!canAfford(state, def.cost)) return false
  if (count > 1 && def.resource && Object.keys(def.cost).length === 0) {
    let remaining = count
    const xp = xpFactor(state, id)
    while (remaining > 0) {
      const toLevel = Math.max(
        1,
        Math.ceil(
          (actionRequiredXp(state, id) - state.actionSkills[id].xp) / xp,
        ),
      )
      const batch = Math.min(remaining, toLevel)
      state.resources[def.resource] += automatedOutput(state, id) * batch
      grantActionXp(state, id, xp * batch)
      remaining -= batch
    }
    syncUnlocks(state)
    syncActions(state)
    return true
  }
  pay(state, def.cost)
  grantActionXp(state, id, xpFactor(state, id))
  if (def.resource) {
    state.resources[def.resource] += automatedOutput(state, id)
  }
  if (id === 'explore') applyExploreReward(state, automationFactor(state, id))
  syncUnlocks(state)
  syncActions(state)
  return true
}

export function cancelManual(state: GameState) {
  if (!state.manual) return
  refund(state, state.manual.paid)
  state.manual = null
}
