import type { ResourceId } from '../../ids'
import type { ResourceDefinition } from '../../types'

export const resources = {
  charge: {
    name: 'Charge',
    description: 'Stored energy, impatient for something to switch on.',
    threshold: 100,
  },
  circuits: {
    name: 'Circuits',
    description: 'Tiny roads for decisions that happen much too quickly.',
    threshold: 20,
  },
  data: {
    name: 'Data',
    description: 'Facts gathered faster than anyone can nod thoughtfully.',
    threshold: 50,
  },
} satisfies Partial<Record<ResourceId, ResourceDefinition>>
