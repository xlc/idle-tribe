import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  miner: {
    name: 'Miner',
    aptitude: 'Mining',
    learning: 'production',
    description: 'Finds promising metal before it has stopped being a rock.',
    output: 'ore',
    input: {},
  },
  smelter: {
    name: 'Smelter',
    aptitude: 'Smelting',
    learning: 'production',
    description: 'Helps ore reconsider its commitment to being inconvenient.',
    output: 'metal',
    input: { ore: 3, wood: 1 },
  },
  machinist: {
    name: 'Machinist',
    aptitude: 'Machining',
    learning: 'production',
    description:
      'Builds the moving parts that make everyone else look organized.',
    output: 'machinery',
    input: { metal: 3, tools: 1 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
