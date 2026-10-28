import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  'battery-bank': {
    forms: [
      {
        name: 'Battery bank',
        description: 'A savings account for whatever needs switching on later.',
        requires: { research: ['electronics'] },
        cost: { metal: 80, blocks: 60, tools: 20 },
        work: 20,
        storage: { charge: 4000 },
      },
    ],
    effect: '+4,000 charge base storage.',
  },
  'data-center': {
    forms: [
      {
        name: 'Data center',
        description: "A home for facts that have outgrown everyone's memory.",
        requires: { research: ['electronics'] },
        cost: { metal: 80, machinery: 20, blocks: 80 },
        work: 25,
        storage: { circuits: 400, data: 1000, knowledge: 1000 },
      },
    ],
    effect: 'Store circuits, data, and knowledge.',
  },
  generator: {
    forms: [
      {
        name: 'Generator',
        description:
          'Makes the sort of power that does not require a motivational speech.',
        requires: { research: ['electronics'] },
        cost: { metal: 100, machinery: 30, blocks: 60 },
        work: 30,
        rate: 12,
      },
    ],
    effect:
      'Charge production; solar conversion improves rate and removes fuel use.',
    job: 'power-worker',
  },
  'electronics-plant': {
    forms: [
      {
        name: 'Electronics plant',
        description:
          'Persuades tiny components to agree on where the electricity should go.',
        requires: { research: ['electronics'] },
        cost: { metal: 100, machinery: 20, tools: 40 },
        work: 30,
        rate: 0.5,
      },
    ],
    effect: 'Electronics workplace; 0.008 circuits/s per worker.',
    job: 'electronics-worker',
  },
  'computing-center': {
    forms: [
      {
        name: 'Computing center',
        description:
          'Does the thinking that mostly involves doing the same thing a billion times.',
        requires: { research: ['computing'] },
        cost: { metal: 80, circuits: 60, machinery: 20 },
        work: 30,
        rate: 1,
      },
    ],
    effect: 'Analyst workplace; 0.017 data/s per worker.',
    job: 'analyst',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
