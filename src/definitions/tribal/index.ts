import type { EraDefinition } from '../types'
import { actions } from './actions'
import { buildings } from './buildings'
import { equipment } from './equipment'
import { jobs } from './jobs'
import { research } from './research'
import { resources } from './resources'

export const TRIBAL = {
  name: 'Tribal',
  landscape: 'camp',
  description: 'Civilization begins with lunch and a fairly optimistic stick.',
  resources,
  buildings,
  buildingUpgrades: {},
  research,
  jobs,
  actions,
  equipment,
  perks: {},
} satisfies EraDefinition
