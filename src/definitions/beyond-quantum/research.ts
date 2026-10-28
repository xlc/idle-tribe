import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  'causal-engineering': {
    name: 'Causal engineering',
    requires: { research: ['coherent-assembly'] },
    cost: {
      knowledge: 8000,
      data: 2000,
      'exotic-material': 200,
      'quantum-components': 120,
      charge: 3000,
    },
    seconds: 43200,
    effect:
      'Enter beyond quantum; unlock Causal laboratory and Temporal vault.',
    description: 'Cause and effect have been invited to a design meeting.',
    effects: {},
    era: 7,
  },
  'stellar-synthesis': {
    name: 'Stellar synthesis',
    requires: { research: ['causal-engineering'] },
    cost: {
      knowledge: 7000,
      data: 1200,
      'causal-models': 30,
      'quantum-components': 60,
    },
    seconds: 32400,
    effect:
      'Unlock Stellar foundry, a high-output metal route using exotic material and charge.',
    description:
      'The furnace has submitted a proposal involving rather more sky.',
    effects: {},
  },
  'causal-archives': {
    name: 'Causal archives',
    requires: { research: ['causal-engineering'] },
    cost: { knowledge: 7000, data: 1500, 'causal-models': 25, circuits: 200 },
    seconds: 21600,
    effect:
      'Unlock Causal archive and Causal data center; full-speed offline window +4h.',
    description:
      'The records now include a carefully labeled shelf for what happens next.',
    effects: { offlineHours: 4 },
  },
  'predictive-fabrication': {
    name: 'Predictive fabrication',
    requires: { research: ['stellar-synthesis', 'causal-archives'] },
    cost: { knowledge: 10000, data: 2500, 'causal-models': 60, machinery: 250 },
    seconds: 32400,
    effect:
      'Unlock Predictive machine shop; selected processing technology +20%.',
    description:
      'The workshop has finished preparing before anyone remembers to ask.',
    effects: {
      jobBonus: { machinist: 0.2, 'electronics-worker': 0.2, toolmaker: 0.2 },
    },
    upgrade: {
      maxLevel: 3,
      requires: { research: ['causal-synthesis'] },
      costMultiplier: 1.75,
      timeMultiplier: 1.2,
      effect: 'Selected workshop technology bonus +0.04 per additional level.',
      effects: {
        jobBonus: {
          machinist: 0.04,
          'electronics-worker': 0.04,
          toolmaker: 0.04,
        },
      },
    },
  },
  'causal-synthesis': {
    name: 'Causal synthesis',
    requires: { research: ['predictive-fabrication'] },
    cost: {
      knowledge: 12000,
      data: 4000,
      'causal-models': 80,
      'quantum-components': 150,
    },
    seconds: 43200,
    effect:
      'Unlock Causal synthesis lab: faster models with reduced recipe inputs. Continue expanding without a final reset requirement.',
    description:
      'Cause and effect have agreed to a more productive working arrangement.',
    effects: {},
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
