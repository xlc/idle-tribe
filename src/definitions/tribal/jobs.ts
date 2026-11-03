import type { WorkingJob } from '../../ids'
import type { JobDefinition } from '../../types'

export const jobs = {
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
  sawyer: {
    name: 'Sawyer',
    aptitude: 'Sawing',
    learning: 'production',
    output: 'planks',
    input: { wood: 3 },
  },
  mason: {
    name: 'Mason',
    aptitude: 'Masonry',
    learning: 'production',
    output: 'blocks',
    input: { stone: 3 },
  },
  toolmaker: {
    name: 'Toolmaker',
    aptitude: 'Toolmaking',
    learning: 'production',
    output: 'tools',
    input: { planks: 2, blocks: 1 },
  },
  scholar: {
    name: 'Scholar',
    aptitude: 'Scholarship',
    learning: 'production',
    output: 'knowledge',
    input: { food: 1 },
  },
} satisfies Partial<Record<WorkingJob, JobDefinition>>
