import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  'food-store': {
    forms: [
      {
        name: 'Granary',
        description: 'A dry home for the harvest and the next hungry season.',
        cost: { wood: 20, stone: 10 },
        work: 2,
        requires: { research: ['agriculture'] },
        storage: { food: 400 },
      },
    ],
    effect: 'Food-only storage; later forms increase its capacity.',
  },
  irrigation: {
    forms: [
      {
        name: 'Irrigation works',
        description: "Water takes the scenic route through everyone's crops.",
        cost: { planks: 40, blocks: 30, tools: 10 },
        work: 20,
        requires: { research: ['irrigation'] },
      },
    ],
    effect: 'Farm production technology +15% × √level; no workers or upkeep.',
    jobBonus: { farmer: 0.15 },
  },
  farm: {
    forms: [
      {
        name: 'Farm',
        description: 'Lunch now grows where we tell it to.',
        cost: { planks: 30, blocks: 20, tools: 10 },
        work: 15,
        requires: { research: ['agriculture'] },
        rate: 18,
      },
    ],
    effect: 'Farmer workplace; 0.3 food/s per worker',
    job: 'farmer',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
