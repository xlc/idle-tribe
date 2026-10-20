import { canAfford, pay, refund, storageMultiplier } from './resources'
import type { ActionId, Cost, GameState } from './types'

type ActionDefinition = {
  name: string
  description: string
  seconds: number
  cost: Cost
  visible: (state: GameState) => boolean
} & (
  | { resource: 'food' | 'wood' | 'stone'; amount: number; discovery?: never }
  | { resource?: never; amount?: never; discovery: 'wood' | 'stone' }
)
export const ACTIONS: Record<ActionId, ActionDefinition> = {
  gather: {
    name: 'Gather food',
    description:
      'Investigate the bushes for something that counts as breakfast.',
    seconds: 9,
    cost: {},
    resource: 'food',
    amount: 3,
    visible: () => true,
  },
  sticks: {
    name: 'Gather wood',
    description: 'Find a branch with a promising future.',
    seconds: 15,
    cost: {},
    resource: 'wood',
    amount: 3,
    visible: (s) => s.discovered.wood,
  },
  stone: {
    name: 'Gather stone',
    description: 'Pick up a rock and call it the start of something.',
    seconds: 15,
    cost: {},
    resource: 'stone',
    amount: 3,
    visible: (s) => s.discovered.stone,
  },
  explore: {
    name: 'Explore nearby',
    description:
      'The edge of the clearing is doing an excellent job of looking interesting.',
    seconds: 20,
    cost: { food: 10 },
    discovery: 'wood',
    visible: (s) => s.exploreUnlocked && !s.discovered.wood,
  },
  'explore-further': {
    name: 'Explore farther',
    description: 'Pack a snack and enlarge your definition of nearby.',
    seconds: 30,
    cost: { food: 20 },
    discovery: 'stone',
    visible: (s) => s.research['sharpened-stick'] && !s.discovered.stone,
  },
}
export function syncUnlocks(state: GameState) {
  if (state.resources.food >= 5) state.exploreUnlocked = true
  if (state.resources.wood >= 2) state.researchUnlocked = true
}
export function startAction(state: GameState, id: ActionId) {
  const def = ACTIONS[id]
  if (state.manual || !def.visible(state) || !canAfford(state, def.cost))
    return false
  pay(state, def.cost)
  state.manual = { id, paid: { ...def.cost }, progress: 0 }
  return true
}
export function manualRate(state: GameState) {
  if (!state.manual) return 0
  const def = ACTIONS[state.manual.id],
    r = def.resource
  return (r ? storageMultiplier(state, r) : 1) / def.seconds
}
export function finishManual(state: GameState) {
  const active = state.manual
  if (!active) return
  const def = ACTIONS[active.id]
  state.manual = null
  if (def.resource) {
    state.resources[def.resource] += def.amount
  }
  if (def.discovery) {
    state.discovered[def.discovery] = true
    state.notice = `Discovered ${def.discovery}`
  }
  syncUnlocks(state)
}
export function cancelManual(state: GameState) {
  if (!state.manual) return
  refund(state, state.manual.paid)
  state.manual = null
}
