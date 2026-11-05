import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  'causal-laboratory': {
    name: 'Causal laboratory',
    description:
      'Investigates cause and effect while carefully labeling which is which.',
    requires: { research: ['causal-engineering'] },
    cost: {
      machinery: 80,
      circuits: 100,
      'quantum-components': 30,
      data: 500,
    },
    work: 60,
    rate: 0.05,
    effect: 'Causal model production; synthesis improves rate and recipe.',
    job: 'causal-researcher',
  },
  'stellar-foundry': {
    name: 'Stellar foundry',
    description: 'The ambitions of a furnace have become rather astronomical.',
    requires: { research: ['stellar-synthesis'] },
    cost: {
      machinery: 150,
      'quantum-components': 60,
      'causal-models': 20,
      'exotic-material': 100,
    },
    work: 90,
    rate: 12,
    effect: 'Stellar workplace; 0.2 metal/s per worker.',
    job: 'stellar-worker',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
