import { EPSILON } from './constants'
import type { GameState, Person } from './types'
export function healthMultiplier(person: Person) {
  return person.health > 3 ? 1 : person.health > 2 ? 0.8 : 0.5
}
const MEAL_COST = 2
const FULL_HEALTH_MEAL_COST = 1
export function mealPortion(person: Person) {
  return person.health >= 5 ? FULL_HEALTH_MEAL_COST : MEAL_COST
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
