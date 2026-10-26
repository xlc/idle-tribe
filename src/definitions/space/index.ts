import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { research } from './research'
import { resources } from './resources'

export const SPACE = {
  name: 'Space',
  landscape: 'future',
  description: 'The roof was becoming a limitation.',
  resources,
  buildings,
  buildingUpgrades,
  research,
  jobs,
  occupations: {},
  actions: {},
  equipment: [],
  perks: {},
} satisfies EraDefinition
