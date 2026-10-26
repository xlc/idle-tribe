import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { research } from './research'
import { resources } from './resources'

export const TOWN = {
  index: 2,
  name: 'Town',
  landscape: 'town',
  description:
    'A settlement large enough for everyone to have opinions about it.',
  resources,
  buildings,
  buildingUpgrades,
  research,
  jobs,
  occupations: {},
  actions: {},
  perks: {},
} satisfies EraDefinition
