import { completedTechnologies } from './research'
import { createDefaultState } from './state'
import type { GameState, PerkId } from './types'
export const PERKS: Record<
  PerkId,
  { name: string; cost: number; effect: string; description: string }
> = {
  'longer-preparations': {
    name: 'Longer preparations',
    cost: 10,
    effect: '+2h full-speed offline window.',
    description: 'Past you has thoughtfully packed a little extra future.',
  },
  'efficient-instruction': {
    name: 'Efficient instruction',
    cost: 15,
    effect: 'Research material costs −10%.',
    description: 'A useful head start on questions you have asked before.',
  },
  'early-astronomy': {
    name: 'Early astronomy',
    cost: 20,
    effect: 'Unlock optional town astronomy research.',
    description: 'A lasting suspicion that looking up might pay off.',
  },
  'organized-records': {
    name: 'Organized records',
    cost: 25,
    effect: 'All storage thresholds ×1.10.',
    description: 'The piles are finally on speaking terms with the paperwork.',
  },
}
export function legacyReward(state: GameState) {
  return Math.floor(
    10 * Math.max(0, state.era - 1) ** 1.5 + completedTechnologies(state) / 5,
  )
}
export function canReset(state: GameState) {
  return state.legacy.discovered && state.research.writing
}
export function resetRun(state: GameState) {
  if (!canReset(state)) return false
  const reward = legacyReward(state),
    legacy = structuredClone(state.legacy),
    welcome = state.welcome,
    savedAt = state.savedAt
  legacy.lifetime += reward
  legacy.points += reward
  legacy.highestEra = Math.max(legacy.highestEra, state.era)
  Object.assign(state, createDefaultState(), { legacy, welcome, savedAt })
  return true
}
export function buyPerk(state: GameState, id: PerkId) {
  const perk = PERKS[id]
  if (
    !state.legacy.discovered ||
    state.legacy.perks[id] ||
    state.legacy.points < perk.cost
  )
    return false
  state.legacy.points -= perk.cost
  state.legacy.perks[id] = true
  return true
}
