import type { ResourceId } from '../../ids'
import type { ResourceDefinition } from '../../types'

export const resources = {
  'causal-models': {
    name: 'Causal models',
    description:
      'Careful diagrams of why things happened, or might insist on happening.',
    threshold: 5,
  },
} satisfies Partial<Record<ResourceId, ResourceDefinition>>
