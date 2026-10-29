import type { ActionId } from '../../ids'
import type { ActionDefinition } from '../../types'

export const actions = {
  gather: {
    kind: 'resource',
    name: 'Gather food',
    description:
      'Investigate the bushes for something that counts as breakfast.',
    levelEffect: 'Per level: +2% output · +2% speed',
    seconds: 1,
    baseXp: 4,
    cost: {},
    building: 'foraging',
    job: 'forager',
    resource: 'food',
    amount: 1,
    // Keep wild gathering as a fallback until the settlement has expanded
    // beyond its first farm. This prevents a hidden farm completion from
    // turning off the only active food source before a farmer is assigned.
    visible: (s) =>
      !(s.research.agriculture > 0 && s.facilities.farm.level >= 2),
    hiddenReason: () => 'Retired after the second farm is built',
  },
  sticks: {
    kind: 'resource',
    name: 'Gather wood',
    description: 'Find a branch with a promising future.',
    levelEffect: 'Per level: +2% output · +2% speed',
    seconds: 2,
    baseXp: 3,
    cost: {},
    building: 'lumber',
    job: 'woodcutter',
    resource: 'wood',
    amount: 1,
    visible: (s) => s.discovered.wood,
    hiddenReason: () => 'Discover wood by exploring',
  },
  stone: {
    kind: 'resource',
    name: 'Gather stone',
    description: 'Pick up a rock and call it the start of something.',
    levelEffect: 'Per level: +2% output · +2% speed',
    seconds: 3,
    baseXp: 5,
    cost: {},
    building: 'quarry',
    job: 'stoneworker',
    resource: 'stone',
    amount: 1,
    visible: (s) => s.discovered.stone,
    hiddenReason: () => 'Discover stone by exploring',
  },
  explore: {
    kind: 'exploration',
    name: 'Explore',
    description:
      'The edge of the clearing is doing an excellent job of looking interesting.',
    levelEffect: 'Per level: faster trips · better finds',
    seconds: 4,
    baseXp: 1,
    cost: { food: 6 },
    building: 'expedition-camp',
    job: 'explorer',
    visible: (s) => s.exploreUnlocked,
    hiddenReason: () => 'Reach 5 food to unlock',
  },
} satisfies Partial<Record<ActionId, ActionDefinition>>
