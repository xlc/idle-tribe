import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  'quantum-engineering': {
    name: 'Quantum engineering',
    requires: { research: ['orbital-surveying', 'solar-collection'] },
    cost: {
      knowledge: 7000,
      data: 1600,
      'exotic-material': 120,
      circuits: 300,
      charge: 2000,
    },
    seconds: 43200,
    effect:
      'Enter the quantum era; unlock Quantum laboratory, fabricator, vault, and archives.',
    description:
      'Tiny things have strange rules, and we have started reading the instructions.',
    effects: {},
    era: 6,
  },
  'coherent-assembly': {
    name: 'Coherent assembly',
    requires: { research: ['quantum-engineering'] },
    cost: {
      knowledge: 5000,
      data: 1000,
      'quantum-components': 30,
      machinery: 100,
    },
    seconds: 21600,
    effect:
      'Quantum component production technology +25%; unlock Quantum habitat.',
    description:
      'The parts work better when they agree on which experiment this is.',
    effects: { jobBonus: { 'quantum-engineer': 0.25 } },
  },
  'closed-cycle-fabrication': {
    name: 'Closed-cycle fabrication',
    requires: { research: ['lean-fabrication', 'quantum-engineering'] },
    cost: { knowledge: 6000, data: 1000, 'quantum-components': 40 },
    seconds: 21600,
    effect:
      'Toolmaker, machinist, and electronics recipe inputs multiply by a further 0.85.',
    description:
      'Waste has become a temporary disagreement about where things belong.',
    effects: {
      recipeMultiplier: {
        toolmaker: 0.85,
        machinist: 0.85,
        'electronics-worker': 0.85,
      },
    },
  },
  'resilient-megastructures': {
    name: 'Resilient megastructures',
    requires: { research: ['structural-systems', 'quantum-engineering'] },
    cost: { knowledge: 6000, data: 1000, 'quantum-components': 40 },
    seconds: 21600,
    effect:
      'Housing contribution and all storage thresholds multiply by a further 1.25.',
    description:
      'Even the enormous buildings have somewhere sensible to put their feet.',
    effects: { housing: 1.25, storage: 1.25 },
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
