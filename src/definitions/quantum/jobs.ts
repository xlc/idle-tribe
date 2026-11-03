import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  'quantum-engineer': {
    name: 'Quantum engineer',
    aptitude: 'Quantum engineering',
    learning: 'production',
    output: 'quantum-components',
    input: { 'exotic-material': 2, data: 5, charge: 10 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
