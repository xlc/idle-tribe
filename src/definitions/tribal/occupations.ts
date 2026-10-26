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
} satisfies Partial<Record<WorkingJob, OccupationDefinition>>
