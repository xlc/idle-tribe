import type { BuildingId } from '../../ids'
import type { BuildingDefinition } from '../../types'

export const buildings = {
  'meeting-place': {
    forms: [
      {
        name: 'Meeting place',
        description: 'An excellent place to accomplish very little together.',
        cost: { planks: 80, blocks: 60, tools: 15 },
        work: 30,
        requires: { research: ['writing'] },
      },
    ],
    effect: 'Leisure coverage for 10 people per level',
    leisure: 10,
  },
  'public-well': {
    forms: [
      {
        name: 'Public well',
        description:
          "Fresh water, with a convenient place to discuss everyone else's business.",
        cost: { blocks: 60, planks: 30, tools: 10 },
        work: 20,
        requires: { research: ['town-planning'] },
      },
    ],
    effect: 'Amenity coverage for 10 people per level',
    amenities: 10,
  },
  bathhouse: {
    forms: [
      {
        name: 'Bathhouse',
        description:
          'Warm water and clean cups make a crowded town feel considered.',
        cost: { planks: 100, blocks: 80, tools: 25, ceramics: 40 },
        work: 45,
        requires: { research: ['public-health'] },
      },
    ],
    effect: 'Amenity coverage +15 and leisure coverage +5 per level',
    amenities: 15,
    leisure: 5,
  },
  'great-hall': {
    forms: [
      {
        name: 'Great Hall',
        description:
          "Finally, a room large enough for the settlement's collective self-importance.",
        cost: { planks: 120, blocks: 120, tools: 40, knowledge: 200 },
        work: 90,
        requires: { research: ['civic-engineering'] },
      },
    ],
    effect:
      'Unique milestone; +20 leisure coverage and +20 amenity coverage; ceremonial town milestone',
    unique: true,
    leisure: 20,
    amenities: 20,
  },
  observatory: {
    forms: [
      {
        name: 'Observatory',
        description: 'Stare into space with enough purpose to call it work.',
        cost: { planks: 80, blocks: 60, tools: 20 },
        work: 30,
        requires: { research: ['early-astronomy'] },
      },
    ],
    effect:
      'Knowledge bonus +5% \u00d7 \u221alevel; offline window +\u221alevel hours.',
    offlineHours: 1,
    jobBonus: { scholar: 0.05 },
  },
  kiln: {
    forms: [
      {
        name: 'Kiln',
        description:
          'A hot little room where clay becomes patient enough to be useful.',
        cost: { planks: 80, blocks: 80, tools: 20 },
        work: 30,
        requires: { research: ['ceramic-craft'] },
        rate: 1,
      },
    ],
    effect: 'Potter workplace; 0.017 ceramic/s per worker.',
    job: 'potter',
  },
} satisfies Partial<Record<BuildingId, BuildingDefinition>>
