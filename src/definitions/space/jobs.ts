import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  'orbital-worker': {
    name: 'Orbital worker',
    aptitude: 'Orbital extraction',
    learning: 'production',
    output: 'exotic-material',
    input: { charge: 4 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
