import type { BuildingId } from '../ids'
import type { BuildingDefinition } from '../types'

export const ADVANCED_BUILDINGS = {
  'orbital-extractor': {
    forms: [
      {
        name: 'Orbital extractor',
        description:
          'Finding useful things somewhere considerably less convenient than the quarry.',
        requires: {
          research: ['orbital-flight'],
          facilities: { 'launch-complex': 1 },
        },
        cost: { machinery: 60, circuits: 80, charge: 600 },
        work: 40,
        rate: 0.25,
      },
      {
        name: 'Orbital mining network',
        description: 'The distant rocks now have a regular collection service.',
        requires: {
          research: ['orbital-surveying'],
          facilities: { 'launch-complex': 1 },
        },
        cost: { machinery: 120, circuits: 150, 'exotic-material': 20 },
        work: 70,
        rate: 1,
        input: { charge: 6 },
      },
    ],
    effect: 'Exotic material extraction; later forms improve the base rate.',
    job: 'orbital-worker',
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
    effect: 'Quantum workplace; 0.1 components/min per worker.',
    job: 'quantum-engineer',
  },
  'causal-laboratory': {
    forms: [
      {
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
      },
      {
        name: 'Causal synthesis lab',
        description:
          'Yesterday\u2019s results have become tomorrow\u2019s very useful equipment.',
        requires: { research: ['causal-synthesis'] },
        cost: { machinery: 150, 'quantum-components': 80, 'causal-models': 40 },
        work: 90,
        rate: 0.12,
        input: { 'quantum-components': 1, data: 8, charge: 12 },
      },
    ],
    effect: 'Causal model production; synthesis improves rate and recipe.',
    job: 'causal-researcher',
  },
  'stellar-foundry': {
    forms: [
      {
        name: 'Stellar foundry',
        description:
          'The ambitions of a furnace have become rather astronomical.',
        requires: { research: ['stellar-synthesis'] },
        cost: {
          machinery: 150,
          'quantum-components': 60,
          'causal-models': 20,
          'exotic-material': 100,
        },
        work: 90,
        rate: 30,
      },
    ],
    effect: 'Stellar workplace; 30 metal/min per worker.',
    job: 'stellar-worker',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
