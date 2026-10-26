import type { EraDefinition } from '../types'
import { buildingUpgrades } from './building-upgrades'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { research } from './research'

export const AGRICULTURAL = {
  index: 1,
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
  perks: {},
} satisfies EraDefinition
