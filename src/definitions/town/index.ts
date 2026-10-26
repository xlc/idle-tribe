import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { equipment } from './equipment'
import { jobs } from './jobs'
import { research } from './research'
import { resources } from './resources'

export const TOWN = {
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
  equipment,
  perks: {},
} satisfies EraDefinition
