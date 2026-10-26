import type { BuildingId } from '../../ids'
import type { FormDefinition } from '../../types'

export const buildingUpgrades = {
  library: [
    {
      name: 'Causal archive',
      description:
        'The filing system is remarkably prepared for your next question.',
      requires: { research: ['causal-archives'] },
      cost: { circuits: 200, 'quantum-components': 50, 'causal-models': 20 },
      work: 40,
      storage: { knowledge: 9000, data: 2000, 'causal-models': 300 },
      offlineHours: 2,
    },
  ],
  'data-center': [
    {
      name: 'Causal data center',
      description:
        'The answers have begun arriving with suspiciously convenient timestamps.',
      requires: { research: ['causal-archives'] },
      cost: { circuits: 200, 'quantum-components': 30, 'causal-models': 20 },
      work: 50,
      storage: {
        circuits: 1200,
        data: 10000,
        knowledge: 3000,
        'causal-models': 400,
      },
    },
  ],
  'quantum-vault': [
    {
      name: 'Temporal vault',
      description:
        'Everything stays where it belongs, including the order of events.',
      requires: { research: ['causal-engineering'] },
      cost: { circuits: 200, 'quantum-components': 40, data: 600 },
      work: 65,
      storage: {
        'quantum-components': 900,
        'exotic-material': 1200,
        'causal-models': 600,
      },
    },
  ],
  'machine-shop': [
    {
      name: 'Predictive machine shop',
      description: 'Your next machine is already occupying the assembly bench.',
      requires: { research: ['predictive-fabrication'] },
      cost: { metal: 300, 'quantum-components': 30, 'causal-models': 20 },
      work: 70,
      rate: 1.5,
      input: { metal: 2, tools: 0.5, charge: 1, 'causal-models': 0.01 },
    },
  ],
} satisfies Partial<Record<BuildingId, FormDefinition[]>>
