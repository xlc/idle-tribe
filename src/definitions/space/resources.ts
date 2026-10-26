import type { ResourceId } from '../../ids'
import type { ResourceDefinition } from '../../types'

export const resources = {
  'exotic-material': {
    name: 'Exotic material',
    description:
      'Matter that makes the old textbooks look a little embarrassed.',
    threshold: 10,
  },
} satisfies Partial<Record<ResourceId, ResourceDefinition>>
