import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  'launch-complex': {
    forms: [
      {
        name: 'Launch complex',
        description:
          'The ground has served us well, but we have other appointments.',
        requires: { research: ['orbital-flight'] },
        cost: { machinery: 80, circuits: 80, charge: 1000, metal: 200 },
        work: 60,
      },
    ],
    effect:
      'Enables orbital workplaces; exotic extraction technology +10% \u00d7 \u221alevel.',
    jobBonus: { 'orbital-worker': 0.1 },
  },
  'cargo-depot': {
    forms: [
      {
        name: 'Cargo depot',
        description:
          'Even among the stars, someone has to organize the deliveries.',
        requires: { research: ['orbital-flight'] },
        cost: { machinery: 40, circuits: 80, metal: 300 },
        work: 30,
        storage: {
          'exotic-material': 400,
          machinery: 400,
          circuits: 800,
          'quantum-components': 50,
        },
      },
    ],
    effect: 'Storage for exotic materials and orbital supplies.',
  },
  'space-observatory': {
    forms: [
      {
        name: 'Deep-space array',
        description:
          'The view is excellent, and somebody should really write this down.',
        requires: {
          research: ['orbital-flight'],
          facilities: { 'launch-complex': 1 },
        },
        cost: { machinery: 40, circuits: 100, metal: 200 },
        work: 40,
      },
    ],
    effect:
      'Knowledge technology +10% \u00d7 \u221alevel; offline window +\u221alevel hours.',
    jobBonus: { scholar: 0.1 },
    offlineHours: 1,
  },
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
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
