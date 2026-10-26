import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { equipment } from './equipment'
import { jobs } from './jobs'
import { research } from './research'

export const AGRICULTURAL = {
  name: 'Agricultural',
  landscape: 'town',
  description: 'Dinner has put down roots, and so have we.',
  resources: {},
  buildings,
  buildingUpgrades,
  research,
  jobs,
  occupations: {},
  actions: {},
  equipment,
  perks: {},
} satisfies EraDefinition
