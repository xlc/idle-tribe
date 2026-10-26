import type { ResourceId } from '../../ids'
import type { ResourceDefinition } from '../../types'

export const resources = {
  food: {
    name: 'Food',
    description: 'The one resource everyone insists on consuming.',
    threshold: 120,
  },
  wood: {
    name: 'Wood',
    description: 'Future homes, currently shaped like trees.',
    threshold: 60,
  },
  stone: {
    name: 'Stone',
    description:
      'The settlement’s oldest and least flexible building material.',
    threshold: 60,
  },
  planks: {
    name: 'Planks',
    description: 'Wood persuaded to take a more useful shape.',
    threshold: 20,
  },
  blocks: {
    name: 'Blocks',
    description: 'Stone with its corners finally in order.',
    threshold: 20,
  },
  tools: {
    name: 'Tools',
    description: 'An excellent way to stop doing everything the hard way.',
    threshold: 10,
  },
  knowledge: {
    name: 'Knowledge',
    description: 'Useful ideas that survived being explained to someone else.',
    threshold: 20,
  },
} satisfies Partial<Record<ResourceId, ResourceDefinition>>
