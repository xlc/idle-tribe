import { roundResource } from './format'
import { RESOURCES } from './ids'
import type { Cost, GameState, ResourceId } from './types'

export const RESOURCE_DEFINITIONS: Record<
  ResourceId,
  {
    name: string
    visible: (state: GameState) => boolean
  }
> = {
  fruit: { name: 'Fruit', visible: () => true },
  wood: { name: 'Wood', visible: (state) => state.explored },
  stone: { name: 'Stone', visible: (state) => state.stoneFound },
  planks: {
    name: 'Planks',
    visible: (state) => state.researchLevels.carpentry > 0,
  },
  blocks: {
    name: 'Blocks',
    visible: (state) => state.researchLevels.masonry > 0,
  },
  knowledge: {
    name: 'Knowledge',
    visible: (state) => state.researchLevels.writing > 0,
  },
}

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
