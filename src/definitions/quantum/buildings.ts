import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  'quantum-fabricator': {
    forms: [
      {
        name: 'Quantum fabricator',
        description:
          "Assembles tomorrow's equipment from parts that make yesterday's engineers nervous.",
        requires: { research: ['quantum-engineering'] },
        cost: {
          machinery: 100,
          circuits: 150,
          'quantum-components': 20,
          data: 300,
        },
        work: 50,
      },
    ],
    effect: 'Selected processing technology +15% \u00d7 \u221alevel.',
    jobBonus: {
      sawyer: 0.15,
      mason: 0.15,
      toolmaker: 0.15,
      machinist: 0.15,
      'electronics-worker': 0.15,
      'quantum-engineer': 0.15,
    },
  },
  'quantum-vault': {
    forms: [
      {
        name: 'Quantum vault',
        description:
          'Keeps complicated little things in a reassuringly ordinary inventory.',
        requires: { research: ['quantum-engineering'] },
        cost: { metal: 200, circuits: 100, 'exotic-material': 20 },
        work: 40,
        storage: {
          'quantum-components': 300,
          'exotic-material': 600,
          'causal-models': 100,
        },
      },
    ],
    effect: 'Storage for quantum and exotic materials and causal models.',
  },
  'quantum-laboratory': {
    forms: [
      {
        name: 'Quantum laboratory',
        description:
          'A laboratory for very small things with very large research budgets.',
        requires: { research: ['quantum-engineering'] },
        cost: {
          machinery: 80,
          circuits: 150,
          'exotic-material': 30,
          data: 300,
        },
        work: 50,
        rate: 0.1,
      },
    ],
    effect: 'Quantum workplace; 0.002 components/s per worker.',
    job: 'quantum-engineer',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
