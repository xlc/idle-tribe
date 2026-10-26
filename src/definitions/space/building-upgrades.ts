import type { BuildingId } from '../../ids'
import type { FormDefinition } from '../../types'

export const buildingUpgrades = {
  housing: [
    {
      name: 'Habitat',
      description: 'Home is where you can leave your helmet off.',
      requires: {
        research: ['orbital-flight'],
        facilities: { 'launch-complex': 1 },
      },
      cost: { metal: 120, machinery: 20, circuits: 30 },
      work: 25,
      housing: 16,
    },
  ],
  generator: [
    {
      name: 'Solar array',
      description: 'The fuel arrives every morning with very little paperwork.',
      requires: { research: ['solar-collection'] },
      cost: { metal: 150, circuits: 80, 'exotic-material': 20 },
      work: 45,
      rate: 24,
      input: {},
    },
  ],
} satisfies Partial<Record<BuildingId, FormDefinition[]>>
