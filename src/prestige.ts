import { PERKS } from './definitions'
import { completedTechnologies } from './research'
import { hasResearch } from './research-effects'
import { resetState } from './state'
import type { GameState, PerkId } from './types'
export function legacyReward(state: GameState) {
  return Math.floor(
    10 * Math.max(0, state.era - 1) ** 1.5 + completedTechnologies(state) / 5,
  )
}
export function canReset(state: GameState) {
  return state.legacy.discovered && hasResearch(state, 'writing')
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
  resetState(state, { legacy, welcome, savedAt })
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
