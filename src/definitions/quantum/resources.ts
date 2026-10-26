import type { ResourceId } from '../../ids'
import type { ResourceDefinition } from '../../types'

export const resources = {
  'quantum-components': {
    name: 'Quantum components',
    description: 'Small parts with unusually complicated working arrangements.',
    threshold: 5,
  },
} satisfies Partial<Record<ResourceId, ResourceDefinition>>
