import { FEAST_FRUIT_PER_HEART, FED_MEAL_FRUIT } from './constants'
import { roundResource } from './format'
import type { GameState, Person } from './types'

export function getHungerEffects(person: Pick<Person, 'hunger' | 'maxHunger'>) {
  const ratio = person.hunger / person.maxHunger
  if (ratio <= 0.4) return { portion: 0.1, outputMultiplier: 0.5 }
  if (ratio <= 0.6) return { portion: 0.5, outputMultiplier: 0.8 }
  return { portion: FED_MEAL_FRUIT, outputMultiplier: 1 }
}

export function createFood(state: GameState, saveProgress: () => void) {
  function getMealCost() {
    return roundResource(
      state.people.reduce(
        (sum, person) => sum + getHungerEffects(person).portion,
        0,
      ),
    )
  }

  function getFeastCost() {
    // Charge whole fruit, including for fractional hearts in older saves.
    return Math.ceil(
      state.people.reduce(
        (sum, person) => sum + (person.maxHunger - person.hunger),
        0,
      ) * FEAST_FRUIT_PER_HEART,
    )
  }

  function canFeast() {
    const cost = getFeastCost()
    return cost > 0 && state.fruit >= cost
  }

  function feast() {
    if (!canFeast()) return false
    state.fruit = roundResource(state.fruit - getFeastCost())
    for (const person of state.people) person.hunger = person.maxHunger
    saveProgress()
    return true
  }

  function consumeMeal() {
    // Feed the hungriest first. Ties retain roster order, without reordering
    // people or their mounted job controls. Player identity controls survival.
    const mealOrder = [...state.people].sort(
      (a, b) => a.hunger / a.maxHunger - b.hunger / b.maxHunger,
    )
    for (const person of mealOrder) {
      const { portion } = getHungerEffects(person)
      if (state.fruit + 1e-9 >= portion) {
        state.fruit = roundResource(state.fruit - portion)
        person.hunger = Math.min(person.maxHunger, person.hunger + 1)
      } else {
        person.hunger = Math.max(0, person.hunger - 1)
      }
    }
  }

  return {
    getMealCost,
    getFeastCost,
    canFeast,
    feast,
    consumeMeal,
  }
}
