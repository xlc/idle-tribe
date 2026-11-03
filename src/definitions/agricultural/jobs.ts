import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  farmer: {
    name: 'Farmer',
    aptitude: 'Farming',
    learning: 'production',
    output: 'food',
    input: {},
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
