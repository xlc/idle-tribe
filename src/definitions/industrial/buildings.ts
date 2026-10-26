import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  'ore-mine': {
    forms: [
      {
        name: 'Ore mine',
        description:
          'The metal is down there, wearing a very convincing rock disguise.',
        requires: { research: ['mechanization'] },
        cost: { planks: 80, blocks: 60, tools: 20 },
        work: 20,
        rate: 6,
      },
    ],
    effect: 'Miner workplace; 6 ore/min per worker.',
    job: 'miner',
  },
  foundry: {
    forms: [
      {
        name: 'Foundry',
        description: 'Where stubborn ore warms up to the idea of being metal.',
        requires: { research: ['mechanization'] },
        cost: { planks: 60, blocks: 100, tools: 30 },
        work: 30,
        rate: 2,
      },
    ],
    effect:
      'Metal production; electric conversion improves rate and uses charge.',
    job: 'smelter',
  },
  'machine-shop': {
    forms: [
      {
        name: 'Machine shop',
        description:
          "A workshop for building the things that do the workshop's work.",
        requires: { research: ['mechanization'] },
        cost: { planks: 80, blocks: 80, metal: 40, tools: 20 },
        work: 30,
        rate: 0.25,
      },
    ],
    effect: 'Machinery production; later forms improve rate and recipes.',
    job: 'machinist',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
