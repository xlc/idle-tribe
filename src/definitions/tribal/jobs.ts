import type { ProductionJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
  sawyer: {
    name: 'Sawyer',
    aptitude: 'Sawing',
    learning: 'production',
    description: 'Helps trees settle into a flatter line of work.',
    output: 'planks',
    input: { wood: 3 },
  },
  mason: {
    name: 'Mason',
    aptitude: 'Masonry',
    learning: 'production',
    description: 'Makes stone look like it was expecting to become a building.',
    output: 'blocks',
    input: { stone: 3 },
  },
  toolmaker: {
    name: 'Toolmaker',
    aptitude: 'Toolmaking',
    learning: 'production',
    description: 'Equips everyone else to complain less about their equipment.',
    output: 'tools',
    input: { planks: 2, blocks: 1 },
  },
  scholar: {
    name: 'Scholar',
    aptitude: 'Scholarship',
    learning: 'production',
    description: 'Turns a full stomach into difficult questions.',
    output: 'knowledge',
    input: { food: 1 },
  },
} satisfies Partial<Record<ProductionJob, JobDefinition>>
