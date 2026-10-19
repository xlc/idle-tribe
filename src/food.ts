import { EPSILON } from './constants'
import type { GameState, Person } from './types'
export function healthMultiplier(person: Person) {
  return person.health > 3 ? 1 : person.health > 2 ? 0.8 : 0.5
}
export function mealPortion(person: Person) {
  return person.health > 3 ? 1 : person.health > 2 ? 0.5 : 0.1
}
export function mealCost(state: GameState) {
  return state.people.reduce((sum, p) => sum + mealPortion(p), 0)
}
export function consumeMeal(state: GameState) {
  for (const p of [...state.people].sort((a, b) => a.health - b.health)) {
    const cost = mealPortion(p)
    if (state.resources.food + EPSILON >= cost) {
      state.resources.food = Math.max(0, state.resources.food - cost)
      p.health = Math.min(5, p.health + 1)
    } else p.health = Math.max(0, p.health - 1)
  }
}
export function feastCost(state: GameState) {
  return Math.ceil(state.people.reduce((sum, p) => sum + 5 - p.health, 0))
}
export function feast(state: GameState) {
  const cost = feastCost(state)
  if (!cost || state.resources.food + EPSILON < cost) return false
  state.resources.food = Math.max(0, state.resources.food - cost)
  for (const p of state.people) p.health = 5
  return true
}
