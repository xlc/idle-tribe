import type { BuildingId } from '../../ids'
import type { FormDefinition } from '../../types'

export const buildingUpgrades = {
  housing: [
    {
      name: 'Cottages',
      description: 'Now with walls the wind has to go around.',
      requires: { research: ['agriculture'] },
      cost: { planks: 12, blocks: 8, tools: 3 },
      work: 5,
      housing: 4,
    },
  ],
  'food-store': [
    {
      name: 'Granary',
      description: 'The harvest has moved in and brought all its friends.',
      requires: { research: ['agriculture'] },
      cost: { planks: 15, blocks: 10 },
      work: 4,
      storage: { food: 1200 },
    },
  ],
  lumber: [
    {
      name: 'Timber yard',
      description:
        'More timber, neatly arranged for its upcoming life as something else.',
      requires: { research: ['forestry-methods'] },
      cost: { planks: 20, blocks: 10, tools: 3 },
      work: 6,
      actionAutomation: { sticks: 0.05 },
    },
  ],
  quarry: [
    {
      name: 'Stone pit',
      description: 'The good rocks were underneath the other rocks.',
      requires: { research: ['stone-lifting'] },
      cost: { planks: 15, blocks: 20, tools: 3 },
      work: 6,
      actionAutomation: { stone: 0.05 },
    },
  ],
} satisfies Partial<Record<BuildingId, FormDefinition[]>>
