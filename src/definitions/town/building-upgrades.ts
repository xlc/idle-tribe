import type { BuildingId } from '../../ids'
import type { FormDefinition } from '../../types'

export const buildingUpgrades = {
  housing: [
    {
      name: 'Town houses',
      description: 'More neighbors, conveniently within complaining distance.',
      requires: { research: ['town-planning'] },
      cost: { planks: 25, blocks: 25, tools: 5 },
      work: 10,
      housing: 8,
    },
  ],
  library: [
    {
      name: 'Library',
      description:
        'A quiet building full of people who thought they had answers.',
      requires: { research: ['writing'] },
      cost: { planks: 15, blocks: 15 },
      work: 5,
      storage: { knowledge: 400 },
    },
  ],
  study: [
    {
      name: 'School',
      description: 'A place to learn how much there is left to learn.',
      requires: { research: ['writing'] },
      cost: { planks: 25, blocks: 15, tools: 5 },
      work: 8,
      rate: 0.75,
    },
  ],
} satisfies Partial<Record<BuildingId, FormDefinition[]>>
