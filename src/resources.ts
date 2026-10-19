import { RESOURCES } from './constants'
import { roundResource } from './format'
import type { Cost, GameState } from './types'

export function createResources(state: GameState) {
  function canAfford(cost: Cost) {
    return RESOURCES.every(
      (resource) => state[resource] + 1e-9 >= (cost[resource] ?? 0),
    )
  }

  function pay(cost: Cost) {
    for (const resource of RESOURCES)
      state[resource] = roundResource(state[resource] - (cost[resource] ?? 0))
  }

  return {
    canAfford,
    pay,
  }
}
