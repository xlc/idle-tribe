import type { ResearchId } from '../../ids'
import type { ResearchDefinition } from '../../types'

export const research = {
  'orbital-flight': {
    name: 'Orbital flight',
    requires: { research: ['automation', 'distributed-records'] },
    cost: {
      knowledge: 5000,
      data: 800,
      machinery: 200,
      circuits: 200,
      charge: 1500,
    },
    seconds: 32400,
    effect:
      'Enter space; unlock Launch complex and Cargo depot. Build a Launch complex for orbital extraction, Habitat and Deep-space array.',
    description:
      'Falling around the world turns out to be a useful travel arrangement.',
    effects: {},
    era: 5,
  },
  'orbital-surveying': {
    name: 'Orbital surveying',
    requires: {
      research: ['orbital-flight'],
      facilities: { 'launch-complex': 1 },
    },
    cost: { knowledge: 4000, data: 600, 'exotic-material': 40, circuits: 100 },
    seconds: 21600,
    effect: 'Unlock Orbital mining network; exotic extraction technology +20%.',
    description:
      'The distant rocks have been asked to describe their qualifications.',
    effects: { jobBonus: { 'orbital-worker': 0.2 } },
  },
  'solar-collection': {
    name: 'Solar collection',
    requires: { research: ['orbital-flight'] },
    cost: {
      knowledge: 3500,
      circuits: 150,
      'exotic-material': 30,
      machinery: 60,
    },
    seconds: 16200,
    effect: 'Unlock Solar array: double base charge rate with no wood input.',
    description: 'The largest furnace nearby has declined to send a fuel bill.',
    effects: {},
  },
} satisfies Partial<Record<ResearchId, ResearchDefinition>>
