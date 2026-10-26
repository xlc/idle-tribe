import type { BuildingId } from '../../ids'
import type { FormDefinition } from '../../types'

export const buildingUpgrades = {
  library: [
    {
      name: 'Technical archive',
      description:
        'The instructions have finally outgrown the back of the envelope.',
      requires: { research: ['computing'] },
      cost: { metal: 200, machinery: 50, circuits: 30 },
      work: 15,
      storage: { knowledge: 1800 },
    },
  ],
  study: [
    {
      name: 'Research institute',
      description:
        'A larger building for discovering how many questions the school missed.',
      requires: { research: ['computing'] },
      cost: { metal: 100, machinery: 30, circuits: 50 },
      work: 20,
      rate: 2.25,
    },
  ],
  foundry: [
    {
      name: 'Electric foundry',
      description: 'The furnace now takes its orders through a switch.',
      requires: { research: ['automation'] },
      cost: { metal: 100, machinery: 30, circuits: 30 },
      work: 45,
      rate: 6,
      input: { ore: 3, charge: 1 },
    },
  ],
  'machine-shop': [
    {
      name: 'Automated machine shop',
      description:
        'Several machines are quietly taking credit for each other\u2019s work.',
      requires: { research: ['automation'] },
      cost: { metal: 150, machinery: 40, circuits: 50 },
      work: 45,
      rate: 0.75,
      input: { metal: 3, tools: 1, charge: 2 },
    },
  ],
} satisfies Partial<Record<BuildingId, FormDefinition[]>>
