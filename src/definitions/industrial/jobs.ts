import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  miner: {
    name: 'Miner',
    aptitude: 'Mining',
    learning: 'production',
    output: 'ore',
    input: {},
  },
  smelter: {
    name: 'Smelter',
    aptitude: 'Smelting',
    learning: 'production',
    output: 'metal',
    input: { ore: 3, wood: 1 },
  },
  machinist: {
    name: 'Machinist',
    aptitude: 'Machining',
    learning: 'production',
    output: 'machinery',
    input: { metal: 3, tools: 1 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
