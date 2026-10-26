import type { ResourceId } from '../../ids'
import type { ResourceDefinition } from '../../types'

export const resources = {
  ore: {
    name: 'Ore',
    description: 'Rock with a more ambitious job hidden inside.',
    threshold: 100,
  },
  metal: {
    name: 'Metal',
    description: 'Shiny proof that the furnace was worth the trouble.',
    threshold: 50,
  },
  machinery: {
    name: 'Machinery',
    description: 'Several moving parts that have agreed to move together.',
    threshold: 10,
  },
} satisfies Partial<Record<ResourceId, ResourceDefinition>>
