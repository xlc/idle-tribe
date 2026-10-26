import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { research } from './research'
import { resources } from './resources'

export const DIGITAL = {
  name: 'Digital',
  landscape: 'future',
  description: 'The blinking lights insist everything is under control.',
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
