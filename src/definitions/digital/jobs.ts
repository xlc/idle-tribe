import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  'power-worker': {
    name: 'Power worker',
    aptitude: 'Power generation',
    learning: 'production',
    description: 'Keeps the switches supplied with reasons to switch on.',
    output: 'charge',
    input: { wood: 0.5 },
  },
  'electronics-worker': {
    name: 'Electronics worker',
    aptitude: 'Electronics',
    learning: 'production',
    description:
      'Connects tiny parts with impressively strong opinions about direction.',
    output: 'circuits',
    input: { metal: 2, charge: 3 },
  },
  analyst: {
    name: 'Analyst',
    aptitude: 'Analysis',
    learning: 'production',
    description:
      'Asks the machines to turn an interesting question into several files.',
    output: 'data',
    input: { knowledge: 1, circuits: 1, charge: 2 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
