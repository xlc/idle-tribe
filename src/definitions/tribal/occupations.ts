import type { WorkingJob } from '../../ids'
import type { OccupationDefinition } from '../../types'

export const occupations = {
  builder: { name: 'Builder', aptitude: 'Building', learning: 'construction' },
  forager: { name: 'Forager', aptitude: 'Foraging', learning: 'production' },
  woodcutter: {
    name: 'Woodcutter',
    aptitude: 'Woodcutting',
    learning: 'production',
  },
  stoneworker: {
    name: 'Stoneworker',
    aptitude: 'Stoneworking',
    learning: 'production',
  },
  explorer: {
    name: 'Explorer',
    aptitude: 'Exploration',
    learning: 'production',
  },
  digger: { name: 'Root digger', aptitude: 'Foraging', learning: 'production' },
  hunter: { name: 'Hunter', aptitude: 'Hunting', learning: 'production' },
  chopper: {
    name: 'Chopper',
    aptitude: 'Woodcutting',
    learning: 'production',
  },
  feller: { name: 'Feller', aptitude: 'Woodcutting', learning: 'production' },
  'logging-operator': {
    name: 'Logging operator',
    aptitude: 'Woodcutting',
    learning: 'production',
  },
  'stone-splitter': {
    name: 'Stone splitter',
    aptitude: 'Stoneworking',
    learning: 'production',
  },
  'stone-miner': {
    name: 'Stone miner',
    aptitude: 'Stoneworking',
    learning: 'production',
  },
  'quarry-operator': {
    name: 'Quarry operator',
    aptitude: 'Stoneworking',
    learning: 'production',
  },
} satisfies Partial<Record<WorkingJob, OccupationDefinition>>
