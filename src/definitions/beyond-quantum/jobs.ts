import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  'causal-researcher': {
    name: 'Causal researcher',
    aptitude: 'Causal research',
    learning: 'production',
    description:
      'Files the results carefully enough to remember which happened first.',
    output: 'causal-models',
    input: { 'quantum-components': 2, data: 10, charge: 20 },
  },
  'stellar-worker': {
    name: 'Stellar worker',
    aptitude: 'Stellar production',
    learning: 'production',
    description:
      'Works beside a furnace with an unusually ambitious job description.',
    output: 'metal',
    input: { 'exotic-material': 0.1, charge: 2 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
