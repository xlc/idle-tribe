import type { GameState, Mastery } from './types'
export function masteryRequired(mastery: Mastery) {
  return Math.ceil(20 * mastery.level ** 1.5)
}
export function masteryMultiplier(mastery: Mastery) {
  return 1 + 0.07 * Math.sqrt(mastery.level - 1)
}
export function awardMastery(state: GameState, id: 'food' | 'wood' | 'stone') {
  const mastery = state.mastery[id]
  mastery.xp++
  while (mastery.xp >= masteryRequired(mastery)) {
    mastery.xp -= masteryRequired(mastery)
    mastery.level++
  }
}
