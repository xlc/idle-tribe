import { EPSILON } from './constants'
import type { GameState } from './types'

// Food is measured per minute internally. A normal villager consumes 0.01/s;
// working villagers consume three times as much while they are on the job.
const IDLE_MEAL_COST = 0.6
const WORK_MEAL_COST = 1.8

function busy(state: GameState, index: number) {
  return (
    state.people[index]?.job !== 'idle' ||
    state.manual.some((entry) => entry.person === index) ||
    state.projects.research?.worker === index
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

// Work costs three times the idle food rate. Food is shared, so a shortage pauses
// automated work while manual work remains available.
export function consumeMealTick(state: GameState, seconds: number) {
  const share = seconds / 60
  const remaining = state.resources.food - mealCost(state) * share
  state.resources.food = remaining <= EPSILON ? 0 : remaining
}

export function automatedWorkAllowed(state: GameState) {
  return state.resources.food > 0
}
