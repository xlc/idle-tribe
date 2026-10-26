import type { ResourceId } from '../../ids'
import type { ResourceDefinition } from '../../types'

export const resources = {
  ceramics: {
    name: 'Ceramics',
    description: 'Fired clay that keeps water, grain, and good ideas in place.',
    threshold: 30,
  },
} satisfies Partial<Record<ResourceId, ResourceDefinition>>
