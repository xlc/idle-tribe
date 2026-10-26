import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  farmer: {
    name: 'Farmer',
    aptitude: 'Farming',
    learning: 'production',
    description: 'Persuades plants to keep regular working hours.',
    output: 'food',
    input: {},
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
