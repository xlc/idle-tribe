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
// Meals are eaten per tick: food drains at one meal per minute and health
// follows at one heart per minute. When food runs short the weakest eat
// first, mirroring the shared-meal priority.
export function consumeMealTick(state: GameState, seconds: number) {
  const share = seconds / 60
  // With enough food for everyone the order is irrelevant, and skipping the
  // sort keeps long absence settles cheap at large populations.
  const fed = state.resources.food >= mealCost(state) * share
  for (const p of fed
    ? state.people
    : [...state.people].sort((a, b) => a.health - b.health)) {
    const cost = mealPortion(p) * share
    if (state.resources.food >= cost) {
      state.resources.food = Math.max(0, state.resources.food - cost)
      p.health = Math.min(5, p.health + share)
    } else p.health = Math.max(0, p.health - share)
  }
}
