import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  potter: {
    name: 'Potter',
    aptitude: 'Pottery',
    learning: 'production',
    output: 'ceramics',
    input: { blocks: 2, wood: 1 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
