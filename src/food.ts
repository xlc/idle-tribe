import type { GameState } from './types'

const IDLE_MEAL_COST = 1
const WORK_MEAL_COST = 3

function busy(state: GameState, index: number) {
  return (
    state.people[index]?.job !== 'idle' ||
    state.manual.some((entry) => entry.person === index) ||
    state.queues.research.active?.worker === index
  )
}

export function mealPortion(state: GameState, index: number) {
  return busy(state, index) ? WORK_MEAL_COST : IDLE_MEAL_COST
}

export function mealCost(state: GameState) {
  return state.people.reduce(
    (sum, _, index) => sum + mealPortion(state, index),
    0,
  )
}

// Work costs three food per minute. Food is shared, so a shortage pauses
// automated work while manual work remains available.
export function consumeMealTick(state: GameState, seconds: number) {
  const share = seconds / 60
  state.resources.food = Math.max(
    0,
    state.resources.food - mealCost(state) * share,
  )
}

export function automatedWorkAllowed(state: GameState) {
  return state.resources.food > 0
}
