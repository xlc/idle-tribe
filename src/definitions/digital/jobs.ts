import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  'power-worker': {
    name: 'Power worker',
    aptitude: 'Power generation',
    learning: 'production',
    output: 'charge',
    input: { wood: 0.5 },
  },
  'electronics-worker': {
    name: 'Electronics worker',
    aptitude: 'Electronics',
    learning: 'production',
    output: 'circuits',
    input: { metal: 2, charge: 3 },
  },
  analyst: {
    name: 'Analyst',
    aptitude: 'Analysis',
    learning: 'production',
    output: 'data',
    input: { knowledge: 1, circuits: 1, charge: 2 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
