import type { EraDefinition } from '../types'
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
  research,
  jobs,
  actions: {},
  equipment,
  perks: {},
} satisfies EraDefinition
