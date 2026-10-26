import type { EraDefinition } from '../types'
import { actions } from './actions'
import { buildings } from './buildings'
import { jobs } from './jobs'
import { occupations } from './occupations'
import { research } from './research'
import { resources } from './resources'

export const TRIBAL = {
  index: 0,
  name: 'Tribal',
  landscape: 'camp',
  description: 'Civilization begins with lunch and a fairly optimistic stick.',
  resources,
  buildings,
  buildingUpgrades: {},
  research,
  jobs,
  occupations,
  actions,
  perks: {},
} satisfies EraDefinition
