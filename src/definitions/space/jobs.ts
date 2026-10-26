import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  'orbital-worker': {
    name: 'Orbital worker',
    aptitude: 'Orbital extraction',
    learning: 'production',
    description:
      'Gathers useful material a rather long way from the lunch room.',
    output: 'exotic-material',
    input: { charge: 4 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
